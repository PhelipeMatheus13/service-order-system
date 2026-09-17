// (Node built‑ins)
import { beforeEach, describe, expect, it, vi } from "vitest";

// (shared)
import {
    isUniqueConstraintOn,
    isNotFoundError,
} from "../../../../src/shared/utils/prisma-error.js";

// Mock Prisma to control the error class
vi.mock("../../../../src/generated/prisma/client.js", () => ({
    Prisma: {
        PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
            code: string;
            meta?: unknown;

            constructor(message: string, { code, meta }: { code: string; meta?: unknown }) {
                super(message);
                this.code = code;
                this.meta = meta;
            }
        },
    },
}));

import { Prisma } from "../../../../src/generated/prisma/client.js";

const makePrismaError = (
    code: string,
    meta?: Record<string, unknown>,
): Error =>
    new Prisma.PrismaClientKnownRequestError("Prisma error", {
        code,
        meta,
        clientVersion: "7.9.1",
    });

describe("Prisma Error Utils (Unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("isUniqueConstraintOn", () => {
        it("should return false when error is not a PrismaClientKnownRequestError", () => {
            const result = isUniqueConstraintOn(new Error("generic error"), "email");
            expect(result).toBe(false);
        });

        it("should return false when error code is not P2002", () => {
            const error = makePrismaError("P2025");
            const result = isUniqueConstraintOn(error, "email");
            expect(result).toBe(false);
        });

        it("should return true when the field is present in driver adapter constraint fields", () => {
            const error = makePrismaError("P2002", {
                driverAdapterError: {
                    cause: {
                        constraint: {
                            fields: ["email"],
                        },
                    },
                },
            });

            const result = isUniqueConstraintOn(error, "email");
            expect(result).toBe(true);
        });

        it("should return false when the field is not present in driver adapter constraint fields", () => {
            const error = makePrismaError("P2002", {
                driverAdapterError: {
                    cause: {
                        constraint: {
                            fields: ["phoneNumber"],
                        },
                    },
                },
            });

            const result = isUniqueConstraintOn(error, "email");
            expect(result).toBe(false);
        });

        it("should return false when meta is missing", () => {
            const error = makePrismaError("P2002");
            const result = isUniqueConstraintOn(error, "email");
            expect(result).toBe(false);
        });

        it("should return false when driverAdapterError shape is incomplete", () => {
            const error = makePrismaError("P2002", {
                driverAdapterError: {},
            });

            const result = isUniqueConstraintOn(error, "email");
            expect(result).toBe(false);
        });
    });

    describe("isNotFoundError", () => {
        it("should return false when error is not a PrismaClientKnownRequestError", () => {
            const result = isNotFoundError(new Error("generic error"));
            expect(result).toBe(false);
        });

        it("should return true when error code is P2025", () => {
            const error = makePrismaError("P2025");
            const result = isNotFoundError(error);
            expect(result).toBe(true);
        });

        it("should return false when error code is not P2025", () => {
            const error = makePrismaError("P2002");
            const result = isNotFoundError(error);
            expect(result).toBe(false);
        });
    });
});