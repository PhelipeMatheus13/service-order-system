// Node built‑ins
import express from "express";
import { z } from "zod";
// shared
import validate from "../../shared/middlewares/validate.js";
import { loginLimiter, refreshLimiter } from "../../shared/middlewares/rate-limiter.js";
import registry from "../../shared/docs/registry.js";
import { errorSchema } from "../../shared/docs/components/schemas.js"
// local modules
import { loginSchema, tokensOutputSchema, refreshSchema, logoutSchema, logoutAllSchema } from "./auth.schemas.js";
import authController from "./auth.controller.js";

const router = express.Router();

// POST
registry.registerPath({
    tags: ["Auth"],
    method: "post",
    path: "/auth/login",
    summary: "Authenticates the user and returns a access token and an refresh token",
    request: {
        body: {
            content: { "application/json": { schema: loginSchema } },
        },
    },
    responses: {
        200: {
            description: "Successful login, returns access and refresh tokens",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: tokensOutputSchema,
                    }),
                },
            },
        },
        401: {
            description: "Invalid credentials",
            content: {
                "application/json": {
                    schema: errorSchema,
                    example: {
                        success: false,
                        error: {
                            code: "INVALID_CREDENTIALS",
                            message: "Invalid email or password",
                        },
                    },
                },
            },
        },
        422: { $ref: "#/components/responses/loginValidationError" },
        500: { $ref: "#/components/responses/InternalError" },
    }
});
router.post("/login", loginLimiter, validate(loginSchema), authController.login);

registry.registerPath({
    tags: ["Auth"],
    method: "post",
    path: "/auth/refresh",
    summary: "Generates a new access token and refresh token using a valid refresh token",
    request: {
        body: {
            content: { "application/json": { schema: refreshSchema } },
        },
    },
    responses: {
        200: {
            description: "Tokens refreshed successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: tokensOutputSchema,
                    }),
                },
            },
        },
        401: {
            description: "Invalid, reused, expired or not found refresh token",
            content: {
                "application/json": {
                    schema: errorSchema,
                    examples: {
                        invalidRefreshToken: { $ref: "#/components/examples/invalidRefreshToken" },
                        refreshTokenReuseDetected: { $ref: "#/components/examples/refreshTokenReuseDetected" },
                        refreshTokenExpired: { $ref: "#/components/examples/refreshTokenExpired" },
                        refreshTokenNotFound: { $ref: "#/components/examples/refreshTokenNotFound" },
                    },
                },
            },
        },
        422: { $ref: "#/components/responses/refreshTokenValidationError" },
        500: { $ref: "#/components/responses/InternalError" },
    }
});
router.post("/refresh", refreshLimiter, validate(refreshSchema), authController.refresh);


registry.registerPath({
    tags: ["Auth"],
    method: "post",
    path: "/auth/logout",
    summary: "Invalidates the current session's refresh token",
    request: {
        body: {
            content: { "application/json": { schema: logoutSchema } },
        },
    },
    responses: {
        200: {
            description: "Logout successful, session revoked",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        message: z.string().openapi({ example: "Logged out successfully" })
                    }),
                },
            },
        },
        401: {
            description: "Invalid, expired or not found refresh token",
            content: {
                "application/json": {
                    schema: errorSchema,
                    examples: {
                        invalidRefreshToken: { $ref: "#/components/examples/invalidRefreshToken" },
                        refreshTokenExpired: { $ref: "#/components/examples/refreshTokenExpired" },
                        refreshTokenNotFound: { $ref: "#/components/examples/refreshTokenNotFound" },
                    },
                },
            },
        },
        404: { $ref: "#/components/responses/refreshTokenNotFoundError" },
        422: { $ref: "#/components/responses/refreshTokenValidationError" },
        500: { $ref: "#/components/responses/InternalError" },
    }
});
router.post("/logout", validate(logoutSchema), authController.logout);


registry.registerPath({
    tags: ["Auth"],
    method: "post",
    path: "/auth/logout-all",
    summary: "Invalidates all active sessions for the authenticated user",
    request: {
        body: {
            content: { "application/json": { schema: logoutAllSchema } },
        },
    },
    responses: {
        200: {
            description: "Logout successful, session revoked",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        message: z.string().openapi({ example: "Logged out successfully" })
                    }),
                },
            },
        },
        401: {
            description: "Invalid, reused, expired or not found refresh token",
            content: {
                "application/json": {
                    schema: errorSchema,
                    examples: {
                        invalidRefreshToken: { $ref: "#/components/examples/invalidRefreshToken" },
                        refreshTokenReuseDetected: { $ref: "#/components/examples/refreshTokenReuseDetected" },
                        refreshTokenExpired: { $ref: "#/components/examples/refreshTokenExpired" },
                        refreshTokenNotFound: { $ref: "#/components/examples/refreshTokenNotFound" },
                    },
                },
            },
        },
        422: { $ref: "#/components/responses/refreshTokenValidationError" },
        500: { $ref: "#/components/responses/InternalError" },
    }
});
router.post("/logout-all", validate(logoutAllSchema), authController.logoutAll);

export default router;
