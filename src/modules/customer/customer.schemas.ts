import { z } from "zod";
import registry from "../../shared/docs/registry.js";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const normalizeEmptyValue = (value: unknown): unknown => {
    if (value === null || value === undefined) return null;

    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
    }

    return value;
};

const isValidPhone = (value: string): boolean => {
    try {
        const phone = parsePhoneNumberFromString(value, "BR");
        return phone?.isValid() ?? false;
    } catch {
        return false;
    }
};

const phoneNumberSchema = z.preprocess(
    normalizeEmptyValue,
    z.union([
        z.null(),
        z.string().refine(isValidPhone, {
            message: "Please provide a valid phone number",
        }),
    ])
);


const customerSchema = registry.register(
    "Customer",
    z.object({
        id: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
        phoneNumber: z.string().nullable(),
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

        phoneNumber: phoneNumberSchema.openapi({ example: "+55 (21) 98765-4321" }),
    })
);

type CreateCustomerRequest = z.infer<typeof createCustomerSchema>;

const updateCustomerSchema = registry.register(
    "UpdateCustomer",
    z.object({
        firstName: z.preprocess(
            normalizeEmptyValue,
            z.union([z.null(), z.string().min(3, "First name must be at least 3 characters long")])
        ),

        lastName: z.preprocess(
            normalizeEmptyValue,
            z.union([z.null(), z.string().min(3, "Last name must be at least 3 characters long")])
        ),

        email: z.preprocess(
            normalizeEmptyValue,
            z.union([z.null(), z.email("Please provide a valid email address")])
        ),

        phoneNumber: phoneNumberSchema,
    })
    .refine(
        (data) =>
            data.firstName !== null ||
            data.lastName !== null ||
            data.email !== null ||
            data.phoneNumber !== null,
        { message: "At least one field must be provided for update" }
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
