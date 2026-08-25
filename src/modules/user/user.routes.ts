import express from "express";
const router = express.Router();

import userController from "./user.controller.js";
import registry from "../../shared/docs/registry.js";
import { z } from "zod";
import { registerLimiter, confirmEmailLimiter } from "../../shared/middlewares/rate-limiter.js";
import validate from "../../shared/middlewares/validate.js";
import { registerSchema, userSchema, confirmEmailSchema } from "./user.schemas.js";
import { errorSchema } from "../../shared/docs/components/schemas.js"

// POST
registry.registerPath({
    tags: ["User"],
    method: "post",
    path: "/users/register",
    summary: "Registers a new user",
    request: {
        body: {
            content: { "application/json": { schema: registerSchema } }, // inside RegisterPath → Zod object
        },
    },
    responses: {
        201: {
            description: "User created successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: userSchema,
                        message: z.string().openapi({ example: "User created successfully" })
                    }),
                },
            },
        },
        409: {
            description: "Email already in use",
            content: {
                "application/json": {
                    schema: errorSchema, // inside RegisterPath → Zod object
                    example: {
                        success: false,
                        error: { code: "ALREADY_EXISTS", message: "Email already in use, please choose another" },
                    },
                },
            },
        },
        422: { $ref: "#/components/responses/RegisterValidationError" }, // points to the entire response → $ref string
        500: { $ref: "#/components/responses/InternalError" },           // points to the entire response → $ref string
    },
});
router.post("/register", registerLimiter, validate(registerSchema), userController.register);

registry.registerPath({
    tags: ["User"],
    method: "post",
    path: "/users/confirm-email",
    summary: "Confirm user email",
    request: {
        body: {
            content: { "application/json": { schema: confirmEmailSchema } },
        },
    },
    responses: {
        200: {
            description: "Email confirmed successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: z.object({
                            activationToken: z.string().openapi({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }),
                        }),
                        message: z.string().openapi({ example: "Email confirmed successfully" }),
                    }),
                },
            },
        },
        401: {
            description: "Invalid or expired challenger number",
            content: {
                "application/json": {
                    schema: errorSchema,
                    examples: {
                        invalidChallengerNumber: { $ref: "#/components/examples/invalidChallengerNumber" },
                        challengerNumberExpired: { $ref: "#/components/examples/challengerNumberExpired" },
                    },
                },
            },
        },
        404: {
            description: "Resource validation not found",
            content: {
                "application/json": {
                    schema: errorSchema,
                    example: {
                        success: false,
                        error: { code: "NOT_FOUND", message: "Resource validation not found" },
                    },
                },
            },
        },
        409: {
            description: "Resource validation already confirmed",
            content: {
                "application/json": {
                    schema: errorSchema,
                    example: {
                        success: false,
                        error: { code: "CONFLICT", message: "Resource validation already confirmed" },
                    },
                },
            },
        },
        422: { $ref: "#/components/responses/confirmEmailValidationError" },
        500: { $ref: "#/components/responses/InternalError" },
    },
})
router.post("/confirm-email", confirmEmailLimiter, validate(confirmEmailSchema), userController.confirmEmail);

// GET
registry.registerPath({
    tags: ["User"],
    method: "get",
    path: "/users/",
    summary: "List users",
    request: {
        query: z.object({
            limit: z.coerce.number().int().positive().optional().openapi({
                example: 5,
            }),
        }),
    },
    responses: {
        200: {
            description: "Users listed successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: z.array(userSchema),
                    }),
                },
            },
        },
        500: { $ref: "#/components/responses/InternalError" },
    },
});
router.get("/", userController.listUsers);

registry.registerPath({
    tags: ["User"],
    method: "get",
    path: "/users/{id}",
    summary: "Retrieves a user by id",
    request: {
        params: z.object({ id: z.string() }),
    },
    responses: {
        200: {
            description: "User retrieved successfully",
            content: {
                "application/json": {
                    schema: z.object({ success: z.boolean().openapi({ example: true }), data: userSchema }),
                },
            },
        },
        400: { $ref: "#/components/responses/MissingUserIdError" },
        404: { $ref: "#/components/responses/UserNotFoundError" },
        500: { $ref: "#/components/responses/InternalError" },
    },
});
router.get("/:id", userController.getUser);

// DELETE
registry.registerPath({
    tags: ["User"],
    method: "delete",
    path: "/users/{id}",
    summary: "Deletes a user by id",
    request: {
        params: z.object({ id: z.string() }),
    },
    responses: {
        200: {
            description: "User deleted successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        message: z.string().openapi({ example: "User deleted successfully" }),
                    }),
                },
            },
        },
        400: { $ref: "#/components/responses/MissingUserIdError" },
        404: { $ref: "#/components/responses/UserNotFoundError" },
        500: { $ref: "#/components/responses/InternalError" },
    },
});
router.delete("/:id", userController.deleteUser);

export default router;