import { vi, describe, beforeEach, it, expect } from "vitest";

import {
    register,
    startSubscribers,
} from "../../../../src/shared/pubsub/subscriber.js";

import { getSubscriberChannel } from "../../../../src/shared/pubsub/connection.js";
import PubsubError from "../../../../src/shared/pubsub/error.js";
import logger from "../../../../src/shared/config/logger.js";

vi.mock("../../../../src/shared/pubsub/connection.js");
vi.mock("../../../../src/shared/config/logger.js", () => ({
    default: {
        info: vi.fn(),
    },
}));

describe("Subscriber (Unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("register", () => {
        it("should register and consume a subscriber", async () => {
            const message = {
                fields: {
                    routingKey: "public.users.created",
                },
                content: Buffer.from(JSON.stringify({
                    userId: "user-1",
                    action: "INSERT",
                })),
            };

            const handler = vi.fn().mockResolvedValue(undefined);

            const channel = {
                assertExchange: vi.fn().mockResolvedValue(undefined),
                assertQueue: vi.fn().mockResolvedValue(undefined),
                bindQueue: vi.fn().mockResolvedValue(undefined),
                prefetch: vi.fn().mockResolvedValue(undefined),
                consume: vi.fn().mockImplementation(async (_queue, callback) => {
                    await callback(message);

                    return {
                        consumerTag: "consumer-1",
                    };
                }),
                ack: vi.fn(),
                nack: vi.fn(),
            };

            vi.mocked(getSubscriberChannel).mockReturnValue(channel as never);

            const subscriber = {
                config: {
                    topic: "public.users.created",
                    queue: "user-created",
                },
                handler,
            };

            const consumerTag = await register(subscriber);

            expect(consumerTag).toBe("consumer-1");

            expect(channel.assertExchange)
                .toHaveBeenCalledWith(
                    "events",
                    "topic",
                    { durable: true },
                );

            expect(channel.assertQueue)
                .toHaveBeenCalledWith(
                    "user-created",
                    { durable: true },
                );

            expect(channel.bindQueue)
                .toHaveBeenCalledWith(
                    "user-created",
                    "events",
                    "public.users.created",
                );

            expect(channel.prefetch)
                .toHaveBeenCalledWith(10);

            expect(logger.info)
                .toHaveBeenCalledWith(
                    {
                        topic: "public.users.created",
                        queue: "user-created",
                    },
                    "pubsub: subscribing",
                );

            expect(handler)
                .toHaveBeenCalledWith({
                    topic: "public.users.created",
                    content: {
                        userId: "user-1",
                        action: "INSERT",
                    },
                });

            expect(channel.ack)
                .toHaveBeenCalledWith(message);

            expect(channel.nack).not.toHaveBeenCalled();
        });

        it("should use the configured prefetch", async () => {
            const channel = {
                assertExchange: vi.fn().mockResolvedValue(undefined),
                assertQueue: vi.fn().mockResolvedValue(undefined),
                bindQueue: vi.fn().mockResolvedValue(undefined),
                prefetch: vi.fn().mockResolvedValue(undefined),
                consume: vi.fn().mockResolvedValue({
                    consumerTag: "consumer-1",
                }),
                ack: vi.fn(),
                nack: vi.fn(),
            };

            vi.mocked(getSubscriberChannel).mockReturnValue(channel as never);

            await register({
                config: {
                    topic: "public.users.created",
                    queue: "user-created",
                    prefetch: 1,
                },
                handler: vi.fn(),
            });

            expect(channel.prefetch)
                .toHaveBeenCalledWith(1);
        });

        it("should ignore null messages", async () => {
            const channel = {
                assertExchange: vi.fn().mockResolvedValue(undefined),
                assertQueue: vi.fn().mockResolvedValue(undefined),
                bindQueue: vi.fn().mockResolvedValue(undefined),
                prefetch: vi.fn().mockResolvedValue(undefined),
                consume: vi.fn().mockImplementation(async (_queue, callback) => {
                    await callback(null);

                    return {
                        consumerTag: "consumer-1",
                    };
                }),
                ack: vi.fn(),
                nack: vi.fn(),
            };

            const handler = vi.fn();

            vi.mocked(getSubscriberChannel).mockReturnValue(channel as never);

            await register({
                config: {
                    topic: "public.users.created",
                    queue: "user-created",
                },
                handler,
            });

            expect(handler).not.toHaveBeenCalled();

            expect(channel.ack).not.toHaveBeenCalled();

            expect(channel.nack).not.toHaveBeenCalled();
        });

        it("should nack with requeue when the handler throws a retriable error", async () => {
            const error = new Error("Handler failed");

            const message = {
                fields: {
                    routingKey: "public.users.created",
                },
                content: Buffer.from(JSON.stringify({
                    userId: "user-1",
                })),
            };

            const handler = vi.fn().mockRejectedValue(error);
            const onError = vi.fn();

            const channel = {
                assertExchange: vi.fn().mockResolvedValue(undefined),
                assertQueue: vi.fn().mockResolvedValue(undefined),
                bindQueue: vi.fn().mockResolvedValue(undefined),
                prefetch: vi.fn().mockResolvedValue(undefined),
                consume: vi.fn().mockImplementation(async (_queue, callback) => {
                    await callback(message);

                    return {
                        consumerTag: "consumer-1",
                    };
                }),
                ack: vi.fn(),
                nack: vi.fn(),
            };

            vi.mocked(getSubscriberChannel).mockReturnValue(channel as never);

            await register({
                config: {
                    topic: "public.users.created",
                    queue: "user-created",
                },
                handler,
                onError,
            });

            expect(onError)
                .toHaveBeenCalledWith(
                    error,
                    {
                        topic: "public.users.created",
                        content: {
                            userId: "user-1",
                        },
                    },
                );

            expect(channel.ack).not.toHaveBeenCalled();

            expect(channel.nack)
                .toHaveBeenCalledWith(message, false, true);
        });

        it("should nack without requeue when PubsubError is not retriable", async () => {
            const error = new PubsubError("Invalid message", false);

            const message = {
                fields: {
                    routingKey: "public.users.created",
                },
                content: Buffer.from(JSON.stringify({
                    userId: "user-1",
                })),
            };

            const handler = vi.fn().mockRejectedValue(error);
            const onError = vi.fn();

            const channel = {
                assertExchange: vi.fn().mockResolvedValue(undefined),
                assertQueue: vi.fn().mockResolvedValue(undefined),
                bindQueue: vi.fn().mockResolvedValue(undefined),
                prefetch: vi.fn().mockResolvedValue(undefined),
                consume: vi.fn().mockImplementation(async (_queue, callback) => {
                    await callback(message);

                    return {
                        consumerTag: "consumer-1",
                    };
                }),
                ack: vi.fn(),
                nack: vi.fn(),
            };

            vi.mocked(getSubscriberChannel).mockReturnValue(channel as never);

            await register({
                config: {
                    topic: "public.users.created",
                    queue: "user-created",
                },
                handler,
                onError,
            });

            expect(onError)
                .toHaveBeenCalledWith(
                    error,
                    {
                        topic: "public.users.created",
                        content: {
                            userId: "user-1",
                        },
                    },
                );

            expect(channel.ack).not.toHaveBeenCalled();

            expect(channel.nack)
                .toHaveBeenCalledWith(message, false, false);
        });
    });

    describe("startSubscribers", () => {
        it("should register all subscribers and cancel them on stop", async () => {
            const channel = {
                assertExchange: vi.fn(),
                assertQueue: vi.fn(),
                bindQueue: vi.fn(),
                prefetch: vi.fn(),
                consume: vi.fn()
                    .mockResolvedValueOnce({ consumerTag: "consumer-1" })
                    .mockResolvedValueOnce({ consumerTag: "consumer-2" }),
                cancel: vi.fn(),
            };

            vi.mocked(getSubscriberChannel).mockReturnValue(channel as never);

            const subscriber1 = {
                config: {
                    topic: "topic-1",
                    queue: "queue-1",
                },
                handler: vi.fn(),
            };

            const subscriber2 = {
                config: {
                    topic: "topic-2",
                    queue: "queue-2",
                },
                handler: vi.fn(),
            };

            const result = await startSubscribers([
                subscriber1,
                subscriber2,
            ]);

            expect(channel.consume).toHaveBeenCalledTimes(2);

            await result.stop();

            expect(channel.cancel).toHaveBeenCalledWith("consumer-1");
            expect(channel.cancel).toHaveBeenCalledWith("consumer-2");
        });
    });
});