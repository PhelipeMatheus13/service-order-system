import { z } from "zod";
import registry from "../../shared/docs/registry.js";

const serviceOrderSchema = registry.register(
    "ServiceOrderSchema",
    z.object({
        id: z.string(),
        customerId: z.string(),
        deviceId: z.string(),
        reportedProblem: z.string(),
        status: z.string(),
        createdBy: z.string(),
        cancelledAt: z.string().nullable(), 
        cancelReason: z.string().nullable(), 
        finishedAt: z.string().nullable(), 
        createdAt: z.string(),
        updatedAt: z.string().nullable(),
    })
);

const diagnosisSchema = registry.register(
    "diagnosisSchema",
    z.object({
        id: z.string(),
        serviceOrderId: z.string(),
        result: z.string(),
        createdBy: z.string(),
        createdAt: z.string(),
        completedBy: z.string().nullable(),
        completedAt: z.string().nullable(),
    })
);

const findingSchema = registry.register(
    "findingSchema",
    z.object({
        id: z.string(),
        diagnosisId: z.string(),
        description: z.string(),
        repairable: z.boolean(),
        createdById: z.string(),
        createdAt: z.string(),
        updatedAt: z.string().nullable(),
        updatedById: z.string().nullable(),
    })
);

const createServiceOrderSchema = registry.register(
    "CreateServiceOrderSchema",
    z.object({
        deviceId: z
            .string()
            .uuid("Device ID must be a valid UUID")
            .openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),

        reportedProblem: z
            .string()
            .trim()
            .min(10, "Reported problem must be at least 10 characters long")
            .max(2000, "Reported problem must contain at most 2000 characters")
            .openapi({
                example: "Screen is cracked and the touch is not responding on the right side.",
            }),
    })
);

type CreateServiceOrderRequest = z.infer<typeof createServiceOrderSchema>;

const cancelServiceOrderSchema = registry.register(
    "CancelServiceOrderSchema",
    z.object({
        reason: z
            .string()
            .trim()
            .min(5, "Cancellation reason must be at least 5 characters long")
            .max(500, "Cancellation reason must contain at most 500 characters")
            .openapi({
                example: "I no longer need the service.",
            }),
    })
);

type CancelServiceOrderRequest = z.infer<typeof cancelServiceOrderSchema>;

const createFindingSchema = registry.register(
    "createFindingSchema",
    z.object({
        description: z
            .string()
            .trim()
            .min(5, "Description must be at least 5 characters long")
            .max(2000, "Description must contain at most 2000 characters")
            .openapi({
                example: "Battery capacity below expected level.",
            }),

        repairable: z
            .boolean()
            .openapi({
                example: true,
                description: "Whether this finding can be repaired.",
            }),
    })
);

type CreateFindingRequest = z.infer<typeof createFindingSchema>;

const updateFindingSchema = registry.register(
    "updateFindingSchema",
    z.object({
        description: z
            .string()
            .trim()
            .min(5, "Description must be at least 5 characters long")
            .max(2000, "Description must contain at most 2000 characters")
            .openapi({
                example: "Battery capacity below expected level.",
            }),

        repairable: z
            .boolean()
            .openapi({
                example: true,
                description: "Whether this finding can be repaired.",
            }),
    })
);

type UpdateFindingRequest = z.infer<typeof updateFindingSchema>;

const completeDiagnosisSchema = registry.register(
    "completeDiagnosisSchema",
    z.object({
        result: z
            .enum(["FAULT_FOUND", "NO_FAULT_FOUND", "INCONCLUSIVE"])
            .openapi({
                example: "FAULT_FOUND",
                description: "The Result of the diagnosis",
            }),
    })
);

type CompleteDiagnosisRequest = z.infer<typeof completeDiagnosisSchema>;

export {
    serviceOrderSchema,
    createServiceOrderSchema,
    cancelServiceOrderSchema,
    diagnosisSchema,
    findingSchema,
    createFindingSchema,
    updateFindingSchema,
    completeDiagnosisSchema,
};

export type {
    CreateServiceOrderRequest,
    CancelServiceOrderRequest,
    CreateFindingRequest,
    UpdateFindingRequest,
    CompleteDiagnosisRequest
};