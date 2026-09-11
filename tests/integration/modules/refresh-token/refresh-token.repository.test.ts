// (Node built-ins)
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
const { randomUUID } = require("crypto");
// (Types)
import { CreateRefreshTokenInput } from "../../../../src/modules/refresh-token/refresh-token.types.js";
// (shared/ infra)
import { PrismaClient } from "../../../../src/generated/prisma/client.js";
import { setPrismaInstance } from "../../../../src/shared/config/database.js";
import { setupTestDatabase } from "../../../helpers/testDatabase.js";
// (local modules)
import refreshTokenRepository from "../../../../src/modules/refresh-token/refresh-token.repository.js";

describe("User Repository (Integration)", () => {
    let db: Awaited<ReturnType<typeof setupTestDatabase>>;
    let prisma: PrismaClient;

    beforeAll(async () => {
        db = await setupTestDatabase();
        prisma = db.prismaClient;
        setPrismaInstance(prisma);
    });

    afterAll(async () => {
        await db.stop();
    });

    beforeEach(async () => {
        await prisma.refreshToken.deleteMany();
        await prisma.user.deleteMany();
    });

    describe("Writer repository", () => {
        describe("create", () => {
            let tokenData: CreateRefreshTokenInput;

            beforeEach(async () => {
                const userCreated = await prisma.user.create({
                    data: {
                        firstName: "Jhon",
                        lastName: "Doe",
                        email: "jhon@example.com",
                        role: "TECHNICIAN",
                        passwordHash: "passwordHash",
                        active: true,
                    },
                });

                tokenData = {
                    userId: userCreated.id,
                    jti: randomUUID(),
                    tokenHash: "refreshTokenHash",
                    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                };
            });

            it("should insert a new refresh token into the database", async () => {
                const tokenCreated = await refreshTokenRepository.create(tokenData);

                const tokenFinded = await prisma.refreshToken.findUnique({
                    where: { id: tokenCreated.id },
                });

                expect(tokenFinded).not.toBeNull();
                expect(tokenFinded?.userId).toBe(tokenData.userId);
                expect(tokenFinded?.jti).toBe(tokenData.jti);
                expect(tokenFinded?.tokenHash).toBe(tokenData.tokenHash);
                expect(tokenFinded?.expiresAt.getTime()).toBeTruthy();
                expect(tokenFinded?.createdAt).toBeTruthy();
                expect(tokenFinded?.revokedAt).toBeNull();
            });

            it("should use the transaction client when provided", async () => {
                let tokenCreatedId: string | undefined;

                await expect(
                    prisma.$transaction(async (tx) => {
                        const tokenCreated = await refreshTokenRepository.create(tokenData, tx);

                        tokenCreatedId = tokenCreated.id;

                        throw new Error("rollback");
                    })
                ).rejects.toThrow("rollback");

                if (tokenCreatedId === undefined) {
                    throw new Error("tokenCreatedId should have been defined");
                }

                const tokenFinded = await prisma.refreshToken.findUnique({
                    where: { id: tokenCreatedId },
                });

                expect(tokenFinded).toBeNull();
            });
        });

        describe("revokeById", () => {
            let tokenCreatedId: string;

            beforeEach(async () => {
                const userCreated = await prisma.user.create({
                    data: {
                        firstName: "Jhon",
                        lastName: "Doe",
                        email: "jhon@example.com",
                        role: "TECHNICIAN",
                        passwordHash: "passwordHash",
                        active: true,
                    },
                    select: { id: true },
                });

                const tokenCreated = await prisma.refreshToken.create({
                    data: {
                        userId: userCreated.id,
                        jti: randomUUID(),
                        tokenHash: "refreshTokenHash",
                        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                    },
                });

                tokenCreatedId = tokenCreated.id
            });

            it("should revoke a non-revoked token and return true", async () => {
                const revoked = await refreshTokenRepository.revokeById(tokenCreatedId);

                expect(revoked).toBe(true);

                const tokenFinded = await prisma.refreshToken.findUnique({
                    where: { id: tokenCreatedId },
                });

                expect(tokenFinded?.revokedAt).toBeTruthy();
            });

            it("should return false when the token is already revoked", async () => {
                await refreshTokenRepository.revokeById(tokenCreatedId);

                const revoked = await refreshTokenRepository.revokeById(tokenCreatedId);

                expect(revoked).toBe(false);

                const tokenFinded = await prisma.refreshToken.findUnique({
                    where: { id: tokenCreatedId },
                });

                expect(tokenFinded?.revokedAt).toBeTruthy();
            });

            it("should use the transaction client when provided", async () => {
                await expect(
                    prisma.$transaction(async (tx) => {
                        const revoked = await refreshTokenRepository.revokeById(tokenCreatedId, tx);
                        expect(revoked).toBe(true);

                        throw new Error("rollback");
                    })
                ).rejects.toThrow("rollback");

                const tokenFinded = await prisma.refreshToken.findUnique({
                    where: { id: tokenCreatedId },
                });

                expect(tokenFinded?.revokedAt).toBeNull();
            });
        });

        describe("revokeAllByUserId", () => {
            let userId: string;

            beforeEach(async () => {
                const user = await prisma.user.create({
                    data: {
                        firstName: "Jhon",
                        lastName: "Doe",
                        email: "jhon@example.com",
                        role: "TECHNICIAN",
                        passwordHash: "passwordHash",
                        active: true,
                    },
                    select: { id: true },
                });

                userId = user.id;
            });

            it("should revoke all non-revoked tokens for the user and return the count", async () => {
                await prisma.refreshToken.createMany({
                    data: [
                        {
                            userId,
                            jti: randomUUID(),
                            tokenHash: "hash1",
                            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                        },
                        {
                            userId,
                            jti: randomUUID(),
                            tokenHash: "hash2",
                            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                        },
                        {
                            userId,
                            jti: randomUUID(),
                            tokenHash: "hash3",
                            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                        },
                    ],
                });

                const count = await refreshTokenRepository.revokeAllByUserId(userId);

                expect(count).toBe(3);

                const activeTokens = await prisma.refreshToken.count({
                    where: { userId, revokedAt: null },
                });
                expect(activeTokens).toBe(0);
            });

            it("should ignore already revoked tokens and return only the count of newly revoked ones", async () => {
                // create one active token and one revoked token for the user
                await prisma.refreshToken.createMany({
                    data: [
                        {
                            userId,
                            jti: randomUUID(),
                            tokenHash: "hash1",
                            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                        },
                        {
                            userId,
                            jti: randomUUID(),
                            tokenHash: "revoked-hash",
                            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                            revokedAt: new Date(),
                        },
                    ]
                });

                const count = await refreshTokenRepository.revokeAllByUserId(userId);

                // should only count the active token, not the already revoked one
                expect(count).toBe(1);

                const activeTokens = await prisma.refreshToken.count({
                    where: { userId, revokedAt: null },
                });
                expect(activeTokens).toBe(0);
            });

            it("should return 0 if the user has no tokens at all", async () => {
                const count = await refreshTokenRepository.revokeAllByUserId(userId);
                expect(count).toBe(0);
            });
        });
    });

    describe("Reader repository", () => {
        describe("findByJti", () => {
            it("should return the refresh token if a token with the given jti exists", async () => {
                const userCreated = await prisma.user.create({
                    data: {
                        firstName: "Jhon",
                        lastName: "Doe",
                        phoneNumber: "5521995437105",
                        email: "jhon@example.com",
                        passwordHash: "passwordHash",
                        role: "ATTENDANT",
                        active: true,
                        updatedAt: new Date,
                    }
                });

                const tokenCreated = await prisma.refreshToken.create({
                    data: {
                        userId: userCreated.id,
                        jti: randomUUID(),
                        tokenHash: "refreshTokenHash",
                        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                    },
                });


                 
                const tokenFinded = await refreshTokenRepository.findByJti(tokenCreated.jti);

                expect(tokenFinded?.id).toBeTruthy();
                expect(tokenFinded?.userId).toBe(tokenCreated.userId);
                expect(tokenFinded?.jti).toBe(tokenCreated.jti);
                expect(tokenFinded?.tokenHash).toBe(tokenCreated.tokenHash);
                expect(tokenFinded?.expiresAt.getTime()).toBeTruthy();
                expect(tokenFinded?.createdAt).toBeTruthy();
                expect(tokenFinded?.revokedAt).toBeNull();
            });

            it("should return null if a user with the given email does not exist", async () => {
                const tokenFinded = await refreshTokenRepository.findByJti("non-existent-jti");
                expect(tokenFinded).toBeNull();
            });
        });
    });
});
