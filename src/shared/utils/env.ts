/**
 * Reads a required environment variable, throwing a clear error if missing.
 * Guarantees a `string` return (never `string | undefined`), avoiding
 * repeated manual checks across the codebase.
 */
const getRequiredEnv = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};

export { getRequiredEnv };