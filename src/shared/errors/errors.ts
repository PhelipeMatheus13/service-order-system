interface AppErrorOptions {
    statusCode?: number;
    code?: string;
    message?: string;
    details?: unknown;
}

interface AppErrorJSON {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}

class AppError extends Error {
    statusCode: number;
    code: string;
    details: unknown;

    constructor({ statusCode = 500, code = "INTERNAL_ERROR", message = "Internal server error", details = null}: AppErrorOptions = {}) {
        super(message); 
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        // captureStackTrace generates the stack trace and removes the internal frames from the AppError creation process
        // keeping the stack cleaner and more focused on the actual point of error in the application
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON(): AppErrorJSON {
        return {
            success: false,
            error: {
                code: this.code,
                message: this.message,
                // Only add details to the object if this.details exists.
                ...(this.details ? { details: this.details }: {}),
            },
        };
    }
}

const badRequest = (options: AppErrorOptions = {}): AppError => new AppError({
    statusCode: 400,
    code: "BAD_REQUEST",
    message: "Bad request",
    ...options,
});

const unauthorized = (options: AppErrorOptions = {}): AppError => new AppError({
    statusCode: 401,
    code: "UNAUTHORIZED",
    message: "Authentication required",
    ...options,
});

const forbidden = (options: AppErrorOptions = {}): AppError => new AppError({
    statusCode: 403,
    code: "FORBIDDEN",
    message: "Access denied",
    ...options,
});

const notFound = (options: AppErrorOptions = {}): AppError => new AppError({
    statusCode: 404,
    code: "NOT_FOUND",
    message: "Resource not found",
    ...options,
});

const conflict = (options: AppErrorOptions = {}): AppError => new AppError({
    statusCode: 409,
    code: "CONFLICT",
    message: "Resource conflict",
    ...options,
});

const alreadyExists = (options: AppErrorOptions = {}): AppError => new AppError({
    statusCode: 409,
    code: "ALREADY_EXISTS",
    message: "Resource already exists",
    ...options,
});

const unprocessable = (options: AppErrorOptions = {}): AppError => new AppError({
    statusCode: 422,
    code: "VALIDATION_ERROR",
    message: "Validation failed",
    ...options,
});

const internal = (options: AppErrorOptions = {}): AppError => new AppError({
    statusCode: 500,
    code: "INTERNAL_ERROR",
    message: "Internal server error",
    ...options,
});

export {
    AppError,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    conflict,
    alreadyExists,
    unprocessable,
    internal,
};