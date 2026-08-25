import amqp, { type Channel, type ChannelModel, type ConfirmChannel } from "amqplib";
import { getRequiredEnv } from "../config/env.js";
import logger from "../config/logger.js";

let connection: ChannelModel;
let publisherChannel: ConfirmChannel;
let subscriberChannel: Channel;

const buildConnectionUrl = (): string => {
    const user = getRequiredEnv("RABBITMQ_USER");
    const password = getRequiredEnv("RABBITMQ_PASSWORD");
    const host = getRequiredEnv("RABBITMQ_HOST");
    const port = getRequiredEnv("RABBITMQ_PORT");
    return `amqp://${user}:${password}@${host}:${port}`;
};

const connect = async (): Promise<void> => {
    const url = buildConnectionUrl();
    connection = await amqp.connect(url);

    publisherChannel = await connection.createConfirmChannel();
    subscriberChannel = await connection.createChannel();
};

const getPublisherChannel = (): ConfirmChannel => publisherChannel;
const getSubscriberChannel = (): Channel => subscriberChannel;


const checkConnection = async (): Promise<boolean> => {
    try {
        await publisherChannel.checkExchange("events");
        return true;
    } catch (error) {
        logger.error({ err: error }, "RabbitMQ connection check failed:");
        return false;
    }
};

export {
    connect,
    getPublisherChannel,
    getSubscriberChannel,
    checkConnection
};