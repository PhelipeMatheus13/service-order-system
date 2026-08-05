import { defineConfig } from "prisma/config";
import { connectionString } from "./src/shared/config/connection-string.js";
import { getEnv } from "./src/shared/config/env.js";


export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        // Integration tests provide DATABASE_URL dynamically, pointing Prisma
        // to the temporary Testcontainers database. In normal application
        // execution this variable is absent, so we fall back to the standard
        // connection string built from the project's environment variables.
        url: getEnv("DATABASE_URL") ?? connectionString,
    },
});
