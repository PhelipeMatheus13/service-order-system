import { vi, describe, beforeEach, it, expect } from "vitest";

import { publish } from "../../../../src/shared/pubsub/publisher.js";

import { getPublisherChannel } from "../../../../src/shared/pubsub/connection.js";

vi.mock("../../../../src/shared/pubsub/connection.js");

describe("Publisher (Unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("publish", () => {
        it("should publish a message to the topic exchange", async () => {
            const channel = {
                assertExchange: vi.fn().mockResolvedValue(undefined),
                publish: vi.fn(),
                waitForConfirms: vi.fn().mockResolvedValue(undefined),
            };

            vi.mocked(getPublisherChannel).mockReturnValue(channel as never);

            const message = {
                userId: "user-1",
                action: "INSERT",
            };

            await publish("public.users.created", message);

            expect(getPublisherChannel).toHaveBeenCalled();

            expect(channel.assertExchange)
                .toHaveBeenCalledWith(
                    "events",
                    "topic",
                    { durable: true },
                );

            expect(channel.publish)
                .toHaveBeenCalledWith(
                    "events",
                    "public.users.created",
                    Buffer.from(JSON.stringify(message)),
                    { persistent: true },
                );

            expect(channel.waitForConfirms)
                .toHaveBeenCalled();
        });

        it("should throw when asserting the exchange fails", async () => {
            const error = new Error("Failed to assert exchange");

            const channel = {
                assertExchange: vi.fn().mockRejectedValue(error),
                publish: vi.fn(),
                waitForConfirms: vi.fn().mockResolvedValue(undefined),
            };

            vi.mocked(getPublisherChannel).mockReturnValue(channel as never);

            await expect(
                publish("public.users.created", {
                    userId: "user-1",
                }),
            ).rejects.toThrow(error);

            expect(channel.publish).not.toHaveBeenCalled();

            expect(channel.waitForConfirms).not.toHaveBeenCalled();
        });

        it("should throw when waiting for publisher confirms fails", async () => {
            const error = new Error("Publisher confirmation failed");

            const channel = {
                assertExchange: vi.fn().mockResolvedValue(undefined),
                publish: vi.fn(),
                waitForConfirms: vi.fn().mockRejectedValue(error),
            };

            vi.mocked(getPublisherChannel).mockReturnValue(channel as never);

            await expect(
                publish("public.users.created", {
                    userId: "user-1",
                }),
            ).rejects.toThrow(error);

            expect(channel.assertExchange)
                .toHaveBeenCalledWith(
                    "events",
                    "topic",
                    { durable: true },
                );

            expect(channel.publish).toHaveBeenCalled();

            expect(channel.waitForConfirms)
                .toHaveBeenCalled();
        });
    });
});