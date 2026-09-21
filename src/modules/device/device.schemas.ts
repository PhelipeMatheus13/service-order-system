import { z } from "zod";
import registry from "../../shared/docs/registry.js";
import { emptyToNull } from "../../shared/utils/empty-to-null.js";

const deviceSchema = registry.register(
    "Device",
    z.object({
        id: z.string(),
        customerId: z.string(),
        type: z.string(),
        brand: z.string(),
        model: z.string(),
        color: z.string(),
        serialNumber: z.string().nullable(),
        imei: z.string().nullable(),
        createdAt: z.string(),
        updatedAt: z.string().nullable(),
    })
);

const createDeviceSchema = registry.register(
    "CreateDeviceSchema",
    z.object({
        customerId: z
            .string()
            .uuid("Customer ID must be a valid UUID")
            .openapi({example: "550e8400-e29b-41d4-a716-446655440000"}),

        type: z
            .string()
            .min(1, "Type is required")
            .max(100, "Type must contain at most 100 characters")
            .openapi({example: "Smartphone"}),

        brand: z
            .string()
            .min(1, "Brand is required")
            .max(100, "Brand must contain at most 100 characters")
            .openapi({example: "Apple"}),

        model: z
            .string()
            .min(1, "Model is required")
            .max(255, "Model must contain at most 255 characters")
            .openapi({ example: "iPhone 14"}),

        color: z
            .string()
            .min(1, "Color is required")
            .max(100, "Color must contain at most 100 characters")
            .openapi({ example: "Black"}),

        serialNumber: z.preprocess(
            emptyToNull,
            z.union([
                z.null(),
                z.string().max(255, "Serial number must contain at most 255 characters"),
            ])
        ).openapi({ example: "SN123456789"}),

        imei: z.preprocess(
            emptyToNull,
            z.union([
                z.null(),
                z.string().regex(/^\d{15}$/, "IMEI must contain exactly 15 digits"),
            ])
        ).openapi({type: "string" , example: "356938035643809"}),
    })
);

type createDeviceRequest = z.infer<typeof createDeviceSchema>;

const updateDeviceSchema = registry.register(
    "UpdateDeviceSchema",
    z.object({
        type: z.preprocess(
            emptyToNull,
            z.union([
                z.null(),
                z.string()
                    .max(100, "Type must contain at most 100 characters"),
            ])
        ).openapi({ example: "Smartphone" }),

        brand: z.preprocess(
            emptyToNull,
            z.union([
                z.null(),
                z.string()
                    .max(100, "Brand must contain at most 100 characters"),
            ])
        ).openapi({ example: "Apple" }),

        model: z.preprocess(
            emptyToNull,
            z.union([
                z.null(),
                z.string()
                    .max(255, "Model must contain at most 255 characters"),
            ])
        ).openapi({ example: "iPhone 14" }),

        color: z.preprocess(
            emptyToNull,
            z.union([
                z.null(),
                z.string()
                    .max(100, "Color must contain at most 100 characters"),
            ])
        ).openapi({ example: "Black" }),

        serialNumber: z.preprocess(
            emptyToNull,
            z.union([
                z.null(),
                z.string().max(255, "Serial number must contain at most 255 characters"),
            ])
        ).openapi({ example: "SN123456789" }),

        imei: z.preprocess(
            emptyToNull,
            z.union([
                z.null(),
                z.string().regex(/^\d{15}$/, "IMEI must contain exactly 15 digits"),
            ])
        ).openapi({ type: "string", example: "356938035643809" }),
    })
    .refine(
        (data) =>
            data.type !== null ||
            data.brand !== null ||
            data.model !== null ||
            data.color !== null ||
            data.serialNumber !== null ||
            data.imei !== null,
        { path: ["body"], message: "At least one field must be provided for update" }
    )
);

type updateDeviceRequest = z.infer<typeof updateDeviceSchema>;


export {
    deviceSchema,
    createDeviceSchema,
    updateDeviceSchema,
};

export type {
    createDeviceRequest,
    updateDeviceRequest,
};