import { z } from "zod";
import registry  from "../registry.js";

const errorSchema = registry.register(
    "Error",
    z.object({
        success: z.boolean().openapi({ example: false }),
        error: z.object({
            code: z.string().openapi({ example: "ERROR_CODE" }),
            message: z.string().openapi({ example: "Error description" }),
        }),
    })
);

const validationErrorSchema = registry.register(
    "ValidationError",
    z.object({
        success: z.boolean().openapi({ example: false }),
        error: z.object({
            code: z.string().openapi({ example: "VALIDATION_ERROR" }),
            message: z.string().openapi({ example: "Validation failed" }),
            details: z.array(
                z.object({
                    field: z.string(),
                    message: z.string(),
                })
            ).openapi({
                example: [{ field: "name", message: "Name is required" }],
            }),
        }),
    })
);

export {
    errorSchema,
    validationErrorSchema,
}