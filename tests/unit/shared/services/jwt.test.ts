import { vi, describe, beforeEach, afterEach, it, expect } from "vitest";
import jwt from "jsonwebtoken";

import {
    generateAccessToken,
    generateRefreshToken,
    decodeAccessToken,
    decodeRefreshToken,
} from "../../../../src/shared/services/jwt.js";
import logger from "../../../../src/shared/config/logger.js";


vi.mock("jsonwebtoken", () => ({
    default: {
        sign: vi.fn(),
        verify: vi.fn(),
    },
}));

vi.mock("../../../../src/shared/config/logger.js", () => ({
    default: {
        warn: vi.fn(),
        error: vi.fn(),
    },
}));


// jsonwebtoken exposes sync and callback overloads. vi.mocked() can't infer the
// intended one, so narrow each function to the signature used here.
const sign = vi.mocked(jwt.sign as unknown as (payload: object, secret: string, options?: object) => string);
const verify = vi.mocked(jwt.verify as unknown as (token: string, secret: string) => unknown);

describe("JWT Service (Unit)", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv, SECRET: "secret", REFRESH_SECRET: "refresh" };
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    describe("generateAccessToken", () => {
        it("should throw if SECRET is not set", () => {
            delete process.env.SECRET;

            expect(() => generateAccessToken("user-123", "admin"))
                .toThrow("Missing required environment variable: SECRET");

            expect(sign).not.toHaveBeenCalled();
        });

        it("should generate access token using SECRET and expiration of 15m", () => {
            sign.mockReturnValue("access-token");
            const token = generateAccessToken("user-123", "admin");
            expect(token).toBe("access-token");
            expect(sign).toHaveBeenCalledWith({ id: "user-123", role: "admin" }, "secret", { expiresIn: "15m" });
        });        
    });

    describe("decodeAccessToken", () => {
        it("should throw if SECRET is not set", () => {
            delete process.env.SECRET;

            expect(() => decodeAccessToken("valid-token"))
                .toThrow("Missing required environment variable: SECRET");

            expect(verify).not.toHaveBeenCalled();
        });

        it("should throw ACCESS_TOKEN_EXPIRED error when token is expired", () => {
            const expiredError = new Error("jwt expired");
            expiredError.name = "TokenExpiredError";
            verify.mockImplementation(() => { throw expiredError; });

            expect(() => decodeAccessToken("expired-token"))
                .toThrow(
                    expect.objectContaining({
                        statusCode: 401,
                        code: "ACCESS_TOKEN_EXPIRED",
                        message: "Access token expired",
                    })
                );
        });

        it("should log a warning and throw INVALID_TOKEN for a known jwt library error", () => {
            const jwtError = new Error("invalid signature");
            jwtError.name = "JsonWebTokenError";
            verify.mockImplementation(() => { throw jwtError; });


            expect(() => decodeAccessToken("bad-token"))
                .toThrow(
                    expect.objectContaining({
                        statusCode: 401,
                        code: "INVALID_TOKEN",
                        message: "Invalid access token",
                    })
                );

            expect(logger.warn).toHaveBeenCalledWith({ err: jwtError }, "Invalid access token");
            
        });

        it("should log an error and throw INVALID_TOKEN for an unexpected error", () => {
            const unexpectedError = new Error("unexpected error");
            verify.mockImplementation(() => { throw unexpectedError; });

            expect(() => decodeAccessToken("bad-token"))
                .toThrow(
                    expect.objectContaining({
                        statusCode: 401,
                        code: "INVALID_TOKEN",
                        message: "Invalid access token",
                    })
                );

            expect(logger.error).toHaveBeenCalledWith({ err: unexpectedError }, "Unexpected error while verifying access token");
        });

        it("should throw an exception if verify returns a string instead of a payload", () => {
            verify.mockReturnValue("invalid-string");
            
            expect(() => decodeAccessToken("valid-token"))
                .toThrow(
                    expect.objectContaining({
                        statusCode: 401,
                        code: "INVALID_TOKEN",
                        message: "Invalid token format",
                    })
                );
        }); 

        it("should decode a valid token", () => {
            verify.mockReturnValue({ id: "user-123", role: "admin", iat: 123, exp: 456 });
            const decoded = decodeAccessToken("valid-token");
            expect(decoded).toEqual({ id: "user-123", role: "admin", iat: 123, exp: 456 });
            expect(verify).toHaveBeenCalledWith("valid-token", "secret");
        });        
    });    

    describe("generateRefreshToken", () => {
        it("should throw if REFRESH_SECRET is not set", () => {
            delete process.env.REFRESH_SECRET;

            expect(() => generateRefreshToken("user-123", "admin", "jti-uuid-123"))
                .toThrow("Missing required environment variable: REFRESH_SECRET");

            expect(sign).not.toHaveBeenCalled();
        });
        
        it("should generate refresh token using REFRESH_SECRET and expiration of 7d", () => {
            sign.mockReturnValue("refresh-token");
            const token = generateRefreshToken("user-123", "admin", "jti-uuid-123");
            expect(token).toBe("refresh-token");
            expect(sign).toHaveBeenCalledWith({ id: "user-123", role: "admin", jti: "jti-uuid-123" }, "refresh", { expiresIn: "7d" });
        });        
    });

    describe("decodeRefreshToken", () => {
        it("should throw if REFRESH_SECRET is not set", () => {
            delete process.env.REFRESH_SECRET;

            expect(() => decodeRefreshToken("valid-token"))
                .toThrow("Missing required environment variable: REFRESH_SECRET");

            expect(verify).not.toHaveBeenCalled();
        });

        it("should throw REFRESH_TOKEN_EXPIRED error when token is expired", () => {
            const expiredError = new Error("jwt expired");
            expiredError.name = "TokenExpiredError";
            verify.mockImplementation(() => { throw expiredError; });

            expect(() => decodeRefreshToken("expired-token"))
                .toThrow(
                    expect.objectContaining({
                        statusCode: 401,
                        code: "REFRESH_TOKEN_EXPIRED",
                        message: "Refresh token expired",
                    })
                );
        });

        it("should log a warning and throw INVALID_TOKEN for a known jwt library error", () => {
            const jwtError = new Error("invalid signature");
            jwtError.name = "JsonWebTokenError";
            verify.mockImplementation(() => { throw jwtError; });

            expect(() => decodeRefreshToken("bad-token"))
                .toThrow(
                    expect.objectContaining({
                        statusCode: 401,
                        code: "INVALID_TOKEN",
                        message: "Invalid refresh token",
                    })
                );

            expect(logger.warn).toHaveBeenCalledWith({ err: jwtError }, "Invalid refresh token");
        });

        it("should log an error and throw INVALID_TOKEN for an unexpected error", () => {
            const unexpectedError = new Error("unexpected error");
            verify.mockImplementation(() => { throw unexpectedError; });

            expect(() => decodeRefreshToken("bad-token"))
                .toThrow(
                    expect.objectContaining({
                        statusCode: 401,
                        code: "INVALID_TOKEN",
                        message: "Invalid refresh token",
                    })
                );

            expect(logger.error).toHaveBeenCalledWith({ err: unexpectedError }, "Unexpected error while verifying refresh token");
        });

        it("should throw an exception if verify returns a string instead of a payload", () => {
            verify.mockReturnValue("invalid-string");
            
            expect(() => decodeRefreshToken("valid-token"))
                .toThrow(
                    expect.objectContaining({
                        statusCode: 401,
                        code: "INVALID_TOKEN",
                        message: "Invalid token format",
                    })
                );
        });         

        it("should decode a valid token", () => {
            verify.mockReturnValue({ id: "user-123", role: "admin", iat: 123, exp: 456 });
            const decoded = decodeRefreshToken("valid-token");
            expect(decoded).toEqual({ id: "user-123", role: "admin", iat: 123, exp: 456 });
            expect(verify).toHaveBeenCalledWith("valid-token", "refresh");
        });
    });
});