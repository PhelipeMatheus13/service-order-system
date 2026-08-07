import { execSync } from "node:child_process";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.js";

interface TestDatabase {
    prismaClient: PrismaClient;
    container: StartedPostgreSqlContainer;
    stop: () => Promise<void>;
}

const setupTestDatabase = async (): Promise<TestDatabase> => {
    // start the PostgreSQL container
    const container = await new PostgreSqlContainer("postgres:15-alpine") // light image for postgres
        .withDatabase("service_order_system_local")
        .withUsername("postgres")
        .withPassword("mysecretpassword")
        .withExposedPorts(5432)
        .start();

    const computedConnectionString =
        `postgresql://${container.getUsername()}:${container.getPassword()}` +
        `@${container.getHost()}:${container.getMappedPort(5432)}` +
        `/${container.getDatabase()}`;

    // Integration tests expose the container connection through
    // DATABASE_URL so Prisma CLI applies migrations against this
    // temporary database instead of the application's default one.
    process.env.DATABASE_URL = computedConnectionString;

    // Apply all migrations
    try {
        execSync("npx prisma migrate deploy", { stdio: "pipe" });
    } catch (error) {
        // Surface the real Prisma CLI output only when something actually fails,
        // instead of always printing it (which is what `stdio: "inherit"` did).
        if (error instanceof Error && "stderr" in error) {
            console.error((error as { stderr: Buffer }).stderr.toString());
        }
        throw error;
    }


    const adapter = new PrismaPg({
        connectionString: computedConnectionString,
    });

    let prismaClient = new PrismaClient({ adapter });

    const stop = async () => {
        await prismaClient.$disconnect();
        await container.stop();
    };

    return {
        prismaClient,
        container,
        stop,
    };
};

export { setupTestDatabase };