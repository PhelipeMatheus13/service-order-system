import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

import { hashToken, compareToken } from "../../../../src/shared/services/token-hash.js";
import logger from "../../../../src/shared/config/logger.js";
import { internal } from "../../../../src/shared/errors/errors.js";

vi.mock("../../../../src/shared/config/logger.js", () => ({
    default: {
        error: vi.fn(),
    },
}));

vi.mock("../../../../src/shared/errors/errors.js", () => ({
    internal: vi.fn(() => new Error("Internal server error")),
}));

describe("Token Hash Service (Unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("hashToken", () => {
        it("should return a SHA-256 hex hash of the token", () => {
            const token = "test-token";
            const hash = hashToken(token);
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
            expect(hash).toBe(crypto.createHash("sha256").update(token).digest("hex"));
        });

        it("should return the same hash for the same token", () => {
            const token = "test-token";
            expect(hashToken(token)).toBe(hashToken(token));
        });

        it("should return different hash for different tokens", () => {
            expect(hashToken("token1")).not.toBe(hashToken("token2"));
        });

        it("should handle empty string token", () => {
            const hash = hashToken("");
            expect(hash).toBe(crypto.createHash("sha256").update("").digest("hex"));
        });
    });

    describe("compareToken", () => {
        it("should return true when token matches hash", () => {
            const token = "test-token";
            const hash = hashToken(token);
            expect(compareToken(token, hash)).toBe(true);
        });

        it("should return false when token does not match hash", () => {
            const token = "test-token";
            const hash = hashToken("other-token");
            expect(compareToken(token, hash)).toBe(false);
        });

        it("should log error and throw internal error when buffer lengths differ", () => {
            const token = "test-token";
            const invalidHash = "invalid"; // shorter than 64 chars

            expect(() => compareToken(token, invalidHash)).toThrow("Internal server error");
            expect(logger.error).toHaveBeenCalledWith(
                { err: expect.any(Error) },
                "Unexpected error while comparing token"
            );
            expect(internal).toHaveBeenCalled();
        });
    });
});