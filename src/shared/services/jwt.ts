import jwt from "jsonwebtoken";
import logger from "../config/logger.js";
import { unauthorized } from "../errors/errors.js";
import { getRequiredEnv } from "../config/env.js";

const generateAccessToken = (userId: string, role: string): string => {
    const secret = getRequiredEnv("SECRET");
    return jwt.sign({ id: userId, role: role }, secret, { expiresIn: "15m" });
};

interface AccessTokenPayload {
    id: string;
    role: string;
    exp: number;
}

const decodeAccessToken = (token: string): AccessTokenPayload => {
    const secret = getRequiredEnv("SECRET");

    let decoded: string | jwt.JwtPayload;

    try {
        decoded = jwt.verify(token, secret);
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === "TokenExpiredError") {
                throw unauthorized({ message: "Access token expired", code: "ACCESS_TOKEN_EXPIRED" });
            }

            if (error.name === "JsonWebTokenError" || error.name === "NotBeforeError") {
                logger.warn({ err: error }, "Invalid access token");
                throw unauthorized({ message: "Invalid access token", code: "INVALID_ACCESS_TOKEN" });
            }
        }

        logger.error({ err: error }, "Unexpected error while verifying access token");
        throw unauthorized({ message: "Invalid access token", code: "INVALID_ACCESS_TOKEN" });
    }

    // This should never happen with a standard JWT, but we handle it for safety.
    if (typeof decoded === "string") {
        logger.warn({ decoded }, "Access token decoded as string, expected object");
        throw unauthorized({ message: "Invalid access token format", code: "INVALID_ACCESS_TOKEN" });
    }

    return decoded as AccessTokenPayload;
};

const generateRefreshToken = (userId: string, role: string, jti: string): string => {
    const secret = getRequiredEnv("REFRESH_SECRET");
    return jwt.sign({ id: userId, role: role, jti: jti }, secret, { expiresIn: "7d" });
};

interface RefreshTokenPayload {
    id: string;
    role: string;
    jti: string;
    exp: number;
}

const decodeRefreshToken = (token: string): RefreshTokenPayload => {
    const secret = getRequiredEnv("REFRESH_SECRET");

    let decoded: string | jwt.JwtPayload;

    try {
        decoded = jwt.verify(token, secret);
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === "TokenExpiredError") {
                throw unauthorized({ message: "Refresh token expired", code: "REFRESH_TOKEN_EXPIRED" });
            }

            if (error.name === "JsonWebTokenError" || error.name === "NotBeforeError") {
                logger.warn({ err: error }, "Invalid refresh token");
                throw unauthorized({ message: "Invalid refresh token", code: "INVALID_REFRESH_TOKEN" });
            }
        }

        logger.error({ err: error }, "Unexpected error while verifying refresh token");
        throw unauthorized({ message: "Invalid refresh token", code: "INVALID_REFRESH_TOKEN" });
    }

    // This should never happen with a standard JWT, but we handle it for safety.
    if (typeof decoded === "string") {
        logger.warn({ decoded }, "Refresh token decoded as string, expected object");
        throw unauthorized({ message: "Invalid refresh token format", code: "INVALID_REFRESH_TOKEN" });
    }

    return decoded as RefreshTokenPayload;
};


const generateActivationToken = (userId: string): string => {
    const secret = getRequiredEnv("ACTIVATION_SECRET");
    return jwt.sign({ id: userId }, secret, { expiresIn: "15m" });
};

interface ActivationTokenPayload {
    id: string;
    role: string;
    exp: number;
}

const decodeActivationToken = (token: string): ActivationTokenPayload => {
    const secret = getRequiredEnv("ACTIVATION_SECRET");

    let decoded: string | jwt.JwtPayload;

    try {
        decoded = jwt.verify(token, secret);
    } catch (error) {
        if (error instanceof Error) {
            if (error.name === "TokenExpiredError") {
                throw unauthorized({ message: "Activation token expired", code: "ACTIVATION_TOKEN_EXPIRED" });
            }

            if (error.name === "JsonWebTokenError" || error.name === "NotBeforeError") {
                logger.warn({ err: error }, "Invalid activation token");
                throw unauthorized({ message: "Invalid activation token", code: "INVALID_ACTIVATION_TOKEN" });
            }
        }

        logger.error({ err: error }, "Unexpected error while verifying activation token");
        throw unauthorized({ message: "Invalid activation token", code: "INVALID_ACTIVATION_TOKEN" });
    }

    // This should never happen with a standard JWT, but we handle it for safety.
    if (typeof decoded === "string") {
        logger.warn({ decoded }, "Activation token decoded as string, expected object");
        throw unauthorized({ message: "Invalid activation token format", code: "INVALID_ACTIVATION_TOKEN" });
    }

    return decoded as ActivationTokenPayload;
};

export {
    generateAccessToken,
    decodeAccessToken,
    generateRefreshToken,
    decodeRefreshToken,
    generateActivationToken,
    decodeActivationToken
};