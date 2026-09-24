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

const missingDeviceIdError = registry.registerComponent("responses", "missingDeviceIdError", {
    description: "Invalid request, missing device id",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
                success: false,
                error: {
                    code: "BAD_REQUEST",
                    message: "Device ID is required",
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

const deviceNotFoundError = registry.registerComponent("responses", "deviceNotFoundError", {
    description: "Device not found or does not exist",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Device not found",
                },
            },
        },
    },
});

// 409
const emailAlreadyExistsError = registry.registerComponent("responses", "emailAlreadyExistsError", {
    description: "Email already in use",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
                success: false,
                error: {
                    code: "ALREADY_EXISTS",
                    message: "Email already in use",
                },
            },
        },
    },
});

const deviceUniqueConstraintError = registry.registerComponent("responses", "deviceUniqueConstraintError", {
    description: "Device unique constraint error",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            examples: {
                serialNumberAlreadyExists: {
                    summary: "Serial number already exists",
                    value: {
                        success: false,
                        error: {
                            code: "ALREADY_EXISTS",
                            message: "Device with this serial number already exists",
                        },
                    },
                },

                imeiAlreadyExists: {
                    summary: "IMEI already exists",
                    value: {
                        success: false,
                        error: {
                            code: "ALREADY_EXISTS",
                            message: "Device with this IMEI already exists",
                        },
                    },
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

const createDeviceValidationError = registry.registerComponent("responses", "createDeviceValidationError", {
    description: "Create device validation error",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" },
            example: {
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Validation failed",
                    details: [
                        { field: "customerId", message: "Customer ID must be a valid UUID" },
                        { field: "type", message: "Type is required" },
                        { field: "brand", message: "Brand is required" },
                        { field: "model", message: "Model is required" },
                        { field: "color", message: "Color is required" },
                        { field: "serialNumber", message: "Serial number must contain at most 255 characters" },
                        { field: "imei", message: "IMEI must contain exactly 15 digits" },
                    ],
                },
            },
        },
    },
});

const updateDeviceValidationError = registry.registerComponent("responses", "updateDeviceValidationError", {
    description: "Update device validation error",
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
                                { field: "type", message: "Type must contain at most 100 characters" },
                                { field: "brand", message: "Brand must contain at most 100 characters" },
                                { field: "model", message: "Model must contain at most 255 characters" },
                                { field: "color", message: "Color must contain at most 100 characters" },
                                { field: "serialNumber", message: "Serial number must contain at most 255 characters" },
                                { field: "imei", message: "IMEI must contain exactly 15 digits" },
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

const createServiceOrderValidationError = registry.registerComponent("responses", "createServiceOrderValidationError", {
    description: "Create service order validation error",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" },
            example: {
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Validation failed",
                    details: [
                        { field: "deviceId", message: "Device ID must be a valid UUID" },
                        { field: "reportedProblem", message: "Reported problem must be at least 10 characters long" },
                    ],
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

export {
    missingUserIdError,
    missingCustomerIdError,
    missingDeviceIdError,
    userNotFoundError,
    customerNotFoundError,
    deviceNotFoundError,
    emailAlreadyExistsError,
    deviceUniqueConstraintError,
    registerValidationError,
    confirmEmailValidationError,
    activateUserValidationError,
    loginValidationError,
    refreshTokenValidationError,
    createCustomerValidationError,
    updateCustomerValidationError,
    createDeviceValidationError,
    updateDeviceValidationError,
    createServiceOrderValidationError,
    internalError,
};