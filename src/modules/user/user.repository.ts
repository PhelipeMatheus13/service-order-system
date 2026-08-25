import { getPrisma } from "../../shared/config/database.js";
import { Prisma } from "../../generated/prisma/client.js";
import type { 
    RegisterInput, 
    UserRecord, 
    ListUsersInput,
    OutboxUserRecord,
    ResourceValidationRecord,
    CreateResourceValidationInput,
    ResourceValidationType,
} from "./user.types.js";


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
        await prisma.user.delete({where: { id }});
        return true
    } catch (error) {
        // if the user does not exist, Prisma will throw a known request error with code P2025
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return false;
        }
        throw error
    }
};

const createResourceValidation = async (input: CreateResourceValidationInput): Promise<ResourceValidationRecord> => {
    const prisma = getPrisma();
    const resourceValidation = await prisma.userResourceValidation.create({
        data: {
            userId: input.userId,
            challengerNumber: input.challengerNumber,
            resourceType: input.resourceType,
        },
    });

    return resourceValidation;
}

// Reader
const existsByEmail = async(email: string): Promise<boolean>  => {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({where: { email }});
    
    return !!user;
};

const findById = async(id: string): Promise<UserRecord | null>  => {
    const prisma = getPrisma();
    return prisma.user.findUnique({ where: { id } });
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

const findResourceValidation = async ( 
    userId: string,
    resourceType: ResourceValidationType,
): Promise<ResourceValidationRecord | null> => {
    const prisma = getPrisma();

    const resourceValidation = await prisma.userResourceValidation.findFirst({
        where: {
            userId,
            resourceType,
        },
    });

    return resourceValidation;
};

export default {
    // Writer
    create,
    deleteById,
    createResourceValidation,
    // Reader
    existsByEmail,
    findById,
    list,
    listOutboxUserUnconsumed,
    markOutboxUserAsConsumed,
    findResourceValidation,
};