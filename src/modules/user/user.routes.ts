import express from "express";
const router = express.Router();

import userController from "./user.controller.js";
import registry  from "../../shared/docs/registry.js";
import { z } from "zod";
import validate from "../../shared/middlewares/validate.js";
import { registerSchema, userSchema } from "./user.schemas.js";
import { registerLimiter } from "../../shared/middlewares/rate-limiter.js";
import { errorSchema } from "../../shared/docs/components/schemas.js"


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
                    schema: z.object({ success: z.boolean().openapi({ example: true }), data: userSchema}),
                },
            },
        },
        400: { $ref: "#/components/responses/MissingUserIdError" },
        404: { $ref: "#/components/responses/UserNotFoundError" },
        500: { $ref: "#/components/responses/InternalError" },
    },
});
router.get("/:id", userController.getUser);

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