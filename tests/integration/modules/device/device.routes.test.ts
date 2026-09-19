// (Node built‑ins)
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
// (shared / infra)
import app from "../../../../src/app";
import { PrismaClient } from "../../../../src/generated/prisma/client.js";
import { setupTestDatabase } from "../../../helpers/testDatabase.js";
import { setPrismaInstance } from "../../../../src/shared/config/database";
import { generateAccessToken } from "../../../../src/shared/services/jwt.js";

describe("Device Routes (Integration)", () => {
    let db: Awaited<ReturnType<typeof setupTestDatabase>>;
    let prisma: PrismaClient;
    let customerId: string;
    let accessToken: string;

    beforeAll(async () => {
        db = await setupTestDatabase();
        prisma = db.prismaClient;
        setPrismaInstance(prisma);
    });

    afterAll(async () => {
        await db.stop();
    });

    beforeEach(async () => {
        await prisma.device.deleteMany();
        await prisma.customer.deleteMany();

        const customer = await prisma.customer.create({
            data: {
                firstName: "John",
                lastName: "Doe",
                email: "john@example.com",
                phoneNumber: "5521995437105",
            },
            select: { id: true },
        });

        customerId = customer.id;
        accessToken = generateAccessToken("fake-user-id", "ADMIN");
    });

    describe("POST /devices", () => {
        const validDevice = {
            type: "SMARTPHONE",
            brand: "Samsung",
            model: "Galaxy S23",
            serialNumber: "SN-123456",
            imei: "123456789012345",
            color: "Black",
        };

        it("should create a new device successfully", async () => {
            const res = await request(app)
                .post("/devices")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    ...validDevice,
                    customerId,
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Device created successfully");

            const device = await prisma.device.findFirst({ where: { serialNumber: validDevice.serialNumber }});

            expect(device).toBeTruthy();
            expect(device?.id).toBeDefined();
            expect(device?.customerId).toBe(customerId);
        });
    });
});