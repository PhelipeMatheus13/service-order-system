import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import app from "../../../../src/app";
import { PrismaClient } from "../../../../src/generated/prisma/client.js";
import { setupTestDatabase } from "../../../helpers/testDatabase.js";
import { setPrismaInstance } from "../../../../src/shared/config/database";
import { generateActivationToken } from "../../../../src/shared/services/jwt.js";
import { resendConfirmationCode } from "../../../../src/modules/user/user.emails.js";

vi.mock("../../../../src/modules/user/user.emails.js", () => ({
    resendConfirmationCode: vi.fn().mockResolvedValue(undefined),
}));

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

    describe("POST /users/confirm-email", () => {
        it("should confirm user email successfully", async () => {
            const user = await prisma.user.create({
                data: {
                    firstName: "Jhon",
                    lastName: "Doe",
                    email: "jhon@example.com",
                    role: "ATTENDANT",
                    active: false,
                },
            });

            await prisma.userResourceValidation.create({
                data: {
                    userId: user.id,
                    challengerNumber: "123456",
                    resourceType: "EMAIL",
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // expires in 10 minutes
                },
            });

            const res = await request(app)
                .post("/users/confirm-email")
                .send({
                    email: "jhon@example.com",
                    challengerNumber: "123456",
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Email confirmed successfully");
            expect(res.body.data.activationToken).toBeTruthy();
        });
    });

    describe("GET /users", () => {
        it("should return users ordered by creation date descending and respect the given limit", async () => {
            const now = new Date;

            await prisma.user.create({
                data: {
                    firstName: "John",
                    lastName: "Doe",
                    phoneNumber: "5521995437105",
                    email: "john@example.com",
                    passwordHash: "passwordHash",
                    role: "ATTENDANT",
                    active: true,
                    createdAt: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
                },
            });

            const userCreated = await prisma.user.create({
                data: {
                    firstName: "Jane",
                    lastName: "Doe",
                    phoneNumber: "5521995437106",
                    email: "jane@example.com",
                    passwordHash: "passwordHash",
                    role: "TECHNICIAN",
                    active: true,
                    createdAt: now,
                },
            });

            const res = await request(app)
                .get("/users")
                .query({ limit: 1 });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].id).toBe(userCreated.id);
            expect(res.body.data[0].firstName).toBe(userCreated.firstName);
            expect(res.body.data[0].lastName).toBe(userCreated.lastName);
            expect(res.body.data[0].phoneNumber).toBe(userCreated.phoneNumber);
            expect(res.body.data[0].email).toBe(userCreated.email);
            expect(res.body.data[0].role).toBe(userCreated.role);
            expect(res.body.data[0].active).toBe(userCreated.active);
            expect(res.body.data[0].createdAt).toBeTruthy();
            expect(res.body.data[0].updatedAt).toBeNull();
            expect(res.body.data[0].passwordHash).toBeUndefined();
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

    describe("POST /users/activate", () => {
        it("should activate the user successfully", async () => {
            const user = await prisma.user.create({
                data: {
                    firstName: "Jhon",
                    lastName: "Doe",
                    email: "jhon@example.com",
                    role: "ATTENDANT",
                    active: false,
                },
            });

            const resourceValidation = await prisma.userResourceValidation.create({
                data: {
                    userId: user.id,
                    challengerNumber: "123456",
                    resourceType: "EMAIL",
                    confirmedAt: new Date(),
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // expires in 10 minutes
                },
            });

            const activationToken = generateActivationToken(user.id, resourceValidation.id);

            const res = await request(app)
                .post("/users/activate")
                .set("Authorization", `Bearer ${activationToken}`)
                .send({
                    password: "Str0ng!P4ss",
                    confirmPassword: "Str0ng!P4ss",
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("User activated successfully");

            const activatedUser = await prisma.user.findUnique({
                where: {
                    id: user.id,
                },
            });

            expect(activatedUser?.active).toBe(true);
            expect(activatedUser?.passwordHash).toBeTruthy();
            expect(activatedUser?.updatedAt).toBeTruthy();
        });
    });

    describe("POST /users/resend-email-confirmation", () => {
        it("should resend the confirmation email successfully", async () => {
            const user = await prisma.user.create({
                data: {
                    firstName: "Jhon",
                    lastName: "Doe",
                    email: "johndoe@hotmail.com",
                    role: "ATTENDANT",
                },
            });

            const response = await request(app)
                .post("/users/resend-email-confirmation")
                .send({
                    email: user.email,
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                message: "If the account is eligible, a new verification code has been sent",
            });

            expect(resendConfirmationCode).toHaveBeenCalledWith({
                to: user.email,
                name: `${user.firstName} ${user.lastName}`,
                code: expect.stringMatching(/^\d{6}$/),
            });
        });
    });
});
