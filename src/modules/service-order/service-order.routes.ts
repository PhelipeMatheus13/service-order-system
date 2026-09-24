// Node built‑ins
import express from "express";
import { z } from "zod";
// shared
import registry from "../../shared/docs/registry.js";
import { errorSchema } from "../../shared/docs/components/schemas.js"
import validate from "../../shared/middlewares/validate.js";
import { checkAccessToken, authorize } from "../../shared/middlewares/auth.js";
// local modules
import { serviceOrderSchema, createServiceOrderSchema } from "./service-order.schemas.js";
import serviceOrderController from "./service-order.controller.js";

const router = express.Router();

// POST
registry.registerPath({
    tags: ["Service-order"],
    method: "post",
    path: "/service-orders",
    summary: "Creates a new service order (requires ADMIN or ATTENDANT role)",
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: { "application/json": { schema: createServiceOrderSchema } },
        },
    },
    responses: {
        201: {
            description: "service order created successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: serviceOrderSchema,
                        message: z.string().openapi({ example: "service order created successfully" }),
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
                        authenticatedUserNoLongerExists: { $ref: "#/components/examples/authenticatedUserNoLongerExists" },
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
        422: { $ref: "#/components/responses/createServiceOrderValidationError" },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.post("/", checkAccessToken, authorize("ADMIN", "ATTENDANT"), validate(createServiceOrderSchema), serviceOrderController.CreateServiceOrder);

export default router;
