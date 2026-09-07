import { beforeEach, describe, expect, it, vi } from "vitest";
import authController from "../../../../src/modules/auth/auth.controller.js";

// Mock dependencies
import authService from "../../../../src/modules/auth/auth.service.js";

vi.mock("../../../../src/modules/auth/auth.service.js");

describe("Auth Controller (Unit)", () => {
    let req: any;
    let res: any;
    let next: any;

    beforeEach(() => {
        req = { body: {}, params: {}, user: {}, locals: {} };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };
        next = vi.fn();
        vi.clearAllMocks();
    });

    describe("login", () => {
        it("should return 200 with tokens on successful login", async () => {
            const requestBody = {
                email: "test@example.com",
                password: "Str0ng!P4ss",
            };
            req.body = requestBody;

            const mockTokens = {
                accessToken: "access-token",
                refreshToken: "refresh-token",
            };

            vi.mocked(authService.login).mockResolvedValue(mockTokens);

            await authController.login(req, res, next);

            expect(authService.login).toHaveBeenCalledWith({
                email: requestBody.email,
                password: requestBody.password,
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    accessToken: mockTokens.accessToken,
                    refreshToken: mockTokens.refreshToken,
                },
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe("refresh", () => {
        it("should return 200 with new tokens on successful refresh", async () => {
            const requestBody = {
                refreshToken: "old-refresh-token",
            };
            req.body = requestBody;

            const mockTokens = {
                accessToken: "new-access-token",
                refreshToken: "new-refresh-token",
            };

            vi.mocked(authService.rotateTokens).mockResolvedValue(mockTokens);

            await authController.refresh(req, res, next);

            expect(authService.rotateTokens).toHaveBeenCalledWith("old-refresh-token");

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    accessToken: mockTokens.accessToken,
                    refreshToken: mockTokens.refreshToken,
                },
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe("logout", () => {
        it("should return 200 on successful logout", async () => {
            const requestBody = {
                refreshToken: "refresh-token",
            };
            req.body = requestBody;

            vi.mocked(authService.logout).mockResolvedValue(undefined);

            await authController.logout(req, res, next);

            expect(authService.logout).toHaveBeenCalledWith("refresh-token");

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Logged out successfully",
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe("logoutAll", () => {
        it("should return 200 on successful logout from all devices", async () => {
            const requestBody = {
                refreshToken: "refresh-token",
            };
            req.body = requestBody;

            vi.mocked(authService.logoutAll).mockResolvedValue(undefined);

            await authController.logoutAll(req, res, next);

            expect(authService.logoutAll).toHaveBeenCalledWith("refresh-token");

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Logged out from all devices",
            });
            expect(next).not.toHaveBeenCalled();
        });
    });
});