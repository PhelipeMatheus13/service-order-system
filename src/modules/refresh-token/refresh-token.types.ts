import { RefreshToken } from "../../generated/prisma/client.js";

interface CreateRefreshTokenInput {
    userId: string;
    jti: string;
    tokenHash: string;
    expiresAt: Date;
}

export type {
    RefreshToken as RefreshTokenRecord,
    CreateRefreshTokenInput,
};