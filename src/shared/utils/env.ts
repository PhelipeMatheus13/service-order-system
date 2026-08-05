// dotenv.config() is called here, once, because this is the single
// entry point every part of the codebase uses to read env vars — any
// module that imports getRequiredEnv is automatically protected against
// ESM import-hoisting ordering issues, without needing to remember to
// call dotenv.config() itself.
import dotenv from "dotenv";
dotenv.config({ quiet: true });

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

const getEnv = (name: string): string | undefined => {
    return process.env[name];
};


export { getRequiredEnv, getEnv };