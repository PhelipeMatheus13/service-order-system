import { getRequiredEnv } from "../utils/env.js";

// This is intentionally kept separate from `database.ts` because
// `prisma.config.ts` is loaded by the Prisma CLI before the generated
// Prisma Client exists. Importing `database.ts` here would create a
// circular dependency during client generation. This module provides
// only the database connection string required by the CLI.
const buildConnectionString = (): string => {
    const user = getRequiredEnv("DB_USER");
    const password = getRequiredEnv("DB_PASSWORD");
    const host = getRequiredEnv("DB_HOST");
    const port = getRequiredEnv("DB_PORT");
    const database = getRequiredEnv("DB_NAME");
    return `postgresql://${user}:${password}@${host}:${port}/${database}?schema=public`;
};

const connectionString = buildConnectionString();

export { connectionString };