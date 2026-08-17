import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PrismaClient } from "../../../../src/generated/prisma/client.js";
import { setupTestDatabase } from "../../../helpers/testDatabase.js";
import { setPrismaInstance } from "../../../../src/shared/config/database";
import userRepository from "../../../../src/modules/user/user.repository.js";
import { UserRecord } from "../../../../src/modules/user/user.types.js";


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
        await prisma.user.deleteMany();
    });

    describe("Writer repository", () => {
        describe("create", () => {
            it("should insert a new user into the database", async () => {
                const userData = {
                    firstName: "Jhon",
                    lastName: "Doe",
                    phoneNumber: "5521995437105",
                    email: "jhon@example.com",
                    role: "ATTENDANT",
                } as UserRecord;

                const userCreated = await userRepository.create(userData);

                expect(userCreated).toBeDefined();
                expect(typeof userCreated.id).toBe("string");

                const user = await prisma.user.findUnique({ where: { id: userCreated.id } });

                expect(user?.id).toBeTruthy();
                expect(user?.firstName).toBe(userCreated.firstName);
                expect(user?.lastName).toBe(userCreated.lastName);
                expect(user?.phoneNumber).toBe(userCreated.phoneNumber);
                expect(user?.email).toBe(userCreated.email);
                expect(user?.passwordHash).toBeNull(); // user must be created without a password.
                expect(user?.role).toBe(userCreated.role);
                expect(user?.active).toBe(false);
                expect(user?.createdAt).toBeTruthy();
                expect(user?.updatedAt).toBeNull();
            });
        });

        describe("deleteById", () => {
            it("should delete a user from the database by ID", async () => {
                const userData = {
                    firstName: "Jhon",
                    lastName: "Doe",
                    email: "jhon@example.com",
                    role: "ATTENDANT",
                } as UserRecord;

                const { id: userId } = await prisma.user.create({
                    data: userData,
                    select: { id: true }
                });

                const deleted = await userRepository.deleteById(userId);
                expect(deleted).toBe(true);

                const user = await prisma.user.findUnique({ where: { id: userId } });
                expect(user).toBeNull();
            });

            it("should return 0 if no user was deleted", async () => {
                const deleted = await userRepository.deleteById("0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa"); // Non-existent ID
                expect(deleted).toBe(false);
            });
        });
    });

    describe("Reader repository", () => {
        describe("existsByEmail", () => {
            it("should return true if a user with the given email exists", async () => {
                const userData = {
                    firstName: "Jhon",
                    lastName: "Doe",
                    email: "jhon@example.com",
                    role: "ATTENDANT",
                } as UserRecord;

                await prisma.user.create({ data: userData });

                const exists = await userRepository.existsByEmail("jhon@example.com");
                expect(exists).toBe(true);
            });

            it("should return false if a user with the given email does not exist", async () => {
                const exists = await userRepository.existsByEmail("nonexistent@example.com");
                expect(exists).toBe(false);
            });
        });

        describe("findById", () => {
            it("should return the user if a user with the given ID exists", async () => {
                const userData = {
                    firstName: "Jhon",
                    lastName: "Doe",
                    phoneNumber: "5521995437105",
                    email: "jhon@example.com",
                    passwordHash: "passwordHash",
                    role: "ATTENDANT",
                    active: true,
                    updatedAt: new Date,
                } as UserRecord;

                const  userCreated = await prisma.user.create({data: userData});

                const user = await userRepository.findById(userCreated.id);

                expect(user?.id).toBeTruthy();
                expect(user?.firstName).toBe(userCreated.firstName);
                expect(user?.lastName).toBe(userCreated.lastName);
                expect(user?.phoneNumber).toBe(userCreated.phoneNumber);
                expect(user?.email).toBe(userCreated.email);
                expect(user?.passwordHash).toBe(userCreated.passwordHash);
                expect(user?.role).toBe(userCreated.role);
                expect(user?.createdAt).toBeTruthy();
                expect(user?.updatedAt).toBeTruthy();
            });

            it("should return null if a user with the given ID does not exist", async () => {
                const user = await userRepository.findById("0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa");
                expect(user).toBeNull();
            });
        });

        describe("list", () => {
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

                const users = await userRepository.list({
                    options: {
                        limit: 1,
                    },
                });

                expect(users).toHaveLength(1);
                expect(users[0].id).toBe(userCreated.id);
                expect(users[0].firstName).toBe(userCreated.firstName);
                expect(users[0].lastName).toBe(userCreated.lastName);
                expect(users[0].phoneNumber).toBe(userCreated.phoneNumber);
                expect(users[0].email).toBe(userCreated.email);
                expect(users[0].role).toBe(userCreated.role);
                expect(users[0].active).toBe(userCreated.active);
                expect(users[0].createdAt).toBeTruthy();
                expect(users[0].updatedAt).toBeNull();
            });
        });
    });
});