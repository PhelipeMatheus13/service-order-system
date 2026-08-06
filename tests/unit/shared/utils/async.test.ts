import { describe, it, vi, expect } from "vitest";
import type { Request, Response, NextFunction } from "express";

import asyncHandler from "../../../../src/shared/utils/async.js";

describe("asyncHandler (Unit)", () => {
    it("should call next with a standard error when thrown", async () => {
        const standardError = new Error("unexpected failure");
        const handler = asyncHandler(async () => { throw standardError; });

        const req = {} as Request;
        const res = {} as Response;
        const next: NextFunction = vi.fn();

        await handler(req, res, next);

        expect(next).toHaveBeenCalledWith(standardError);
    });

    it("should not call next when the wrapped function succeeds", async () => {
        const handler = asyncHandler(async (req, res) => {
            res.status(200).json({ success: true });
        });

        const req = {} as Request;
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as unknown as Response;
        
        const next: NextFunction = vi.fn();

        await handler(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });
});