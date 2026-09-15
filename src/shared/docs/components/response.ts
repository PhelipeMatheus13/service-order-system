import registry from "../registry.js";

// 400
const missingUserIdError = registry.registerComponent("responses", "missingUserIdError", {
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

const missingCustomerIdError = registry.registerComponent("responses", "missingCustomerIdError", {
    description: "Invalid request, missing customer id",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
                success: false,
                error: {
                    code: "BAD_REQUEST",
                    message: "Customer ID is required",
                },
            },
        },
    },
});

// 404
const userNotFoundError = registry.registerComponent("responses", "userNotFoundError", {
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

const customerNotFoundError = registry.registerComponent("responses", "customerNotFoundError", {
    description: "Customer not found or does not exist",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Customer not found",
                },
            },
        },
    },
});

// 500
const internalError = registry.registerComponent("responses", "internalError", {
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

// VALIDATION ERRORS (422)
const registerValidationError = registry.registerComponent("responses", "registerValidationError", {
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

const loginValidationError = registry.registerComponent("responses", "loginValidationError", {
    description: "Login validation error",
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
                        { field: "password", message: "Passwords is required" },
                    ],
                },
            },
        },
    },
});

const refreshTokenValidationError = registry.registerComponent("responses", "refreshTokenValidationError", {
    description: "Login validation error",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" },
            example: {
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Validation failed",
                    details: [
                        { field: "refreshToken", message: "Refresh token is required" },
                    ],
                },
            },
        },
    },
});

const createCustomerValidationError = registry.registerComponent("responses", "createCustomerValidationError", {
    description: "Create customer validation error",
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
                        { field: "email", message: "Please provide a valid email address" },
                        { field: "phoneNumber", message: "Please provide a valid phone number" },
                    ],
                },
            },
        },
    },
});

const updateCustomerValidationError = registry.registerComponent("responses", "updateCustomerValidationError", {
    description: "Update customer validation error",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" },
            examples: {
                invalidFields: {
                    summary: "Invalid fields values",
                    value: {
                        success: false,
                        error: {
                            code: "VALIDATION_ERROR",
                            message: "Validation failed",
                            details: [
                                { field: "firstName", message: "First name must be at least 3 characters long" },
                                { field: "lastName", message: "Last name must be at least 3 characters long" },
                                { field: "email", message: "Please provide a valid email address" },
                                { field: "phoneNumber", message: "Please provide a valid phone number" },
                            ],
                        },
                    },
                },
                noFieldsProvided: {
                    summary: "No fields provided for update",
                    value: {
                        success: false,
                        error: {
                            code: "VALIDATION_ERROR",
                            message: "Validation failed",
                            details: [
                                { field: "body", message: "At least one field must be provided for update" },
                            ],
                        },
                    },
                },
            },
        },
    },
});


export {
    missingUserIdError,
    missingCustomerIdError,
    userNotFoundError,
    customerNotFoundError,
    internalError,
    registerValidationError,
    confirmEmailValidationError,
    activateUserValidationError,
    loginValidationError,
    refreshTokenValidationError,
    createCustomerValidationError,
    updateCustomerValidationError,
};