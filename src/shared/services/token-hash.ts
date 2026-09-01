import crypto from "node:crypto";
import logger from "../config/logger.js";
import { internal } from "../errors/errors.js";

/**
 * Creates a SHA-256 hash of a token, returned as a hex string.
 * Synchronous and cheap by design: unlike passwords, tokens already have
 * high entropy, so this hash doesn't need bcrypt's deliberate cost — its
 * only purpose is to avoid storing the raw token, not to resist brute-force.
 */
const hashToken = (token: string): string => {
    // Intentionally no try/catch: this is a synchronous operation with no
    // realistic failure mode. Unexpected errors are handled by the global
    // error middleware as a 500 response.
    return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Compares a token against a stored hash in constant time, preventing
 * timing attacks on the comparison itself.
 */
const compareToken = (token: string, hash: string): boolean => {
    const tokenHash = hashToken(token);

    try {
        return crypto.timingSafeEqual(
            Buffer.from(tokenHash),
            Buffer.from(hash),
        );
    } catch (error) {
        logger.error({ err: error }, "Unexpected error while comparing token");
        throw internal();
    }
};

export { hashToken, compareToken };