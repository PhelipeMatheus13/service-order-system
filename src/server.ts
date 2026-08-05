import dotenv from "dotenv";
dotenv.config({ quiet: true });

import app from "./app.js";
import { checkConnection } from "./shared/config/database.js";
import logger from "./shared/utils/logger.js";
import { getEnv } from "./shared/utils/env.js";

const port = Number(getEnv("PORT")) || 3000;

const startServer = async (): Promise<void> => {
    logger.info("Connecting to database...");
    const isConnected = await checkConnection();

    if (!isConnected) {
        logger.error("❌ Failed to connect to database. Exiting...");
        process.exit(1);
    }

    logger.info("✅ Database connected successfully");

    const gracefulShutdown = () => {
        logger.info("Shutting down gracefully...");
        process.exit(0);
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);

    app.listen(port, () => {
        logger.info(`🚀 Server running on port ${port}`);
    });
}

// execute the function 
startServer(); 