import type { CreateRefreshTokenInput, RefreshTokenRecord } from "./refresh-token.types.js";
import { getPrisma } from "../../shared/config/database.js";
import { Prisma, PrismaClient } from "../../generated/prisma/client.js";

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

// Writer
const create = async (input: CreateRefreshTokenInput, tx?: Prisma.TransactionClient): Promise<RefreshTokenRecord> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();
    const refreshToken = await prisma.refreshToken.create({
        data: {
            userId: input.userId,
            jti: input.jti,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt,
        }
    });

    return refreshToken;
};

const revokeById = async (id: string, tx?: Prisma.TransactionClient): Promise<boolean> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();
    const result = await prisma.refreshToken.updateMany({
        where: { id, revokedAt: null },
        data: { revokedAt: new Date() },
    });

    return result.count > 0;
};

const revokeAllByUserId = async (userId: string): Promise<number> => {
    const prisma = getPrisma();
    const result = await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });

    return result.count;
};

// Reader
const findByJti = async (jti: string): Promise<RefreshTokenRecord | null> => {
    const prisma = getPrisma();
    return prisma.refreshToken.findUnique({ where: { jti } });
};

export default {
    // Writer
    create,
    revokeById,
    revokeAllByUserId,
    // Reader
    findByJti,
};