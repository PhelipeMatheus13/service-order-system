import { vi, describe, afterAll, beforeAll, beforeEach, it, expect } from "vitest";

import { checkToken, authorize } from "../../../../src/shared/middlewares/auth.js";
import { decodeAccessToken } from "../../../../src/shared/services/jwt.js";
import logger from "../../../../src/shared/config/logger.js";

vi.mock("../../../../src/shared/services/jwt.js");

vi.mock("../../../../src/shared/config/logger.js", () => ({
    default: {
        error: vi.fn(),
    },
}));

describe("Auth Middleware (Unit)", () => {
    let req: any;
    let res: any;
    let next: any;

    const originalEnv = process.env;

    afterAll(() => {
        process.env = originalEnv;
    });

    beforeAll(() => {
        process.env = {
            ...originalEnv,
            SECRET: "secret",
            REFRESH_SECRET: "refresh",
        };
    });

    beforeEach(() => {
        req = { headers: {} };
        res = {};
        next = vi.fn();
        vi.clearAllMocks();
    });

    describe("checkToken", () => {
        it("should call next with unauthorized error if no token provided", () => {
            checkToken(req, res, next);
            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 401,
                    code: "UNAUTHORIZED",
                    message: "Access denied",
                })
            );
        });

        it("should pass decode errors to next", () => {
            req.headers.authorization = "Bearer invalid.token";
            const decodeErr = new Error("decode failed");

            vi.mocked(decodeAccessToken).mockImplementation(() => {
                throw decodeErr;
            });

            checkToken(req, res, next);
            expect(logger.error).toHaveBeenCalledWith({ err: decodeErr }, "Token validation failed:");
            expect(next).toHaveBeenCalledWith(decodeErr);
        });

        it("should extract token correctly", () => {
            req.headers.authorization = "Bearer valid.token";
            vi.mocked(decodeAccessToken).mockReturnValue({ id: "uuid", role: "user", exp: Date.now() + 1000 });

            checkToken(req, res, next);
            expect(decodeAccessToken).toHaveBeenCalledWith("valid.token");
            expect(req.user).toEqual({
                id: "uuid",
                role: "user",
            });
            expect(next).toHaveBeenCalledWith();
        });
    });

    describe("authorize", () => {
        it("should throw forbidden if req.user is missing", () => {
            const middleware = authorize("admin");
            req.user = undefined;

            expect(() => middleware(req, res, next)).toThrow(
                expect.objectContaining({
                    statusCode: 403,
                    code: "FORBIDDEN",
                    message: "Access denied",
                })
            );

            expect(next).not.toHaveBeenCalled();
        });
        
        it("should throw forbidden if user role is not allowed", () => {
            const middleware = authorize("admin");
            req.user = { id: "uuid-123", role: "user" };

            expect(() => middleware(req, res, next)).toThrow(
                expect.objectContaining({
                    statusCode: 403,
                    code: "FORBIDDEN",
                    message: "Access denied",
                })
            );

            expect(next).not.toHaveBeenCalled();
        });

        it("should call next if user role is allowed", () => {
            const middleware = authorize("admin", "user");
            req.user = { id: "uuid-123", role: "user" };

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith();
        });
    });
});