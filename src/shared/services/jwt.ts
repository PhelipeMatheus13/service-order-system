import jwt from "jsonwebtoken";
import logger from "../config/logger.js";
import { getRequiredEnv } from "../config/env.js";
import { unauthorized } from "../errors/errors.js";

const generateAccessToken = (userId: string, role: string): string => {
    const secret = getRequiredEnv("SECRET");
    return jwt.sign({ sub: userId, role: role }, secret, { expiresIn: "15m" });
};

interface AccessTokenPayload {
    sub: string;
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

interface RefreshTokenPayload {
    sub: string;
    role: string;
    jti: string;
    exp: number;
}

interface GenerateRefreshTokenResponse {
    refreshToken: string;
    refreshTokenPayload: RefreshTokenPayload;
}

const generateRefreshToken = (userId: string, role: string, jti: string): GenerateRefreshTokenResponse => {
    const secret = getRequiredEnv("REFRESH_SECRET");

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 7 * 24 * 60 * 60; // 7 days 

    const refreshToken = jwt.sign({ sub: userId, role: role, jti: jti, exp }, secret);
    return {
        refreshToken,
        refreshTokenPayload: { sub: userId, role, jti, exp }
    }
};

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

interface ActivationTokenPayload {
    sub: string;
    jti: string;
    exp: number;
}

interface GenerateActivationTokenResponse {
    activationToken: string;
    activationTokenPayload: ActivationTokenPayload;
}

const generateActivationToken = (userId: string, jti: string): GenerateActivationTokenResponse => {
    const secret = getRequiredEnv("ACTIVATION_SECRET");

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 15 * 60;

    const activationToken = jwt.sign({ sub: userId, jti, iat, exp }, secret);
    return {
        activationToken,
        activationTokenPayload: { sub: userId, jti, exp }
    };
};

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