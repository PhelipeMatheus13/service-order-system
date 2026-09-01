import { describe, it, expect } from "vitest";
import generateSecure6DigitCode from "../../../../src/shared/utils/secure-code";

describe("generateSecure6DigitCode (Unit)", () => {
    it("should generate a 6-digit code", () => {
        const code = generateSecure6DigitCode();

        // Checks if the code contains exactly 6 digits
        expect(code).toMatch(/^\d{6}$/);
    });

    it("should generate a code between 100000 and 999999", () => {
        const code = generateSecure6DigitCode();
        const numericCode = Number(code);

        expect(numericCode).toBeGreaterThanOrEqual(100_000);
        expect(numericCode).toBeLessThan(1_000_000);
    });

    it("should return the code as a string", () => {
        const code = generateSecure6DigitCode();

        expect(typeof code).toBe("string");
    });
});