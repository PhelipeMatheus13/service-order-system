// (Node built‑ins)
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
// (shared / infra)
import app from "../../../../src/app.js";
import { PrismaClient } from "../../../../src/generated/prisma/client.js";
import { setupTestDatabase } from "../../../helpers/testDatabase.js";
import { setPrismaInstance } from "../../../../src/shared/config/database.js";
import { generateAccessToken } from "../../../../src/shared/services/jwt.js";

describe("Service Order Routes (Integration)", () => {
    let db: Awaited<ReturnType<typeof setupTestDatabase>>;
    let prisma: PrismaClient;
    let userId: string;
    let customerId: string;
    let deviceId: string;
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
        await prisma.serviceOrder.deleteMany();
        await prisma.device.deleteMany();
        await prisma.customer.deleteMany();
        await prisma.user.deleteMany();

        const user = await prisma.user.create({
            data: {
                firstName: "John",
                lastName: "Doe",
                email: "john@example.com",
                passwordHash: "passwordHash",
                role: "ATTENDANT",
                active: true,
            },
            select: { id: true },
        });
        userId = user.id;
        accessToken = generateAccessToken(userId, "ATTENDANT");

        const customer = await prisma.customer.create({
            data: {
                firstName: "Jane",
                lastName: "Doe",
                email: "jane@example.com",
                phoneNumber: "5521995437105",
            },
            select: { id: true },
        });
        customerId = customer.id;

        const device = await prisma.device.create({
            data: {
                customerId,
                type: "SMARTPHONE",
                brand: "Samsung",
                model: "Galaxy S23",
                serialNumber: "SN-123456",
                imei: "123456789012345",
                color: "Black",
            },
            select: { id: true },
        });
        deviceId = device.id;
    });

    describe("POST /service-orders", () => {
        it("should create a new service order successfully", async () => {
            const res = await request(app)
                .post("/service-orders")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    deviceId,
                    reportedProblem: "Screen is cracked and touch is not responding.",
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("service order created successfully");

            const serviceOrder = await prisma.serviceOrder.findUnique({
                where: { id: res.body.data.id },
            });

            expect(serviceOrder).toBeTruthy();
            expect(serviceOrder?.deviceId).toBe(deviceId);
            expect(serviceOrder?.customerId).toBe(customerId);
            expect(serviceOrder?.createdById).toBe(userId);
            expect(serviceOrder?.status).toBe("RECEIVED");
        });
    });
});