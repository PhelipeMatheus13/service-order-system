import { describe, expect, it } from "vitest";

import PubsubError from "../../../../src/shared/pubsub/error.js";

describe("PubsubError (Unit)", () => {
    it("should be retriable by default", () => {
        const error = new PubsubError("Something went wrong");

        expect(error).toMatchObject({
            name: "PubsubError",
            message: "Something went wrong",
            retriable: true,
        });
    });

    it("should allow disabling retry", () => {
        const error = new PubsubError("Something went wrong", false);

        expect(error.retriable).toBe(false);
    });
});