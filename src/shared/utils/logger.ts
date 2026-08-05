import pino from "pino";
import { getContext } from "./request-context.js";
import { getRequiredEnv, getEnv } from "./env.js";

const nodeEnv = getRequiredEnv("NODE_ENV") 

const isTest = nodeEnv === "test";
const isDevelopment = nodeEnv === "development";

/**
 * Application-wide Pino logger instance.
 * Log level and output format adapt automatically based on NODE_ENV:
 * silent in tests, pretty-printed in development, raw JSON in production
 * (and any other unmapped environment, as a safe default)
 */
const logger = pino({
    // Set the log level based on the environment
    // Allows passing the log level via environment variable for testing purposes (userful for testing)
    level: getEnv("LOG_LEVEL") || (isTest ? "silent" : isDevelopment ? "debug" : "info"),
    // Use pino-pretty printing in development for better readability
    transport: isDevelopment
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                customColors: "error:red,warn:yellow,info:green,debug:blue",
                translateTime: "SYS:dd-mm-yyyy HH:MM:ss", // Uses pt-BR format for date and time
                ignore: "pid,hostname",
                singleLine: true,
                errorLikeObjectKeys: ["err", "error"],
            },
        }
        // If it's not development, then just raw JSON
        :undefined,

    // Redact sensitive information from logs, including passwords and tokens
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "req.body.password",
            "req.body.refreshToken",
            "password",
            "*.password",
        ],
        censor: "**REDACTED**",
    },
    
    // Must return a NEW object (not the live context reference) 
    mixin: () => {
        const context = getContext();
        return context ? { ...context } : {};
    },
});

export default logger;