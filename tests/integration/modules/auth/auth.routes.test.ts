// (Node built‑ins)
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
// (shared / infra)
import app from "../../../../src/app";
import { PrismaClient } from "../../../../src/generated/prisma/client.js";
import { setupTestDatabase } from "../../../helpers/testDatabase.js";
import { setPrismaInstance } from "../../../../src/shared/config/database";
import { hashPassword } from "../../../../src/shared/services/hash.js";
import { hashToken } from "../../../../src/shared/services/token-hash.js";
import { generateRefreshToken } from "../../../../src/shared/services/jwt.js";

describe("Auth Routes (Integration)", () => {
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

    describe("POST /auth/login", () => {
        const password = "Str0ng!P4ss";

        beforeEach(async () => {
            const hashedPassword = await hashPassword(password);
            await prisma.user.create({
                data: {
                    firstName: "John",
                    lastName: "Doe",
                    email: "john@example.com",
                    passwordHash: hashedPassword,
                    role: "ATTENDANT",
                    active: true,
                },
            });
        });

        it("should login successfully and return tokens", async () => {
            const res = await request(app)
                .post("/auth/login")
                .send({
                    email: "john@example.com",
                    password,
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty("accessToken");
            expect(res.body.data).toHaveProperty("refreshToken");
        });
    });

    describe("POST /auth/refresh", () => {
        let refreshToken: string;

        beforeEach(async () => {
            const password = "Str0ng!P4ss";
            const hashedPassword = await hashPassword(password);

            const user = await prisma.user.create({
                data: {
                    firstName: "John",
                    lastName: "Doe",
                    email: "john@example.com",
                    passwordHash: hashedPassword,
                    role: "ATTENDANT",
                    active: true,
                },
            });

            const jti = randomUUID();
            const { refreshToken: token, refreshTokenPayload } = generateRefreshToken(user.id, user.role, jti);
            refreshToken = token;

            await prisma.refreshToken.create({
                data: {
                    userId: user.id,
                    jti: refreshTokenPayload.jti,
                    tokenHash: hashToken(refreshToken),
                    expiresAt: new Date(refreshTokenPayload.exp * 1000),
                },
            });
        });

        it("should refresh tokens successfully", async () => {
            const res = await request(app)
                .post("/auth/refresh")
                .send({ refreshToken });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty("accessToken");
            expect(res.body.data).toHaveProperty("refreshToken");
            expect(res.body.data.refreshToken).not.toBe(refreshToken);
        });
    });

    describe("POST /auth/logout", () => {
        let refreshToken: string;

        beforeEach(async () => {
            const password = "Str0ng!P4ss";
            const hashedPassword = await hashPassword(password);

            const user = await prisma.user.create({
                data: {
                    firstName: "John",
                    lastName: "Doe",
                    email: "john@example.com",
                    passwordHash: hashedPassword,
                    role: "ATTENDANT",
                    active: true,
                },
            });

            const jti = randomUUID();
            const { refreshToken: token, refreshTokenPayload } = generateRefreshToken(user.id, user.role, jti);
            refreshToken = token;

            await prisma.refreshToken.create({
                data: {
                    userId: user.id,
                    jti: refreshTokenPayload.jti,
                    tokenHash: hashToken(refreshToken),
                    expiresAt: new Date(refreshTokenPayload.exp * 1000),
                },
            });
        });

        it("should logout successfully", async () => {
            const res = await request(app)
                .post("/auth/logout")
                .send({ refreshToken });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Logged out successfully");
        });
    });

    describe("POST /auth/logout-all", () => {
        let refreshToken: string;

        beforeEach(async () => {
            const password = "Str0ng!P4ss";
            const hashedPassword = await hashPassword(password);

            const user = await prisma.user.create({
                data: {
                    firstName: "John",
                    lastName: "Doe",
                    email: "john@example.com",
                    passwordHash: hashedPassword,
                    role: "ATTENDANT",
                    active: true,
                },
            });

            const jti = randomUUID();
            const { refreshToken: token, refreshTokenPayload } = generateRefreshToken(user.id, user.role, jti);
            refreshToken = token;

            await prisma.refreshToken.create({
                data: {
                    userId: user.id,
                    jti: refreshTokenPayload.jti,
                    tokenHash: hashToken(refreshToken),
                    expiresAt: new Date(refreshTokenPayload.exp * 1000),
                },
            });
        });

        it("should logout from all devices successfully", async () => {
            const res = await request(app)
                .post("/auth/logout-all")
                .send({ refreshToken });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Logged out from all devices");
        });
    });
});