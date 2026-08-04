import dotenv from "dotenv";
dotenv.config({ quiet: true });

import knexBuilder, { Knex } from "knex";
import logger from "../utils/logger.js";

const environment = process.env.NODE_ENV || "development";

// Reads a required environment variable, or throws a clear error if it's missing.
// This keeps `parseInt`/connection fields free of `string | undefined` issues,
// since the return type here is guaranteed to be a real string.
const getRequiredEnv = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};

// Define default configurations (knex) for development and testing environments.
// Production should be configured via environment variables
const configurations: Record<string, Knex.Config> = {
    development: {
        client: "pg",
        connection: {
            host: getRequiredEnv("DB_HOST"),
            port: parseInt(getRequiredEnv("DB_PORT"), 10),
            user: getRequiredEnv("DB_USER"),
            password: getRequiredEnv("DB_PASSWORD"),
            database: getRequiredEnv("DB_NAME"),
        },
        pool: { min: 2, max: 10 },
        migrations: {
            directory: "./database/migrations",
        },
    },
    test: {
        client: "pg",
        connection: {
            host: "localhost",
            port: 5433,
            user: "test",
            password: "test",
            database: "service_order_system_test",
        },
        pool: { min: 1, max: 5 },
        migrations: {
            directory: "./database/migrations",
        },
    },
};

// Select the appropriate configuration based on the environment variable
const config = configurations[environment];
if (!config) {
    throw new Error(`Unknown environment: ${environment}`);
}

// knexBuilder is a factory function: calling it with a config returns a real,
// connected Knex instance — this replaces `require("knex")(config)`.
let _knex: Knex = knexBuilder(config);

// manage the Knex instance, It allows us to always capture the current Knex
// instance, even if it gets replaced (testing)
const getKnex = (): Knex => _knex;

// Allow replacing the Knex instance (useful for testing)
const setKnexInstance = (newKnex: Knex): void => {
    _knex = newKnex;
};

const checkConnection = async (): Promise<boolean> => {
    try {
        await _knex.raw("SELECT 1");
        return true;
    } catch (error) {
        logger.error({ err: error }, "Database connection failed:");
        return false;
    }
};

export {
    getKnex,
    setKnexInstance,
    checkConnection,
    config,
};