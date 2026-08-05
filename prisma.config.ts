import "dotenv/config";
import { defineConfig } from "prisma/config";
import { connectionString } from "./src/shared/config/connection-string.js";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: connectionString,
    },
});
