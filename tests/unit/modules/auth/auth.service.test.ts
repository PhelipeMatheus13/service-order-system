import { describe, it, expect, beforeEach, vi } from "vitest";
import type { LoginInput,  } from "../../../../src/modules/auth/auth.types.js";
import { User } from "../../../../src/generated/prisma/client.js";
import authService from "../../../../src/modules/auth/auth.service.js";

// Mocks dependencies
import { getPrisma } from "../../../../src/shared/config/database.js";
import logger from "../../../../src/shared/config/logger.js";
import { comparePassword } from "../../../../src/shared/services/hash.js";
import { hashToken, compareToken } from "../../../../src/shared/services/token-hash.js";
import { generateAccessToken, generateRefreshToken, decodeRefreshToken } from "../../../../src/shared/services/jwt.js";
import userService from "../../../../src/modules/user/user.service.js";
import refreshTokenService from "../../../../src/modules/refresh-token/refresh-token.service.js";


vi.mock("../../../../src/shared/config/database.js");
vi.mock("../../../../src/shared/config/logger.js", () => ({
    default: {
        error: vi.fn(),
        warn: vi.fn(),
    },
}));
vi.mock("../../../../src/shared/services/hash.js");
vi.mock("../../../../src/shared/services/token-hash.js");
vi.mock("../../../../src/shared/services/jwt.js");
vi.mock("../../../../src/modules/user/user.service.js");
vi.mock("../../../../src/modules/refresh-token/refresh-token.service.js");

describe("Auth Service (Unit)", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe("login", () => {
        const input: LoginInput = {
            email: "test@example.com",
            password: "Str0ng!P4ss",
        };

        const mockUser = {
            id: "uuid-123",
            firstName: "John",
            lastName: "Doe",
            email: input.email,
            phoneNumber: null,
            passwordHash: "hashed-password",
            role: "ATTENDANT",
            active: true,
            createdAt: new Date(),
            updatedAt: null,
        } as User;

        const mockRefreshTokenPayload = {
            sub: mockUser.id,
            role: mockUser.role,
            jti: "jti-uuid-123",
            exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        };

        const setupLoginMocks = () => {
            vi.mocked(userService.findUserByEmail).mockResolvedValue(mockUser);
            vi.mocked(comparePassword).mockResolvedValue(true);
            vi.mocked(generateAccessToken).mockReturnValue("access-token");
            vi.mocked(generateRefreshToken).mockReturnValue({
                refreshToken: "refresh-token",
                refreshTokenPayload: mockRefreshTokenPayload,
            });
            vi.mocked(hashToken).mockReturnValue("hashed-refresh-token");
            vi.mocked(refreshTokenService.createRefreshToken).mockResolvedValue({
                id: "token-id",
                userId: mockUser.id,
                jti: mockRefreshTokenPayload.jti,
                tokenHash: "hashed-refresh-token",
                expiresAt: new Date(mockRefreshTokenPayload.exp * 1000),
                createdAt: new Date(),
                consumedAt: null,
                revokedAt: null,
            });
        };

        it("should throw if userService.findUserByEmail fails", async () => {
            const error = new Error("Database error");
            vi.mocked(userService.findUserByEmail).mockRejectedValue(error);

            await expect(authService.login(input)).rejects.toThrow(error);
        });

        it("should throw with INVALID_CREDENTIALS if user not found", async () => {
            vi.mocked(userService.findUserByEmail).mockResolvedValue(null);

            await expect(authService.login(input)).rejects.toMatchObject({
                statusCode: 401,
                code: "INVALID_CREDENTIALS",
                message: "Invalid email or password",
            });
        });

        it("should throw with INVALID_CREDENTIALS if user is inactive", async () => {
            vi.mocked(userService.findUserByEmail).mockResolvedValue({
                ...mockUser,
                active: false,
            });

            await expect(authService.login(input)).rejects.toMatchObject({
                statusCode: 401,
                code: "INVALID_CREDENTIALS",
                message: "Invalid email or password",
            });
        });

        it("should throw with INVALID_CREDENTIALS if user has no passwordHash", async () => {
            vi.mocked(userService.findUserByEmail).mockResolvedValue({
                ...mockUser,
                passwordHash: null,
            });

            await expect(authService.login(input)).rejects.toMatchObject({
                statusCode: 401,
                code: "INVALID_CREDENTIALS",
                message: "Invalid email or password",
            });
        });

        it("should throw if comparePassword fails", async () => {
            const error = new Error("Hash error");
            vi.mocked(userService.findUserByEmail).mockResolvedValue(mockUser);
            vi.mocked(comparePassword).mockRejectedValue(error);

            await expect(authService.login(input)).rejects.toThrow(error);
        });

        it("should throw with INVALID_CREDENTIALS if password does not match", async () => {
            vi.mocked(userService.findUserByEmail).mockResolvedValue(mockUser);
            vi.mocked(comparePassword).mockResolvedValue(false);

            await expect(authService.login(input)).rejects.toMatchObject({
                statusCode: 401,
                code: "INVALID_CREDENTIALS",
                message: "Invalid email or password",
            });
        });

        it("should throw if generateAccessToken fails", async () => {
            setupLoginMocks();
            const error = new Error("JWT error");
            vi.mocked(generateAccessToken).mockImplementation(() => {
                throw error;
            });

            await expect(authService.login(input)).rejects.toThrow(error);
        });

        it("should throw if generateRefreshToken fails", async () => {
            setupLoginMocks();
            const error = new Error("JWT error");
            vi.mocked(generateRefreshToken).mockImplementation(() => {
                throw error;
            });

            await expect(authService.login(input)).rejects.toThrow(error);
        });

        it("should throw if hashToken fails", async () => {
            setupLoginMocks();
            const error = new Error("Hash error");
            vi.mocked(hashToken).mockImplementation(() => { throw error; });

            await expect(authService.login(input)).rejects.toThrow(error);
        });

        it("should throw if refreshTokenService.createRefreshToken fails", async () => {
            setupLoginMocks();
            const error = new Error("DB error");
            vi.mocked(refreshTokenService.createRefreshToken).mockRejectedValue(error);

            await expect(authService.login(input)).rejects.toThrow(error);
        });

        it("should login successfully", async () => {
            setupLoginMocks();

            const result = await authService.login(input);

            expect(userService.findUserByEmail).toHaveBeenCalledWith(input.email);
            expect(comparePassword).toHaveBeenCalledWith(input.password, mockUser.passwordHash);
            expect(generateAccessToken).toHaveBeenCalledWith(mockUser.id, mockUser.role);
            expect(generateRefreshToken).toHaveBeenCalledWith(mockUser.id, mockUser.role, expect.any(String));
            expect(hashToken).toHaveBeenCalledWith("refresh-token");
            expect(refreshTokenService.createRefreshToken).toHaveBeenCalledWith({
                userId: mockUser.id,
                jti: mockRefreshTokenPayload.jti,
                tokenHash: "hashed-refresh-token",
                expiresAt: new Date(mockRefreshTokenPayload.exp * 1000),
            });

            expect(result).toEqual({
                accessToken: "access-token",
                refreshToken: "refresh-token",
            });
        });
    });

    describe("rotateTokens", () => {
        const oldRefreshToken = "valid-refresh-token";

        const oldDecoded = {
            sub: "uuid-123",
            role: "ATTENDANT",
            jti: "jti-old",
            exp: Math.floor(Date.now() / 1000) + 3600,
        };

        const oldTokenData = {
            id: "token-123",
            userId: "uuid-123",
            jti: "jti-old",
            tokenHash: "hashed-old",
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            consumedAt: null,
            revokedAt: null,
        };

        const newRefreshPayload = {
            sub: "uuid-456",
            role: "ATTENDANT",
            jti: "jti-new",
            exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        };

        const mockTransaction = {};

        const setupRotateMocks = () => {
            vi.mocked(decodeRefreshToken)
                .mockReturnValueOnce(oldDecoded)
                .mockReturnValueOnce(newRefreshPayload);
            vi.mocked(refreshTokenService.findRefreshTokenByJti).mockResolvedValue(oldTokenData);
            vi.mocked(compareToken).mockReturnValue(true);
            vi.mocked(generateAccessToken).mockReturnValue("new-access-token");
            vi.mocked(generateRefreshToken).mockReturnValue({
                refreshToken: "new-refresh-token",
                refreshTokenPayload: newRefreshPayload,
            });
            vi.mocked(hashToken).mockReturnValue("hashed-new");
            vi.mocked(refreshTokenService.revokeRefreshTokenById).mockResolvedValue(true);
            vi.mocked(refreshTokenService.createRefreshToken).mockResolvedValue({
                id: "new-token-id",
                userId: newRefreshPayload.sub,
                jti: newRefreshPayload.jti,
                tokenHash: "hashed-new",
                expiresAt: new Date(newRefreshPayload.exp * 1000),
                createdAt: new Date(),
                consumedAt: null,
                revokedAt: null,
            });
            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async (callback) => callback(mockTransaction)),
            } as any);
        };

        it("should throw if decodeRefreshToken fails", async () => {
            const error = new Error("JWT error");
            vi.mocked(decodeRefreshToken).mockImplementation(() => {
                throw error;
            });

            await expect(authService.rotateTokens(oldRefreshToken)).rejects.toThrow(error);
        });

        it("should throw with REFRESH_TOKEN_NOT_FOUND if token not found", async () => {
            vi.mocked(decodeRefreshToken).mockReturnValue(oldDecoded);
            vi.mocked(refreshTokenService.findRefreshTokenByJti).mockResolvedValue(null);

            await expect(authService.rotateTokens(oldRefreshToken)).rejects.toMatchObject({
                statusCode: 401,
                code: "REFRESH_TOKEN_NOT_FOUND",
                message: "Refresh token not found",
            });
        });

        it("should throw if findRefreshTokenByJti fails", async () => {
            const error = new Error("DB error");
            vi.mocked(decodeRefreshToken).mockReturnValue(oldDecoded);
            vi.mocked(refreshTokenService.findRefreshTokenByJti).mockRejectedValue(error);

            await expect(authService.rotateTokens(oldRefreshToken)).rejects.toThrow(error);
        });

        it("should throw if compareToken fails", async () => {
            const error = new Error("Compare error");
            vi.mocked(decodeRefreshToken).mockReturnValue(oldDecoded);
            vi.mocked(refreshTokenService.findRefreshTokenByJti).mockResolvedValue(oldTokenData);
            vi.mocked(compareToken).mockImplementation(() => {
                throw error;
            });

            await expect(authService.rotateTokens(oldRefreshToken)).rejects.toThrow(error);
        });

        it("should throw with INVALID_REFRESH_TOKEN if hash does not match", async () => {
            vi.mocked(decodeRefreshToken).mockReturnValue(oldDecoded);
            vi.mocked(refreshTokenService.findRefreshTokenByJti).mockResolvedValue(oldTokenData);
            vi.mocked(compareToken).mockReturnValue(false);

            await expect(authService.rotateTokens(oldRefreshToken)).rejects.toMatchObject({
                statusCode: 401,
                code: "INVALID_REFRESH_TOKEN",
                message: "Invalid refresh token",
            });
        });

        it("should revoke all sessions and throw if token is already revoked", async () => {
            const revokedTokenData = { ...oldTokenData, revokedAt: new Date() };
            vi.mocked(decodeRefreshToken).mockReturnValue(oldDecoded);
            vi.mocked(refreshTokenService.findRefreshTokenByJti).mockResolvedValue(revokedTokenData);
            vi.mocked(compareToken).mockReturnValue(true);
            vi.mocked(refreshTokenService.revokeAllRefreshTokensByUserId).mockResolvedValue(1);

            await expect(authService.rotateTokens(oldRefreshToken)).rejects.toMatchObject({
                statusCode: 401,
                code: "REFRESH_TOKEN_REUSE_DETECTED",
                message: "Refresh token reuse detected",
            });

            expect(refreshTokenService.revokeAllRefreshTokensByUserId).toHaveBeenCalledWith(revokedTokenData.userId);
            expect(logger.error).toHaveBeenCalledWith(
                {
                    userId: revokedTokenData.userId,
                    jti: revokedTokenData.jti,
                    tokenId: revokedTokenData.id,
                },
                "Refresh token reuse detected: all sessions revoked",
            );
        });

        it("should throw if revokeAllRefreshTokensByUserId fails during reuse detection", async () => {
            const error = new Error("DB error");
            const revokedTokenData = { ...oldTokenData, revokedAt: new Date() };
            vi.mocked(decodeRefreshToken).mockReturnValue(oldDecoded);
            vi.mocked(refreshTokenService.findRefreshTokenByJti).mockResolvedValue(revokedTokenData);
            vi.mocked(compareToken).mockReturnValue(true);
            vi.mocked(refreshTokenService.revokeAllRefreshTokensByUserId).mockRejectedValue(error);

            await expect(authService.rotateTokens(oldRefreshToken)).rejects.toThrow(error);
        });

        it("should throw if generateAccessToken fails", async () => {
            setupRotateMocks();
            const error = new Error("JWT error");
            vi.mocked(generateAccessToken).mockImplementation(() => {
                throw error;
            });

            await expect(authService.rotateTokens(oldRefreshToken)).rejects.toThrow(error);
        });

        it("should throw if generateRefreshToken fails", async () => {
            setupRotateMocks();
            const error = new Error("JWT error");
            vi.mocked(generateRefreshToken).mockImplementation(() => {
                throw error;
            });

            await expect(authService.rotateTokens(oldRefreshToken)).rejects.toThrow(error);
        });

        it("should throw if hashToken fails", async () => {
            setupRotateMocks();
            const error = new Error("Hash error");
            vi.mocked(hashToken).mockImplementation(() => { throw error; });

            await expect(authService.rotateTokens(oldRefreshToken)).rejects.toThrow(error);
        });

        it("should throw if revokeRefreshTokenById fails", async () => {
            setupRotateMocks();
            const error = new Error("DB error");
            vi.mocked(refreshTokenService.revokeRefreshTokenById).mockRejectedValue(error);

            await expect(authService.rotateTokens(oldRefreshToken)).rejects.toThrow(error);
        });

        it("should throw with REFRESH_TOKEN_REUSE_DETECTED if revoke returns false (race condition)", async () => {
            setupRotateMocks();
            vi.mocked(refreshTokenService.revokeRefreshTokenById).mockResolvedValue(false);

            await expect(authService.rotateTokens(oldRefreshToken)).rejects.toMatchObject({
                statusCode: 401,
                code: "REFRESH_TOKEN_REUSE_DETECTED",
                message: "Refresh token reuse detected",
            });

            expect(logger.error).toHaveBeenCalledWith(
                {
                    userId: oldTokenData.userId,
                    jti: oldTokenData.jti,
                    tokenId: oldTokenData.id,
                },
                "Refresh token reuse detected: race condition on revoke",
            );
        });

        it("should throw if createRefreshToken fails within transaction", async () => {
            setupRotateMocks();
            const error = new Error("DB error");
            vi.mocked(refreshTokenService.createRefreshToken).mockRejectedValue(error);

            await expect(authService.rotateTokens(oldRefreshToken)).rejects.toThrow(error);
        });

        it("should rotate tokens successfully", async () => {
            setupRotateMocks();

            const result = await authService.rotateTokens(oldRefreshToken);

            expect(decodeRefreshToken).toHaveBeenCalledWith(oldRefreshToken);
            expect(refreshTokenService.findRefreshTokenByJti).toHaveBeenCalledWith(oldDecoded.jti);
            expect(compareToken).toHaveBeenCalledWith(oldRefreshToken, oldTokenData.tokenHash);
            expect(generateAccessToken).toHaveBeenCalledWith(oldTokenData.userId, oldDecoded.role);
            expect(generateRefreshToken).toHaveBeenCalledWith(oldTokenData.userId, oldDecoded.role, expect.any(String));
            expect(hashToken).toHaveBeenCalledWith("new-refresh-token");
            expect(refreshTokenService.revokeRefreshTokenById).toHaveBeenCalledWith(oldTokenData.id, mockTransaction);
            expect(refreshTokenService.createRefreshToken).toHaveBeenCalledWith(
                {
                    tokenHash: "hashed-new",
                    userId: newRefreshPayload.sub,
                    jti: newRefreshPayload.jti,
                    expiresAt: new Date(newRefreshPayload.exp * 1000),
                },
                mockTransaction,
            );

            expect(result).toEqual({
                accessToken: "new-access-token",
                refreshToken: "new-refresh-token",
            });
        });
    });

    describe("logout", () => {
        const refreshToken = "valid-refresh-token";

        const decoded = {
            sub: "uuid-123",
            role: "ATTENDANT",
            jti: "jti-123",
            exp: Math.floor(Date.now() / 1000) + 3600,
        };

        const tokenData = {
            id: "token-123",
            userId: "uuid-123",
            jti: "jti-123",
            tokenHash: "hashed-refresh",
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            consumedAt: null,
            revokedAt: null,
        };

        const setupLogoutMocks = () => {
            vi.mocked(decodeRefreshToken).mockReturnValue(decoded);
            vi.mocked(refreshTokenService.findRefreshTokenByJti).mockResolvedValue(tokenData);
            vi.mocked(compareToken).mockReturnValue(true);
            vi.mocked(refreshTokenService.revokeRefreshTokenById).mockResolvedValue(true);
        };

        it("should throw if decodeRefreshToken fails", async () => {
            const error = new Error("JWT error");
            vi.mocked(decodeRefreshToken).mockImplementation(() => {
                throw error;
            });

            await expect(authService.logout(refreshToken)).rejects.toThrow(error);
        });

        it("should throw if findRefreshTokenByJti fails", async () => {
            const error = new Error("DB error");
            vi.mocked(decodeRefreshToken).mockReturnValue(decoded);
            vi.mocked(refreshTokenService.findRefreshTokenByJti).mockRejectedValue(error);

            await expect(authService.logout(refreshToken)).rejects.toThrow(error);
        });

        it("should throw with REFRESH_TOKEN_NOT_FOUND if token not found", async () => {
            vi.mocked(decodeRefreshToken).mockReturnValue(decoded);
            vi.mocked(refreshTokenService.findRefreshTokenByJti).mockResolvedValue(null);

            await expect(authService.logout(refreshToken)).rejects.toMatchObject({
                statusCode: 401,
                code: "REFRESH_TOKEN_NOT_FOUND",
                message: "Refresh token not found",
            });
        });

        it("should throw if compareToken fails", async () => {
            const error = new Error("Compare error");
            vi.mocked(decodeRefreshToken).mockReturnValue(decoded);
            vi.mocked(refreshTokenService.findRefreshTokenByJti).mockResolvedValue(tokenData);
            vi.mocked(compareToken).mockImplementation(() => {
                throw error;
            });

            await expect(authService.logout(refreshToken)).rejects.toThrow(error);
        });

        it("should throw with INVALID_REFRESH_TOKEN if hash does not match", async () => {
            vi.mocked(decodeRefreshToken).mockReturnValue(decoded);
            vi.mocked(refreshTokenService.findRefreshTokenByJti).mockResolvedValue(tokenData);
            vi.mocked(compareToken).mockReturnValue(false);

            await expect(authService.logout(refreshToken)).rejects.toMatchObject({
                statusCode: 401,
                code: "INVALID_REFRESH_TOKEN",
                message: "Invalid refresh token",
            });
        });

        it("should throw if revokeRefreshTokenById fails", async () => {
            setupLogoutMocks();
            const error = new Error("DB error");
            vi.mocked(refreshTokenService.revokeRefreshTokenById).mockRejectedValue(error);

            await expect(authService.logout(refreshToken)).rejects.toThrow(error);
        });

        it("should log warning and return if token already revoked (idempotent)", async () => {
            setupLogoutMocks();
            vi.mocked(refreshTokenService.revokeRefreshTokenById).mockResolvedValue(false);

            await expect(authService.logout(refreshToken)).resolves.toBeUndefined();

            expect(logger.warn).toHaveBeenCalledWith(
                {
                    userId: tokenData.userId,
                    jti: tokenData.jti,
                    tokenId: tokenData.id,
                },
                "Logout called on already revoked token (idempotent)",
            );
        });

        it("should logout successfully", async () => {
            setupLogoutMocks();

            await expect(authService.logout(refreshToken)).resolves.toBeUndefined();

            expect(decodeRefreshToken).toHaveBeenCalledWith(refreshToken);
            expect(refreshTokenService.findRefreshTokenByJti).toHaveBeenCalledWith(decoded.jti);
            expect(compareToken).toHaveBeenCalledWith(refreshToken, tokenData.tokenHash);
            expect(refreshTokenService.revokeRefreshTokenById).toHaveBeenCalledWith(tokenData.id);
        });
    });

    describe("logoutAll", () => {
        const refreshToken = "valid-refresh-token";

        const decoded = {
            sub: "uuid-123",
            role: "ATTENDANT",
            jti: "jti-123",
            exp: Math.floor(Date.now() / 1000) + 3600,
        };

        const tokenData = {
            id: "token-123",
            userId: "uuid-123",
            jti: "jti-123",
            tokenHash: "hashed-refresh",
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            consumedAt: null,
            revokedAt: null,
        };

        const setupLogoutAllMocks = () => {
            vi.mocked(decodeRefreshToken).mockReturnValue(decoded);
            vi.mocked(refreshTokenService.findRefreshTokenByJti).mockResolvedValue(tokenData);
            vi.mocked(compareToken).mockReturnValue(true);
            vi.mocked(refreshTokenService.revokeAllRefreshTokensByUserId).mockResolvedValue(2);
        };

        it("should throw if decodeRefreshToken fails", async () => {
            const error = new Error("JWT error");
            vi.mocked(decodeRefreshToken).mockImplementation(() => {
                throw error;
            });

            await expect(authService.logoutAll(refreshToken)).rejects.toThrow(error);
        });

        it("should throw if findRefreshTokenByJti fails", async () => {
            const error = new Error("DB error");
            vi.mocked(decodeRefreshToken).mockReturnValue(decoded);
            vi.mocked(refreshTokenService.findRefreshTokenByJti).mockRejectedValue(error);

            await expect(authService.logoutAll(refreshToken)).rejects.toThrow(error);
        });

        it("should throw with REFRESH_TOKEN_NOT_FOUND if token not found", async () => {
            vi.mocked(decodeRefreshToken).mockReturnValue(decoded);
            vi.mocked(refreshTokenService.findRefreshTokenByJti).mockResolvedValue(null);

            await expect(authService.logoutAll(refreshToken)).rejects.toMatchObject({
                statusCode: 401,
                code: "REFRESH_TOKEN_NOT_FOUND",
                message: "Refresh token not found",
            });
        });

        it("should throw if compareToken fails", async () => {
            const error = new Error("Compare error");
            vi.mocked(decodeRefreshToken).mockReturnValue(decoded);
            vi.mocked(refreshTokenService.findRefreshTokenByJti).mockResolvedValue(tokenData);
            vi.mocked(compareToken).mockImplementation(() => {
                throw error;
            });

            await expect(authService.logoutAll(refreshToken)).rejects.toThrow(error);
        });

        it("should throw with INVALID_REFRESH_TOKEN if hash does not match", async () => {
            vi.mocked(decodeRefreshToken).mockReturnValue(decoded);
            vi.mocked(refreshTokenService.findRefreshTokenByJti).mockResolvedValue(tokenData);
            vi.mocked(compareToken).mockReturnValue(false);

            await expect(authService.logoutAll(refreshToken)).rejects.toMatchObject({
                statusCode: 401,
                code: "INVALID_REFRESH_TOKEN",
                message: "Invalid refresh token",
            });
        });

        it("should throw with REFRESH_TOKEN_REUSE_DETECTED if token already revoked", async () => {
            const revokedTokenData = { ...tokenData, revokedAt: new Date() };
            vi.mocked(decodeRefreshToken).mockReturnValue(decoded);
            vi.mocked(refreshTokenService.findRefreshTokenByJti).mockResolvedValue(revokedTokenData);
            vi.mocked(compareToken).mockReturnValue(true);

            await expect(authService.logoutAll(refreshToken)).rejects.toMatchObject({
                statusCode: 401,
                code: "REFRESH_TOKEN_REUSE_DETECTED",
                message: "Refresh token reuse detected",
            });

            expect(logger.warn).toHaveBeenCalledWith(
                {
                    userId: revokedTokenData.userId,
                    jti: revokedTokenData.jti,
                    tokenId: revokedTokenData.id,
                },
                "Refresh token reuse detected: logout called on already revoked token",
            );
        });

        it("should throw if revokeAllRefreshTokensByUserId fails", async () => {
            setupLogoutAllMocks();
            const error = new Error("DB error");
            vi.mocked(refreshTokenService.revokeAllRefreshTokensByUserId).mockRejectedValue(error);

            await expect(authService.logoutAll(refreshToken)).rejects.toThrow(error);
        });

        it("should logout all successfully", async () => {
            setupLogoutAllMocks();

            await expect(authService.logoutAll(refreshToken)).resolves.toBeUndefined();

            expect(decodeRefreshToken).toHaveBeenCalledWith(refreshToken);
            expect(refreshTokenService.findRefreshTokenByJti).toHaveBeenCalledWith(decoded.jti);
            expect(compareToken).toHaveBeenCalledWith(refreshToken, tokenData.tokenHash);
            expect(refreshTokenService.revokeAllRefreshTokensByUserId).toHaveBeenCalledWith(tokenData.userId);
        });
    });
});