import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    RegisterInput,
    UserRecord,
    ConfirmEmailInput,
    ActivateUserInput
} from "../../../../src/modules/user/user.types.js";
import userService from "../../../../src/modules/user/user.service.js";

// Mock dependencies
import logger from "../../../../src/shared/config/logger.js";
import userRepository from "../../../../src/modules/user/user.repository.js";
import { generateActivationToken } from "../../../../src/shared/services/jwt.js"
import { hashPassword } from "../../../../src/shared/services/hash.js";
import { getPrisma } from "../../../../src/shared/config/database.js";
import { resendConfirmationCode } from "../../../../src/modules/user/user.emails.js";
import { hashToken } from "../../../../src/shared/services/token-hash.js";

vi.mock("../../../../src/shared/config/logger.js", () => ({
    default: {
        error: vi.fn(),
    },
}));
vi.mock("../../../../src/modules/user/user.repository.js");
vi.mock("../../../../src/shared/services/jwt.js");
vi.mock("../../../../src/shared/services/hash.js");
vi.mock("../../../../src/shared/config/database.js");
vi.mock("../../../../src/modules/user/user.emails.js");
vi.mock("../../../../src/shared/services/token-hash.js");

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
            expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
            confirmedAt: null,
            consumedAt: null,
        };

        const mockActivationToken = "activation-token";
        const mockJti = "jti-123";
        const mockExp = Math.floor(Date.now() / 1000) + 900;

        const setupConfirmEmailMocks = () => {
            const tx = {} as any;

            vi.mocked(userRepository.findResourceValidationByEmail).mockResolvedValue(resourceValidation);
            vi.mocked(generateActivationToken).mockReturnValue({
                activationToken: mockActivationToken,
                tokenPayload: { sub: resourceValidation.userId, jti: mockJti, exp: mockExp },
            });
            vi.mocked(userRepository.confirmResourceValidationById).mockResolvedValue(true);
            vi.mocked(hashToken).mockReturnValue("hashed-token");
            vi.mocked(userRepository.createUserActivationToken).mockResolvedValue({
                id: "token-id",
                userId: resourceValidation.userId,
                jti: mockJti,
                tokenHash: "hashed-token",
                createdAt: new Date(),
                expiresAt: new Date(mockExp * 1000),
                consumedAt: null,
            });
            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async (callback) => callback(tx)),
            } as any);

            return { tx };
        };

        it("should propagate error when findResourceValidationByEmail throws", async () => {
            const error = new Error("Database error");
            vi.mocked(userRepository.findResourceValidationByEmail).mockRejectedValue(error);

            await expect(userService.confirmEmail(input))
                .rejects.toThrow(error);

            expect(userRepository.confirmResourceValidationById).not.toHaveBeenCalled();
            expect(generateActivationToken).not.toHaveBeenCalled();
            expect(userRepository.createUserActivationToken).not.toHaveBeenCalled();
        });

        it("should throw when the resource validation does not exist", async () => {
            vi.mocked(userRepository.findResourceValidationByEmail).mockResolvedValue(null);

            await expect(userService.confirmEmail(input))
                .rejects.toMatchObject({
                    statusCode: 404,
                    message: "Resource validation not found",
                });

            expect(userRepository.confirmResourceValidationById).not.toHaveBeenCalled();
            expect(generateActivationToken).not.toHaveBeenCalled();
            expect(userRepository.createUserActivationToken).not.toHaveBeenCalled();
        });

        it("should throw when the challenger number is invalid", async () => {
            vi.mocked(userRepository.findResourceValidationByEmail).mockResolvedValue({
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
            expect(userRepository.createUserActivationToken).not.toHaveBeenCalled();
        });

        it("should throw when the resource validation is already confirmed", async () => {
            vi.mocked(userRepository.findResourceValidationByEmail).mockResolvedValue({
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
            expect(userRepository.createUserActivationToken).not.toHaveBeenCalled();
        });

        it("should throw when the challenger number has expired", async () => {
            vi.mocked(userRepository.findResourceValidationByEmail).mockResolvedValue({
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
            expect(userRepository.createUserActivationToken).not.toHaveBeenCalled();
        });

        it("should propagate error when confirmResourceValidationById throws", async () => {
            const error = new Error("DB error");
            setupConfirmEmailMocks();
            vi.mocked(userRepository.confirmResourceValidationById).mockRejectedValue(error);

            await expect(userService.confirmEmail(input))
                .rejects.toThrow(error);

            expect(userRepository.createUserActivationToken).not.toHaveBeenCalled();
        });

        it("should throw conflict when confirmResourceValidationById returns false", async () => {
            const { tx } = setupConfirmEmailMocks();
            vi.mocked(userRepository.confirmResourceValidationById).mockResolvedValue(false);

            await expect(userService.confirmEmail(input))
                .rejects.toMatchObject({
                    statusCode: 409,
                    message: "Resource validation already confirmed",
                });

            expect(generateActivationToken).toHaveBeenCalledWith(resourceValidation.userId, expect.any(String));
            expect(userRepository.confirmResourceValidationById).toHaveBeenCalledWith(resourceValidation.id, tx);
            expect(userRepository.createUserActivationToken).not.toHaveBeenCalled();
        });

        it("should propagate error when hashToken throws", async () => {
            const error = new Error("Hash error");
            setupConfirmEmailMocks();
            vi.mocked(hashToken).mockImplementation(() => { throw error; });

            await expect(userService.confirmEmail(input))
                .rejects.toThrow(error);

            expect(userRepository.createUserActivationToken).not.toHaveBeenCalled();
        });

        it("should propagate error when createUserActivationToken throws", async () => {
            const error = new Error("Create token error");
            const { tx } = setupConfirmEmailMocks();
            vi.mocked(userRepository.createUserActivationToken).mockRejectedValue(error);

            await expect(userService.confirmEmail(input))
                .rejects.toThrow(error);

            expect(userRepository.createUserActivationToken).toHaveBeenCalledWith(
                {
                    userId: resourceValidation.userId,
                    jti: mockJti,
                    tokenHash: "hashed-token",
                    expiresAt: new Date(mockExp * 1000),
                },
                tx,
            );
        });

        it("should confirm the resource validation, create activation token and return the token", async () => {
            const { tx } = setupConfirmEmailMocks();

            await expect(userService.confirmEmail(input))
                .resolves.toBe(mockActivationToken);

            expect(generateActivationToken).toHaveBeenCalledWith(resourceValidation.userId, expect.any(String));
            expect(userRepository.confirmResourceValidationById).toHaveBeenCalledWith(resourceValidation.id, tx);
            expect(hashToken).toHaveBeenCalledWith(mockActivationToken);
            expect(userRepository.createUserActivationToken).toHaveBeenCalledWith(
                {
                    userId: resourceValidation.userId,
                    jti: mockJti,
                    tokenHash: "hashed-token",
                    expiresAt: new Date(mockExp * 1000),
                },
                tx,
            );
        });
    });

    describe("activateUser", () => {
        const input: ActivateUserInput = {
            userId: "user-123",
            password: "password123",
            jti: "jti-123",
        };

        const activationToken = {
            id: "token-id",
            userId: "user-123",
            jti: "jti-123",
            tokenHash: "hashed-token",
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 60000),
            consumedAt: null,
        };

        const setupActivateUserMocks = () => {
            const tx = {} as any;

            vi.mocked(userRepository.findUserActivationTokenByJti).mockResolvedValue(activationToken);
            vi.mocked(hashPassword).mockResolvedValue("hashed-password");
            vi.mocked(userRepository.consumeUserActivationTokenByJti).mockResolvedValue(true);
            vi.mocked(userRepository.activateAndSetPassword).mockResolvedValue();
            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async (callback) => callback(tx)),
            } as any);

            return { tx };
        };

        it("should propagate error when findUserActivationTokenByJti throws", async () => {
            const error = new Error("Database error");
            vi.mocked(userRepository.findUserActivationTokenByJti).mockRejectedValue(error);

            await expect(userService.activateUser(input))
                .rejects.toThrow(error);

            expect(hashPassword).not.toHaveBeenCalled();
            expect(getPrisma).not.toHaveBeenCalled();
        });

        it("should throw NOT_FOUND if activation token does not exist", async () => {
            vi.mocked(userRepository.findUserActivationTokenByJti).mockResolvedValue(null);

            await expect(userService.activateUser(input))
                .rejects.toMatchObject({
                    statusCode: 404,
                    message: "Activation token not found",
                    code: "TOKEN_NOT_FOUND",
                });

            expect(userRepository.findUserActivationTokenByJti).toHaveBeenCalledWith(input.jti);
            expect(hashPassword).not.toHaveBeenCalled();
            expect(getPrisma).not.toHaveBeenCalled();
        });

        it("should throw UNAUTHORIZED if token already consumed", async () => {
            vi.mocked(userRepository.findUserActivationTokenByJti).mockResolvedValue({
                ...activationToken,
                consumedAt: new Date(),
            });

            await expect(userService.activateUser(input))
                .rejects.toMatchObject({
                    statusCode: 401,
                    message: "Activation token reuse detected",
                    code: "TOKEN_REUSE_DETECTED",
                });

            expect(logger.error).toHaveBeenCalledWith(
                {
                    userId: input.userId,
                    jti: input.jti,
                },
                "Activation token reuse detected",
            );

            expect(hashPassword).not.toHaveBeenCalled();
            expect(getPrisma).not.toHaveBeenCalled();
        });

        it("should throw when hashing password fails", async () => {
            const error = new Error("Failed to hash password");
            vi.mocked(userRepository.findUserActivationTokenByJti).mockResolvedValue(activationToken);
            vi.mocked(hashPassword).mockRejectedValue(error);

            await expect(userService.activateUser(input))
                .rejects.toThrow(error);

            expect(hashPassword).toHaveBeenCalledWith(input.password);
            expect(getPrisma).not.toHaveBeenCalled();
        });

        it("should propagate error when consumeUserActivationTokenByJti throws", async () => {
            const error = new Error("Consume error");
            setupActivateUserMocks();
            vi.mocked(userRepository.consumeUserActivationTokenByJti).mockRejectedValue(error);

            await expect(userService.activateUser(input))
                .rejects.toThrow(error);

            expect(userRepository.consumeUserActivationTokenByJti).toHaveBeenCalledWith(input.jti, expect.anything());
            expect(userRepository.activateAndSetPassword).not.toHaveBeenCalled();
        });

        it("should throw UNAUTHORIZED if consumeUserActivationTokenByJti returns false (race condition)", async () => {
            const { tx } = setupActivateUserMocks();
            vi.mocked(userRepository.consumeUserActivationTokenByJti).mockResolvedValue(false);

            await expect(userService.activateUser(input))
                .rejects.toMatchObject({
                    statusCode: 401,
                    message: "Activation token reuse detected",
                    code: "TOKEN_REUSE_DETECTED",
                });

            expect(logger.error).toHaveBeenCalledWith(
                {
                    userId: input.userId,
                    jti: input.jti,
                },
                "Activation token reuse detected: race condition on token consumption",
            );

            expect(userRepository.consumeUserActivationTokenByJti).toHaveBeenCalledWith(input.jti, tx);
            expect(userRepository.activateAndSetPassword).not.toHaveBeenCalled();
        });

        it("should propagate error when activateAndSetPassword throws", async () => {
            const error = new Error("Activation error");
            const { tx } = setupActivateUserMocks();
            vi.mocked(userRepository.activateAndSetPassword).mockRejectedValue(error);

            await expect(userService.activateUser(input))
                .rejects.toThrow(error);

            expect(userRepository.consumeUserActivationTokenByJti).toHaveBeenCalledWith(input.jti, tx);
            expect(userRepository.activateAndSetPassword).toHaveBeenCalledWith(
                input.userId,
                "hashed-password",
                tx,
            );
        });

        it("should hash password, consume token and activate user successfully", async () => {
            const { tx } = setupActivateUserMocks();

            await userService.activateUser(input);

            expect(hashPassword).toHaveBeenCalledWith(input.password);
            expect(userRepository.consumeUserActivationTokenByJti).toHaveBeenCalledWith(input.jti, tx);
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

        const setupResendEmailMocks = () => {
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
            });
            vi.mocked(resendConfirmationCode).mockResolvedValue(undefined);

            return { tx };
        };

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
            vi.mocked(userRepository.invalidateActiveEmailValidations).mockRejectedValue(error);

            await expect(userService.resendEmailConfirmationCode(email))
                .rejects.toThrow(error);

            expect(userRepository.createResourceValidation).not.toHaveBeenCalled();
            expect(resendConfirmationCode).not.toHaveBeenCalled();
        });

        it("should propagate an error when creating the new validation fails", async () => {
            const error = new Error("Failed to create validation");
            const { tx } = setupResendEmailMocks();
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
            const { tx } = setupResendEmailMocks();
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
            const { tx } = setupResendEmailMocks();

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