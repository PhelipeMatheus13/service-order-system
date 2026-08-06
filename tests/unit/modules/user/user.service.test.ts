import { beforeEach, describe, expect, it, vi } from "vitest";

import userService from "../../../../src/modules/user/user.service.js";
import userRepository from "../../../../src/modules/user/user.repository.js";
import { hashPassword } from "../../../../src/shared/services/hash.js";

vi.mock("../../../../src/modules/user/user.repository.js");
vi.mock("../../../../src/shared/services/hash.js");

describe("User Service (Unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createUser", () => {
        const registerData = {
            name: "John doe",
            email: "johndoe@hotmail.com",
            password: "Johndoe@password"
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

        it("should throw if fail in hashService.hashPassword", async () => {
            vi.mocked(userRepository).existsByEmail.mockResolvedValue(false);
            vi.mocked(hashPassword).mockResolvedValue("hashedPassword");
            vi.mocked(userRepository).create.mockRejectedValue(new Error("fake error"));

            await expect(userService.createUser(registerData))
                .rejects.toThrow("fake error");
        });

        it("should create user successfully", async () => {
            vi.mocked(userRepository).existsByEmail.mockResolvedValue(false);
            vi.mocked(hashPassword).mockResolvedValue("hashedPassword");
            vi.mocked(userRepository).create.mockResolvedValue("uuid-123");

            const result = await userService.createUser(registerData);

            expect(userRepository.existsByEmail).toHaveBeenCalledWith(registerData.email);
            expect(hashPassword).toHaveBeenCalledWith(registerData.password);
            expect(userRepository.create).toHaveBeenCalledWith({
                name: registerData.name,
                email: registerData.email,
                password: "hashedPassword",
            });

            expect(result).toBe("uuid-123");
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
                id: userId,
                name: "John doe",
                email: "johndoe@hotmail.com",
                password: "hashPassword",
                createdAt: new Date(),
                updatedAt: null,
            };

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
});