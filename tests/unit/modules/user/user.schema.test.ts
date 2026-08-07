import { describe, expect, it } from "vitest";

import { registerSchema } from "../../../../src/modules/user/user.schemas.js";


// Only test the schema's custom `refine` logic.
// Built-in Zod validators (e.g. `min`, `email`, `regex`, `trim`) 
// are already covered by the library itself.
describe("user schemas (unit)", () => {
    it("should fail when passwords do not match", () => {
        const result = registerSchema.safeParse({
            name: "John",
            email: "john@example.com",
            password: "Pass@123",
            confirmPassword: "Other@123",
        });

        if (!result.success) {
            expect(result.error.issues).toHaveLength(1);

            expect(result.error.issues[0]).toMatchObject({
                code: "custom",
                path: ["confirmPassword"],
                message: "Passwords do not match",
            });
        }
    });
});