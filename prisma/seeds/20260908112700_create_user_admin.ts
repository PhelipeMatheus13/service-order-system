import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { hashPassword } from "../../src/shared/services/hash.js";

const seed = async (prisma: PrismaClient): Promise<void> => {
    await prisma.outboxUser.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await hashPassword("Admin@123");

    await prisma.user.create({
        data: {
            firstName: "System",
            lastName: "Administrator",
            email: "admin@sistema.com",
            passwordHash,
            role: "ADMIN",
            active: true,
        },
    });
};

export default seed;