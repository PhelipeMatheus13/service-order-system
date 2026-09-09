import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { getEnv } from "../src/shared/config/env.js";
import { connectionString } from "../src/shared/config/connection-string.js";

// Database URL (same logic as prisma.config.ts)
const databaseUrl = getEnv("DATABASE_URL") ?? connectionString;
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

// Seeds directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedsDirectory = path.join(__dirname, "seeds");

const main = async (): Promise<void> => {
    const files = (await fs.readdir(seedsDirectory))
        .filter((file) => file.endsWith(".ts"))


    if (files.length === 0) {
        console.log("🔍 No seed files found.");
        return;
    }

    console.log(`🔍 Running ${files.length} seed(s)...`);

    for (const file of files) {
        const seedPath = pathToFileURL(path.join(seedsDirectory, file)).href;
        const module = await import(seedPath);

        if (typeof module.default !== "function") {
            throw new Error(`❌ Seed ${file} must export a default function.`);
        }

        await module.default(prisma);
        console.log(`✅ Seed ${file} completed.`);
    }

    console.log("🚀 All seeds have been executed successfully!");
};

main()
    .catch((error) => {
        console.error("❌ Error while running seeds:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });