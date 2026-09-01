import { getPublisherChannel } from "./connection.js";

const EXCHANGE = "events";

/**
 * Publishes a message to a topic exchange. Generic — knows nothing about
 * domain-specific payloads; domain publishers (e.g. user-created.publisher.ts)
 * call this with their own shape.
 */
const publish = async (topic: string, message: object): Promise<void> => {
    const channel = getPublisherChannel();
    await channel.assertExchange(EXCHANGE, "topic", { durable: true });

    const payload = Buffer.from(JSON.stringify(message));
    channel.publish(EXCHANGE, topic, payload, { persistent: true });
    
    await channel.waitForConfirms();
};

export { publish };