import { vi, describe, it, expect } from "vitest";


import { runWithContext } from "../../../../src/shared/context/request-context.js";
import requestContext from "../../../../src/shared/middlewares/request-context.js";

vi.mock("../../../../src/shared/context/request-context")

describe("request-context.middleware (Unit)", () => {
    describe("requestContextMiddleware", () => {
        let req: any;
        let res: any; 
        let next: any;

        it("calls runWithContext with the request id and delegates to next", () => {
            req = { id: 'req-1' };
            res = {};
            next = vi.fn();

            vi.mocked(runWithContext).mockImplementation((store, callback) => callback());

            requestContext(req, res, next);

            expect(runWithContext).toHaveBeenCalledWith({ requestId: 'req-1' }, next);
            expect(next).toHaveBeenCalledTimes(1);
        });
    });
});