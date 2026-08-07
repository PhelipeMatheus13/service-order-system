import { beforeEach, describe, expect, it, vi } from "vitest";

import userController from "../../../../src/modules/user/user.controller.js";
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
                name: "John doe",
                email: "johndoe@hotmail.com",
                password: "Johndoe@password",
                confirmpassword: "Johndoe@password",
            };

            req.body = requestBody;

            vi.mocked(userService).createUser.mockResolvedValue("uuid-123");

            await userController.register(req, res, next);

            // validates the behavior of registerInputDTO
            expect(userService.createUser).toHaveBeenCalledWith({
                name: requestBody.name,
                email: requestBody.email,
                password: requestBody.password,
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "User created successfully",
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe("getUser", () => {
        it("should return 200 with user data", async () => {
            const userId = "uuid-123";
            req.params.id = userId;

            const mockUserRecord = {
                id: userId,
                name: "John doe",
                email: "johndoe@hotmail.com",
                password: "hashPassword",
                createdAt: new Date(),
                updatedAt: null,
            };

            vi.mocked(userService).getUserById.mockResolvedValue(mockUserRecord);

            await userController.getUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                // validates the behavior of userOutputDTO
                data: {
                    id: mockUserRecord.id,
                    name: mockUserRecord.name,
                    email: mockUserRecord.email,
                    createdAt: String(mockUserRecord.createdAt),
                    updatedAt: String(mockUserRecord.updatedAt),
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
});