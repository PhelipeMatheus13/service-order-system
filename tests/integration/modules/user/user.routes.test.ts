import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../../../../src/app";
import { PrismaClient } from "../../../../src/generated/prisma/client.js";
import { setupTestDatabase } from "../../../helpers/testDatabase.js";
import { setPrismaInstance } from "../../../../src/shared/config/database";

describe("User Routes (Integration)", () => {
    let db: Awaited<ReturnType<typeof setupTestDatabase>>;
    let prisma: PrismaClient;
    let userId: string;

    beforeAll(async () => {
        db = await setupTestDatabase();
        prisma = db.prismaClient;
        setPrismaInstance(prisma);
    });

    afterAll(async () => {
        await db.stop();
    });

    beforeEach(async () => {
        await prisma.user.deleteMany();
    });

    describe("POST /users/register", () => {
        const validUser = {
            firstName: "John",
            lastName: "Doe",
            phoneNumber: "+55 (21) 98765-4321",
            email: "john@example.com",
            role: "ATTENDANT",
        };

        it("should register a new user successfully", async () => {
            const res = await request(app)
                .post("/users/register")
                .send(validUser);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toEqual("User created successfully");

            const user = await prisma.user.findUnique({ where: { email: validUser.email } });

            expect(user).toBeTruthy();
            expect(user?.id).toBeDefined();
        });

        it("should return 422 if validation fails (e.g., short password)", async () => {
            const invalidUser = { ...validUser, email: "john@example" };
            const res = await request(app)
                .post("/users/register")
                .send(invalidUser);

            expect(res.statusCode).toBe(422);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toMatchObject({
                code: "VALIDATION_ERROR",
                message: "Validation failed"
            });
        });
    });

    describe("GET /users/:id", () => {
        beforeEach(async () => {
            ({ id: userId } = await prisma.user.create({
                data: {
                    firstName: "Jhon",
                    lastName: "Doe",
                    phoneNumber: "5521995437105",
                    email: "jhon@example.com",
                    passwordHash: "passwordHash",
                    role: "ATTENDANT",
                    active: true,
                    updatedAt: new Date,
                },
                select: { id: true },
            }));
        });

        it("should return user data", async () => {
            const res = await request(app)
                .get(`/users/${userId}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toMatchObject({
                id: userId,
                firstName: "Jhon",
                lastName: "Doe",
                phoneNumber: "5521995437105",
                email: "jhon@example.com",
                role: "ATTENDANT",
                active: true,
            });
            expect(res.body.data.createdAt).toBeTruthy();
            expect(res.body.data.updatedAt).toBeTruthy();
            expect(res.body.data.password).toBeUndefined(); // password should not be returned
        });
    });

    describe("DELETE /users/:id", () => {
        beforeEach(async () => {
            ({ id: userId } = await prisma.user.create({
                data: {
                    firstName: "Jhon",
                    lastName: "Doe",                    
                    email: "test@example.com",
                    role: "ATTENDANT",
                },
                select: { id: true },
            }));
        });

        it("should delete user", async () => {
            const res = await request(app)
                .delete(`/users/${userId}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("User deleted successfully");
        });
    });
});
