import { z } from "zod";
import registry from "../../shared/docs/registry.js";
import { emptyToNull } from "../../shared/utils/empty-to-null.js";
import { isValidPhoneNumber } from "../../shared/utils/phone.js";

const customerSchema = registry.register(
    "Customer",
    z.object({
        id: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
        phoneNumber: z.string(),
        createdAt: z.string(),
        updatedAt: z.string().nullable(),
    })
);

const createCustomerSchema = registry.register(
    "CreateCustomer",
    z.object({
        firstName: z
            .string()
            .trim()
            .min(3, "First name must be at least 3 characters long")
            .openapi({ example: "John" }),

        lastName: z
            .string()
            .trim()
            .min(3, "Last name must be at least 3 characters long")
            .openapi({ example: "Doe" }),

        email: z
            .email("Please provide a valid email address")
            .trim()
            .openapi({ example: "johndoe@hotmail.com" }),

        phoneNumber: z.string().refine(isValidPhoneNumber, {
            message: "Please provide a valid phone number",
        }).openapi({ example: "+55 (21) 98765-4321" }),
    })
);

type CreateCustomerRequest = z.infer<typeof createCustomerSchema>;

const updateCustomerSchema = registry.register(
    "UpdateCustomer",
    z.object({
        firstName: z.preprocess(
            emptyToNull,
            z.union([
                z.null(),
                z.string().min(3, "First name must be at least 3 characters long"),
            ])
        ).openapi({ example: "John" }),

        lastName: z.preprocess(
            emptyToNull,
            z.union([
                z.null(),
                z.string().min(3, "Last name must be at least 3 characters long"),
            ])
        ).openapi({ example: "Doe" }),

        email: z.preprocess(
            emptyToNull,
            z.union([
                z.null(),
                z.email("Please provide a valid email address"),
            ])
        ).openapi({ example: "johndoe@hotmail.com" }),

        phoneNumber: z.preprocess(
            emptyToNull,
            z.union([
                z.null(),
                z.string().refine(isValidPhoneNumber, { message: "Please provide a valid phone number" }),
            ])
        ).openapi({ example: "+55 (21) 98765-4321" }),
    })
    .refine(
        (data) =>
            data.firstName !== null ||
            data.lastName !== null ||
            data.email !== null ||
            data.phoneNumber !== null,
        { path: ["body"], message: "At least one field must be provided for update" }
    )
);

type UpdateCustomerRequest = z.infer<typeof updateCustomerSchema>;

export {
    customerSchema,
    createCustomerSchema,
    updateCustomerSchema,
};

export type {
    CreateCustomerRequest,
    UpdateCustomerRequest,
};
