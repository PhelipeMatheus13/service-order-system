/**
 * Normalizes empty or whitespace-only strings to null.
 * @param value - The value to normalize.
 * @returns The normalized value, which is either the trimmed string or null.
 */
const emptyToNull = (value: unknown): unknown => {
    if (value === null || value === undefined) return null;

    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
    }

    return value;
}

export  { emptyToNull };