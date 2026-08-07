import { vi, describe, beforeEach, it, expect } from "vitest";

import errorHandler from "../../../../src/shared/middlewares/error.js";
import { notFound } from "../../../../src/shared/errors/errors.js";
import logger from "../../../../src/shared/config/logger.js";

vi.mock("../../../../src/shared/config/logger.js", () => ({
    default: {
        error: vi.fn(),
    },
}));

describe("Error Middleware (Unit)", () => {
    let req: any;
    let res: any; 
    let next: any;

    beforeEach(() => {
        req = {};
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };
        next = vi.fn();

        vi.clearAllMocks();
    });

    it("should respond with operational error details when error is operational", () => {
        const operationalError = notFound({ message: "Resource not found" });

        errorHandler(operationalError, req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(operationalError.toJSON());
    });

    it("should respond with 500 for non-operational errors and log the error", () => {
        const unexpectedError = new Error("Database error");

        errorHandler(unexpectedError, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                code: "INTERNAL_ERROR",
                message: "Internal server error",
            },
        });

        expect(logger.error).toHaveBeenCalledWith({ err: unexpectedError }, "Unexpected error");
    });
});