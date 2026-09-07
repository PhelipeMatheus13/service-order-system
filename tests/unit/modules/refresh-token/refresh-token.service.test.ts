import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateRefreshTokenInput } from "../../../../src/modules/refresh-token/refresh-token.types.js";
import refreshTokenService from "../../../../src/modules/refresh-token/refresh-token.service.js";

// Mock dependencies
import refreshTokenRepository from "../../../../src/modules/refresh-token/refresh-token.repository.js";

vi.mock("../../../../src/modules/refresh-token/refresh-token.repository.js");

describe("Refresh Token Service (Unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createRefreshToken", () => {
        const input: CreateRefreshTokenInput = {
            userId: "user-123",
            jti: "jti-123",
            tokenHash: "hashed-token",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };

        const mockTokenRecord = {
            id: "token-123",
            userId: input.userId,
            jti: input.jti,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt,
            createdAt: new Date(),
            consumedAt: null,
            revokedAt: null,
        };
        
        it("should propagate errors from the repository", async () => {
            const error = new Error("Database error");
            vi.mocked(refreshTokenRepository.create).mockRejectedValue(error);

            await expect(refreshTokenService.createRefreshToken(input))
                .rejects.toThrow(error);
        });

        it("should call repository.create with the input and return the created token", async () => {
            vi.mocked(refreshTokenRepository.create).mockResolvedValue(mockTokenRecord);

            const result = await refreshTokenService.createRefreshToken(input);

            expect(refreshTokenRepository.create).toHaveBeenCalledWith(input, undefined);
            expect(result).toBe(mockTokenRecord);
        });

        it("should forward the transaction client when provided", async () => {
            const tx = {} as any;
            vi.mocked(refreshTokenRepository.create).mockResolvedValue(mockTokenRecord);

            const result = await refreshTokenService.createRefreshToken(input, tx);

            expect(refreshTokenRepository.create).toHaveBeenCalledWith(input, tx);
            expect(result).toBe(mockTokenRecord);
        });
    });

    describe("revokeRefreshTokenById", () => {
        const tokenId = "token-123";

        it("should propagate errors from the repository", async () => {
            const error = new Error("Database error");
            vi.mocked(refreshTokenRepository.revokeById).mockRejectedValue(error);

            await expect(refreshTokenService.revokeRefreshTokenById(tokenId))
                .rejects.toThrow(error);
        });

        it("should call repository.revokeById with the id and return true when revoked", async () => {
            vi.mocked(refreshTokenRepository.revokeById).mockResolvedValue(true);

            const result = await refreshTokenService.revokeRefreshTokenById(tokenId);

            expect(refreshTokenRepository.revokeById).toHaveBeenCalledWith(tokenId, undefined);
            expect(result).toBe(true);
        });

        it("should return false when the token is already revoked", async () => {
            vi.mocked(refreshTokenRepository.revokeById).mockResolvedValue(false);

            const result = await refreshTokenService.revokeRefreshTokenById(tokenId);

            expect(refreshTokenRepository.revokeById).toHaveBeenCalledWith(tokenId, undefined);
            expect(result).toBe(false);
        });

        it("should forward the transaction client when provided", async () => {
            const tx = {} as any;
            vi.mocked(refreshTokenRepository.revokeById).mockResolvedValue(true);

            const result = await refreshTokenService.revokeRefreshTokenById(tokenId, tx);

            expect(refreshTokenRepository.revokeById).toHaveBeenCalledWith(tokenId, tx);
            expect(result).toBe(true);
        });
    });

    describe("revokeAllRefreshTokensByUserId", () => {
        const userId = "user-123";

        it("should propagate errors from the repository", async () => {
            const error = new Error("Database error");
            vi.mocked(refreshTokenRepository.revokeAllByUserId).mockRejectedValue(error);

            await expect(refreshTokenService.revokeAllRefreshTokensByUserId(userId))
                .rejects.toThrow(error);
        });

        it("should call repository.revokeAllByUserId with the userId and return the count", async () => {
            vi.mocked(refreshTokenRepository.revokeAllByUserId).mockResolvedValue(3);

            const result = await refreshTokenService.revokeAllRefreshTokensByUserId(userId);

            expect(refreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith(userId);
            expect(result).toBe(3);
        });
    });

    describe("findRefreshTokenByJti", () => {
        const jti = "jti-123";

        const mockTokenRecord = {
            id: "token-123",
            userId: "user-123",
            jti: jti,
            tokenHash: "hashed-token",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            createdAt: new Date(),
            consumedAt: null,
            revokedAt: null,
        };

        it("should propagate errors from the repository", async () => {
            const error = new Error("Database error");
            vi.mocked(refreshTokenRepository.findByJti).mockRejectedValue(error);

            await expect(refreshTokenService.findRefreshTokenByJti(jti))
                .rejects.toThrow(error);
        });

        it("should return null when the token does not exist", async () => {
            vi.mocked(refreshTokenRepository.findByJti).mockResolvedValue(null);

            const result = await refreshTokenService.findRefreshTokenByJti(jti);

            expect(refreshTokenRepository.findByJti).toHaveBeenCalledWith(jti);
            expect(result).toBeNull();
        });

        it("should call repository.findByJti with the jti and return the token when found", async () => {
            vi.mocked(refreshTokenRepository.findByJti).mockResolvedValue(mockTokenRecord);

            const result = await refreshTokenService.findRefreshTokenByJti(jti);

            expect(refreshTokenRepository.findByJti).toHaveBeenCalledWith(jti);
            expect(result).toBe(mockTokenRecord);
        });
    });
});