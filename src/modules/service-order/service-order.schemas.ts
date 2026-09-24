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
        createdAt: z.string(),
        updatedAt: z.string().nullable(),
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

type createServiceOrderRequest = z.infer<typeof createServiceOrderSchema>;

export {
    serviceOrderSchema,
    createServiceOrderSchema,
};

export type {
    createServiceOrderRequest,
};