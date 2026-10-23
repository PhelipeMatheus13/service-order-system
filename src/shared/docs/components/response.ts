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

const missingServiceOrderIdError = registry.registerComponent("responses", "missingServiceOrderIdError", {
    description: "Invalid request, missing service order id",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
                success: false,
                error: {
                    code: "BAD_REQUEST",
                    message: "Service order ID is required",
                },
            },
        },
    },
});

const missingDiagnosisIdError = registry.registerComponent("responses", "missingDiagnosisIdError", {
    description: "Invalid request, missing diagnosis id",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
                success: false,
                error: {
                    code: "BAD_REQUEST",
                    message: "Diagnosis ID is required",
                },
            },
        },
    },
});

const missingFindingIdError = registry.registerComponent("responses", "missingFindingIdError", {
    description: "Invalid request, missing finding id",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
                success: false,
                error: {
                    code: "BAD_REQUEST",
                    message: "Finding ID is required",
                },
            },
        },
    },
});

const missingQuoteIdError = registry.registerComponent("responses", "missingQuoteIdError", {
    description: "Invalid request, missing Quote id",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
                success: false,
                error: {
                    code: "BAD_REQUEST",
                    message: "Quote ID is required",
                },
            },
        },
    },
});

const missingQuoteItemIdError = registry.registerComponent("responses", "missingQuoteItemIdError", {
    description: "Invalid request, missing Quote item id",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
                success: false,
                error: {
                    code: "BAD_REQUEST",
                    message: "Quote Item ID is required",
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

const serviceOrderNotFoundError = registry.registerComponent("responses", "serviceOrderNotFoundError", {
    description: "service order not found or does not exist",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Service order not found",
                },
            },
        },
    },
});

const diagnosisNotFoundError = registry.registerComponent("responses", "diagnosisNotFoundError", {
    description: "Diagnosis not found or does not exist",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Diagnosis not found",
                },
            },
        },
    },
});

const findingNotFoundError = registry.registerComponent("responses", "findingNotFoundError", {
    description: "Finding not found or does not exist",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Finding not found",
                },
            },
        },
    },
});

const quoteNotFoundError = registry.registerComponent("responses", "quoteNotFoundError", {
    description: "Quote not found or does not exist",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Quote not found",
                },
            },
        },
    },
});

const quoteOrFindingNotFoundError = registry.registerComponent("responses", "quoteOrFindingNotFoundError", {
    description: "Finding not found or does not exist",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            examples: {
                quoteNotFound: {
                    summary: "Quote not found",
                    value: {
                        success: false,
                        error: {
                            code: "NOT_FOUND",
                            message: "Quote not found",
                        },
                    },
                },
                findingNotFound: {
                    summary: "Finding not found",
                    value: {
                        success: false,
                        error: {
                            code: "NOT_FOUND",
                            message: "Finding not found",
                        },
                    },
                },
            },
        },
    },
});

const quoteItemNotFoundError  = registry.registerComponent("responses", "quoteItemNotFoundError", {
    description: "Quote item not found or does not exist",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Quote item not found",
                },
            },
        },
    },
});

const updateQuoteItemAndComponentsNotFoundError = registry.registerComponent("responses", "updateQuoteItemAndComponentsNotFoundError", {
    description: "Quote item or component not found",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            examples: {
                quoteItemNotFound: {
                    summary: "Quote item not found",
                    value: {
                        success: false,
                        error: {
                            code: "NOT_FOUND",
                            message: "Quote item not found",
                        },
                    },
                },
                quoteNotFound: {
                    summary: "Quote not found",
                    value: {
                        success: false,
                        error: {
                            code: "NOT_FOUND",
                            message: "Quote not found",
                        },
                    },
                },
                quoteItemOrComponentNotFound: {
                    summary: "Quote item or component deleted between read and update (race condition)",
                    value: {
                        success: false,
                        error: {
                            code: "NOT_FOUND",
                            message: "Quote item or component not found",
                        },
                    },
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

const cancelServiceOrderConflictError = registry.registerComponent("responses", "cancelServiceOrderConflictError", {
    description: "Service order cannot be cancelled",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            examples: {
                alreadyCancelled: {
                    summary: "Service order is already cancelled",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Service order is already cancelled",
                        },
                    },
                },
                notCancellable: {
                    summary: "Current status does not allow cancellation",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Service order cannot be cancelled in its current status",
                        },
                    },
                },
                statusChanged: {
                    summary: "Status changed during cancellation (race condition)",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Service order could not be cancelled because its status changed",
                        },
                    },
                },
            },
        },
    },
});

const startDiagnosisConflictError = registry.registerComponent("responses", "startDiagnosisConflictError", {
    description: "Diagnosis cannot be created",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            examples: {
                notWaitingForDiagnosis: {
                    summary: "Service order is not in WAITING_DIAGNOSIS status",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Service order is not waiting for diagnosis",
                        },
                    },
                },
                statusChanged: {
                    summary: "Status changed during diagnosis creation (race condition)",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Service order is no longer available to start diagnosis",
                        },
                    },
                },
                diagnosisAlreadyExists: {
                    summary: "A diagnosis already exists for this service order",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "A diagnosis already exists for this service order",
                        },
                    },
                },
            },
        },
    },
});

const createFindingConflictError = registry.registerComponent("responses", "createFindingConflictError", {
    description: "Finding cannot be created",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            examples: {
                diagnosisAlreadyCompleted: {
                    summary: "Diagnosis is already completed",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Diagnosis already completed",
                        },
                    },
                },
                diagnosisStateChanged: {
                    summary: "Diagnosis state changed during the request (race condition)",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Finding can no longer be created in its current state",
                        },
                    },
                },
            },
        },
    },
});


const completeDiagnosisConflictError = registry.registerComponent("responses", "completeDiagnosisConflictError", {
    description: "Diagnosis cannot be completed",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            examples: {
                diagnosisAlreadyCompleted: {
                    summary: "Diagnosis is already completed",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Diagnosis already completed",
                        },
                    },
                },
                diagnosisStateChanged: {
                    summary: "Diagnosis state changed during the request (race condition)",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Diagnosis can no longer be completed in its current state",
                        },
                    },
                },
                serviceOrderNoLongerInDiagnosis: {
                    summary: "Service order is no longer in diagnosis (race condition)",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Service order is no longer in diagnosis",
                        },
                    },
                },
            },
        },
    },
});

const createQuoteConflictError = registry.registerComponent("responses", "createQuoteConflictError", {
    description: "Quote cannot be created",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            examples: {
                diagnosisDoesNotBelongToServiceOrder: {
                    summary: "Diagnosis belongs to a different service order",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Diagnosis does not belong to this service order",
                        },
                    },
                },
                serviceOrderNoLongerAwaitingQuote: {
                    summary: "Service order status changed during the request (race condition)",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Service order is no longer awaiting quote",
                        },
                    },
                },
                currentQuoteAlreadyExists: {
                    summary: "Service order already has a current (non-superseded) quote",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Service order already has a current quote",
                        },
                    },
                },
            },
        },
    },
});

const createQuoteItemAndComponentsConflictError = registry.registerComponent("responses", "createQuoteItemAndComponentsConflictError", {
    description: "Quote item and components cannot be created",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            examples: {
                quoteNotDraft: {
                    summary: "Quote is not in DRAFT status",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Quote is not in DRAFT status",
                        },
                    },
                },
                findingDoesNotBelongToDiagnosis: {
                    summary: "Finding does not belong to the quote's diagnosis",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Finding does not belong to this quote's diagnosis",
                        },
                    },
                },
                findingNotRepairable: {
                    summary: "Finding is not repairable",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Finding is not repairable",
                        },
                    },
                },
                quoteNoLongerDraft: {
                    summary: "Quote status changed during the request (race condition)",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Quote is no longer in DRAFT status",
                        },
                    },
                },
            },
        },
    },
});

const updateQuoteItemAndComponentsConflictError = registry.registerComponent("responses", "updateQuoteItemAndComponentsConflictError", {
    description: "Quote item cannot be updated",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            examples: {
                quoteNotDraft: {
                    summary: "Quote is not in DRAFT status",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Quote is not in DRAFT status",
                        },
                    },
                },
                quoteNoLongerDraft: {
                    summary: "Quote status changed during the request (race condition)",
                    value: {
                        success: false,
                        error: {
                            code: "CONFLICT",
                            message: "Quote is no longer in DRAFT status",
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

const cancelServiceOrderValidationError = registry.registerComponent("responses", "cancelServiceOrderValidationError", {
    description: "Cancel service order validation error",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" },
            example: {
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Validation failed",
                    details: [
                        { field: "reason", message: "Reason must be at least 5 characters long" },
                    ],
                },
            },
        },
    },
});

const createFindingValidationError = registry.registerComponent("responses", "createFindingValidationError", {
    description: "Create finding validation error",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" },
            example: {
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Validation failed",
                    details: [
                        { field: "description", message: "Reason must be at least 5 characters long" },
                        { field: "repairable", message: "Expected a boolean value" },
                    ],
                },
            },
        },
    },
});

const updateFindingValidationError = registry.registerComponent("responses", "updateFindingValidationError", {
    description: "Update finding validation error",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" },
            example: {
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Validation failed",
                    details: [
                        { field: "description", message: "Reason must be at least 5 characters long" },
                        { field: "repairable", message: "Expected a boolean value" },
                    ],
                },
            },
        },
    },
});

const completeDiagnosisValidationError = registry.registerComponent("responses", "completeDiagnosisValidationError", {
    description: "Complete diagnosis validation error",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" },
            example: {
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Validation failed",
                    details: [
                        {
                            field: "result",
                            message: "Invalid enum value. Expected 'FAULT_FOUND' | 'NO_FAULT_FOUND' | 'INCONCLUSIVE', received 'DONE'",
                        },
                    ],
                },
            },
        },
    },
});

const createQuoteValidationError = registry.registerComponent("responses", "createQuoteValidationError", {
    description: "create quote validation error",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" },
            example: {
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Validation failed",
                    details: [
                        { field: "diagnosisId", message: "Diagnosis ID must be a valid UUID", },
                    ],
                },
            },
        },
    },
});


const createQuoteItemAndComponentsValidationError = registry.registerComponent("responses", "createQuoteItemAndComponentsValidationError", {
    description: "create quote item and components validation error",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" },
            example: {
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Validation failed",
                    details: [
                        { field: "findingId", message: "Finding ID must be a valid UUID" },
                        { field: "description", message: "Description is required" },
                        { field: "components.0.type", message: "Invalid option: expected one of \"PART\"|\"LABOR\"|\"OTHER\"" },
                        { field: "components.0.quantity", message: "Quantity must be greater than zero" },
                        { field: "components.0.unitPrice", message: "Unit price must have at most 2 decimal places" },
                    ],
                },
            },
        },
    },
});

const updateQuoteItemAndComponentsValidationError = registry.registerComponent("responses", "updateQuoteItemAndComponentsValidationError", {
    description: "Update quote item validation error",
    content: {
        "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" },
            examples: {
                invalidFields: {
                    summary: "Invalid field values",
                    value: {
                        success: false,
                        error: {
                            code: "VALIDATION_ERROR",
                            message: "Validation failed",
                            details: [
                                { field: "description", message: "Description must be at most 255 characters" },
                                { field: "components.0.componentId", message: "Component ID must be a valid UUID" },
                                { field: "components.0.type", message: "Invalid option: expected one of \"PART\"|\"LABOR\"|\"OTHER\"" },
                                { field: "components.0.quantity", message: "Quantity must be greater than zero" },
                                { field: "components.0.unitPrice", message: "Unit price must have at most 2 decimal places" },
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
    // 400
    missingUserIdError,
    missingCustomerIdError,
    missingDeviceIdError,
    missingServiceOrderIdError,
    missingDiagnosisIdError,
    missingFindingIdError,
    missingQuoteIdError,
    missingQuoteItemIdError,
    // 404
    userNotFoundError,
    customerNotFoundError,
    deviceNotFoundError,
    serviceOrderNotFoundError,
    diagnosisNotFoundError,
    findingNotFoundError,
    quoteNotFoundError,
    quoteOrFindingNotFoundError,
    quoteItemNotFoundError,
    updateQuoteItemAndComponentsNotFoundError,
    // 409
    emailAlreadyExistsError,
    deviceUniqueConstraintError,
    cancelServiceOrderConflictError,
    startDiagnosisConflictError,
    createFindingConflictError,
    completeDiagnosisConflictError,
    createQuoteConflictError,
    createQuoteItemAndComponentsConflictError,
    updateQuoteItemAndComponentsConflictError,
    // 422
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
    cancelServiceOrderValidationError,
    createFindingValidationError,
    updateFindingValidationError,
    completeDiagnosisValidationError,
    createQuoteValidationError,
    createQuoteItemAndComponentsValidationError,
    updateQuoteItemAndComponentsValidationError,
    // 500
    internalError,
};