import registry  from "../registry.js";

const internalError = registry.registerComponent("responses", "InternalError", {
    description: "Internal error",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
                success: false,
                error: {
                    code: "INTERNAL_ERROR",
                    message: "Internal server error",
                },
            },
        },
    },
});

const registerValidationError = registry.registerComponent("responses", "RegisterValidationError", {
    description: "Register validation error",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" },
            example: {
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Validation failed",
                    details: [
                        { field: "firstName", message: "First name must be at least 3 characters long" },
                        { field: "lastName", message: "Last name must be at least 3 characters long" },
                        { field: "phoneNumber", message: "Please provide a valid phone number" },
                        { field: "email", message: "Please provide a valid email address" },
                        { field: "role", message: "Invalid option: expected one of \"ADMIN\"|\"ATTENDANT\"|\"TECHNICIAN\"" },
                    ],
                },
            },
        },
    },
});

const missingUserIdError = registry.registerComponent("responses", "MissingUserIdError", {
    description: "Invalid request, missing user id",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
                success: false,
                error: {
                    code: "BAD_REQUEST",
                    message: "User ID is required",
                },
            },
        },
    },
});

const userNotFoundError = registry.registerComponent("responses", "UserNotFoundError", {
    description: "User not found or does not exist",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "User not found",
                },
            },
        },
    },
});

const confirmEmailValidationError = registry.registerComponent("responses", "confirmEmailValidationError", {
    description: "Confirm email validation error",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" },
            example: {
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Validation failed",
                    details: [
                        { field: "email", message: "Please provide a valid email address" },
                        { field: "challengerNumber", message: "Challenger number must contain exactly 6 digits" },
                    ],
                },
            },
        },
    },
});

const activateUserValidationError = registry.registerComponent("responses", "activateUserValidationError", {
    description: "Activate user validation error",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" },
            example: {
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Validation failed",
                    details: [
                        { field: "password", message: "Password must be at least 8 characters" },
                        { field: "confirmPassword", message: "Passwords do not match" },
                    ],
                },
            },
        },
    },
});

export {
    internalError,
    registerValidationError,
    missingUserIdError, 
    userNotFoundError,
    confirmEmailValidationError
};