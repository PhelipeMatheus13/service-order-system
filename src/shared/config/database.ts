import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import { connectionString } from "./connection-string.js";
import logger from "./logger.js";

// Creates the PostgreSQL adapter used by Prisma Client
const adapter = new PrismaPg({connectionString});

// Mutable so it can be swapped out in tests (e.g. testcontainers wiring
// a fresh instance via setPrismaInstance).
let prismaClient = new PrismaClient({ adapter });


const getPrisma = (): PrismaClient => prismaClient;

const setPrismaInstance = (newClient: PrismaClient): void => {
    prismaClient = newClient;
};

const checkConnection = async (): Promise<boolean> => {
    try {
        await prismaClient.$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        logger.error({ err: error }, "Database connection failed:");
        return false;
    }
};

export { 
    getPrisma, 
    setPrismaInstance, 
    checkConnection, 
};