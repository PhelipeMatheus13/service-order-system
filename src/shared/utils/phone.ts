import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Checks if a given phone number is valid according to the libphonenumber-js library.
 * @param value - The phone number string to validate.
 * @returns A boolean indicating whether the phone number is valid.
 */
const isValidPhoneNumber = (value: string): boolean => {
    try {
        const phone = parsePhoneNumberFromString(value, "BR"); // default to Brazil region for validation 
        return phone?.isValid() ?? false;
    } catch {
        return false;
    }
};

/**
 * Sanitizes a phone number string by removing all non-digit characters.
 * @param phone - The phone number string to sanitize.
 * @returns The sanitized phone number string or null if input is null.
 */
const sanitizePhoneNumber = (phone: string | null): string | null => {
    if (!phone) return null;
    return phone.replace(/\D/g, "");
};

export { isValidPhoneNumber, sanitizePhoneNumber };