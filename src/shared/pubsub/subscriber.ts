import { getSubscriberChannel } from "./connection.js";
import PubsubError from "./error.js";
import logger from "../config/logger.js";

interface Message {
    topic: string;
    content: unknown;
}

interface SubscriberConfig {
    topic: string;
    queue: string;
    prefetch?: number;
}

interface Subscriber {
    config: SubscriberConfig;
    handler: (message: Message) => Promise<void>;
    onError?: (error: unknown, message: Message) => void;
}

const EXCHANGE = "events";

/**
 * Registers a single subscriber's binding and starts consuming.
 * Returns the consumer tag so the caller can cancel it later.
 */
const register = async (subscriber: Subscriber): Promise<string> => {
    const channel = getSubscriberChannel();
    const { topic, queue, prefetch = 10 } = subscriber.config;

    await channel.assertExchange(EXCHANGE, "topic", { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, EXCHANGE, topic);
    await channel.prefetch(prefetch);

    logger.info({ topic, queue }, "pubsub: subscribing");

    const { consumerTag } = await channel.consume(queue, async (msg) => {
        if (!msg) return;

        const message: Message = {
            topic: msg.fields.routingKey,
            content: JSON.parse(msg.content.toString()),
        };

        try {
            await subscriber.handler(message);
            channel.ack(msg);
        } catch (error) {
            subscriber.onError?.(error, message);

            const retriable = error instanceof PubsubError ? error.retriable : true;
            channel.nack(msg, false, retriable);
        }
    });

    return consumerTag;
};

/**
 * Registers every subscriber in the list and returns a single stop()
 * that cancels all consumers — used for graceful shutdown.
 */
const startSubscribers = async (subscribers: Subscriber[]): Promise<{ stop: () => Promise<void> }> => {
    const channel = getSubscriberChannel();
    const consumerTags: string[] = [];

    for (const subscriber of subscribers) {
        const tag = await register(subscriber);
        consumerTags.push(tag);
    }

    const stop = async (): Promise<void> => {
        for (const tag of consumerTags) {
            await channel.cancel(tag);
        }
    };

    return { stop };
};

export { register, startSubscribers };
export type { Subscriber, SubscriberConfig, Message };