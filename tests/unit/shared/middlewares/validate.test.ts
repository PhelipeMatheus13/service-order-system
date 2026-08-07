import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import validate from "../../../../src/shared/middlewares/validate.js";

describe("validate middleware (Unit)", () => {
    const schema = z.object({
        name: z.string().trim().min(3, "Name must be at least 3 characters long"),
        age: z.number(),
    });

    it("should call next() and replace req.body with the parsed/sanitized data on success", () => {
        const req: any = { body: { name: "  John  ", age: 30 } };
        const next = vi.fn();

        const middleware = validate(schema);
        middleware(req, {} as any, next);

        expect(next).toHaveBeenCalledWith(); // called with no error = success path
        expect(req.body).toEqual({ name: "John", age: 30 }); // trimmed by the schema
    });

    it("should call next() with an unprocessable error when validation fails", () => {
        const req: any = { body: { name: "Jo", age: "not-a-number" } };
        const next = vi.fn();

        const middleware = validate(schema);
        middleware(req, {} as any, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 422,
                code: "VALIDATION_ERROR",
                message: "Validation failed",
            }),
        );
    });

    it("should map each issue's field path to a dot-separated string", () => {
        const nestedSchema = z.object({
            user: z.object({
                email: z.email("Invalid email"),
            }),
        });

        const req: any = { body: { user: { email: "not-an-email" } } };
        const next = vi.fn();

        const middleware = validate(nestedSchema);
        middleware(req, {} as any, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                details: [{ field: "user.email", message: "Invalid email" }],
            }),
        );
    });
});