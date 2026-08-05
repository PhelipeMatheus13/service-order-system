import type { ErrorRequestHandler } from "express";
import logger from "../config/logger.js";
import { AppError } from "../errors/errors.js";

/**
 * Global error handling middleware.
 *
 * Handles operational errors and returns standardized error responses.
 * Unexpected errors are logged and returned as a 500 Internal Server Error.
 */
const errorHandler: ErrorRequestHandler =  (err, _req, res, _next) => {
    // check if the object is an AppError.
    if (err instanceof AppError) {
        return res.status(err.statusCode).json(err.toJSON());
    }

    logger.error({ err }, "Unexpected error");
    return res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_ERROR",
            message: "Internal server error",
        },
    });
};

export default errorHandler;