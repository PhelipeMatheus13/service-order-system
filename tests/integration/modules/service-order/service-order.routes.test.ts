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

    describe("POST /service-orders/quotes/:id/items", () => {
        it("should create a quote item with components successfully", async () => {
            const { user, findings, quotes } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "ATTENDANT" })
                .withCustomer()
                .withDevice()
                .withServiceOrder({ status: "AWAITING_QUOTE" })
                .withDiagnosis()
                .withFinding({ repairable: true })
                .withQuote()
                .build();

            const quoteId = quotes[0].id;

            const accessToken = generateAccessToken(user.id, "ATTENDANT");

            const res = await request(app)
                .post(`/service-orders/quotes/${quoteId}/items`)
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    findingId: findings[0].id,
                    description: "Battery replacement",
                    components: [
                        {
                            type: "PART",
                            description: "Battery",
                            quantity: 1,
                            unitPrice: 80.0,
                        },
                        {
                            type: "LABOR",
                            description: "Battery replacement labor",
                            quantity: 1,
                            unitPrice: 20.0,
                        },
                    ],
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Quote item successfully created");

            expect(res.body.data).toMatchObject({
                quoteId: quoteId,
                findingId: findings[0].id,
                description: "Battery replacement",
                decision: "PENDING",
                createdById: user.id,
            });
            expect(res.body.data.id).toBeTruthy();
            expect(res.body.data.quoteItemComponents).toHaveLength(2);

            const partComponent = res.body.data.quoteItemComponents.find(
                (c: any) => c.type === "PART"
            );
            expect(partComponent.unitPrice).toBe("80");

            const laborComponent = res.body.data.quoteItemComponents.find(
                (c: any) => c.type === "LABOR"
            );
            expect(laborComponent.unitPrice).toBe("20");

            // Verify persistence in the database
            const quoteItemFound = await prisma.quoteItem.findUnique({
                where: { id: res.body.data.id },
                include: { quoteItemComponents: true },
            });

            expect(quoteItemFound).toBeTruthy();
            expect(quoteItemFound?.quoteId).toBe(quoteId);
            expect(quoteItemFound?.quoteItemComponents).toHaveLength(2);
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

    describe("GET /service-orders/quotes/:id", () => {
        it("should return the quote data", async () => {
            const { user, quotes } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "ATTENDANT" })
                .withCustomer()
                .withDevice()
                .withServiceOrder({ status: "AWAITING_QUOTE" })
                .withDiagnosis()
                .withQuote()
                .build();

            const quote = quotes[0];

            expect(quote).toBeTruthy();

            const accessToken = generateAccessToken(user.id, "ATTENDANT");

            const res = await request(app)
                .get(`/service-orders/quotes/${quote.id}`)
                .set("Authorization", `Bearer ${accessToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toMatchObject({
                id: quote.id,
                serviceOrderId: quote.serviceOrderId,
                diagnosisId: quote.diagnosisId,
                status: "DRAFT",
                createdById: user.id,
            });
            expect(res.body.data.createdAt).toBeTruthy();
            expect(res.body.data.submittedAt).toBeNull();
            expect(res.body.data.respondedAt).toBeNull();
            expect(res.body.data.updatedAt).toBeNull();
        });
    });

    describe("GET /service-orders/:id/quotes", () => {
        it("should return the quotes ordered by creation date ascending", async () => {
            const { user, serviceOrder, quotes } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "ATTENDANT" })
                .withCustomer()
                .withDevice()
                .withServiceOrder({ status: "AWAITING_QUOTE" })
                .withDiagnosis()
                .withQuote({ status: "SUPERSEDED" })
                .withQuote({ status: "DRAFT" })
                .build();

            const accessToken = generateAccessToken(user.id, "ATTENDANT");

            const res = await request(app)
                .get(`/service-orders/${serviceOrder!.id}/quotes`)
                .set("Authorization", `Bearer ${accessToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(2);
            expect(res.body.data[0].id).toBe(quotes[0].id);
            expect(res.body.data[0].status).toBe("SUPERSEDED");
            expect(res.body.data[1].id).toBe(quotes[1].id);
            expect(res.body.data[1].status).toBe("DRAFT");
        });

        it("should return an empty array when the service order has no quotes", async () => {
            const { user, serviceOrder } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "ATTENDANT" })
                .withCustomer()
                .withDevice()
                .withServiceOrder({ status: "AWAITING_QUOTE" })
                .build();

            const accessToken = generateAccessToken(user.id, "ATTENDANT");

            const res = await request(app)
                .get(`/service-orders/${serviceOrder!.id}/quotes`)
                .set("Authorization", `Bearer ${accessToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual([]);
        });
    });

    describe("GET /service-orders/quotes/items/:id", () => {
        it("should return the quote item with its components", async () => {
            const { user, findings, quoteItems } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "ATTENDANT" })
                .withCustomer()
                .withDevice()
                .withServiceOrder({ status: "AWAITING_QUOTE" })
                .withDiagnosis()
                .withFinding({ repairable: true })
                .withQuote()
                .withQuoteItem({
                    findingIndex: 0,
                    description: "Battery replacement",
                    components: [
                        { type: "PART", description: "Battery", quantity: 1, unitPrice: 80 },
                        { type: "LABOR", description: "Battery replacement labor", quantity: 1, unitPrice: 20 },
                    ],
                })
                .build();

            const accessToken = generateAccessToken(user.id, "ATTENDANT");
            const quoteItemId = quoteItems[0].id;

            const res = await request(app)
                .get(`/service-orders/quotes/items/${quoteItemId}`)
                .set("Authorization", `Bearer ${accessToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toMatchObject({
                id: quoteItemId,
                quoteId: quoteItems[0].quoteId,
                findingId: findings[0].id,
                description: "Battery replacement",
                decision: "PENDING",
                createdById: user.id,
            });
            expect(res.body.data.quoteItemComponents).toHaveLength(2);

            const partComponent = res.body.data.quoteItemComponents.find(
                (c: any) => c.type === "PART",
            );
            expect(partComponent.unitPrice).toBe("80");

            const laborComponent = res.body.data.quoteItemComponents.find(
                (c: any) => c.type === "LABOR",
            );
            expect(laborComponent.unitPrice).toBe("20");
        });
    });

    describe("GET /service-orders/quotes/:id/items", () => {
        it("should return the quote items ordered by creation date ascending", async () => {
            const { user, findings, quotes, quoteItems } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "ATTENDANT" })
                .withCustomer()
                .withDevice()
                .withServiceOrder({ status: "AWAITING_QUOTE" })
                .withDiagnosis()
                .withFinding({ repairable: true, description: "Battery issue" })
                .withFinding({ repairable: true, description: "Screen issue" })
                .withQuote()
                .withQuoteItem({
                    findingIndex: 0,
                    description: "Battery replacement",
                    components: [
                        { type: "PART", description: "Battery", quantity: 1, unitPrice: 80 },
                    ],
                })
                .withQuoteItem({
                    findingIndex: 1,
                    description: "Screen replacement",
                    components: [
                        { type: "PART", description: "Screen", quantity: 1, unitPrice: 120 },
                    ],
                })
                .build();

            const accessToken = generateAccessToken(user.id, "ATTENDANT");
            const quoteId = quotes[0].id;

            const res = await request(app)
                .get(`/service-orders/quotes/${quoteId}/items`)
                .set("Authorization", `Bearer ${accessToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(2);

            // The builder creates items in order, and the repository orders by
            // createdAt ascending, so the first item should be "Battery replacement".
            expect(res.body.data[0].id).toBe(quoteItems[0].id);
            expect(res.body.data[0].description).toBe("Battery replacement");
            expect(res.body.data[0].findingId).toBe(findings[0].id);
            expect(res.body.data[0].quoteItemComponents).toHaveLength(1);
            expect(res.body.data[0].quoteItemComponents[0].unitPrice).toBe("80");

            expect(res.body.data[1].id).toBe(quoteItems[1].id);
            expect(res.body.data[1].description).toBe("Screen replacement");
            expect(res.body.data[1].findingId).toBe(findings[1].id);
            expect(res.body.data[1].quoteItemComponents[0].unitPrice).toBe("120");
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

    describe("PATCH /service-orders/quotes/items/:id", () => {
        it("should update the quote item and its components successfully", async () => {
            const { user, quoteItems } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "ATTENDANT" })
                .withCustomer()
                .withDevice()
                .withServiceOrder({ status: "AWAITING_QUOTE" })
                .withDiagnosis()
                .withFinding({ repairable: true })
                .withQuote()
                .withQuoteItem({
                    findingIndex: 0,
                    description: "Battery replacement",
                    components: [
                        { type: "PART", description: "Battery", quantity: 1, unitPrice: 80 },
                        { type: "LABOR", description: "Battery replacement labor", quantity: 1, unitPrice: 20 },
                    ],
                })
                .build();

            const accessToken = generateAccessToken(user.id, "ATTENDANT");

            const quoteItem = quoteItems[0];
            const [firstComponent] = quoteItem.components;

            const res = await request(app)
                .patch(`/service-orders/quotes/items/${quoteItem.id}`)
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    description: "Battery replacement (updated)",
                    components: [
                        {
                            componentId: firstComponent.id,
                            type: null,
                            description: null,
                            quantity: 2,
                            unitPrice: 90,
                        },
                    ],
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toMatchObject({
                id: quoteItem.id,
                description: "Battery replacement (updated)",
                updatedById: user.id,
            });
            expect(res.body.data.updatedAt).toBeTruthy();
            expect(res.body.data.quoteItemComponents).toHaveLength(2);

            const updatedPart = res.body.data.quoteItemComponents.find(
                (c: any) => c.id === firstComponent.id,
            );
            expect(updatedPart.quantity).toBe(2);
            expect(updatedPart.unitPrice).toBe("90");
            expect(updatedPart.type).toBe("PART");
            expect(updatedPart.description).toBe("Battery");

            // Verify persistence in the database
            const persistedItem = await prisma.quoteItem.findUnique({
                where: { id: quoteItem.id },
                include: { quoteItemComponents: true },
            });

            expect(persistedItem?.description).toBe("Battery replacement (updated)");
            expect(persistedItem?.updatedById).toBe(user.id);
            expect(persistedItem?.updatedAt).toBeTruthy();
            expect(persistedItem?.quoteItemComponents).toHaveLength(2);

            const persistedComponent = persistedItem?.quoteItemComponents.find(
                (c) => c.id === firstComponent.id,
            );
            expect(persistedComponent?.quantity).toBe(2);
            expect(persistedComponent?.unitPrice.toString()).toBe("90");
        });
    });

    describe("DELETE /service-orders/findings/:id", () => {
        it("should delete the finding successfully", async () => {
            const { user, findings } = await new ServiceOrderBuilder(prisma)
                .withUser({ role: "TECHNICIAN" })
                .withCustomer()
                .withDevice()
                .withServiceOrder({ status: "IN_DIAGNOSIS" })
                .withDiagnosis()
                .withFinding({ repairable: true, description: "Battery capacity below expected level" })
                .build();

            const accessToken = generateAccessToken(user.id, "TECHNICIAN");
            const findingId = findings[0].id;

            const res = await request(app)
                .delete(`/service-orders/findings/${findingId}`)
                .set("Authorization", `Bearer ${accessToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Finding successfully deleted");

            // Verify the finding was actually deleted from the database
            const deletedFinding = await prisma.finding.findUnique({
                where: { id: findingId },
            });

            expect(deletedFinding).toBeNull();
        });
    });
});