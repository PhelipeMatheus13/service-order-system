import rateLimit from 'express-rate-limit';
import type { RequestHandler } from "express";

interface RateLimiterOptions {
    identifier: string;
    windowMs: number;
    maxRequests: number;
    errorMessage?: string;
}


/**
 * Creates and configures an Express rate limiter middleware.
 *
 * @param options - Rate limiter configuration.
 * @param options.identifier - Name of the rate limiting policy exposed in the `RateLimit-Policy` header.
 * @param options.windowMs - Time window in milliseconds.
 * @param options.maxRequests - Maximum number of requests allowed within the time window.
 * @param options.errorMessage - Custom error message returned when the rate limit is exceeded.
 * @returns Configured Express middleware.
 */
const createRateLimiter = ({ identifier, windowMs, maxRequests, errorMessage }: RateLimiterOptions): RequestHandler => {
    return rateLimit({
        identifier,
        windowMs,
        limit: maxRequests,
        standardHeaders: "draft-8", // latest IETF RateLimit header spec, exposes limit/remaining/reset to clients
        legacyHeaders: false,       // disables the old non-standard X-RateLimit-* headers
        message: {
            success: false,
            error: {
                code: "TOO_MANY_REQUESTS",
                message: errorMessage ?? "Too many requests, please try again later",
            },
        },
    });
};

const globalLimiter = createRateLimiter({
    identifier: "global",
    windowMs: 60 * 1000, // 1 min
    maxRequests: 60,
});

const registerLimiter = createRateLimiter({
    identifier: "register",
    windowMs: 60 * 1000, // 1 min
    maxRequests: 5,
    errorMessage: "Too many register attempts, please try again in a minute",
});

const confirmEmailLimiter = createRateLimiter({
    identifier: "confirm-email",
    windowMs: 60 * 1000, // 1 min
    maxRequests: 5, 
    errorMessage: "Too many confirm attempts, please try again in a minute",
});

export {
    globalLimiter,
    registerLimiter,
    confirmEmailLimiter,
};