import dotenv from "dotenv";
dotenv.config({ quiet: true });

import { connect as connectPubsub } from "./shared/pubsub/connection.js";
import { startSubscribers, type Subscriber } from "./shared/pubsub/subscriber.js";
import { startPeriodicJobs, type PeriodicJob } from "./shared/background/periodic-job.js";
import { getAndPushUnconsumedUserEvents } from "./modules/user/jobs/outbox-relay.js";
import { sendEmailConfirmationCodeSubscriber } from "./modules/user/subscribers/user-created.js";
import logger from "./shared/config/logger.js";

const periodicJobs: PeriodicJob[] = [
    { name: "user-outbox-relay", intervalMs: 5000, run: getAndPushUnconsumedUserEvents },
];

const subscribers: Subscriber[] = [
    sendEmailConfirmationCodeSubscriber,
];

const startPubsub = async (): Promise<void> => {
    logger.info("Connecting to RabbitMQ...");
    await connectPubsub();
    logger.info("✅ RabbitMQ connected successfully");

    const { stop: stopJobs } = startPeriodicJobs(periodicJobs);
    const { stop: stopSubscribers } = await startSubscribers(subscribers);

    logger.info("🐇 Pubsub process running");

    const gracefulShutdown = async (): Promise<void> => {
        logger.info("Shutting down pubsub process gracefully...");
        stopJobs();
        await stopSubscribers();
        process.exit(0);
    };

    process.on("SIGTERM", () => { void gracefulShutdown(); });
    process.on("SIGINT", () => { void gracefulShutdown(); });
};

startPubsub();