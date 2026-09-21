// Node built‑ins
import express from "express";
import { z } from "zod";
// shared
import registry from "../../shared/docs/registry.js";
import { errorSchema } from "../../shared/docs/components/schemas.js"
import validate from "../../shared/middlewares/validate.js";
import { checkAccessToken, authorize } from "../../shared/middlewares/auth.js";
// local modules
import { deviceSchema, createDeviceSchema, updateDeviceSchema } from "./device.schemas.js";
import deviceController from "./device.controller.js";

const router = express.Router();

// POST
registry.registerPath({
    tags: ["Device"],
    method: "post",
    path: "/devices",
    summary: "Creates a new customer device (requires ADMIN or ATTENDANT role)",
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: { "application/json": { schema: createDeviceSchema } },
        },
    },
    responses: {
        201: {
            description: "Device created successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: deviceSchema,
                        message: z.string().openapi({ example: "Device created successfully" }),
                    }),
                },
            },
        },
        401: {
            description: "Missing, invalid or expired access token",
            content: {
                "application/json": {
                    schema: errorSchema,
                    examples: {
                        missingAccessToken: { $ref: "#/components/examples/missingAccessToken" },
                        invalidAccessToken: { $ref: "#/components/examples/invalidAccessToken" },
                        accessTokenExpired: { $ref: "#/components/examples/accessTokenExpired" },
                    },
                },
            },
        },
        403: {
            description: "Forbidden, user does not have the required role",
            content: {
                "application/json": {
                    schema: errorSchema,
                    example: {
                        success: false,
                        error: {
                            code: "FORBIDDEN",
                            message: "Access denied",
                        },
                    },
                },
            },
        },
        404: { $ref: "#/components/responses/customerNotFoundError"  },
        409: { $ref: "#/components/responses/deviceUniqueConstraintError" },
        422: { $ref: "#/components/responses/createDeviceValidationError" },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.post("/", checkAccessToken, authorize("ADMIN", "ATTENDANT"), validate(createDeviceSchema), deviceController.createDevice);

// GET 
registry.registerPath({
    tags: ["Device"],
    method: "get",
    path: "/devices/:id",
    summary: "Get a Device by ID",
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ id: z.string() }),
    },
    responses: {
        200: {
            description: "Device retrieved successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: deviceSchema,
                    }),
                },
            },
        },
        400: { $ref: "#/components/responses/missingDeviceIdError" },
        401: {
            description: "Missing, invalid or expired access token",
            content: {
                "application/json": {
                    schema: errorSchema,
                    examples: {
                        missingAccessToken: { $ref: "#/components/examples/missingAccessToken" },
                        invalidAccessToken: { $ref: "#/components/examples/invalidAccessToken" },
                        accessTokenExpired: { $ref: "#/components/examples/accessTokenExpired" },
                    },
                },
            },
        },
        404: { $ref: "#/components/responses/deviceNotFoundError" },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.get("/:id", checkAccessToken, deviceController.getDevice);

registry.registerPath({
    tags: ["Device"],
    method: "get",
    path: "/devices",
    summary: "List devices",
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: "Device retrieved successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: z.array(deviceSchema),
                    }),
                },
            },
        },
        401: {
            description: "Missing, invalid or expired access token",
            content: {
                "application/json": {
                    schema: errorSchema,
                    examples: {
                        missingAccessToken: { $ref: "#/components/examples/missingAccessToken" },
                        invalidAccessToken: { $ref: "#/components/examples/invalidAccessToken" },
                        accessTokenExpired: { $ref: "#/components/examples/accessTokenExpired" },
                    },
                },
            },
        },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.get("/", checkAccessToken, deviceController.listDevices);

// PATCH
registry.registerPath({
    tags: ["Device"],
    method: "patch",
    path: "/devices/:id",
    summary: "Updates a devices by ID (requires ADMIN or ATTENDANT role)",
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ id: z.string() }),
        body: {
            content: { "application/json": { schema: updateDeviceSchema } },
        },
    },
    responses: {
        200: {
            description: "Device updated successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: deviceSchema,
                        message: z.string().openapi({ example: "Device updated successfully" }),
                    }),
                },
            },
        },
        400: { $ref: "#/components/responses/missingDeviceIdError" },
        401: {
            description: "Missing, invalid or expired access token",
            content: {
                "application/json": {
                    schema: errorSchema,
                    examples: {
                        missingAccessToken: { $ref: "#/components/examples/missingAccessToken" },
                        invalidAccessToken: { $ref: "#/components/examples/invalidAccessToken" },
                        accessTokenExpired: { $ref: "#/components/examples/accessTokenExpired" },
                    },
                },
            },
        },
        403: {
            description: "Forbidden, user does not have the required role",
            content: {
                "application/json": {
                    schema: errorSchema,
                    example: {
                        success: false,
                        error: {
                            code: "FORBIDDEN",
                            message: "Access denied",
                        },
                    },
                },
            },
        },
        404: { $ref: "#/components/responses/deviceNotFoundError" },
        409: { $ref: "#/components/responses/deviceUniqueConstraintError" },
        422: { $ref: "#/components/responses/updateDeviceValidationError" },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.patch("/:id", checkAccessToken, authorize("ADMIN", "ATTENDANT"), validate(updateDeviceSchema), deviceController.updateDevice);


export default router;
