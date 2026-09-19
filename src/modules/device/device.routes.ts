// Node built‑ins
import express from "express";
import { z } from "zod";
// shared
import registry from "../../shared/docs/registry.js";
import { errorSchema } from "../../shared/docs/components/schemas.js"
import validate from "../../shared/middlewares/validate.js";
import { checkAccessToken, authorize } from "../../shared/middlewares/auth.js";
// local modules
import { deviceSchema, createDeviceSchema } from "./device.schema.js";
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


export default router;
