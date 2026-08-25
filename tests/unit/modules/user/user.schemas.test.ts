import { describe, expect, it, vi } from "vitest";

import {
    normalizeEmptyValue,
    isValidPhone,
} from "../../../../src/modules/user/user.schemas.js";

describe("User Schemas (Unit)", () => {
    describe("normalizeEmptyValue", () => {
        it("should return null when value is null", () => {
            expect(normalizeEmptyValue(null)).toBeNull();
        });

        it("should return null when value is undefined", () => {
            expect(normalizeEmptyValue(undefined)).toBeNull();
        });

        it("should return null when string is empty", () => {
            expect(normalizeEmptyValue("")).toBeNull();
        });

        it("should return null when string contains only whitespace", () => {
            expect(normalizeEmptyValue("   ")).toBeNull();
        });

        it("should trim non-empty strings", () => {
            expect(normalizeEmptyValue("  John  ")).toBe("John");
        });

        it("should return non-string values unchanged", () => {
            expect(normalizeEmptyValue(123)).toBe(123);
            expect(normalizeEmptyValue(false)).toBe(false);
            expect(normalizeEmptyValue({})).toEqual({});
        });
    });

    describe("isValidPhone", () => {
        it("should return true for a valid Brazilian phone number", () => {
            expect(isValidPhone("+55 21 98765-4321")).toBe(true);
        });

        it("should return true for a valid Brazilian landline", () => {
            expect(isValidPhone("+55 21 2345-6789")).toBe(true);
        });

        it("should return false for an invalid phone number", () => {
            expect(isValidPhone("123")).toBe(false);
        });

        it("should return false for an invalid Brazilian phone number", () => {
            expect(isValidPhone("+55 21 999")).toBe(false);
        });

        it("should return false when the phone parser throws", () => {
            expect(isValidPhone("invalid-phone")).toBe(false);
        });
    });
});