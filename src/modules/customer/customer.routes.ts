// Node built‑ins
import express from "express";
import { z } from "zod";
// shared
import registry from "../../shared/docs/registry.js";
import { errorSchema } from "../../shared/docs/components/schemas.js"
import validate from "../../shared/middlewares/validate.js";
import { checkAccessToken, authorize } from "../../shared/middlewares/auth.js";
// local modules
import { createCustomerSchema, updateCustomerSchema, customerSchema } from "./customer.schemas.js";
import customerController from "./customer.controller.js";

const router = express.Router();

// POST
registry.registerPath({
    tags: ["Customer"],
    method: "post",
    path: "/customers",
    summary: "Creates a new customer (requires ADMIN or ATTENDANT role)",
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: { "application/json": { schema: createCustomerSchema } },
        },
    },
    responses: {
        200: {
            description: "Customer created successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: customerSchema,
                        message: z.string().openapi({ example: "Customer created successfully" }),
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
        422: { $ref: "#/components/responses/createCustomerValidationError" },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.post("/", checkAccessToken, authorize("ADMIN", "ATTENDANT"), validate(createCustomerSchema), customerController.createCustomer);


// GET 
registry.registerPath({
    tags: ["Customer"],
    method: "get",
    path: "/customers/:id",
    summary: "Get a customer by ID",
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ id: z.string() }),
    },
    responses: {
        200: {
            description: "Customer retrieved successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: customerSchema,
                    }),
                },
            },
        },
        400: { $ref: "#/components/responses/missingCustomerIdError" },
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
        404: { $ref: "#/components/responses/customerNotFoundError" },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.get("/:id", checkAccessToken, customerController.getCustomer);

registry.registerPath({
    tags: ["Customer"],
    method: "get",
    path: "/customers",
    summary: "List customers",
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: "Customer retrieved successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: z.array(customerSchema),
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
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.get("/", checkAccessToken, customerController.listCustomers);

// PATCH
registry.registerPath({
    tags: ["Customer"],
    method: "patch",
    path: "/customers/:id",
    summary: "Updates a customer by ID (requires ADMIN or ATTENDANT role)",
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ id: z.string() }),
        body: {
            content: { "application/json": { schema: updateCustomerSchema } },
        },
    },
    responses: {
        200: {
            description: "Customer updated successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: customerSchema,
                        message: z.string().openapi({ example: "Customer updated successfully" }),
                    }),
                },
            },
        },
        400: { $ref: "#/components/responses/missingCustomerIdError" },
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
        404: { $ref: "#/components/responses/customerNotFoundError" },
        422: { $ref: "#/components/responses/updateCustomerValidationError" },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.patch("/:id", checkAccessToken, authorize("ADMIN", "ATTENDANT"), validate(updateCustomerSchema), customerController.updateCustomer);


export default router;