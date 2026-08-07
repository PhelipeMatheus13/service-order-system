import { vi, describe, beforeEach, it, expect } from "vitest";
import bcrypt from "bcrypt";

import { hashPassword, comparePassword } from "../../../../src/shared/services/hash.js";
import logger from "../../../../src/shared/config/logger.js";


vi.mock("bcrypt", () => ({
    default: {
        genSalt: vi.fn(),
        hash: vi.fn(),
        compare: vi.fn(),
    },
}));

vi.mock("../../../../src/shared/config/logger.js", () => ({
    default: {
        error: vi.fn(),
    },
}));

// bcrypt exposes callback and Promise overloads. vi.mocked() can't infer the
// intended one, so narrow each function to the Promise-based signature used here.
const genSalt = vi.mocked(bcrypt.genSalt as unknown as (rounds: number) => Promise<string>);
const hash = vi.mocked(bcrypt.hash as unknown as (data: string, salt: string) => Promise<string>);
const compare = vi.mocked(bcrypt.compare as unknown as (data: string, encrypted: string) => Promise<boolean>);

describe("Hash Service (Unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("hashPassword", () => {
        it("should hash", async () => {
            genSalt.mockResolvedValue("salt");
            hash.mockResolvedValue("hashed");

            const result = await hashPassword("password");

            expect(genSalt).toHaveBeenCalledWith(12);
            expect(hash).toHaveBeenCalledWith("password", "salt");
            expect(result).toBe("hashed");
        });

        it("should throw internal error if bcrypt hashing fails", async () => {
            const bcryptError = new Error("bcrypt error");
            genSalt.mockRejectedValue(bcryptError);

            await expect(hashPassword("plain")).rejects.toMatchObject({
                statusCode: 500,
                code: "INTERNAL_ERROR",
                message: "Internal server error",
            });

            expect(logger.error).toHaveBeenCalledWith({ err: bcryptError }, "Unexpected error while hashing password");
        });        
    });

    describe("comparePassword", () => {
        it("should throw internal error if bcrypt compare fails", async () => {
            const bcryptError = new Error("bcrypt error");
            compare.mockRejectedValue(bcryptError);

            await expect(comparePassword("password", "hash")).rejects.toMatchObject({
                statusCode: 500,
                code: "INTERNAL_ERROR",
                message: "Internal server error",
            });

            expect(logger.error).toHaveBeenCalledWith({ err: bcryptError }, "Unexpected error while compare password");
        });
        it("should return false if passwords do not match", async () => {
            compare.mockResolvedValue(false);

            const result = await comparePassword("password", "hash");

            expect(compare).toHaveBeenCalledWith("password", "hash");
            expect(result).toBe(false);
        });

        it("should return true if passwords match", async () => {
            compare.mockResolvedValue(true);

            const result = await comparePassword("password", "hash");

            expect(compare).toHaveBeenCalledWith("password", "hash");
            expect(result).toBe(true);
        });
    });
});