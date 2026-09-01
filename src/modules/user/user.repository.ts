import type {
    RegisterInput,
    UserRecord,
    ListUsersInput,
    OutboxUserRecord,
    ResourceValidationRecord,
    CreateResourceValidationInput,
    ResourceValidationType,
    CreateUserActivationTokenInput,
    UserActivationTokenRecord
} from "./user.types.js";
import { getPrisma } from "../../shared/config/database.js";
import { Prisma, PrismaClient } from "../../generated/prisma/client.js";


// Represents either the main Prisma client or a transaction client.
// Used in repository methods to support optional transactions:
// - If a transaction client is provided (tx), use it.
// - Otherwise, fall back to the default Prisma client.
type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

// Writer
const create = async (input: RegisterInput): Promise<UserRecord> => {
    const prisma = getPrisma();
    const user = await prisma.user.create({
        data: {
            firstName: input.firstName,
            lastName: input.lastName,
            phoneNumber: input.phoneNumber,
            email: input.email,
            role: input.role,
        },
    });

    return user;
};

const deleteById = async (id: string): Promise<boolean> => {
    const prisma = getPrisma();
    try {
        await prisma.user.delete({ where: { id } });
        return true
    } catch (error) {
        // if the user does not exist, Prisma will throw a known request error with code P2025
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return false;
        }
        throw error
    }
};

const createResourceValidation = async (input: CreateResourceValidationInput, tx?: Prisma.TransactionClient): Promise<ResourceValidationRecord> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    const resourceValidation = await prisma.userResourceValidation.create({
        data: {
            userId: input.userId,
            challengerNumber: input.challengerNumber,
            resourceType: input.resourceType,
            expiresAt
        },
    });

    return resourceValidation;
};

// Atomic guard: only succeeds if confirmedAt was still null at the moment
// of the write. Returns whether it actually confirmed the row
const confirmResourceValidationById = async (id: string, tx?: Prisma.TransactionClient): Promise<boolean> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();
    const result = await prisma.userResourceValidation.updateMany({
        where: { id, confirmedAt: null },
        data: { confirmedAt: new Date() },
    });

    return result.count > 0;
};

const activateAndSetPassword = async (userId: string, passwordHash: string, tx?: Prisma.TransactionClient): Promise<void> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();
    await prisma.user.update({
        where: { id: userId },
        data: {
            passwordHash,
            active: true,
            updatedAt: new Date(),
        },
    });
};

const invalidateActiveEmailValidations = async (email: string, tx?: Prisma.TransactionClient): Promise<void> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();
    await prisma.userResourceValidation.updateMany({
        where: {
            user: {
                email,
            },
            resourceType: "EMAIL",
            confirmedAt: null,
            expiresAt: {
                gt: new Date(),
            },
        },
        data: {
            expiresAt: new Date(),
        },
    });
};

const createUserActivationToken = async (input: CreateUserActivationTokenInput, tx?: Prisma.TransactionClient): Promise<UserActivationTokenRecord> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();
    const userActivationToken = await prisma.userActivationToken.create({
        data: {
            userId: input.userId,
            jti: input.jti,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt,
        },
    });
    
    return userActivationToken;
}

// Atomic guard: only succeeds if consumedAt was still null at the moment
// of the write. Returns whether it actually consumed the row
const consumeUserActivationTokenByJti = async (jti: string, tx?: Prisma.TransactionClient): Promise<boolean> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();
    const result = await prisma.userActivationToken.updateMany({
        where: { jti, consumedAt: null },
        data: { consumedAt: new Date() },
    });

    return result.count > 0;
}

// Reader
const existsByEmail = async (email: string): Promise<boolean> => {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { email } });

    return !!user;
};

const findById = async (id: string): Promise<UserRecord | null> => {
    const prisma = getPrisma();
    return prisma.user.findUnique({ where: { id } });
};

const findByEmail = async (email: string): Promise<UserRecord | null> => {
    const prisma = getPrisma();
    return prisma.user.findUnique({ where: { email } });
};

const list = async (input: ListUsersInput): Promise<UserRecord[]> => {
    const prisma = getPrisma();

    const limit = input.options.limit ?? 100;

    return prisma.user.findMany({
        take: limit,
        orderBy: {
            createdAt: "desc",
        },
    });
};

const listOutboxUserUnconsumed = async (): Promise<OutboxUserRecord[]> => {
    const prisma = getPrisma();
    return prisma.outboxUser.findMany({
        where: { consumedAt: null },
        orderBy: { createdAt: "asc" },
    });
};

const markOutboxUserAsConsumed = async (ids: number[]): Promise<void> => {
    if (ids.length === 0) return;

    const prisma = getPrisma();
    await prisma.outboxUser.updateMany({
        where: { id: { in: ids } },
        data: { consumedAt: new Date() },
    });
};

const findResourceValidationByUserId = async (
    userId: string,
    resourceType: ResourceValidationType,
): Promise<ResourceValidationRecord | null> => {
    const prisma = getPrisma();

    const resourceValidation = await prisma.userResourceValidation.findFirst({
        where: {
            userId,
            resourceType,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return resourceValidation;
};

const findResourceValidationByEmail = async (email: string): Promise<ResourceValidationRecord | null> => {
    const prisma = getPrisma();

    const resourceValidation = await prisma.userResourceValidation.findFirst({
        where: {
            user: {
                email,
            },
            resourceType: "EMAIL",
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return resourceValidation;
};

const findUserActivationTokenByJti = async (jti: string): Promise<UserActivationTokenRecord | null> => {
    const prisma = getPrisma();
    return prisma.userActivationToken.findUnique({ where: { jti } });
}

export default {
    // Writer
    create,
    deleteById,
    createResourceValidation,
    confirmResourceValidationById,
    activateAndSetPassword,
    invalidateActiveEmailValidations,
    createUserActivationToken,
    consumeUserActivationTokenByJti,
    // Reader
    existsByEmail,
    findById,
    findByEmail,
    list,
    listOutboxUserUnconsumed,
    markOutboxUserAsConsumed,
    findResourceValidationByUserId,
    findResourceValidationByEmail,
    findUserActivationTokenByJti
};