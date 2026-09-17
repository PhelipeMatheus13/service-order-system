import { describe, expect, it, vi } from "vitest";
import { emptyToNull } from "../../../../src/shared/utils/empty-to-null";


describe("emptyToNull", () => {
    it("should return null when value is null", () => {
        expect(emptyToNull(null)).toBeNull();
    });

    it("should return null when value is undefined", () => {
        expect(emptyToNull(undefined)).toBeNull();
    });

    it("should return null when string is empty", () => {
        expect(emptyToNull("")).toBeNull();
    });

    it("should return null when string contains only whitespace", () => {
        expect(emptyToNull("   ")).toBeNull();
    });

    it("should trim non-empty strings", () => {
        expect(emptyToNull("  John  ")).toBe("John");
    });

    it("should return non-string values unchanged", () => {
        expect(emptyToNull(123)).toBe(123);
        expect(emptyToNull(false)).toBe(false);
        expect(emptyToNull({})).toEqual({});
    });
});
