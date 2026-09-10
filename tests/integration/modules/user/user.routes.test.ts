import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import app from "../../../../src/app";
import { setupTestDatabase } from "../../../helpers/testDatabase.js";
import { PrismaClient } from "../../../../src/generated/prisma/client.js";
import { setPrismaInstance } from "../../../../src/shared/config/database";
import { generateAccessToken, generateActivationToken } from "../../../../src/shared/services/jwt.js";
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
            // Simulate an admin user making the request by generating an access token
            const accessToken =  generateAccessToken("fake-user-id", "ADMIN");

            const res = await request(app)
                .post("/users/register")
                .set("Authorization", `Bearer ${accessToken}`)
                .send(validUser);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toEqual("User created successfully");

            const user = await prisma.user.findUnique({ where: { email: validUser.email } });

            expect(user).toBeTruthy();
            expect(user?.id).toBeDefined();
        });

        it("should return 422 if validation fails (e.g., short password)", async () => {
            const accessToken =  generateAccessToken("fake-user-id", "ADMIN");
            const invalidUser = { ...validUser, email: "john@example" };

            const res = await request(app)
                .post("/users/register")
                .set("Authorization", `Bearer ${accessToken}`)
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
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

            // Single insert operation that returns both users
            const users = await prisma.user.createManyAndReturn({
                data: [
                    {
                        firstName: "John",
                        lastName: "Doe",
                        phoneNumber: "5521995437105",
                        email: "john@example.com",
                        passwordHash: "passwordHash",
                        role: "ATTENDANT",
                        active: true,
                        createdAt: oneHourAgo,
                    },
                    {
                        firstName: "Jane",
                        lastName: "Doe",
                        phoneNumber: "5521995437106",
                        email: "jane@example.com",
                        passwordHash: "passwordHash",
                        role: "TECHNICIAN",
                        active: true,
                        createdAt: now,
                    },
                ],
            });

            const newerUser = users.find(u => u.email === "jane@example.com")!;

            const accessToken = generateAccessToken("fake-user-id", "ADMIN");

            const res = await request(app)
                .get("/users")
                .set("Authorization", `Bearer ${accessToken}`)
                .query({ limit: 1 });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].id).toBe(newerUser.id);
            expect(res.body.data[0].firstName).toBe(newerUser.firstName);
            expect(res.body.data[0].lastName).toBe(newerUser.lastName);
            expect(res.body.data[0].phoneNumber).toBe(newerUser.phoneNumber);
            expect(res.body.data[0].email).toBe(newerUser.email);
            expect(res.body.data[0].role).toBe(newerUser.role);
            expect(res.body.data[0].active).toBe(newerUser.active);
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
            // same userId as created in beforeEach(a user can search for their own data)
            const accessToken = generateAccessToken(userId, "ATTENDANT");

            const res = await request(app)
                .get(`/users/${userId}`)
                .set("Authorization", `Bearer ${accessToken}`);

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
            const accessToken = generateAccessToken("fake-user-id", "ADMIN");
            const res = await request(app)
                .delete(`/users/${userId}`)
                .set("Authorization", `Bearer ${accessToken}`);


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

            await prisma.userResourceValidation.create({
                data: {
                    userId: user.id,
                    challengerNumber: "123456",
                    resourceType: "EMAIL",
                    confirmedAt: new Date(),
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // expires in 10 minutes
                },
            });

            const { activationToken, activationTokenPayload } = generateActivationToken(user.id, randomUUID());

            await prisma.userActivationToken.create({
                data: {
                    userId: user.id,
                    jti: activationTokenPayload.jti,
                    tokenHash: activationToken, // In a real scenario, this should be hashed
                    expiresAt: new Date(activationTokenPayload.exp * 1000),
                    consumedAt: null,
                },
            });

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
