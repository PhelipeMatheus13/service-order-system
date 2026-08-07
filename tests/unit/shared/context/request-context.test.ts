import { describe, it, expect } from "vitest";
import { runWithContext, getContext } from "../../../../src/shared/context/request-context.js";

describe("request-context (Unit)", () => {
    describe("runWithContext", () => {
        it("should run the callback with the provided context", () => {
            const store = { requestId: "abc-123" };

            runWithContext(store, () => {
                expect(getContext()).toEqual(store);
            });
        });

        it("should isolate context between concurrent, overlapping executions", async () => {
            const storeA = { requestId: "request-A" };
            const storeB = { requestId: "request-B" };

            const resultA = runWithContext(storeA, async () => {
                await new Promise((resolve) => setTimeout(resolve, 20));
                return getContext();
            });

            const resultB = runWithContext(storeB, async () => {
                await new Promise((resolve) => setTimeout(resolve, 5));
                return getContext();
            });

            const [contextSeenByA, contextSeenByB] = await Promise.all([resultA, resultB]);

            expect(contextSeenByA).toEqual(storeA);
            expect(contextSeenByB).toEqual(storeB);
        });

        it("should not leak context after runWithContext has completed", () => {
            runWithContext({ requestId: "temp" }, () => {
                // context exists while running
            });

            expect(getContext()).toBeUndefined();
        });
    });

    describe("getContext", () => {
        it("returns undefined when called outside any context", () => {
            expect(getContext()).toBeUndefined();
        });
    });
});