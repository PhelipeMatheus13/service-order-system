// Node built‑ins
import express from "express";
import { z } from "zod";
// shared
import registry from "../../shared/docs/registry.js";
import { errorSchema } from "../../shared/docs/components/schemas.js"
import validate from "../../shared/middlewares/validate.js";
import { checkAccessToken, authorize } from "../../shared/middlewares/auth.js";
// local modules
import {
    serviceOrderSchema,
    createServiceOrderSchema,
    cancelServiceOrderSchema,
    diagnosisSchema,
    findingSchema,
    createFindingSchema,
    updateFindingSchema,
    completeDiagnosisSchema,
    createQuoteSchema,
    quoteSchema,
} from "./service-order.schemas.js";
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
                        message: z.string().openapi({ example: "Service order created successfully" }),
                    }),
                },
            },
        },
        401: {
            description: "Authentication failed or because the authenticated user no longer exists",
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
        409: {
            description: "This device already has an active service order",
            content: {
                "application/json": {
                    schema: { $ref: "#/components/schemas/Error" },
                    example: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "This device already has an active service order",
                        },
                    },
                },
            },
        },
        422: { $ref: "#/components/responses/createServiceOrderValidationError" },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.post("/", checkAccessToken, authorize("ADMIN", "ATTENDANT"), validate(createServiceOrderSchema), serviceOrderController.createServiceOrder);

registry.registerPath({
    tags: ["Diagnosis"],
    method: "post",
    path: "/service-orders/{id}/diagnoses",
    summary: "Start and create a diagnosis (requires ADMIN or TECHNICIAN role)",
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ id: z.string() }),
    },
    responses: {
        201: {
            description: "Diagnosis successfully created",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: diagnosisSchema,
                        message: z.string().openapi({ example: "Diagnosis successfully created" }),
                    }),
                },
            },
        },
        400: { $ref: "#/components/responses/missingServiceOrderIdError" },
        401: {
            description: "Authentication failed or because the authenticated user no longer exists",
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
        409: { $ref: "#/components/responses/startDiagnosisConflictError" },
        404: { $ref: "#/components/responses/serviceOrderNotFoundError" },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.post("/:id/diagnoses", checkAccessToken, authorize("ADMIN", "TECHNICIAN"), serviceOrderController.startDiagnosis);

registry.registerPath({
    tags: ["Diagnosis"],
    method: "post",
    path: "/service-orders/diagnoses/{id}/findings",
    summary: "create a new finding (requires ADMIN or TECHNICIAN role)",
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ id: z.string() }),
        body: {
            content: { "application/json": { schema: createFindingSchema } },
        },
    },
    responses: {
        201: {
            description: "Finding successfully created",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: findingSchema,
                        message: z.string().openapi({ example: "Finding successfully created" }),
                    }),
                },
            },
        },
        400: { $ref: "#/components/responses/missingDiagnosisIdError" },
        401: {
            description: "Authentication failed or because the authenticated user no longer exists",
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
        409: { $ref: "#/components/responses/createFindingConflictError" },
        404: { $ref: "#/components/responses/diagnosisNotFoundError" },
        422: { $ref: "#/components/responses/createFindingValidationError" },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.post("/diagnoses/:id/findings", checkAccessToken, authorize("ADMIN", "TECHNICIAN"), serviceOrderController.createFinding);

registry.registerPath({
    tags: ["Quote"],
    method: "post",
    path: "/service-orders/{id}/quotes",
    summary: "create a new quote (requires ADMIN or ATTENDANT role)",
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ id: z.string() }),
        body: {
            content: { "application/json": { schema: createQuoteSchema } },
        },
    },
    responses: {
        201: {
            description: "Quote successfully created",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: quoteSchema,
                        message: z.string().openapi({ example: "Quote successfully created" }),
                    }),
                },
            },
        },
        400: { $ref: "#/components/responses/missingServiceOrderIdError" },
        401: {
            description: "Authentication failed or because the authenticated user no longer exists",
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
        409: { $ref: "#/components/responses/createQuoteConflictError" },
        404: { $ref: "#/components/responses/diagnosisNotFoundError" },
        422: { $ref: "#/components/responses/createQuoteValidationError" },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.post("/:id/quotes", checkAccessToken, authorize("ADMIN", "ATTENDANT"), validate(createQuoteSchema), serviceOrderController.createQuote);

// GET 
registry.registerPath({
    tags: ["Service-order"],
    method: "get",
    path: "/service-orders/{id}",
    summary: "Get a service order by ID",
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ id: z.string() }),
    },
    responses: {
        200: {
            description: "Service order retrieved successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: serviceOrderSchema,
                    }),
                },
            },
        },
        400: { $ref: "#/components/responses/missingServiceOrderIdError" },
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
        404: { $ref: "#/components/responses/serviceOrderNotFoundError" },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.get("/:id", checkAccessToken, serviceOrderController.getServiceOrderById);

registry.registerPath({
    tags: ["Service-order"],
    method: "get",
    path: "/service-orders",
    summary: "List all service orders",
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: "service orders retrieved successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: z.array(serviceOrderSchema),
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
router.get("/", checkAccessToken, serviceOrderController.listServiceOrders);

registry.registerPath({
    tags: ["Diagnosis"],
    method: "get",
    path: "/service-orders/diagnoses/{id}",
    summary: "Get a diagnosis by ID",
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ id: z.string() }),
    },
    responses: {
        200: {
            description: "Diagnosis retrieved successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: diagnosisSchema,
                    }),
                },
            },
        },
        400: { $ref: "#/components/responses/missingDiagnosisIdError" },
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
        404: { $ref: "#/components/responses/diagnosisNotFoundError" },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.get("/diagnoses/:id", checkAccessToken, serviceOrderController.getDiagnosisById);

registry.registerPath({
    tags: ["Diagnosis"],
    method: "get",
    path: "/service-orders/diagnoses/{id}/findings",
    summary: "Get findings by diagnosis ID",
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ id: z.string() }),
    },
    responses: {
        200: {
            description: "Findings retrieved successfully",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: z.array(findingSchema),
                    }),
                },
            },
        },
        400: { $ref: "#/components/responses/missingDiagnosisIdError" },
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
        404: { $ref: "#/components/responses/diagnosisNotFoundError" },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.get("/diagnoses/:id/findings", checkAccessToken, serviceOrderController.listFindingsByDiagnosisId);

// PATCH
registry.registerPath({
    tags: ["Service-order"],
    method: "patch",
    path: "/service-orders/{id}/cancel",
    summary: "Cancel service orders by ID (requires ADMIN or ATTENDANT role)",
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ id: z.string() }),
        body: {
            content: { "application/json": { schema: cancelServiceOrderSchema } },
        },
    },
    responses: {
        200: {
            description: "Service order successfully cancelled",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        message: z.string().openapi({ example: "Service order successfully cancelled" }),
                    }),
                },
            },
        },
        400: { $ref: "#/components/responses/missingServiceOrderIdError" },
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
        404: { $ref: "#/components/responses/serviceOrderNotFoundError" },
        409: { $ref: "#/components/responses/cancelServiceOrderConflictError" },
        422: { $ref: "#/components/responses/cancelServiceOrderValidationError" },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.patch("/:id/cancel", checkAccessToken, authorize("ADMIN", "ATTENDANT"), validate(cancelServiceOrderSchema), serviceOrderController.cancelServiceOrder);

registry.registerPath({
    tags: ["Diagnosis"],
    method: "patch",
    path: "/service-orders/findings/{id}",
    summary: "Update findings by ID (requires ADMIN or TECHNICIAN role)",
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ id: z.string() }),
        body: {
            content: { "application/json": { schema: updateFindingSchema } },
        },
    },
    responses: {
        200: {
            description: "Findings successfully updated",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: findingSchema,
                        message: z.string().openapi({ example: "Findings successfully updated" }),
                    }),
                },
            },
        },
        400: { $ref: "#/components/responses/missingFindingIdError" },
        401: {
            description: "Authentication failed or because the authenticated user no longer exists",
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
        404: { $ref: "#/components/responses/findingNotFoundError" },
        409: {
            description: "Finding can no longer be updated in its current state",
            content: {
                "application/json": {
                    schema: { $ref: "#/components/schemas/Error" },
                    example: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Finding can no longer be updated in its current state",
                        },
                    },
                },
            },
        },
        422: { $ref: "#/components/responses/updateFindingValidationError" },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.patch("/findings/:id", checkAccessToken, authorize("ADMIN", "TECHNICIAN"), validate(updateFindingSchema), serviceOrderController.updateFinding);

registry.registerPath({
    tags: ["Diagnosis"],
    method: "patch",
    path: "/service-orders/diagnoses/{id}/complete",
    summary: "Complete diagnosis by ID (requires ADMIN or TECHNICIAN role)",
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ id: z.string() }),
        body: {
            content: { "application/json": { schema: completeDiagnosisSchema } },
        },
    },
    responses: {
        200: {
            description: "Diagnosis successfully completed",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        data: diagnosisSchema,
                        message: z.string().openapi({ example: "Diagnosis successfully completed" }),
                    }),
                },
            },
        },
        400: { $ref: "#/components/responses/missingDiagnosisIdError" },
        401: {
            description: "Authentication failed or because the authenticated user no longer exists",
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
        404: { $ref: "#/components/responses/diagnosisNotFoundError" },
        409: { $ref: "#/components/responses/completeDiagnosisConflictError" },
        422: { $ref: "#/components/responses/completeDiagnosisValidationError" },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.patch("/diagnoses/:id/complete", checkAccessToken, authorize("ADMIN", "TECHNICIAN"), validate(completeDiagnosisSchema), serviceOrderController.completeDiagnosis);

// DELETE
registry.registerPath({
    tags: ["Diagnosis"],
    method: "delete",
    path: "/service-orders/findings/{id}",
    summary: "Delete findings by ID (requires ADMIN or TECHNICIAN role)",
    security: [{ bearerAuth: [] }],
    request: {
        params: z.object({ id: z.string() }),
    },
    responses: {
        200: {
            description: "Findings successfully deleted",
            content: {
                "application/json": {
                    schema: z.object({
                        success: z.boolean().openapi({ example: true }),
                        message: z.string().openapi({ example: "Findings successfully deleted" }),
                    }),
                },
            },
        },
        400: { $ref: "#/components/responses/missingFindingIdError" },
        401: {
            description: "Authentication failed",
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
        404: { $ref: "#/components/responses/findingNotFoundError" },
        409: {
            description: "Finding can no longer be deleted in its current state",
            content: {
                "application/json": {
                    schema: { $ref: "#/components/schemas/Error" },
                    example: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Finding can no longer be deleted in its current state",
                        },
                    },
                },
            },
        },
        500: { $ref: "#/components/responses/internalError" },
    }
});
router.delete("/findings/:id", checkAccessToken, authorize("ADMIN", "TECHNICIAN"), serviceOrderController.deleteFinding);

export default router;
