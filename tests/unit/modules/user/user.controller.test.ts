import { beforeEach, describe, expect, it, vi } from "vitest";

import userController from "../../../../src/modules/user/user.controller.js";
import { UserRecord } from "../../../../src/modules/user/user.types.js";
import userService from "../../../../src/modules/user/user.service.js";

vi.mock("../../../../src/modules/user/user.service.js");

describe("User Controller (Unit)", () => {
    let req: any;
    let res: any;
    let next: any;

    beforeEach(() => {
        req = { body: {}, params: {}, user: {} };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };
        next = vi.fn();
        vi.clearAllMocks();
    });

    describe("register", () => {
        it("should return 201 on successful registration", async () => {
            const requestBody = {
                firstName: "John",
                lastName: "Doe",
                phoneNumber: null,
                email: "johndoe@hotmail.com",
                role: "ATTENDANT"
            };

            req.body = requestBody;

            const mockUserRecord = {
                id: "uuid-123",
                firstName: requestBody.firstName,
                lastName: requestBody.lastName,
                phoneNumber: requestBody.phoneNumber,
                email: requestBody.email,
                passwordHash: null,
                role: requestBody.role,
                active: false,
                createdAt: new Date(),
                updatedAt: null,
            } as UserRecord;

            vi.mocked(userService).createUser.mockResolvedValue(mockUserRecord);

            await userController.register(req, res, next);

            // validates the behavior of registerInputDTO
            expect(userService.createUser).toHaveBeenCalledWith({
                firstName: requestBody.firstName,
                lastName: requestBody.lastName,
                phoneNumber: requestBody.phoneNumber,
                email: requestBody.email,
                role: requestBody.role,
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "User created successfully",
                data: {
                    id: mockUserRecord.id,
                    firstName: mockUserRecord.firstName,
                    lastName: mockUserRecord.lastName,
                    phoneNumber: mockUserRecord.phoneNumber,
                    email: mockUserRecord.email,
                    role: mockUserRecord.role,
                    active: mockUserRecord.active,
                    createdAt: String(mockUserRecord.createdAt),
                    updatedAt: null,
                },
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe("getUser", () => {
        it("should return 200 with user data", async () => {
            const userId = "uuid-123";
            req.params.id = userId;

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

            vi.mocked(userService).getUserById.mockResolvedValue(mockUserRecord);

            await userController.getUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                // validates the behavior of userOutputDTO
                data: {
                    id: mockUserRecord.id,
                    firstName: mockUserRecord.firstName,
                    lastName: mockUserRecord.lastName,
                    phoneNumber: mockUserRecord.phoneNumber,
                    email: mockUserRecord.email,
                    role: mockUserRecord.role,
                    active: mockUserRecord.active,
                    createdAt: String(mockUserRecord.createdAt),
                    updatedAt: null,
                },
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with badRequest error if id is missing", async () => {
            await userController.getUser(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                code: "BAD_REQUEST",
                message: "User ID is required",
            }));
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe("deleteUser", () => {
        it("should return 200 if delete user is successful", async () => {
            req.params.id = "uuid-123";

            vi.mocked(userService).deleteUserById.mockResolvedValue();

            await userController.deleteUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'User deleted successfully'
            });
            expect(next).not.toHaveBeenCalled();
        });


        it("should call next with badRequest error if id is missing", async () => {
            await userController.deleteUser(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                code: "BAD_REQUEST",
                message: "User ID is required",
            }));
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe("listUsers", () => {
        it("should return 200 with users data", async () => {
            req.query = {
                limit: "1",
            };

            const mockUserRecords = [
                {
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
                },
            ] as UserRecord[];

            vi.mocked(userService).listUsers.mockResolvedValue(mockUserRecords);

            await userController.listUsers(req, res, next);

            expect(userService.listUsers).toHaveBeenCalledWith({
                options: {
                    limit: 1,
                },
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: [
                    {
                        id: mockUserRecords[0].id,
                        firstName: mockUserRecords[0].firstName,
                        lastName: mockUserRecords[0].lastName,
                        phoneNumber: mockUserRecords[0].phoneNumber,
                        email: mockUserRecords[0].email,
                        role: mockUserRecords[0].role,
                        active: mockUserRecords[0].active,
                        createdAt: String(mockUserRecords[0].createdAt),
                        updatedAt: null,
                    },
                ],
            });

            expect(next).not.toHaveBeenCalled();
        });
    });

    describe("confirmEmail", () => {
        it("should return 200 with activation token when email is confirmed", async () => {
            const requestBody = {
                email: "johndoe@hotmail.com",
                challengerNumber: "123456",
            };

            req.body = requestBody;

            const activationToken = "activation-token";

            vi.mocked(userService.confirmEmail).mockResolvedValue(activationToken);

            await userController.confirmEmail(req, res, next);

            expect(userService.confirmEmail).toHaveBeenCalledWith({
                email: requestBody.email,
                challengerNumber: requestBody.challengerNumber,
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    activationToken,
                },
                message: "Email confirmed successfully",
            });

            expect(next).not.toHaveBeenCalled();
        });
    });

    describe("resendEmailConfirmationCode", () => {
        it("should return 200 when the confirmation code is resent", async () => {
            const requestBody = {
                email: "johndoe@hotmail.com",
            };

            req.body = requestBody;

            vi.mocked(userService.resendEmailConfirmationCode).mockResolvedValue();

            await userController.resendEmailConfirmationCode(req, res, next);

            expect(userService.resendEmailConfirmationCode).toHaveBeenCalledWith(
                requestBody.email,
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "If the account is eligible, a new verification code has been sent",
            });

            expect(next).not.toHaveBeenCalled();
        });
    });

    describe("activateUser", () => {
        it("should return 200 on successful activation", async () => {
            req.user = { id: "user-123" };
            res.locals = { validationId: "validation-123" };
            req.body = { password: "newPassword" };

            vi.mocked(userService.activateUser).mockResolvedValue(undefined);

            await userController.activateUser(req, res, next);

            expect(userService.activateUser).toHaveBeenCalledWith({
                userId: "user-123",
                validationId: "validation-123",
                password: "newPassword",
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "User activated successfully",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with unauthorized error if user is missing", async () => {
            req.user = undefined;
            res.locals = { validationId: "validation-123" };
            req.body = { password: "newPassword" };

            await userController.activateUser(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 401,
                code: "UNAUTHORIZED",
                message: "User not authenticated",
            }));
            expect(userService.activateUser).not.toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
    });
});