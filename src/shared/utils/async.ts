import type { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>; 

/**
 * Wraps an asynchronous route handler in a Express middleware
 * @param fn The asynchronous route handler to wrap
 * @returns The wrapped route handler
 */
const asyncHandler = (fn: AsyncRouteHandler): RequestHandler => (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;