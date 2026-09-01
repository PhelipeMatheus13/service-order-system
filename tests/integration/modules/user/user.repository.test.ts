import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PrismaClient } from "../../../../src/generated/prisma/client.js";
import { setupTestDatabase } from "../../../helpers/testDatabase.js";
import { setPrismaInstance } from "../../../../src/shared/config/database";
import userRepository from "../../../../src/modules/user/user.repository.js";
const { randomUUID } = require("crypto");
import { UserRecord, RegisterInput, CreateResourceValidationInput, CreateUserActivationTokenInput } from "../../../../src/modules/user/user.types.js";


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
        await prisma.outboxUser.deleteMany();
        await prisma.user.deleteMany();
        await prisma.userResourceValidation.deleteMany();
        await prisma.userActivationToken.deleteMany();
    });

    describe("Writer repository", () => {
        describe("create", () => {
            it("should insert a new user into the database", async () => {
                const userData: RegisterInput = {
                    firstName: "Jhon",
                    lastName: "Doe",
                    phoneNumber: "5521995437105",
                    email: "jhon@example.com",
                    role: "ATTENDANT",
                };

                const userCreated = await userRepository.create(userData);

                expect(userCreated).toBeTruthy();

                expect(userCreated?.id).toBeTruthy();
                expect(userCreated?.firstName).toBe(userData.firstName);
                expect(userCreated?.lastName).toBe(userData.lastName);
                expect(userCreated?.phoneNumber).toBe(userData.phoneNumber);
                expect(userCreated?.email).toBe(userData.email);
                expect(userCreated?.passwordHash).toBeNull(); // user must be created without a password.
                expect(userCreated?.role).toBe(userData.role);
                expect(userCreated?.active).toBe(false);
                expect(userCreated?.createdAt).toBeTruthy();
                expect(userCreated?.updatedAt).toBeNull();
            });
        });

        describe("deleteById", () => {
            it("should delete a user from the database by ID", async () => {
                const userData: RegisterInput = {
                    firstName: "Jhon",
                    lastName: "Doe",
                    phoneNumber: null,
                    email: "jhon@example.com",
                    role: "ATTENDANT"
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

        describe("createResourceValidation", async () => {
            let userCreated: UserRecord;

            beforeEach(async () => {
                const userData: RegisterInput = {
                    firstName: "Jhon",
                    lastName: "Doe",
                    phoneNumber: "5521995437105",
                    email: "jhon@example.com",
                    role: "ATTENDANT",
                };

                userCreated = await userRepository.create(userData);
            });

            it("should create a resource validation for an existing user", async () => {
                const resourceValidationData: CreateResourceValidationInput = {
                    userId: userCreated.id,
                    challengerNumber: "123456",
                    resourceType: "EMAIL",
                };

                const resourceValidationCreated = await userRepository.createResourceValidation(resourceValidationData);

                expect(resourceValidationCreated).toBeTruthy();

                expect(resourceValidationCreated?.id).toBeTruthy();
                expect(resourceValidationCreated?.userId).toBe(resourceValidationData.userId);
                expect(resourceValidationCreated?.challengerNumber).toBe(resourceValidationData.challengerNumber);
                expect(resourceValidationCreated?.resourceType).toBe(resourceValidationData.resourceType);
                expect(resourceValidationCreated?.createdAt).toBeTruthy();
                expect(resourceValidationCreated?.expiresAt).toBeTruthy();
                expect(resourceValidationCreated?.confirmedAt).toBeNull();
            });

            it("should use the transaction client when provided", async () => {
                const resourceValidationData: CreateResourceValidationInput = {
                    userId: userCreated.id,
                    challengerNumber: "123456",
                    resourceType: "EMAIL",
                };

                let resourceValidationId: string | undefined;

                await expect(
                    prisma.$transaction(async (tx) => {
                        const validation = await userRepository.createResourceValidation(
                            resourceValidationData,
                            tx,
                        );

                        resourceValidationId = validation.id;

                        throw new Error("rollback");
                    }),
                ).rejects.toThrow("rollback");

                const validation = await prisma.userResourceValidation.findUnique({
                    where: { id: resourceValidationId },
                });

                expect(validation).toBeNull();
            });
        });

        describe("confirmResourceValidationById", async () => {
            let userCreated: UserRecord;

            beforeEach(async () => {
                const userData: RegisterInput = {
                    firstName: "Jhon",
                    lastName: "Doe",
                    phoneNumber: "5521995437105",
                    email: "jhon@example.com",
                    role: "ATTENDANT",
                };

                userCreated = await userRepository.create(userData);
            });

            it("should confirm a resource validation by id", async () => {
                const resourceValidationData: CreateResourceValidationInput = {
                    userId: userCreated.id,
                    challengerNumber: "123456",
                    resourceType: "EMAIL",
                };

                const resourceValidationCreated = await userRepository.createResourceValidation(resourceValidationData);

                await userRepository.confirmResourceValidationById(
                    resourceValidationCreated.id,
                );

                const resourceValidationConfirmed = await prisma.userResourceValidation.findUnique({
                    where: {
                        id: resourceValidationCreated.id,
                    },
                });

                expect(resourceValidationConfirmed).toBeTruthy();
                expect(resourceValidationConfirmed?.id).toBe(resourceValidationCreated.id);
                expect(resourceValidationConfirmed?.confirmedAt).toBeTruthy();
            });
        });

        describe("activateAndSetPassword", async () => {
            let userCreated: UserRecord;

            beforeEach(async () => {
                const userData: RegisterInput = {
                    firstName: "Jhon",
                    lastName: "Doe",
                    phoneNumber: "5521995437105",
                    email: "jhon@example.com",
                    role: "ATTENDANT",
                };

                userCreated = await userRepository.create(userData);
            });

            it("should activate the user and set the password", async () => {
                const passwordHash = "hashed-password";

                await userRepository.activateAndSetPassword(
                    userCreated.id,
                    passwordHash,
                );

                const userUpdated = await prisma.user.findUnique({
                    where: { id: userCreated.id },
                });

                expect(userUpdated).toBeTruthy();
                expect(userUpdated?.passwordHash).toBe(passwordHash);
                expect(userUpdated?.active).toBe(true);
                expect(userUpdated?.updatedAt).toBeTruthy();
            });

            it("should use the transaction client when provided", async () => {
                const passwordHash = "hashed-password";

                await expect(
                    prisma.$transaction(async (tx) => {
                        await userRepository.activateAndSetPassword(userCreated.id, passwordHash, tx);

                        throw new Error("rollback");
                    })
                ).rejects.toThrow("rollback");

                const userUpdated = await prisma.user.findUnique({
                    where: { id: userCreated.id },
                });

                expect(userUpdated?.passwordHash).toBeNull();
                expect(userUpdated?.active).toBe(false);
                expect(userUpdated?.updatedAt).toBeNull();
            });
        });

        describe("invalidateActiveEmailValidations", () => {
            let userCreated: UserRecord;

            beforeEach(async () => {
                const userData: RegisterInput = {
                    firstName: "Jhon",
                    lastName: "Doe",
                    phoneNumber: "5521995437105",
                    email: "jhon@example.com",
                    role: "ATTENDANT",
                };

                userCreated = await userRepository.create(userData);
            });

            it("should invalidate an active and unconfirmed email validation", async () => {
                const validation = await prisma.userResourceValidation.create({
                    data: {
                        userId: userCreated.id,
                        challengerNumber: "123456",
                        resourceType: "EMAIL",
                        expiresAt: new Date(Date.now() + 60_000),
                    },
                });

                await userRepository.invalidateActiveEmailValidations(userCreated.email);

                const updated = await prisma.userResourceValidation.findUnique({
                    where: { id: validation.id },
                });

                expect(updated?.expiresAt).toBeTruthy();
                expect(updated!.expiresAt!.getTime()).toBeLessThanOrEqual(Date.now());
            });

            it("should not invalidate an expired email validation", async () => {
                const validation = await prisma.userResourceValidation.create({
                    data: {
                        userId: userCreated.id,
                        challengerNumber: "123456",
                        resourceType: "EMAIL",
                        expiresAt: new Date(Date.now() - 60_000),
                    },
                });

                const before = await prisma.userResourceValidation.findUnique({
                    where: { id: validation.id },
                });

                await userRepository.invalidateActiveEmailValidations(userCreated.email);

                const after = await prisma.userResourceValidation.findUnique({
                    where: { id: validation.id },
                });

                expect(after?.expiresAt).toEqual(before?.expiresAt);
            });

            it("should not invalidate a confirmed email validation", async () => {
                const validation = await prisma.userResourceValidation.create({
                    data: {
                        userId: userCreated.id,
                        challengerNumber: "123456",
                        resourceType: "EMAIL",
                        expiresAt: new Date(Date.now() + 60_000),
                        confirmedAt: new Date(),
                    },
                });

                const before = await prisma.userResourceValidation.findUnique({
                    where: { id: validation.id },
                });

                await userRepository.invalidateActiveEmailValidations(userCreated.email);

                const after = await prisma.userResourceValidation.findUnique({
                    where: { id: validation.id },
                });

                expect(after?.expiresAt).toEqual(before?.expiresAt);
                expect(after?.confirmedAt).toEqual(before?.confirmedAt);
            });

            it("should use the transaction client when provided", async () => {
                const validation = await userRepository.createResourceValidation({
                    userId: userCreated.id,
                    challengerNumber: "123456",
                    resourceType: "EMAIL",
                });

                const originalExpiresAt = validation.expiresAt!;

                await expect(
                    prisma.$transaction(async (tx) => {
                        await userRepository.invalidateActiveEmailValidations(
                            userCreated.email,
                            tx,
                        );

                        throw new Error("rollback");
                    }),
                ).rejects.toThrow("rollback");

                const afterRollback = await prisma.userResourceValidation.findUnique({
                    where: { id: validation.id },
                });

                expect(afterRollback?.expiresAt?.getTime()).toBe(
                    originalExpiresAt.getTime(),
                );
            });
        });

        describe("createUserActivationToken", () => {
            let userCreated: UserRecord;

            beforeEach(async () => {
                const userData: RegisterInput = {
                    firstName: "Jhon",
                    lastName: "Doe",
                    phoneNumber: "5521995437105",
                    email: "jhon@example.com",
                    role: "ATTENDANT",
                };

                userCreated = await userRepository.create(userData);
            });

            it("should create a activation token for an existing user", async () => {
                const resourceValidationData: CreateUserActivationTokenInput = {
                    userId: userCreated.id,
                    jti: randomUUID(),
                    tokenHash: "hashed-token-01",
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                };

                const resourceValidationCreated = await userRepository.createUserActivationToken(resourceValidationData);

                expect(resourceValidationCreated).toBeTruthy();

                expect(resourceValidationCreated?.id).toBeTruthy();
                expect(resourceValidationCreated?.userId).toBe(userCreated.id);
                expect(resourceValidationCreated?.jti).toBe(resourceValidationData.jti);
                expect(resourceValidationCreated?.tokenHash).toBe(resourceValidationData.tokenHash);
                expect(resourceValidationCreated?.expiresAt).toStrictEqual(resourceValidationData.expiresAt);
                expect(resourceValidationCreated?.createdAt).toBeTruthy();
            });

            it("should use the transaction client when provided", async () => {
                const resourceValidationData: CreateUserActivationTokenInput = {
                    userId: userCreated.id,
                    jti: randomUUID(),
                    tokenHash: "hashed-token-02",
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                };

                await expect(
                    prisma.$transaction(async (tx) => {
                        await userRepository.createUserActivationToken(resourceValidationData, tx,);

                        throw new Error("rollback");
                    }),
                ).rejects.toThrow("rollback");

                const afterRollback = await prisma.userActivationToken.findUnique({
                    where: { jti: resourceValidationData.jti },
                });

                expect(afterRollback).toBeNull();
            });
        });

        describe("consumeUserActivationTokenByJti", async () => {
            let userCreated: UserRecord;

            beforeEach(async () => {
                const userData: RegisterInput = {
                    firstName: "Jhon",
                    lastName: "Doe",
                    phoneNumber: "5521995437105",
                    email: "jhon@example.com",
                    role: "ATTENDANT",
                };

                userCreated = await userRepository.create(userData);
            });

            it("should consume a user activation token by JTI", async () => {
                const userActivationTokenData: CreateUserActivationTokenInput = {
                    userId: userCreated.id,
                    jti: randomUUID(),
                    tokenHash: "hashed-token-01",
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                };

                const userActivationTokenCreated = await userRepository.createUserActivationToken(userActivationTokenData);

                await userRepository.consumeUserActivationTokenByJti(
                    userActivationTokenCreated.jti,
                );

                const userActivationTokenConsumed = await prisma.userActivationToken.findUnique({
                    where: { jti: userActivationTokenCreated.jti },
                });

                expect(userActivationTokenConsumed).toBeTruthy();
                expect(userActivationTokenConsumed?.jti).toBe(userActivationTokenCreated.jti);
                expect(userActivationTokenConsumed?.consumedAt).toBeTruthy();

                // consume again should return false
                const consumeAgain = await userRepository.consumeUserActivationTokenByJti(
                    userActivationTokenCreated.jti,
                );

                expect(consumeAgain).toBe(false);
            });

            it("should use the transaction client when provided", async () => {
                const userActivationTokenData: CreateUserActivationTokenInput = {
                    userId: userCreated.id,
                    jti: randomUUID(),
                    tokenHash: "hashed-token-02",
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                };

                const userActivationTokenCreated = await userRepository.createUserActivationToken(userActivationTokenData);

                await expect(
                    prisma.$transaction(async (tx) => {
                        await userRepository.consumeUserActivationTokenByJti(
                            userActivationTokenCreated.jti,
                            tx,
                        );

                        throw new Error("rollback");
                    }),
                ).rejects.toThrow("rollback");

                const afterRollback = await prisma.userActivationToken.findUnique({
                    where: { jti: userActivationTokenCreated.jti },
                });

                expect(afterRollback?.consumedAt).toBeNull();
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
                } as RegisterInput;

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

        describe("findByEmail", () => {
            it("should return the user if a user with the given email exists", async () => {
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

                const user = await userRepository.findByEmail(userCreated.email);

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

            it("should return null if a user with the given email does not exist", async () => {
                const user = await userRepository.findByEmail("fake@hotmail.com");
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

        describe("listOutboxUserUnconsumed", () => {
            it("should return unconsumed outbox user records ordered by creation date ascending", async () => {
                const user1 = await prisma.user.create({
                    data: {
                        firstName: "John",
                        lastName: "Doe",
                        email: "john@example.com",
                        role: "ATTENDANT",
                    },
                });

                await prisma.user.create({
                    data: {
                        firstName: "Jane",
                        lastName: "Doe",
                        email: "jane@example.com",
                        role: "TECHNICIAN",
                    },
                });

                const unconsumed = await userRepository.listOutboxUserUnconsumed();

                expect(unconsumed).toHaveLength(2);

                const [outbox] = unconsumed;
                const afterState = outbox.afterState as Record<string, any>;

                expect(outbox.id).toBeTruthy();
                expect(outbox.userId).toBe(user1.id);
                expect(outbox.action).toBe("INSERT");

                expect(outbox.beforeState).toBeNull();

                expect(afterState.id).toBe(user1.id);
                expect(afterState.first_name).toBe(user1.firstName);
                expect(afterState.last_name).toBe(user1.lastName);
                expect(afterState.phone_number).toBe(user1.phoneNumber);
                expect(afterState.email).toBe(user1.email);
                expect(afterState.role).toBe(user1.role);
                expect(afterState.active).toBe(user1.active);
                expect(afterState.created_at).toBeTruthy();
                expect(afterState.updated_at).toBeNull();

                expect(outbox.createdAt).toBeTruthy();
                expect(outbox.consumedAt).toBeNull();
            });
        });

        describe("markOutboxUserAsConsumed", () => {
            it("should mark the given outbox user records as consumed", async () => {
                const user1 = await prisma.user.create({
                    data: {
                        firstName: "John",
                        lastName: "Doe",
                        email: "john@example.com",
                        role: "ATTENDANT",
                    },
                });

                const user2 = await prisma.user.create({
                    data: {
                        firstName: "Jane",
                        lastName: "Doe",
                        email: "jane@example.com",
                        role: "TECHNICIAN",
                    },
                });

                const outboxRecords = await prisma.outboxUser.findMany({
                    where: {
                        userId: {
                            in: [user1.id, user2.id],
                        },
                    },
                });

                const ids = outboxRecords.map((record) => record.id);

                await userRepository.markOutboxUserAsConsumed(ids);

                const consumedRecords = await prisma.outboxUser.findMany({
                    where: {
                        id: {
                            in: ids,
                        },
                    },
                });

                expect(consumedRecords).toHaveLength(2);

                for (const record of consumedRecords) {
                    expect(record.consumedAt).toBeTruthy();
                }
            });
        });

        describe("findResourceValidationByUserId", async () => {
            let userCreated: UserRecord;

            beforeEach(async () => {
                const userData: RegisterInput = {
                    firstName: "Jhon",
                    lastName: "Doe",
                    phoneNumber: "5521995437105",
                    email: "jhon@example.com",
                    role: "ATTENDANT",
                };

                userCreated = await userRepository.create(userData);
            });

            it("should find a resource validation for an existing user", async () => {
                const resourceValidationData: CreateResourceValidationInput = {
                    userId: userCreated.id,
                    challengerNumber: "123456",
                    resourceType: "EMAIL",
                };

                const resourceValidationCreated = await userRepository.createResourceValidation(resourceValidationData);

                const resourceValidationFound = await userRepository.findResourceValidationByUserId(
                    userCreated.id,
                    "EMAIL",
                );

                expect(resourceValidationFound).toBeTruthy();

                expect(resourceValidationFound?.id).toBe(resourceValidationCreated.id);
                expect(resourceValidationFound?.userId).toBe(userCreated.id);
                expect(resourceValidationFound?.challengerNumber).toBe("123456");
                expect(resourceValidationFound?.resourceType).toBe("EMAIL");
                expect(resourceValidationFound?.createdAt).toBeTruthy();
                expect(resourceValidationFound?.expiresAt).toBeTruthy();
                expect(resourceValidationFound?.confirmedAt).toBeNull();
            });

            it("should return null when the resource validation does not exist", async () => {
                const resourceValidationFound = await userRepository.findResourceValidationByUserId(
                    userCreated.id,
                    "EMAIL",
                );

                expect(resourceValidationFound).toBeNull();
            });
        });

        describe("findResourceValidationByEmail", async () => {
            let userCreated: UserRecord;

            beforeEach(async () => {
                const userData: RegisterInput = {
                    firstName: "Jhon",
                    lastName: "Doe",
                    phoneNumber: "5521995437105",
                    email: "jhon@example.com",
                    role: "ATTENDANT",
                };

                userCreated = await userRepository.create(userData);
            });

            it("should find a resource validation for an existing user", async () => {
                const resourceValidationData: CreateResourceValidationInput = {
                    userId: userCreated.id,
                    challengerNumber: "123456",
                    resourceType: "EMAIL",
                };

                const resourceValidationCreated = await userRepository.createResourceValidation(resourceValidationData);

                const resourceValidationFound = await userRepository.findResourceValidationByEmail(userCreated.email);

                expect(resourceValidationFound).toBeTruthy();

                expect(resourceValidationFound?.id).toBe(resourceValidationCreated.id);
                expect(resourceValidationFound?.userId).toBe(userCreated.id);
                expect(resourceValidationFound?.challengerNumber).toBe("123456");
                expect(resourceValidationFound?.resourceType).toBe("EMAIL");
                expect(resourceValidationFound?.createdAt).toBeTruthy();
                expect(resourceValidationFound?.expiresAt).toBeTruthy();
                expect(resourceValidationFound?.confirmedAt).toBeNull();
            });

            it("should return null when the resource validation does not exist", async () => {
                const resourceValidationFound = await userRepository.findResourceValidationByEmail(userCreated.email);

                expect(resourceValidationFound).toBeNull();
            });
        });

        describe("findUserActivationTokenByJti", async () => {
            let userCreated: UserRecord;

            beforeEach(async () => {
                const userData: RegisterInput = {
                    firstName: "Jhon",
                    lastName: "Doe",
                    phoneNumber: "5521995437105",
                    email: "jhon@example.com",
                    role: "ATTENDANT",
                };

                userCreated = await userRepository.create(userData);
            });

            it("should find a user activation token for an existing user", async () => {
                const userActivationTokenData: CreateUserActivationTokenInput = {
                    userId: userCreated.id,
                    jti: "test-jti",
                    tokenHash: "hashed-token-01",
                    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
                };

                const userActivationTokenCreated = await userRepository.createUserActivationToken(userActivationTokenData);

                const userActivationTokenFound = await userRepository.findUserActivationTokenByJti(userActivationTokenCreated.jti);

                expect(userActivationTokenFound).toBeTruthy();

                expect(userActivationTokenFound?.id).toBe(userActivationTokenCreated.id);
                expect(userActivationTokenFound?.jti).toBe("test-jti");
                expect(userActivationTokenFound?.expiresAt).toBeTruthy();
            });

            it("should return null when the user activation token does not exist", async () => {
                const userActivationTokenFound = await userRepository.findUserActivationTokenByJti("non-existent-jti");

                expect(userActivationTokenFound).toBeNull();
            });
        });
    });
});
