// (Node built‑ins)
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
// (shared / infra)
import app from "../../../../src/app.js";
import { PrismaClient } from "../../../../src/generated/prisma/client.js";
import { setupTestDatabase } from "../../../helpers/testDatabase.js";
import { setPrismaInstance } from "../../../../src/shared/config/database.js";
import { generateAccessToken } from "../../../../src/shared/services/jwt.js";
import { ServiceOrderBuilder } from "./fixture/serviceOrderBuilder.js";

describe("Service Order Routes (Integration)", () => {
    let db: Awaited<ReturnType<typeof setupTestDatabase>>;
    let prisma: PrismaClient;

    beforeAll(async () => {
        db = await setupTestDatabase();
        prisma = db.prismaClient;
        setPrismaInstance(prisma);
    });

    afterAll(async () => {
        await db.stop();
    });

    beforeEach(async () => {
        await prisma.finding.deleteMany();
        await prisma.diagnosis.deleteMany();
        await prisma.serviceOrderStatusHistory.deleteMany();
        await prisma.serviceOrder.deleteMany();
        await prisma.device.deleteMany();
        await prisma.customer.deleteMany();
        await prisma.user.deleteMany();
    });

    describe("POST /service-orders", () => {
        it("should create a new service order successfully", async () => {
            const { user, customer, device } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "ATTENDANT" })
                .withCustomer()
                .withDevice()
                .build();

            const accessToken = generateAccessToken(user.id, "ATTENDANT");

            const res = await request(app)
                .post("/service-orders")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    deviceId: device.id,
                    reportedProblem: "Screen is cracked and touch is not responding.",
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Service order created successfully");

            const serviceOrder = await prisma.serviceOrder.findUnique({
                where: { id: res.body.data.id },
            });

            expect(serviceOrder).toBeTruthy();
            expect(serviceOrder?.deviceId).toBe(device.id);
            expect(serviceOrder?.customerId).toBe(customer.id);
            expect(serviceOrder?.createdById).toBe(user.id);
            expect(serviceOrder?.status).toBe("WAITING_DIAGNOSIS");
        });
    });

    describe("GET /service-orders/:id", () => {
        it("should return the service order data", async () => {
            const { user, customer, device, serviceOrder } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "ATTENDANT" })
                .withCustomer()
                .withDevice()
                .withServiceOrder()
                .build();

            const accessToken = generateAccessToken(user.id, "ATTENDANT");

            const res = await request(app)
                .get(`/service-orders/${serviceOrder!.id}`)
                .set("Authorization", `Bearer ${accessToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toMatchObject({
                id: serviceOrder!.id,
                customerId: customer.id,
                deviceId: device.id,
                reportedProblem: "Screen is cracked and touch is not responding.",
                status: "WAITING_DIAGNOSIS",
                createdById: user.id,
            });
            expect(res.body.data.createdAt).toBeTruthy();
            expect(res.body.data.updatedAt).toBeNull();
        });
    });

    describe("GET /service-orders", () => {
        it("should return service orders ordered by creation date descending and respect the given limit", async () => {
            const { user, customer, device } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "ATTENDANT" })
                .withCustomer()
                .withDevice()
                .build();

            const accessToken = generateAccessToken(user.id, "ATTENDANT");

            const now = new Date();

            const serviceOrders = await prisma.serviceOrder.createManyAndReturn({
                data: [
                    {
                        customerId: customer.id,
                        deviceId: device.id,
                        reportedProblem: "Screen is cracked and touch is not responding.",
                        createdById: user.id,
                        createdAt: new Date(now.getTime() - 60 * 60 * 1000),
                        finishedAt: new Date(now.getTime() - 30 * 60 * 1000), // (only 1 Service Order active for the device)
                    },
                    {
                        customerId: customer.id,
                        deviceId: device.id,
                        reportedProblem: "Battery drains too fast.",
                        createdById: user.id,
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
            expect(res.body.data[0].customerId).toBe(customer.id);
            expect(res.body.data[0].deviceId).toBe(device.id);
            expect(res.body.data[0].reportedProblem).toBe("Battery drains too fast.");
            expect(res.body.data[0].status).toBe("WAITING_DIAGNOSIS");
            expect(res.body.data[0].createdAt).toBeTruthy();
            expect(res.body.data[0].updatedAt).toBeNull();
        });
    });

    describe("PATCH /service-orders/:id/cancel", () => {
        it("should cancel the service order successfully", async () => {
            const { user, serviceOrder } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "ATTENDANT" })
                .withCustomer()
                .withDevice()
                .withServiceOrder()
                .build();

            const accessToken = generateAccessToken(user.id, "ATTENDANT");

            const res = await request(app)
                .patch(`/service-orders/${serviceOrder!.id}/cancel`)
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    reason: "Customer requested cancellation.",
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Service order successfully cancelled");

            const serviceOrderFound = await prisma.serviceOrder.findUnique({
                where: { id: serviceOrder!.id },
            });

            expect(serviceOrderFound?.status).toBe("CANCELLED");
            expect(serviceOrderFound?.cancelReason).toBe("Customer requested cancellation.");
            expect(serviceOrderFound?.cancelledAt).toBeTruthy();

            const statusHistory = await prisma.serviceOrderStatusHistory.findFirst({
                where: { serviceOrderId: serviceOrder!.id },
                orderBy: { createdAt: "desc" },
            });

            expect(statusHistory).toBeTruthy();
            expect(statusHistory?.fromStatus).toBe("WAITING_DIAGNOSIS");
            expect(statusHistory?.toStatus).toBe("CANCELLED");
            expect(statusHistory?.changeSource).toBe("USER");
            expect(statusHistory?.changedById).toBe(user.id);
        });
    });

    describe("POST /service-orders/:id/diagnoses", () => {
        it("should start a diagnosis successfully", async () => {
            const { user: technician, serviceOrder } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "TECHNICIAN" })
                .withCustomer()
                .withDevice()
                .withServiceOrder()
                .build();

            const technicianAccessToken = generateAccessToken(technician.id, "TECHNICIAN");

            const res = await request(app)
                .post(`/service-orders/${serviceOrder!.id}/diagnoses`)
                .set("Authorization", `Bearer ${technicianAccessToken}`);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Diagnosis successfully created");
            expect(res.body.data).toBeTruthy();
            expect(res.body.data.id).toBeTruthy();
            expect(res.body.data.serviceOrderId).toBe(serviceOrder!.id);
            expect(res.body.data.createdById).toBe(technician.id);
            expect(res.body.data.result).toBeNull();
            expect(res.body.data.completedAt).toBeNull();

            const serviceOrderFound = await prisma.serviceOrder.findUnique({
                where: { id: serviceOrder!.id },
            });
            expect(serviceOrderFound?.status).toBe("IN_DIAGNOSIS");

            const statusHistory = await prisma.serviceOrderStatusHistory.findFirst({
                where: { serviceOrderId: serviceOrder!.id },
                orderBy: { createdAt: "desc" },
            });
            expect(statusHistory).toBeTruthy();
            expect(statusHistory?.fromStatus).toBe("WAITING_DIAGNOSIS");
            expect(statusHistory?.toStatus).toBe("IN_DIAGNOSIS");
            expect(statusHistory?.changeSource).toBe("USER");
            expect(statusHistory?.changedById).toBe(technician.id);
        });
    });

    describe("GET /service-orders/diagnoses/:id", () => {
        it("should return the diagnosis data", async () => {
            const { user, serviceOrder, diagnosis } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "ATTENDANT" })
                .withCustomer()
                .withDevice()
                .withServiceOrder({ status: "IN_DIAGNOSIS" })
                .withDiagnosis()
                .build();

            const accessToken = generateAccessToken(user.id, "ATTENDANT");

            const res = await request(app)
                .get(`/service-orders/diagnoses/${diagnosis!.id}`)
                .set("Authorization", `Bearer ${accessToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toMatchObject({
                id: diagnosis!.id,
                createdById: user.id,
                result: null,
                completedAt: null,
            });
            expect(res.body.data.serviceOrderId).toBe(serviceOrder!.id);
            expect(res.body.data.createdAt).toBeTruthy();
        });
    });

    describe("POST /service-orders/diagnoses/:id/findings", () => {
        it("should create a new finding successfully", async () => {
            const { user: technician, serviceOrder, diagnosis } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "TECHNICIAN" })
                .withCustomer()
                .withDevice()
                .withServiceOrder({ status: "IN_DIAGNOSIS" })
                .withDiagnosis()
                .build();

            const technicianAccessToken = generateAccessToken(technician.id, "TECHNICIAN");

            const res = await request(app)
                .post(`/service-orders/diagnoses/${diagnosis!.id}/findings`)
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
            expect(res.body.data.diagnosisId).toBe(diagnosis!.id);
            expect(res.body.data.createdById).toBe(technician.id);
            expect(res.body.data.description).toBe("Battery capacity below expected level.");
            expect(res.body.data.repairable).toBe(true);

            const finding = await prisma.finding.findUnique({
                where: { id: res.body.data.id },
            });

            expect(finding).toBeTruthy();
            expect(finding?.diagnosisId).toBe(diagnosis!.id);
            expect(finding?.createdById).toBe(technician.id);

            expect(serviceOrder!.id).toBeTruthy();
        });
    });

    describe("PATCH /service-orders/findings/:id", () => {
        it("should update the finding successfully", async () => {
            const { user: technician, serviceOrder, diagnosis, findings } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "TECHNICIAN" })
                .withCustomer()
                .withDevice()
                .withServiceOrder({ status: "IN_DIAGNOSIS" })
                .withDiagnosis()
                .withFinding()
                .build();

            const technicianAccessToken = generateAccessToken(technician.id, "TECHNICIAN");

            const res = await request(app)
                .patch(`/service-orders/findings/${findings[0].id}`)
                .set("Authorization", `Bearer ${technicianAccessToken}`)
                .send({
                    description: "Battery capacity critically below expected level",
                    repairable: false,
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Finding successfully updated");
            expect(res.body.data).toMatchObject({
                id: findings[0].id,
                description: "Battery capacity critically below expected level",
                repairable: false,
                createdById: technician.id,
                updatedById: technician.id,
            });
            expect(res.body.data.updatedAt).toBeTruthy();

            const finding = await prisma.finding.findUnique({
                where: { id: findings[0].id },
            });

            expect(finding?.description).toBe("Battery capacity critically below expected level");
            expect(finding?.repairable).toBe(false);
            expect(finding?.updatedById).toBe(technician.id);
            expect(finding?.updatedAt).toBeTruthy();

            expect(serviceOrder!.id).toBeTruthy();
            expect(diagnosis!.id).toBeTruthy();
        });
    });

    describe("PATCH /service-orders/diagnoses/:id/complete", () => {
        it("should complete the diagnosis and move to AWAITING_DELIVERY when there are no repairable findings", async () => {
            const { user: technician, serviceOrder, diagnosis } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "TECHNICIAN" })
                .withCustomer()
                .withDevice()
                .withServiceOrder({ status: "IN_DIAGNOSIS" })
                .withDiagnosis()
                .build();

            const technicianAccessToken = generateAccessToken(technician.id, "TECHNICIAN");

            const res = await request(app)
                .patch(`/service-orders/diagnoses/${diagnosis!.id}/complete`)
                .set("Authorization", `Bearer ${technicianAccessToken}`)
                .send({
                    result: "FAULT_FOUND",
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Diagnosis successfully completed");
            expect(res.body.data).toMatchObject({
                id: diagnosis!.id,
                result: "FAULT_FOUND",
                completedById: technician.id,
            });
            expect(res.body.data.completedAt).toBeTruthy();

            const diagnosisFound = await prisma.diagnosis.findUnique({
                where: { id: diagnosis!.id },
            });
            expect(diagnosisFound?.result).toBe("FAULT_FOUND");
            expect(diagnosisFound?.completedById).toBe(technician.id);
            expect(diagnosisFound?.completedAt).toBeTruthy();

            const serviceOrderFound = await prisma.serviceOrder.findUnique({
                where: { id: serviceOrder!.id },
            });
            expect(serviceOrderFound?.status).toBe("AWAITING_DELIVERY");

            const statusHistory = await prisma.serviceOrderStatusHistory.findFirst({
                where: { serviceOrderId: serviceOrder!.id },
                orderBy: { createdAt: "desc" },
            });
            expect(statusHistory?.fromStatus).toBe("IN_DIAGNOSIS");
            expect(statusHistory?.toStatus).toBe("AWAITING_DELIVERY");
            expect(statusHistory?.changeSource).toBe("USER");
            expect(statusHistory?.changedById).toBe(technician.id);
        });

        it("should complete the diagnosis and move to AWAITING_QUOTE when there is at least one repairable finding", async () => {
            const { user: technician, serviceOrder, diagnosis } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "TECHNICIAN" })
                .withCustomer()
                .withDevice()
                .withServiceOrder({ status: "IN_DIAGNOSIS" })
                .withDiagnosis()
                .withFinding({ repairable: true })
                .build();

            const technicianAccessToken = generateAccessToken(technician.id, "TECHNICIAN");

            const res = await request(app)
                .patch(`/service-orders/diagnoses/${diagnosis!.id}/complete`)
                .set("Authorization", `Bearer ${technicianAccessToken}`)
                .send({
                    result: "FAULT_FOUND",
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            const serviceOrderFound = await prisma.serviceOrder.findUnique({
                where: { id: serviceOrder!.id },
            });
            expect(serviceOrderFound?.status).toBe("AWAITING_QUOTE");

            const statusHistory = await prisma.serviceOrderStatusHistory.findFirst({
                where: { serviceOrderId: serviceOrder!.id },
                orderBy: { createdAt: "desc" },
            });
            expect(statusHistory?.fromStatus).toBe("IN_DIAGNOSIS");
            expect(statusHistory?.toStatus).toBe("AWAITING_QUOTE");
            expect(statusHistory?.changeSource).toBe("USER");
            expect(statusHistory?.changedById).toBe(technician.id);
        });
    });

    describe("GET /service-orders/diagnoses/:id/findings", () => {
        let userId: string;
        let diagnosisId: string;
        let accessToken: string;

        beforeEach(async () => {
            const { user, diagnosis } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "ATTENDANT" })
                .withCustomer()
                .withDevice()
                .withServiceOrder({ status: "IN_DIAGNOSIS" })
                .withDiagnosis()
                .build();

            userId = user.id;
            diagnosisId = diagnosis!.id;
            accessToken = generateAccessToken(user.id, "ATTENDANT");
        });

        it("should return the findings ordered by creation date ascending", async () => {
            const now = new Date();

            await prisma.finding.createManyAndReturn({
                data: [
                    {
                        diagnosisId,
                        createdById: userId,
                        description: "Battery capacity below expected level",
                        repairable: true,
                        createdAt: new Date(now.getTime() - 60 * 60 * 1000),
                    },
                    {
                        diagnosisId,
                        createdById: userId,
                        description: "Motherboard corrosion",
                        repairable: false,
                        createdAt: now,
                    },
                ],
            });

            const res = await request(app)
                .get(`/service-orders/diagnoses/${diagnosisId}/findings`)
                .set("Authorization", `Bearer ${accessToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(2);
            expect(res.body.data[0].description).toBe("Battery capacity below expected level");
            expect(res.body.data[0].repairable).toBe(true);
            expect(res.body.data[1].description).toBe("Motherboard corrosion");
            expect(res.body.data[1].repairable).toBe(false);
        });

        it("should return an empty array when the diagnosis has no findings", async () => {
            const res = await request(app)
                .get(`/service-orders/diagnoses/${diagnosisId}/findings`)
                .set("Authorization", `Bearer ${accessToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual([]);
        });
    });

    describe("POST /service-orders/:id/quotes", () => {
        it("should create a new quote successfully", async () => {
            const { user, serviceOrder, diagnosis } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "ATTENDANT" })
                .withCustomer()
                .withDevice()
                .withServiceOrder({ status: "AWAITING_QUOTE" })
                .withDiagnosis()
                .build();

            const accessToken = generateAccessToken(user.id, "ATTENDANT");

            const res = await request(app)
                .post(`/service-orders/${serviceOrder!.id}/quotes`)
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    diagnosisId: diagnosis!.id,
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Quote successfully created");
            expect(res.body.data).toMatchObject({
                serviceOrderId: serviceOrder!.id,
                diagnosisId: diagnosis!.id,
                createdById: user.id,
                status: "DRAFT",
            });
            expect(res.body.data.id).toBeTruthy();
            expect(res.body.data.submittedAt).toBeNull();
            expect(res.body.data.respondedAt).toBeNull();
            expect(res.body.data.createdAt).toBeTruthy();

            const quote = await prisma.quote.findUnique({
                where: { id: res.body.data.id },
            });

            expect(quote).toBeTruthy();
            expect(quote?.serviceOrderId).toBe(serviceOrder!.id);
            expect(quote?.diagnosisId).toBe(diagnosis!.id);
            expect(quote?.createdById).toBe(user.id);
            expect(quote?.status).toBe("DRAFT");
        });
    });
});