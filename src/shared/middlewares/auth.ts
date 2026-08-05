import type { Request, RequestHandler } from "express";
import { decodeAccessToken } from "../services/jwt.js";
import logger from "../utils/logger.js";
import { unauthorized, forbidden } from "../errors/errors.js";

interface AuthenticatedUser {
    id: string;
    role: string;
}

// For now, we are extending this interface only within this file, 
// as we consider it the responsibility of this authorization mechanism; 
// however, if this class needs to be declared elsewhere, it would be worth making it global.
interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
}

/**
 * JWT authentication middleware.
 *
 * Validates the access token from the Authorization header.
 * If the token is valid, attaches the user information to `req.user`.
 * Otherwise, throws a 401 Unauthorized error.
 */
const checkToken: RequestHandler = (req, _res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return next(unauthorized({ message: "Access denied" }));
    }

    try {
        const decoded = decodeAccessToken(token);
        (req as AuthenticatedRequest).user = {
            id: decoded.id,
            role: decoded.role,
        };
        
        next();
    } catch (error) {
        logger.error({ err: error }, "Token validation failed:");
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
    const { user } = req as AuthenticatedRequest;

    if (!user || !roles.includes(user.role)) {
        throw forbidden({ message: "Access denied" });
    }

    next();
};

export {
    checkToken,
    authorize,
};