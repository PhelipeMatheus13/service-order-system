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
        // TODO: check output, createdBy or createdById
        createdBy: z.string(),
        cancelledAt: z.string().nullable(),
        cancelReason: z.string().nullable(),
        finishedAt: z.string().nullable(),
        createdAt: z.string(),
        updatedAt: z.string().nullable(),
    })
);

const diagnosisSchema = registry.register(
    "DiagnosisSchema",
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
    "FindingSchema",
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

const quoteSchema = registry.register(
    "QuoteSchema",
    z.object({
        id: z.string(),
        serviceOrderId: z.string(),
        diagnosisId: z.string(),
        status: z.string(),
        submittedAt: z.string().nullable(),
        respondedAt: z.string().nullable(),
        createdById: z.string(),
        createdAt: z.string(),
        updatedAt: z.string().nullable(),
    })
);

const quoteItemWithComponentsSchema = registry.register(
    "QuoteItemWithComponentsSchema",
    z.object({
        id: z.string(),
        quoteId: z.string(),
        findingId: z.string(),
        description: z.string(),
        decision: z.string().nullable(),
        createdById: z.string(),
        createdAt: z.string(),
        updatedById: z.string().nullable(),
        updatedAt: z.string().nullable(),
        quoteItemComponents: z.array(
            z.object({
                id: z.string(),
                quoteItemId: z.string(),
                type: z.string(),
                description: z.string(),
                quantity: z.number(),
                unitPrice: z.number(),
                createdAt: z.string(),
                updatedAt: z.string().nullable(),
            }),
        ),
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
                example: "Phone won't charge",
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
    "CreateFindingSchema",
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
    "UpdateFindingSchema",
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
    "CompleteDiagnosisSchema",
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

const createQuoteSchema = registry.register(
    "CreateQuoteSchema",
    z.object({
        diagnosisId: z
            .string()
            .uuid("Diagnosis ID must be a valid UUID")
            .openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    })
);

type CreateQuoteRequest = z.infer<typeof createQuoteSchema>;

const quoteItemComponentSchema = registry.register(
    "QuoteItemComponentInput",
    z.object({
        type: z
            .enum(["PART", "LABOR", "OTHER"])
            .openapi({
                example: "PART",
                description: "Type of the cost component",
            }),
        description: z
            .string()
            .trim()
            .min(1, "Component description is required")
            .max(255, "Component description must be at most 255 characters")
            .openapi({ example: "Battery" }),

        quantity: z
            .number()
            .int("Quantity must be an integer")
            .positive("Quantity must be greater than zero")
            .openapi({ example: 1 }),

        unitPrice: z
            .number()
            .positive("Unit price must be greater than zero")
            .refine(
                (n) => /^\d+(\.\d{1,2})?$/.test(n.toString()),
                "Unit price must have at most 2 decimal places",
            )
            .openapi({ example: 80.00 }),
    }),
);

const createQuoteItemSchema = registry.register(
    "CreateQuoteItemSchema",
    z.object({
        findingId: z
            .string()
            .uuid("Finding ID must be a valid UUID")
            .openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),

        description: z
            .string()
            .trim()
            .min(1, "Description is required")
            .max(255, "Description must be at most 255 characters")
            .openapi({ example: "Battery replacement" }),

        components: z
            .array(quoteItemComponentSchema)
            .min(1, "At least one component is required")
            .openapi({
                description: "Cost breakdown for this quote item. At least one component is required.",
            }),
    }),
);

type CreateQuoteItemRequest = z.infer<typeof createQuoteItemSchema>;

export {
    serviceOrderSchema,
    diagnosisSchema,
    findingSchema,
    quoteSchema,
    createServiceOrderSchema,
    cancelServiceOrderSchema,
    createFindingSchema,
    updateFindingSchema,
    completeDiagnosisSchema,
    createQuoteSchema,
    createQuoteItemSchema,
    quoteItemWithComponentsSchema,
};

export type {
    CreateServiceOrderRequest,
    CancelServiceOrderRequest,
    CreateFindingRequest,
    UpdateFindingRequest,
    CompleteDiagnosisRequest,
    CreateQuoteRequest,
    CreateQuoteItemRequest,
};