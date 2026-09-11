// (Node built‑ins)
import { randomUUID } from "node:crypto";
// (Types)
import { LoginInput, TokensOutput } from "./auth.types.js"
// (shared)
import { getPrisma } from "../../shared/config/database.js";
import logger from "../../shared/config/logger.js";
import { unauthorized } from "../../shared/errors/errors.js";
import { comparePassword } from "../../shared/services/hash.js";
import { hashToken, compareToken } from "../../shared/services/token-hash.js";
import { generateAccessToken, generateRefreshToken, decodeRefreshToken } from "../../shared/services/jwt.js";
// (external modules)
import userService from "../user/user.service.js";
import refreshTokenService from "../refresh-token/refresh-token.service.js";

const login = async (input: LoginInput): Promise<TokensOutput> => {
    const user = await userService.findUserByEmail(input.email);

    // for security reasons, we don't want to reveal whether the email or password is incorrect
    // So we use a generic error message
    if (!user?.active || !user.passwordHash || !(await comparePassword(input.password, user.passwordHash))) {
        throw unauthorized({
            message: "Invalid email or password",
            code: "INVALID_CREDENTIALS",
        });
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const { refreshToken, refreshTokenPayload } = generateRefreshToken(user.id, user.role, randomUUID());

    await refreshTokenService.createRefreshToken({
        userId: user.id,
        jti: refreshTokenPayload.jti,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(refreshTokenPayload.exp * 1000)
    });


    return { accessToken, refreshToken };
};

const rotateTokens = async (oldRefreshToken: string): Promise<TokensOutput> => {
    const oldRefreshDecoded = decodeRefreshToken(oldRefreshToken);
    const oldRefreshTokenData = await refreshTokenService.findRefreshTokenByJti(oldRefreshDecoded.jti);

    if (!oldRefreshTokenData) {
        throw unauthorized({ message: "Refresh token not found", code: "REFRESH_TOKEN_NOT_FOUND" });
    }

    // for security, compare the provided refresh token with the hashed version in the database
    // This ensures that the presented token is exactly the one that was issued
    if (!(compareToken(oldRefreshToken, oldRefreshTokenData.tokenHash))) {
        throw unauthorized({ message: "Invalid refresh token", code: "INVALID_REFRESH_TOKEN" });
    }

    if (oldRefreshTokenData.revokedAt) {
        // If the token has been revoked, revoke all tokens for this user to prevent reuse
        await refreshTokenService.revokeAllRefreshTokensByUserId(oldRefreshTokenData.userId);

        logger.error({
            userId: oldRefreshTokenData.userId,
            jti: oldRefreshTokenData.jti,
            tokenId: oldRefreshTokenData.id,
        }, "Refresh token reuse detected: all sessions revoked");

        throw unauthorized({ message: "Refresh token reuse detected", code: "REFRESH_TOKEN_REUSE_DETECTED" });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(oldRefreshTokenData.userId, oldRefreshDecoded.role);
    const { refreshToken: newRefresToken, refreshTokenPayload: newRefreshTokenPayload } = generateRefreshToken(
        oldRefreshTokenData.userId,
        oldRefreshDecoded.role,
        randomUUID()
    );

    await getPrisma().$transaction(async (trx) => {
        const revoked = await refreshTokenService.revokeRefreshTokenById(oldRefreshTokenData.id, trx);
        if (!revoked) {
            // race condition: the token was revoked by another process after we checked but before we revoked it
            logger.error({
                userId: oldRefreshTokenData.userId,
                jti: oldRefreshTokenData.jti,
                tokenId: oldRefreshTokenData.id,
            }, "Refresh token reuse detected: race condition on revoke");

            throw unauthorized({ message: "Refresh token reuse detected", code: "REFRESH_TOKEN_REUSE_DETECTED" });
        }

        await refreshTokenService.createRefreshToken({
            tokenHash: hashToken(newRefresToken),
            userId: newRefreshTokenPayload.sub,
            jti: newRefreshTokenPayload.jti,
            expiresAt: new Date(newRefreshTokenPayload.exp * 1000),
        }, trx);
    })

    return { accessToken: newAccessToken, refreshToken: newRefresToken };
};

const logout = async (refreshToken: string): Promise<void> => {
    const refreshTokenDecoded = decodeRefreshToken(refreshToken);
    const refreshTokenData = await refreshTokenService.findRefreshTokenByJti(refreshTokenDecoded.jti);

    if (!refreshTokenData) {
        throw unauthorized({ message: "Refresh token not found", code: "REFRESH_TOKEN_NOT_FOUND" });
    }

    if (!(compareToken(refreshToken, refreshTokenData.tokenHash))) {
        throw unauthorized({ message: "Invalid refresh token", code: "INVALID_REFRESH_TOKEN" });
    }

    const revoked = await refreshTokenService.revokeRefreshTokenById(refreshTokenData.id);
    if (!revoked) {
        // Logout is idempotent: if it was already revoked, we're still done.
        logger.warn({
            userId: refreshTokenData.userId,
            jti: refreshTokenData.jti,
            tokenId: refreshTokenData.id,
        }, "Logout called on already revoked token (idempotent)");
    }

    return;
};

const logoutAll = async (refreshToken: string): Promise<void> => {
    const refreshTokenDecoded = decodeRefreshToken(refreshToken);
    const refreshTokenData = await refreshTokenService.findRefreshTokenByJti(refreshTokenDecoded.jti);

    if (!refreshTokenData) {
        throw unauthorized({ message: "Refresh token not found", code: "REFRESH_TOKEN_NOT_FOUND" });
    }

    if (!(compareToken(refreshToken, refreshTokenData.tokenHash))) {
        throw unauthorized({ message: "Invalid refresh token", code: "INVALID_REFRESH_TOKEN" });
    }

    if (refreshTokenData.revokedAt) {
        logger.warn({
            userId: refreshTokenData.userId,
            jti: refreshTokenData.jti,
            tokenId: refreshTokenData.id,
        }, "Refresh token reuse detected: logout called on already revoked token");

        throw unauthorized({message: "Refresh token reuse detected", code: "REFRESH_TOKEN_REUSE_DETECTED"});
    }

    await refreshTokenService.revokeAllRefreshTokensByUserId(refreshTokenData.userId);
};

export default {
    login,
    rotateTokens,
    logout,
    logoutAll,
}