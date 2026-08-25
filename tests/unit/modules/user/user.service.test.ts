import { beforeEach, describe, expect, it, vi } from "vitest";

import userService from "../../../../src/modules/user/user.service.js";
import { RegisterInput, UserRecord, ConfirmEmailInput } from "../../../../src/modules/user/user.types.js";

import userRepository from "../../../../src/modules/user/user.repository.js";
import { generateActivationToken } from "../../../../src/shared/services/jwt.js"
import { hashPassword } from "../../../../src/shared/services/hash.js";

vi.mock("../../../../src/modules/user/user.repository.js");
vi.mock("../../../../src/shared/services/jwt.js");
vi.mock("../../../../src/shared/services/hash.js");

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

        const resourceValidation = {
            id: "validation-1",
            createdAt: new Date(),
            userId: "user-1",
            resourceType: "EMAIL" as const,
            challengerNumber: "123456",
            expiresAt: null,
            confirmedAt: null,
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

            expect(generateActivationToken)
                .toHaveBeenCalledWith("user-1");

            expect(userRepository.confirmResourceValidationById)
                .toHaveBeenCalledWith("validation-1");
        });
    });
});