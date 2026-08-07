import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PrismaClient } from "../../../../src/generated/prisma/client.js";
import { setupTestDatabase } from "../../../helpers/testDatabase.js";
import { setPrismaInstance } from "../../../../src/shared/config/database";
import userRepository from "../../../../src/modules/user/user.repository.js";


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
                    name: "jhon doe",
                    email: "jhon@example.com",
                    password: "hashedpassword"
                };

                const userId = await userRepository.create(userData);

                expect(userId).toBeDefined();
                expect(typeof userId).toBe("string");

                const user = await prisma.user.findUnique({ where: { id: userId } });

                expect(user?.id).toBeTruthy();
                expect(user?.name).toBe("jhon doe");
                expect(user?.email).toBe("jhon@example.com");
                expect(user?.password).toBe("hashedpassword");
                expect(user?.createdAt).toBeTruthy();
                expect(user?.updatedAt).toBeNull();
            });
        });

        describe("deleteById", () => {
            it("should delete a user from the database by ID", async () => {
                const userData = {
                    name: "jhon doe",
                    email: "jhon@example.com",
                    password: "hashedpassword"
                };

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
                    name: "jhon doe",
                    email: "jhon@example.com",
                    password: "hashedpassword"
                };

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
                    name: "jhon doe",
                    email: "jhon@example.com",
                    password: "hashedpassword"
                };

                const { id: userId } = await prisma.user.create({
                    data: userData,
                    select: { id: true }
                });

                const user = await userRepository.findById(userId);

                expect(user?.id).toBeTruthy();
                expect(user?.name).toBe("jhon doe");
                expect(user?.email).toBe("jhon@example.com");
                expect(user?.password).toBe("hashedpassword");
                expect(user?.createdAt).toBeTruthy();
                expect(user?.updatedAt).toBeNull();
            });

            it("should return null if a user with the given ID does not exist", async () => {
                const user = await userRepository.findById("0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa");
                expect(user).toBeNull();
            });
        });
    });
});