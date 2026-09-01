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

const activateUserSchema = registry.register(
    "activateUserInput",
    z.object({
        password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
            .regex(/[a-z]/, "Password must contain at least one lowercase letter")
            .regex(/[0-9]/, "Password must contain at least one number")
            .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character")
            .openapi({
                example: "Str0ng!P4ss",
                description: "Must have 8+ chars, one uppercase, one lowercase, one number, and one special character"
            }),

        confirmPassword: z
            .string()
            .openapi({ example: "Str0ng!P4ss" }),
    })
    .refine(
        ({ password, confirmPassword }) => password === confirmPassword,
        { path: ["confirmPassword"], message: "Passwords do not match", }
    )
);

const resendEmailConfirmationSchema = registry.register(
    "ResendEmailConfirmationInput",
    z.object({
        email: z
            .email("Please provide a valid email address")
            .trim()
            .openapi({ example: "johndoe@hotmail.com" }),
    }),
);


// Represents the validated request body received by the API.
// This type belongs to the transport layer and may differ from
// the domain input used by the service layer.
type RegisterRequest = z.infer<typeof registerSchema>;
type confirmEmailRequest = z.infer<typeof confirmEmailSchema>;
type activateUserRequest = z.infer<typeof activateUserSchema>;


export {
    registerSchema,
    userSchema,
    confirmEmailSchema,
    activateUserSchema,
    resendEmailConfirmationSchema,
    normalizeEmptyValue,
    isValidPhone,
};

export type {
    RegisterRequest,
    confirmEmailRequest,
    activateUserRequest,
};