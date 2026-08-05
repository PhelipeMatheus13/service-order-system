import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { unprocessable } from "../errors/errors.js";

/** 
 * Creates a middleware function to validate request bodies against a Zod schema.
 * @param schema - The Zod schema to validate against.
 * @returns A middleware function.
 */
function validate<TSchema>(schema: ZodType<TSchema>): RequestHandler {
    return (req, _res, next) => {
        // Validate the request body against the provided Zod schema.
        const result = schema.safeParse(req.body);

        if (!result.success) {
            return next(
                unprocessable({
                    message: "Validation failed",
                    details: result.error.issues.map((issue) => ({
                        field: issue.path.join("."), // Convert the field path array into a dot-separated string.
                        message: issue.message,
                    })),
                }),
            );
        }

        // Use the validated output instead of the original payload.
        // This ensures any sanitization or transformations performed
        // during validation are applied to `req.body`.
        req.body = result.data;
        next();
    };
}

export default validate;