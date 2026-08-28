import { beforeEach, describe, expect, it, vi } from "vitest";

import userService from "../../../../src/modules/user/user.service.js";
import {
    RegisterInput,
    UserRecord,
    ConfirmEmailInput,
    ActivateUserInput
} from "../../../../src/modules/user/user.types.js";

import userRepository from "../../../../src/modules/user/user.repository.js";
import { generateActivationToken } from "../../../../src/shared/services/jwt.js"
import { hashPassword } from "../../../../src/shared/services/hash.js";
import { getPrisma } from "../../../../src/shared/config/database.js";
import { resendConfirmationCode } from "../../../../src/modules/user/user.emails.js";

vi.mock("../../../../src/modules/user/user.repository.js");
vi.mock("../../../../src/shared/services/jwt.js");
vi.mock("../../../../src/shared/services/hash.js");
vi.mock("../../../../src/shared/config/database.js");
vi.mock("../../../../src/modules/user/user.emails.js");

describe("User Service (Unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createUser", () => {
        const registerData: RegisterInput = {
            firstName: "John",
            lastName: "Doe",
            phoneNumber: null,
            email: "johndoe@hotmail.com",
            role: "ATTENDANT"
        };


        it("should throw if fail in email check ", async () => {
            vi.mocked(userRepository).existsByEmail.mockRejectedValue(new Error("fake error"));

            await expect(userService.createUser(registerData))
                .rejects.toThrow("fake error");
        });

        it("should throw if email already exists ", async () => {
            vi.mocked(userRepository).existsByEmail.mockResolvedValue(true);

            await expect(userService.createUser(registerData))
                .rejects.toMatchObject({
                    statusCode: 409,
                    code: "ALREADY_EXISTS",
                    message: "Email already in use, please choose another",
                });
        });

        it("should throw if fail in userRepository.create", async () => {
            vi.mocked(userRepository).existsByEmail.mockResolvedValue(false);
            vi.mocked(userRepository).create.mockRejectedValue(new Error("fake error"));

            await expect(userService.createUser(registerData))
                .rejects.toThrow("fake error");
        });

        it("should create user successfully", async () => {
            vi.mocked(userRepository).existsByEmail.mockResolvedValue(false);

            const mockUserRecord = {
                id: "uuid-123",
                firstName: registerData.firstName,
                lastName: registerData.lastName,
                phoneNumber: registerData.phoneNumber,
                email: registerData.email,
                passwordHash: null,
                role: registerData.role,
                active: false,
                createdAt: new Date(),
                updatedAt: null,
            } as UserRecord;

            vi.mocked(userRepository).create.mockResolvedValue(mockUserRecord);

            const result = await userService.createUser(registerData);

            expect(userRepository.existsByEmail).toHaveBeenCalledWith(registerData.email);
            expect(userRepository.create).toHaveBeenCalledWith({
                firstName: registerData.firstName,
                lastName: registerData.lastName,
                phoneNumber: registerData.phoneNumber,
                email: registerData.email,
                role: registerData.role,
            });

            expect(result).toBe(mockUserRecord);
        });
    });

    describe("getUserById", () => {
        const userId = "uuid-123";

        it("should throw an error if repository.findById fails", async () => {
            vi.mocked(userRepository).findById.mockRejectedValue(new Error("fake error"));

            await expect(userService.getUserById(userId))
                .rejects.toThrow("fake error");
        });


        it("should throw NOT_FOUND error if user does not exist", async () => {
            vi.mocked(userRepository).findById.mockResolvedValue(null);

            await expect(userService.getUserById(userId))
                .rejects.toMatchObject({
                    statusCode: 404,
                    code: "NOT_FOUND",
                    message: "User not found",
                });
        });

        it("should return user", async () => {
            const mockUserRecord = {
                id: "uuid-123",
                firstName: "John",
                lastName: "Doe",
                phoneNumber: null,
                email: "johndoe@hotmail.com",
                passwordHash: null,
                role: "ATTENDANT",
                active: false,
                createdAt: new Date(),
                updatedAt: null,
            } as UserRecord;

            vi.mocked(userRepository).findById.mockResolvedValue(mockUserRecord);

            const result = await userService.getUserById(userId);

            expect(userRepository.findById).toHaveBeenCalledWith(userId);
            expect(result).toEqual(mockUserRecord);
        });
    });

    describe("deleteUserById", () => {
        const userId = "uuid-123";

        it("should throw an error if repository.deleteById fails", async () => {
            vi.mocked(userRepository).deleteById.mockRejectedValue(new Error("fake error"));

            await expect(userService.deleteUserById(userId))
                .rejects.toThrow("fake error");
        });

        it("should throw an error if user does not exist", async () => {
            vi.mocked(userRepository).deleteById.mockResolvedValue(false);

            await expect(userService.deleteUserById(userId)).rejects.toMatchObject({
                statusCode: 404,
                code: "NOT_FOUND",
                message: "User not found",
            });
        });

        it("should delete user by ID", async () => {
            vi.mocked(userRepository).deleteById.mockResolvedValue(true);

            const result = await userService.deleteUserById(userId);

            expect(userRepository.deleteById).toHaveBeenCalledWith(userId);
            expect(result).toEqual(undefined); // return Promise<void>
        });
    });

    describe("listUsers", () => {
        const input = {
            options: {
                limit: 1,
            },
        };

        it("should throw an error if repository.listUsers fails", async () => {
            vi.mocked(userRepository).list.mockRejectedValue(
                new Error("fake error")
            );

            await expect(userService.listUsers(input))
                .rejects.toThrow("fake error");
        });

        it("should return the users from repository", async () => {
            const users = [
                {
                    id: "uuid-123",
                    firstName: "John",
                    lastName: "Doe",
                    phoneNumber: "5521995437105",
                    email: "john@example.com",
                    passwordHash: "passwordHash",
                    role: "ATTENDANT",
                    active: true,
                    createdAt: new Date(),
                    updatedAt: null,
                },
            ] as UserRecord[];

            vi.mocked(userRepository).list.mockResolvedValue(users);

            const result = await userService.listUsers(input);

            expect(userRepository.list).toHaveBeenCalledWith(input);
            expect(result).toEqual(users);
        });
    });

    describe("confirmEmail", () => {
        const input: ConfirmEmailInput = {
            email: "jhon@example.com",
            challengerNumber: "123456",
        };

        const now = new Date();

        const resourceValidation = {
            id: "validation-1",
            createdAt: now,
            userId: "user-1",
            resourceType: "EMAIL" as const,
            challengerNumber: "123456",
            expiresAt: new Date(now.getTime() + 10 * 60 * 1000), // 10 min
            confirmedAt: null,
            consumedAt: null,
        };

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should throw when the resource validation does not exist", async () => {
            vi.mocked(userRepository).findResourceValidationByEmail.mockResolvedValue(null);

            await expect(userService.confirmEmail(input))
                .rejects.toMatchObject({
                    statusCode: 404,
                    message: "Resource validation not found",
                });

            expect(userRepository.confirmResourceValidationById).not.toHaveBeenCalled();
            expect(generateActivationToken).not.toHaveBeenCalled();
        });

        it("should throw when the challenger number is invalid", async () => {
            vi.mocked(userRepository).findResourceValidationByEmail.mockResolvedValue({
                ...resourceValidation,
                challengerNumber: "654321",
            });

            await expect(userService.confirmEmail(input))
                .rejects.toMatchObject({
                    statusCode: 401,
                    message: "Invalid challenger number",
                    code: "INVALID_CHALLENGER_NUMBER",
                });

            expect(userRepository.confirmResourceValidationById).not.toHaveBeenCalled();
            expect(generateActivationToken).not.toHaveBeenCalled();
        });

        it("should throw when the resource validation is already confirmed", async () => {
            vi.mocked(userRepository).findResourceValidationByEmail.mockResolvedValue({
                ...resourceValidation,
                confirmedAt: new Date(),
            });

            await expect(userService.confirmEmail(input))
                .rejects.toMatchObject({
                    statusCode: 409,
                    message: "Resource validation already confirmed",
                });

            expect(userRepository.confirmResourceValidationById).not.toHaveBeenCalled();
            expect(generateActivationToken).not.toHaveBeenCalled();
        });

        it("should throw when the challenger number has expired", async () => {
            vi.mocked(userRepository).findResourceValidationByEmail.mockResolvedValue({
                ...resourceValidation,
                expiresAt: new Date(Date.now() - 60_000),
            });

            await expect(userService.confirmEmail(input))
                .rejects.toMatchObject({
                    statusCode: 401,
                    message: "Challenger number expired",
                    code: "CHALLENGER_NUMBER_EXPIRED",
                });

            expect(userRepository.confirmResourceValidationById).not.toHaveBeenCalled();
            expect(generateActivationToken).not.toHaveBeenCalled();
        });

        it("should confirm the resource validation and return an activation token", async () => {
            const activationToken = "activation-token";

            vi.mocked(userRepository).findResourceValidationByEmail.mockResolvedValue(
                resourceValidation,
            );

            vi.mocked(generateActivationToken).mockReturnValue(activationToken);

            vi.mocked(userRepository).confirmResourceValidationById.mockResolvedValue(
                undefined,
            );

            await expect(userService.confirmEmail(input))
                .resolves.toBe(activationToken);

            expect(generateActivationToken).toHaveBeenCalledWith(resourceValidation.userId, resourceValidation.id);
            expect(userRepository.confirmResourceValidationById).toHaveBeenCalledWith(resourceValidation.id);
        });
    });

    describe("activateUser", () => {
        const input: ActivateUserInput = {
            userId: "user-123",
            password: "password123",
            validationId: "validation-123",
        };

        const resourceValidation = {
            id: "validation-123",
            userId: "user-123",
            challengerNumber: "123456",
            resourceType: "EMAIL" as const,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 60000),
            confirmedAt: null,
            consumedAt: null,
        };

        it("should throw NOT_FOUND if resource validation does not exist", async () => {
            vi.mocked(userRepository.findResourceValidationById).mockResolvedValue(null);

            await expect(userService.activateUser(input))
                .rejects.toMatchObject({
                    statusCode: 404,
                    message: "Resource validation not found",
                });

            expect(userRepository.findResourceValidationById).toHaveBeenCalledWith(input.validationId);
            expect(hashPassword).not.toHaveBeenCalled();
            expect(getPrisma).not.toHaveBeenCalled();
        });

        it("should throw CONFLICT if validation already consumed", async () => {
            vi.mocked(userRepository.findResourceValidationById).mockResolvedValue({
                ...resourceValidation,
                consumedAt: new Date(),
            });

            await expect(userService.activateUser(input))
                .rejects.toMatchObject({
                    statusCode: 409,
                    message: "Activation token already used",
                });

            expect(hashPassword).not.toHaveBeenCalled();
            expect(getPrisma).not.toHaveBeenCalled();
        });

        it("should throw when hashing password fails", async () => {
            const error = new Error("Failed to hash password");
            vi.mocked(userRepository.findResourceValidationById).mockResolvedValue(resourceValidation);
            vi.mocked(hashPassword).mockRejectedValue(error);

            await expect(userService.activateUser(input))
                .rejects.toThrow(error);

            expect(hashPassword).toHaveBeenCalledWith(input.password);
            expect(getPrisma).not.toHaveBeenCalled();
        });

        it("should throw CONFLICT if consumeResourceValidation returns false (race condition)", async () => {
            vi.mocked(userRepository.findResourceValidationById).mockResolvedValue(resourceValidation);
            vi.mocked(hashPassword).mockResolvedValue("hashed-password");

            const tx = {} as any;
            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async (callback) => callback(tx)),
            } as any);

            vi.mocked(userRepository.consumeResourceValidation).mockResolvedValue(false);

            await expect(userService.activateUser(input))
                .rejects.toMatchObject({
                    statusCode: 409,
                    message: "Activation token already used",
                });

            expect(userRepository.consumeResourceValidation).toHaveBeenCalledWith(input.validationId, tx);
            expect(userRepository.activateAndSetPassword).not.toHaveBeenCalled();
        });

        it("should hash password, consume validation and activate user successfully", async () => {
            vi.mocked(userRepository.findResourceValidationById).mockResolvedValue(resourceValidation);
            vi.mocked(hashPassword).mockResolvedValue("hashed-password");

            const tx = {} as any;
            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async (callback) => callback(tx)),
            } as any);

            vi.mocked(userRepository.consumeResourceValidation).mockResolvedValue(true);
            vi.mocked(userRepository.activateAndSetPassword).mockResolvedValue();

            await userService.activateUser(input);

            expect(hashPassword).toHaveBeenCalledWith(input.password);
            expect(userRepository.consumeResourceValidation).toHaveBeenCalledWith(input.validationId, tx);
            expect(userRepository.activateAndSetPassword).toHaveBeenCalledWith(
                input.userId,
                "hashed-password",
                tx,
            );
        });
    });

    describe("resendEmailConfirmationCode", () => {
        const email = "jhon@example.com";

        const user = {
            id: "user-123",
            firstName: "Jhon",
            lastName: "Doe",
            email,
        } as UserRecord;

        it("should silently return when user does not exist", async () => {
            vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

            await expect(userService.resendEmailConfirmationCode(email))
                .resolves.toBeUndefined();

            expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
            expect(userRepository.invalidateActiveEmailValidations).not.toHaveBeenCalled();
            expect(userRepository.createResourceValidation).not.toHaveBeenCalled();
            expect(resendConfirmationCode).not.toHaveBeenCalled();
        });

        it("should propagate an error when invalidating active validations fails", async () => {
            const error = new Error("Failed to invalidate validations");

            vi.mocked(userRepository.findByEmail).mockResolvedValue(user);
            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async (callback) => callback({})),
            } as any);
            vi.mocked(userRepository.invalidateActiveEmailValidations)
                .mockRejectedValue(error);

            await expect(userService.resendEmailConfirmationCode(email))
                .rejects.toThrow(error);

            expect(userRepository.createResourceValidation).not.toHaveBeenCalled();
            expect(resendConfirmationCode).not.toHaveBeenCalled();
        });

        it("should propagate an error when creating the new validation fails", async () => {
            const error = new Error("Failed to create validation");

            const tx = {} as any;

            vi.mocked(userRepository.findByEmail).mockResolvedValue(user);

            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async (callback) => callback(tx)),
            } as any);

            vi.mocked(userRepository.invalidateActiveEmailValidations).mockResolvedValue();

            vi.mocked(userRepository.createResourceValidation).mockRejectedValue(error);

            await expect(userService.resendEmailConfirmationCode(email))
                .rejects.toThrow(error);

            expect(userRepository.invalidateActiveEmailValidations).toHaveBeenCalledWith(email, tx);

            expect(userRepository.createResourceValidation).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: user.id,
                    resourceType: "EMAIL",
                }),
                tx,
            );

            expect(resendConfirmationCode).not.toHaveBeenCalled();
        });

        it("should propagate an error when sending the email fails", async () => {
            const error = new Error("Failed to send email");
            const tx = {} as any;

            vi.mocked(userRepository.findByEmail).mockResolvedValue(user);

            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async (callback) => callback(tx)),
            } as any);

            vi.mocked(userRepository.invalidateActiveEmailValidations).mockResolvedValue();

            vi.mocked(userRepository.createResourceValidation).mockResolvedValue({
                id: "validation-123",
                userId: user.id,
                challengerNumber: "123456",
                resourceType: "EMAIL",
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                confirmedAt: null,
                consumedAt: null,
            });

            vi.mocked(resendConfirmationCode).mockRejectedValue(error);

            await expect(userService.resendEmailConfirmationCode(email))
                .rejects.toThrow(error);

            expect(userRepository.invalidateActiveEmailValidations).toHaveBeenCalledWith(email, tx);
            
            expect(userRepository.createResourceValidation).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: user.id,
                    challengerNumber: expect.stringMatching(/^\d{6}$/),
                    resourceType: "EMAIL",
                }),
                tx,
            );

            expect(resendConfirmationCode).toHaveBeenCalledWith({
                to: user.email,
                name: `${user.firstName} ${user.lastName}`,
                code: expect.stringMatching(/^\d{6}$/),
            });
        });

        it("should resend the confirmation code successfully", async () => {
            const tx = {} as any;

            vi.mocked(userRepository.findByEmail).mockResolvedValue(user);

            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async (callback) => callback(tx)),
            } as any);

            vi.mocked(userRepository.invalidateActiveEmailValidations).mockResolvedValue();

            vi.mocked(userRepository.createResourceValidation).mockResolvedValue({
                id: "validation-123",
                userId: user.id,
                challengerNumber: "123456",
                resourceType: "EMAIL",
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                confirmedAt: null,
                consumedAt: null,
            });
            vi.mocked(resendConfirmationCode).mockResolvedValue(undefined);

            await userService.resendEmailConfirmationCode(email);

            expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
            expect(userRepository.invalidateActiveEmailValidations).toHaveBeenCalledWith(email, tx);
            
            expect(userRepository.createResourceValidation).toHaveBeenCalledWith(
                {
                    userId: user.id,
                    challengerNumber: expect.stringMatching(/^\d{6}$/),
                    resourceType: "EMAIL",
                },
                tx,
            );

            expect(resendConfirmationCode).toHaveBeenCalledWith({
                to: user.email,
                name: `${user.firstName} ${user.lastName}`,
                code: expect.stringMatching(/^\d{6}$/),
            });
        });
    });
});