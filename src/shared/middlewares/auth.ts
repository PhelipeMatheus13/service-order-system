import type { RequestHandler } from "express";
import { decodeAccessToken, decodeActivationToken } from "../services/jwt.js";
import { unauthorized, forbidden } from "../errors/errors.js";

/**
 * JWT authentication middleware.
 *
 * Validates the access token from the Authorization header.
 * If the token is valid, attaches the user information to `req.user`.
 * Otherwise, throws a 401 Unauthorized error.
 */
const checkAccessToken: RequestHandler = (req, _res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return next(unauthorized({ message: "Missing access token", code: "MISSING_ACCESS_TOKEN" }));
    }

    try {
        const decoded = decodeAccessToken(token);
        req.user = {
            id: decoded.sub,
            role: decoded.role,
        };
        
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * JWT authentication middleware.
 *
 * Validates the activation token from the Authorization header.
 * If the token is valid, attaches the user information to `req.user`.
 * Otherwise, throws a 401 Unauthorized error.
 */
const checkActivationToken: RequestHandler = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return next(unauthorized({ message: "Missing activation token", code: "MISSING_ACTIVATION_TOKEN" }));
    }

    try {
        const decoded = decodeActivationToken(token);
        req.user = {
            id: decoded.sub,
        };

        res.locals.jti = decoded.jti;
        
        next();
    } catch (error) {
        next(error);
    }
};


/**
 * Role-based authorization middleware.
 *
 * It receives a list of allowed roles and checks whether the authenticated
 * user (`req.user`) has one of them.
 * Otherwise, throws a 403 Forbidden error.
 *
 * @param roles - Roles authorized to access a route.
 */
const authorize = (...roles: string[]): RequestHandler => (req, _res, next) => {
    if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
        throw forbidden({ message: "Access denied" });
    }

    next();
};

export {
    checkAccessToken,
    checkActivationToken,
    authorize,
};