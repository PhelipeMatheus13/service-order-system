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

const userSchema = registry.register(
    "User",
    z.object({
        id: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        phoneNumber: z.string().nullable(),
        email: z.string(),
        role: z.string(),
        active: z.boolean(),
        createdAt: z.string(),
        updatedAt: z.string().nullable(),
    })
);

const registerSchema = registry.register(
    "RegisterInput",
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

        phoneNumber: phoneNumberSchema.openapi({ example: "+55 (21) 98765-4321" }),

        email: z
            .email("Please provide a valid email address")
            .trim()
            .openapi({ example: "johndoe@hotmail.com" }),

        role: z
            .enum(["ADMIN", "ATTENDANT", "TECHNICIAN"])
            .openapi({ example: "ATTENDANT" }),
    })
);

const confirmEmailSchema = registry.register(
    "ConfirmEmailInput",
    z.object({
        email: z
            .email("Please provide a valid email address")
            .trim()
            .openapi({ example: "johndoe@hotmail.com" }),

        challengerNumber: z
            .string()
            .regex(/^\d{6}$/, "Challenger number must contain exactly 6 digits")
            .openapi({ example: "123456" }),
    }),
);



// Represents the validated request body received by the API.
// This type belongs to the transport layer and may differ from
// the domain input used by the service layer.
type RegisterRequest = z.infer<typeof registerSchema>;
type confirmEmailRequest = z.infer<typeof confirmEmailSchema>;


export {
    registerSchema,
    userSchema,
    confirmEmailSchema,
    normalizeEmptyValue,
    isValidPhone,
};

export type { 
    RegisterRequest,
    confirmEmailRequest
};