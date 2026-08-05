import type { RequestHandler } from "express";
import { runWithContext } from "../context/request-context.js";


/**
 * Requires req.id to already be set.
 * next() must be called INSIDE the run() callback, or the context won't propagate.
 */
const requestContextMiddleware: RequestHandler = (req, _res, next) => {
    runWithContext({
        requestId: String(req.id),
    }, next);
};


export default requestContextMiddleware;