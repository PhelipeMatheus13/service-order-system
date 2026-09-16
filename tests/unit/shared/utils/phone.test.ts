import { describe, expect, it, vi } from "vitest";
import { isValidPhoneNumber, sanitizePhoneNumber } from "../../../../src/shared/utils/phone";

describe("Phone number (Unit)", () => {
    describe("isValidPhone", () => {
        it("should return true for a valid Brazilian phone number", () => {
            expect(isValidPhoneNumber("+55 21 98765-4321")).toBe(true);
        });

        it("should return true for a valid Brazilian landline", () => {
            expect(isValidPhoneNumber("+55 21 2345-6789")).toBe(true);
        });

        it("should return false for an invalid phone number", () => {
            expect(isValidPhoneNumber("123")).toBe(false);
        });

        it("should return false for an invalid Brazilian phone number", () => {
            expect(isValidPhoneNumber("+55 21 999")).toBe(false);
        });

        it("should return false when the phone parser throws", () => {
            expect(isValidPhoneNumber("invalid-phone")).toBe(false);
        });
    });

    describe("sanitizePhoneNumber", () => {
        it("should remove all non-digit characters from a phone number", () => {
            expect(sanitizePhoneNumber("+55 21 98765-4321")).toBe(
                "5521987654321"
            );
        });

        it("should return the same phone number when it contains only digits", () => {
            expect(sanitizePhoneNumber("5521987654321")).toBe(
                "5521987654321"
            );
        });

        it("should remove parentheses, spaces, and hyphens from a phone number", () => {
            expect(sanitizePhoneNumber("(21) 98765-4321")).toBe(
                "21987654321"
            );
        });

        it("should return null when the phone number is null", () => {
            expect(sanitizePhoneNumber(null)).toBe(null);
        });

        it("should return null when the phone number is empty", () => {
            expect(sanitizePhoneNumber("")).toBe(null);
        });
    });
});