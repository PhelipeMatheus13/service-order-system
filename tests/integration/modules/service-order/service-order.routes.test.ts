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
            expect(res.body.message).toBe("Service order created successfully");

            const serviceOrder = await prisma.serviceOrder.findUnique({
                where: { id: res.body.data.id },
            });

            expect(serviceOrder).toBeTruthy();
            expect(serviceOrder?.deviceId).toBe(deviceId);
            expect(serviceOrder?.customerId).toBe(customerId);
            expect(serviceOrder?.createdById).toBe(userId);
            expect(serviceOrder?.status).toBe("WAITING_DIAGNOSIS");
        });
    });

    describe("GET /service-orders/:id", () => {
        let serviceOrderId: string;

        beforeEach(async () => {
            const serviceOrder = await prisma.serviceOrder.create({
                data: {
                    customerId,
                    deviceId,
                    reportedProblem: "Screen is cracked and touch is not responding.",
                    createdById: userId,
                },
                select: { id: true },
            });

            serviceOrderId = serviceOrder.id;
        });

        it("should return the service order data", async () => {
            const res = await request(app)
                .get(`/service-orders/${serviceOrderId}`)
                .set("Authorization", `Bearer ${accessToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toMatchObject({
                id: serviceOrderId,
                customerId,
                deviceId,
                reportedProblem: "Screen is cracked and touch is not responding.",
                status: "WAITING_DIAGNOSIS",
                createdById: userId,
            });
            expect(res.body.data.createdAt).toBeTruthy();
            expect(res.body.data.updatedAt).toBeNull();
        });
    });

    describe("GET /service-orders", () => {
        it("should return service orders ordered by creation date descending and respect the given limit", async () => {
            const now = new Date();

            const serviceOrders = await prisma.serviceOrder.createManyAndReturn({
                data: [
                    {
                        customerId,
                        deviceId,
                        reportedProblem: "Screen is cracked and touch is not responding.",
                        createdById: userId,
                        createdAt: new Date(now.getTime() - 60 * 60 * 1000),
                        finishedAt: new Date(now.getTime() - 30 * 60 * 1000), // (only 1 Service Order active for the device)
                    },
                    {
                        customerId,
                        deviceId,
                        reportedProblem: "Battery drains too fast.",
                        createdById: userId,
                        createdAt: now,
                    },
                ],
            });

            const newerServiceOrder = serviceOrders.find(
                (so) => so.reportedProblem === "Battery drains too fast.",
            )!;

            const res = await request(app)
                .get("/service-orders")
                .set("Authorization", `Bearer ${accessToken}`)
                .query({ limit: 1 });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].id).toBe(newerServiceOrder.id);
            expect(res.body.data[0].customerId).toBe(customerId);
            expect(res.body.data[0].deviceId).toBe(deviceId);
            expect(res.body.data[0].reportedProblem).toBe("Battery drains too fast.");
            expect(res.body.data[0].status).toBe("WAITING_DIAGNOSIS");
            expect(res.body.data[0].createdAt).toBeTruthy();
            expect(res.body.data[0].updatedAt).toBeNull();
        });
    });

    describe("PATCH /service-orders/:id/cancel", () => {
        let serviceOrderId: string;

        beforeEach(async () => {
            const serviceOrder = await prisma.serviceOrder.create({
                data: {
                    customerId,
                    deviceId,
                    reportedProblem: "Screen is cracked and touch is not responding.",
                    createdById: userId,
                },
                select: { id: true },
            });

            serviceOrderId = serviceOrder.id;
        });

        it("should cancel the service order successfully", async () => {
            const res = await request(app)
                .patch(`/service-orders/${serviceOrderId}/cancel`)
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    reason: "Customer requested cancellation.",
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Service order successfully cancelled");

            const serviceOrder = await prisma.serviceOrder.findUnique({
                where: { id: serviceOrderId },
            });

            expect(serviceOrder?.status).toBe("CANCELLED");
            expect(serviceOrder?.cancelReason).toBe("Customer requested cancellation.");
            expect(serviceOrder?.cancelledAt).toBeTruthy();

            const statusHistory = await prisma.serviceOrderStatusHistory.findFirst({
                where: { serviceOrderId },
                orderBy: { createdAt: "desc" },
            });

            expect(statusHistory).toBeTruthy();
            expect(statusHistory?.fromStatus).toBe("WAITING_DIAGNOSIS");
            expect(statusHistory?.toStatus).toBe("CANCELLED");
            expect(statusHistory?.changeSource).toBe("USER");
            expect(statusHistory?.changedById).toBe(userId);
        });
    });

    describe("POST /service-orders/:id/diagnoses", () => {
        let technicianId: string;
        let technicianAccessToken: string;
        let serviceOrderId: string;

        beforeEach(async () => {
            const technician = await prisma.user.create({
                data: {
                    firstName: "Jane",
                    lastName: "Smith",
                    email: "jane.smith@example.com",
                    passwordHash: "passwordHash",
                    role: "TECHNICIAN",
                    active: true,
                },
                select: { id: true },
            });
            technicianId = technician.id;
            technicianAccessToken = generateAccessToken(technicianId, "TECHNICIAN");

            const serviceOrder = await prisma.serviceOrder.create({
                data: {
                    customerId,
                    deviceId,
                    reportedProblem: "Screen is cracked and touch is not responding.",
                    createdById: userId,
                },
                select: { id: true },
            });

            serviceOrderId = serviceOrder.id;
        });

        it("should start a diagnosis successfully", async () => {
            const res = await request(app)
                .post(`/service-orders/${serviceOrderId}/diagnoses`)
                .set("Authorization", `Bearer ${technicianAccessToken}`);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Diagnosis successfully created");
            expect(res.body.data).toBeTruthy();
            expect(res.body.data.id).toBeTruthy();
            expect(res.body.data.serviceOrderId).toBe(serviceOrderId);
            expect(res.body.data.performedById).toBe(technicianId);
            expect(res.body.data.result).toBeNull();
            expect(res.body.data.completedAt).toBeNull();

            const serviceOrder = await prisma.serviceOrder.findUnique({
                where: { id: serviceOrderId },
            });
            expect(serviceOrder?.status).toBe("IN_DIAGNOSIS");

            const statusHistory = await prisma.serviceOrderStatusHistory.findFirst({
                where: { serviceOrderId },
                orderBy: { createdAt: "desc" },
            });
            expect(statusHistory).toBeTruthy();
            expect(statusHistory?.fromStatus).toBe("WAITING_DIAGNOSIS");
            expect(statusHistory?.toStatus).toBe("IN_DIAGNOSIS");
            expect(statusHistory?.changeSource).toBe("USER");
            expect(statusHistory?.changedById).toBe(technicianId);
        });
    });

    describe("GET /service-orders/diagnoses/:id", () => {
        let diagnosisId: string;

        beforeEach(async () => {
            const serviceOrder = await prisma.serviceOrder.create({
                data: {
                    customerId,
                    deviceId,
                    reportedProblem: "Screen is cracked and touch is not responding.",
                    createdById: userId,
                    status: "IN_DIAGNOSIS",
                },
                select: { id: true },
            });

            const diagnosis = await prisma.diagnosis.create({
                data: {
                    serviceOrderId: serviceOrder.id,
                    performedById: userId,
                },
                select: { id: true },
            });

            diagnosisId = diagnosis.id;
        });

        it("should return the diagnosis data", async () => {
            const res = await request(app)
                .get(`/service-orders/diagnoses/${diagnosisId}`)
                .set("Authorization", `Bearer ${accessToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toMatchObject({
                id: diagnosisId,
                performedById: userId,
                result: null,
                completedAt: null,
            });
            expect(res.body.data.serviceOrderId).toBeTruthy();
            expect(res.body.data.createdAt).toBeTruthy();
        });
    });

    describe("POST /service-orders/diagnoses/:id/findings", () => {
        let diagnosisId: string;
        let technicianId: string;
        let technicianAccessToken: string;

        beforeEach(async () => {
            const technician = await prisma.user.create({
                data: {
                    firstName: "Jane",
                    lastName: "Smith",
                    email: "jane.smith@example.com",
                    passwordHash: "passwordHash",
                    role: "TECHNICIAN",
                    active: true,
                },
                select: { id: true },
            });
            technicianId = technician.id;
            technicianAccessToken = generateAccessToken(technicianId, "TECHNICIAN");

            const serviceOrder = await prisma.serviceOrder.create({
                data: {
                    customerId,
                    deviceId,
                    reportedProblem: "Screen is cracked and touch is not responding.",
                    createdById: userId,
                    status: "IN_DIAGNOSIS",
                },
                select: { id: true },
            });

            const diagnosis = await prisma.diagnosis.create({
                data: {
                    serviceOrderId: serviceOrder.id,
                    performedById: technicianId,
                },
                select: { id: true },
            });

            diagnosisId = diagnosis.id;
        });

        it("should create a new finding successfully", async () => {
            const res = await request(app)
                .post(`/service-orders/diagnoses/${diagnosisId}/findings`)
                .set("Authorization", `Bearer ${technicianAccessToken}`)
                .send({
                    description: "Battery capacity below expected level.",
                    repairable: true,
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Finding successfully created");
            expect(res.body.data).toBeTruthy();
            expect(res.body.data.id).toBeTruthy();
            expect(res.body.data.diagnosisId).toBe(diagnosisId);
            expect(res.body.data.createdById).toBe(technicianId);
            expect(res.body.data.description).toBe("Battery capacity below expected level.");
            expect(res.body.data.repairable).toBe(true);

            const finding = await prisma.finding.findUnique({
                where: { id: res.body.data.id },
            });

            expect(finding).toBeTruthy();
            expect(finding?.diagnosisId).toBe(diagnosisId);
            expect(finding?.createdById).toBe(technicianId);
        });
    });
});