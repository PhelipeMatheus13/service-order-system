import type { CreateRefreshTokenInput } from "./refresh-token.types.js";
import { Prisma } from "../../generated/prisma/client.js";
import tokenRepository from "./refresh-token.repository.js"

const createRefreshToken = (input: CreateRefreshTokenInput, tx?: Prisma.TransactionClient) => tokenRepository.create(input, tx);
const revokeRefreshTokenById = (id:string, tx?: Prisma.TransactionClient) => tokenRepository.revokeById(id, tx);
const revokeAllRefreshTokensByUserId = (userId: string) => tokenRepository.revokeAllByUserId(userId);
const findRefreshTokenByJti = (jti: string) => tokenRepository.findByJti(jti);

export default {
    createRefreshToken,
    revokeRefreshTokenById,
    revokeAllRefreshTokensByUserId,
    findRefreshTokenByJti,
};