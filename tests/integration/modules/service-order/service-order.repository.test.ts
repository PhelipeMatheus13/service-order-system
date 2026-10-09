// (Node built‑ins)
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
// (Types)
import type {
    CreateServiceOrderInput,
    CreateServiceOrderStatusHistoryData,
    CancelServiceOrderData,
    StartDiagnosisInput,
    UpdateServiceOrderStatusData
} from "../../../../src/modules/service-order/service-order.types.js";
// (shared / infra)
import { PrismaClient } from "../../../../src/generated/prisma/client.js";
import { setPrismaInstance } from "../../../../src/shared/config/database";
import { setupTestDatabase } from "../../../helpers/testDatabase.js";
// (local modules)
import serviceOrderRepository from "../../../../src/modules/service-order/service-order.repository.js";

describe("Service Order Repository (Integration)", () => {
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
        await prisma.serviceOrder.deleteMany();
        await prisma.device.deleteMany();
        await prisma.customer.deleteMany();
        await prisma.user.deleteMany();
    });

    describe("Writer repository", () => {
        describe("create", () => {
            let customerCreatedId: string;
            let deviceCreatedId: string;
            let userCreatedId: string;

            beforeEach(async () => {
                const userCreated = await prisma.user.create({
                    data: {
                        firstName: "John",
                        lastName: "Doe",
                        email: "john@example.com",
                        role: "ATTENDANT",
                        active: true,
                    },
                });
                userCreatedId = userCreated.id;

                const customerCreated = await prisma.customer.create({
                    data: {
                        firstName: "Jane",
                        lastName: "Doe",
                        email: "jane@example.com",
                        phoneNumber: "5521995437105",
                    },
                });
                customerCreatedId = customerCreated.id;

                const deviceCreated = await prisma.device.create({
                    data: {
                        customerId: customerCreatedId,
                        type: "SMARTPHONE",
                        brand: "Samsung",
                        model: "Galaxy S23",
                        serialNumber: "SN-123456",
                        imei: "123456789012345",
                        color: "Black",
                    },
                });
                deviceCreatedId = deviceCreated.id;
            });

            it("should insert a service order deriving customerId from the device", async () => {
                const input: CreateServiceOrderInput = {
                    deviceId: deviceCreatedId,
                    reportedProblem: "Screen is cracked and touch is not responding.",
                    createdById: userCreatedId,
                };

                const serviceOrderCreated = await serviceOrderRepository.create(input);

                expect(serviceOrderCreated).toBeTruthy();

                const serviceOrderFound = await prisma.serviceOrder.findUnique({
                    where: { id: serviceOrderCreated!.id },
                });

                expect(serviceOrderFound).not.toBeNull();
                expect(serviceOrderFound?.id).toBe(serviceOrderCreated!.id);
                expect(serviceOrderFound?.deviceId).toBe(deviceCreatedId);
                expect(serviceOrderFound?.customerId).toBe(customerCreatedId);
                expect(serviceOrderFound?.reportedProblem).toBe(input.reportedProblem);
                expect(serviceOrderFound?.status).toBe("WAITING_DIAGNOSIS");
                expect(serviceOrderFound?.createdById).toBe(userCreatedId);
                expect(serviceOrderFound?.cancelledAt).toBeNull();
                expect(serviceOrderFound?.cancelReason).toBeNull();
                expect(serviceOrderFound?.finishedAt).toBeNull();
                expect(serviceOrderFound?.createdAt).toBeTruthy();
                expect(serviceOrderFound?.updatedAt).toBeNull();
            });

            it("should return the record with camelCase fields", async () => {
                const input: CreateServiceOrderInput = {
                    deviceId: deviceCreatedId,
                    reportedProblem: "Battery drains too fast.",
                    createdById: userCreatedId,
                };

                const serviceOrderCreated = await serviceOrderRepository.create(input);

                expect(serviceOrderCreated).toHaveProperty("customerId");
                expect(serviceOrderCreated).toHaveProperty("deviceId");
                expect(serviceOrderCreated).toHaveProperty("reportedProblem");
                expect(serviceOrderCreated).toHaveProperty("createdBy");
                expect(serviceOrderCreated).toHaveProperty("cancelledAt");
                expect(serviceOrderCreated).toHaveProperty("cancelReason");
                expect(serviceOrderCreated).toHaveProperty("finishedAt");
                expect(serviceOrderCreated).toHaveProperty("createdAt");
                expect(serviceOrderCreated).toHaveProperty("updatedAt");
            });

            it("should return null when the device does not exist", async () => {
                const input: CreateServiceOrderInput = {
                    deviceId: "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa",
                    reportedProblem: "Screen is cracked.",
                    createdById: userCreatedId,
                };

                const serviceOrderCreated = await serviceOrderRepository.create(input);

                expect(serviceOrderCreated).toBeNull();

                const count = await prisma.serviceOrder.count();
                expect(count).toBe(0);
            });

            it("should use the transaction client when provided", async () => {
                const input: CreateServiceOrderInput = {
                    deviceId: deviceCreatedId,
                    reportedProblem: "Screen is cracked and touch is not responding.",
                    createdById: userCreatedId,
                };

                let serviceOrderCreatedId: string | undefined;

                await expect(
                    prisma.$transaction(async (tx) => {
                        const serviceOrderCreated = await serviceOrderRepository.create(input, tx);

                        serviceOrderCreatedId = serviceOrderCreated!.id;

                        throw new Error("rollback");
                    }),
                ).rejects.toThrow("rollback");

                if (serviceOrderCreatedId === undefined) {
                    throw new Error("serviceOrderCreatedId should have been defined");
                }

                const serviceOrderFound = await prisma.serviceOrder.findUnique({
                    where: { id: serviceOrderCreatedId },
                });

                expect(serviceOrderFound).toBeNull();
            });
        });

        describe("createServiceOrderStatusHistory", () => {
            let serviceOrderCreatedId: string;
            let userCreatedId: string;

            beforeEach(async () => {
                const userCreated = await prisma.user.create({
                    data: {
                        firstName: "John",
                        lastName: "Doe",
                        email: "john@example.com",
                        role: "ATTENDANT",
                        active: true,
                    },
                });
                userCreatedId = userCreated.id;

                const customerCreated = await prisma.customer.create({
                    data: {
                        firstName: "Jane",
                        lastName: "Doe",
                        email: "jane@example.com",
                        phoneNumber: "5521995437105",
                    },
                });

                const deviceCreated = await prisma.device.create({
                    data: {
                        customerId: customerCreated.id,
                        type: "SMARTPHONE",
                        brand: "Samsung",
                        model: "Galaxy S23",
                        serialNumber: "SN-123456",
                        imei: "123456789012345",
                        color: "Black",
                    },
                });

                const serviceOrderCreated = await prisma.serviceOrder.create({
                    data: {
                        customerId: customerCreated.id,
                        deviceId: deviceCreated.id,
                        reportedProblem: "Screen is cracked and touch is not responding.",
                        createdById: userCreated.id,
                    },
                });
                serviceOrderCreatedId = serviceOrderCreated.id;
            });

            it("should insert a status history entry with all fields populated", async () => {
                const input: CreateServiceOrderStatusHistoryData = {
                    serviceOrderId: serviceOrderCreatedId,
                    fromStatus: "AWAITING_APPROVAL",
                    toStatus: "AWAITING_MAINTENANCE",
                    changeSource: "SYSTEM",
                    changedById: null,
                };

                const historyCreated = await serviceOrderRepository.createServiceOrderStatusHistory(input);

                expect(historyCreated).toBeTruthy();

                const historyFound = await prisma.serviceOrderStatusHistory.findUnique({
                    where: { id: historyCreated.id },
                });

                expect(historyFound).not.toBeNull();
                expect(historyFound?.id).toBe(historyCreated.id);
                expect(historyFound?.serviceOrderId).toBe(serviceOrderCreatedId);
                expect(historyFound?.fromStatus).toBe("AWAITING_APPROVAL");
                expect(historyFound?.toStatus).toBe("AWAITING_MAINTENANCE");
                expect(historyFound?.changeSource).toBe("SYSTEM");
                expect(historyFound?.changedById).toBeNull();
                expect(historyFound?.createdAt).toBeTruthy();
            });

            it("should insert a status history entry with null fromStatus (initial status)", async () => {
                const input: CreateServiceOrderStatusHistoryData = {
                    serviceOrderId: serviceOrderCreatedId,
                    fromStatus: null,
                    toStatus: "WAITING_DIAGNOSIS",
                    changeSource: "USER",
                    changedById: userCreatedId,
                };

                const historyCreated = await serviceOrderRepository.createServiceOrderStatusHistory(input);

                const historyFound = await prisma.serviceOrderStatusHistory.findUnique({
                    where: { id: historyCreated.id },
                });

                expect(historyFound).not.toBeNull();
                expect(historyFound?.fromStatus).toBeNull();
                expect(historyFound?.toStatus).toBe("WAITING_DIAGNOSIS");
                expect(historyFound?.changeSource).toBe("USER");
                expect(historyFound?.changedById).toBe(userCreatedId);
            });

            it("should use the transaction client when provided", async () => {
                const input: CreateServiceOrderStatusHistoryData = {
                    serviceOrderId: serviceOrderCreatedId,
                    fromStatus: null,
                    toStatus: "WAITING_DIAGNOSIS",
                    changeSource: "USER",
                    changedById: userCreatedId,
                };

                let historyCreatedId: string | undefined;

                await expect(
                    prisma.$transaction(async (tx) => {
                        const historyCreated = await serviceOrderRepository.createServiceOrderStatusHistory(input, tx);

                        historyCreatedId = historyCreated.id;

                        throw new Error("rollback");
                    }),
                ).rejects.toThrow("rollback");

                if (historyCreatedId === undefined) {
                    throw new Error("historyCreatedId should have been defined");
                }

                const historyFound = await prisma.serviceOrderStatusHistory.findUnique({
                    where: { id: historyCreatedId },
                });

                expect(historyFound).toBeNull();
            });
        });

        describe("cancelServiceOrder", () => {
            let serviceOrderCreatedId: string;

            beforeEach(async () => {
                const userCreated = await prisma.user.create({
                    data: {
                        firstName: "John",
                        lastName: "Doe",
                        email: "john@example.com",
                        role: "ATTENDANT",
                        active: true,
                    },
                });

                const customerCreated = await prisma.customer.create({
                    data: {
                        firstName: "Jane",
                        lastName: "Doe",
                        email: "jane@example.com",
                        phoneNumber: "5521995437105",
                    },
                });

                const deviceCreated = await prisma.device.create({
                    data: {
                        customerId: customerCreated.id,
                        type: "SMARTPHONE",
                        brand: "Samsung",
                        model: "Galaxy S23",
                        serialNumber: "SN-123456",
                        imei: "123456789012345",
                        color: "Black",
                    },
                });

                const serviceOrderCreated = await prisma.serviceOrder.create({
                    data: {
                        customerId: customerCreated.id,
                        deviceId: deviceCreated.id,
                        reportedProblem: "Screen is cracked and touch is not responding.",
                        createdById: userCreated.id,
                    },
                });

                serviceOrderCreatedId = serviceOrderCreated.id;
            });

            it("should cancel a service order when its status allows cancellation and return true", async () => {
                const input: CancelServiceOrderData = {
                    serviceOrderId: serviceOrderCreatedId,
                    reason: "Customer requested cancellation.",
                };

                const cancelled = await serviceOrderRepository.cancelServiceOrder(input);

                expect(cancelled).toBe(true);

                const serviceOrderFound = await prisma.serviceOrder.findUnique({
                    where: { id: serviceOrderCreatedId },
                });

                expect(serviceOrderFound).not.toBeNull();
                expect(serviceOrderFound?.status).toBe("CANCELLED");
                expect(serviceOrderFound?.cancelReason).toBe(input.reason);
                expect(serviceOrderFound?.cancelledAt).toBeTruthy();
                expect(serviceOrderFound?.updatedAt).toBeTruthy();
            });

            it("should return false when the current status does not allow cancellation", async () => {
                await prisma.serviceOrder.update({
                    where: { id: serviceOrderCreatedId },
                    data: { status: "DELIVERED" },
                });

                const input: CancelServiceOrderData = {
                    serviceOrderId: serviceOrderCreatedId,
                    reason: "Customer requested cancellation.",
                };

                const cancelled = await serviceOrderRepository.cancelServiceOrder(input);

                expect(cancelled).toBe(false);

                const serviceOrderFound = await prisma.serviceOrder.findUnique({
                    where: { id: serviceOrderCreatedId },
                });

                expect(serviceOrderFound?.status).toBe("DELIVERED");
                expect(serviceOrderFound?.cancelledAt).toBeNull();
                expect(serviceOrderFound?.cancelReason).toBeNull();
            });

            it("should return false when the service order is already cancelled", async () => {
                await serviceOrderRepository.cancelServiceOrder({
                    serviceOrderId: serviceOrderCreatedId,
                    reason: "First cancellation.",
                });

                const cancelled = await serviceOrderRepository.cancelServiceOrder({
                    serviceOrderId: serviceOrderCreatedId,
                    reason: "Second cancellation attempt.",
                });

                expect(cancelled).toBe(false);

                const serviceOrderFound = await prisma.serviceOrder.findUnique({
                    where: { id: serviceOrderCreatedId },
                });

                expect(serviceOrderFound?.status).toBe("CANCELLED");
                expect(serviceOrderFound?.cancelReason).toBe("First cancellation.");
            });

            it("should return false when the service order does not exist", async () => {
                const cancelled = await serviceOrderRepository.cancelServiceOrder({
                    serviceOrderId: "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa",
                    reason: "Customer requested cancellation.",
                });

                expect(cancelled).toBe(false);
            });

            it("should use the transaction client when provided", async () => {
                const input: CancelServiceOrderData = {
                    serviceOrderId: serviceOrderCreatedId,
                    reason: "Customer requested cancellation.",
                };

                await expect(
                    prisma.$transaction(async (tx) => {
                        const cancelled = await serviceOrderRepository.cancelServiceOrder(input, tx);
                        expect(cancelled).toBe(true);

                        throw new Error("rollback");
                    }),
                ).rejects.toThrow("rollback");

                const serviceOrderFound = await prisma.serviceOrder.findUnique({
                    where: { id: serviceOrderCreatedId },
                });

                expect(serviceOrderFound?.status).toBe("WAITING_DIAGNOSIS");
                expect(serviceOrderFound?.cancelledAt).toBeNull();
                expect(serviceOrderFound?.cancelReason).toBeNull();
            });
        });

        describe("updateServiceOrderStatus", () => {
            let serviceOrderCreatedId: string;

            beforeEach(async () => {
                const userCreated = await prisma.user.create({
                    data: {
                        firstName: "John",
                        lastName: "Doe",
                        email: "john@example.com",
                        role: "TECHNICIAN",
                        active: true,
                    },
                });

                const customerCreated = await prisma.customer.create({
                    data: {
                        firstName: "Jane",
                        lastName: "Doe",
                        email: "jane@example.com",
                        phoneNumber: "5521995437105",
                    },
                });

                const deviceCreated = await prisma.device.create({
                    data: {
                        customerId: customerCreated.id,
                        type: "SMARTPHONE",
                        brand: "Samsung",
                        model: "Galaxy S23",
                        serialNumber: "SN-123456",
                        imei: "123456789012345",
                        color: "Black",
                    },
                });

                const serviceOrderCreated = await prisma.serviceOrder.create({
                    data: {
                        customerId: customerCreated.id,
                        deviceId: deviceCreated.id,
                        reportedProblem: "Screen is cracked and touch is not responding.",
                        createdById: userCreated.id,
                    },
                });
                serviceOrderCreatedId = serviceOrderCreated.id;
            });

            it("should update the status when the current status is in expectedStatuses and return true", async () => {
                const input: UpdateServiceOrderStatusData = {
                    serviceOrderId: serviceOrderCreatedId,
                    expectedStatuses: ["WAITING_DIAGNOSIS"],
                    toStatus: "IN_DIAGNOSIS",
                };

                const updated = await serviceOrderRepository.updateServiceOrderStatus(input);

                expect(updated).toBe(true);

                const serviceOrderFound = await prisma.serviceOrder.findUnique({
                    where: { id: serviceOrderCreatedId },
                });

                expect(serviceOrderFound?.status).toBe("IN_DIAGNOSIS");
                expect(serviceOrderFound?.updatedAt).toBeTruthy();
            });

            it("should return false when the current status is not in expectedStatuses", async () => {
                await prisma.serviceOrder.update({
                    where: { id: serviceOrderCreatedId },
                    data: { status: "DELIVERED" },
                });

                const input: UpdateServiceOrderStatusData = {
                    serviceOrderId: serviceOrderCreatedId,
                    expectedStatuses: ["WAITING_DIAGNOSIS", "IN_DIAGNOSIS"],
                    toStatus: "IN_DIAGNOSIS",
                };

                const updated = await serviceOrderRepository.updateServiceOrderStatus(input);

                expect(updated).toBe(false);

                const serviceOrderFound = await prisma.serviceOrder.findUnique({
                    where: { id: serviceOrderCreatedId },
                });

                expect(serviceOrderFound?.status).toBe("DELIVERED");
            });

            it("should return false when the service order does not exist", async () => {
                const input: UpdateServiceOrderStatusData = {
                    serviceOrderId: "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa",
                    expectedStatuses: ["WAITING_DIAGNOSIS"],
                    toStatus: "IN_DIAGNOSIS",
                };

                const updated = await serviceOrderRepository.updateServiceOrderStatus(input);

                expect(updated).toBe(false);
            });

            it("should accept multiple expected statuses", async () => {
                await prisma.serviceOrder.update({
                    where: { id: serviceOrderCreatedId },
                    data: { status: "AWAITING_QUOTE" },
                });

                const input: UpdateServiceOrderStatusData = {
                    serviceOrderId: serviceOrderCreatedId,
                    expectedStatuses: ["WAITING_DIAGNOSIS", "IN_DIAGNOSIS", "AWAITING_QUOTE"],
                    toStatus: "AWAITING_APPROVAL",
                };

                const updated = await serviceOrderRepository.updateServiceOrderStatus(input);

                expect(updated).toBe(true);

                const serviceOrderFound = await prisma.serviceOrder.findUnique({
                    where: { id: serviceOrderCreatedId },
                });

                expect(serviceOrderFound?.status).toBe("AWAITING_APPROVAL");
            });

            it("should use the transaction client when provided", async () => {
                const input: UpdateServiceOrderStatusData = {
                    serviceOrderId: serviceOrderCreatedId,
                    expectedStatuses: ["WAITING_DIAGNOSIS"],
                    toStatus: "IN_DIAGNOSIS",
                };

                await expect(
                    prisma.$transaction(async (tx) => {
                        const updated = await serviceOrderRepository.updateServiceOrderStatus(input, tx);
                        expect(updated).toBe(true);

                        throw new Error("rollback");
                    }),
                ).rejects.toThrow("rollback");

                const serviceOrderFound = await prisma.serviceOrder.findUnique({
                    where: { id: serviceOrderCreatedId },
                });

                expect(serviceOrderFound?.status).toBe("WAITING_DIAGNOSIS");
                expect(serviceOrderFound?.updatedAt).toBeNull();
            });
        });

        describe("createDiagnosis", () => {
            let userCreatedId: string;
            let serviceOrderCreatedId: string;

            beforeEach(async () => {
                const userCreated = await prisma.user.create({
                    data: {
                        firstName: "John",
                        lastName: "Doe",
                        email: "john@example.com",
                        role: "TECHNICIAN",
                        active: true,
                    },
                });
                userCreatedId = userCreated.id;

                const customerCreated = await prisma.customer.create({
                    data: {
                        firstName: "Jane",
                        lastName: "Doe",
                        email: "jane@example.com",
                        phoneNumber: "5521995437105",
                    },
                });

                const deviceCreated = await prisma.device.create({
                    data: {
                        customerId: customerCreated.id,
                        type: "SMARTPHONE",
                        brand: "Samsung",
                        model: "Galaxy S23",
                        serialNumber: "SN-123456",
                        imei: "123456789012345",
                        color: "Black",
                    },
                });

                const serviceOrderCreated = await prisma.serviceOrder.create({
                    data: {
                        customerId: customerCreated.id,
                        deviceId: deviceCreated.id,
                        reportedProblem: "Screen is cracked and touch is not responding.",
                        createdById: userCreated.id,
                        status: "IN_DIAGNOSIS",
                    },
                });
                serviceOrderCreatedId = serviceOrderCreated.id;
            });

            it("should insert a new diagnosis into the database", async () => {
                const input: StartDiagnosisInput = {
                    serviceOrderId: serviceOrderCreatedId,
                    performedById: userCreatedId,
                };

                const diagnosisCreated = await serviceOrderRepository.createDiagnosis(input);

                expect(diagnosisCreated).toBeTruthy();

                const diagnosisFound = await prisma.diagnosis.findUnique({
                    where: { id: diagnosisCreated.id },
                });

                expect(diagnosisFound).not.toBeNull();
                expect(diagnosisFound?.id).toBe(diagnosisCreated.id);
                expect(diagnosisFound?.serviceOrderId).toBe(serviceOrderCreatedId);
                expect(diagnosisFound?.performedById).toBe(userCreatedId);
                expect(diagnosisFound?.result).toBeNull();
                expect(diagnosisFound?.completedAt).toBeNull();
                expect(diagnosisFound?.createdAt).toBeTruthy();
            });

            it("should throw when a diagnosis already exists for the service order", async () => {
                const input: StartDiagnosisInput = {
                    serviceOrderId: serviceOrderCreatedId,
                    performedById: userCreatedId,
                };

                await serviceOrderRepository.createDiagnosis(input);

                await expect(serviceOrderRepository.createDiagnosis(input))
                    .rejects.toThrow();
            });

            it("should use the transaction client when provided", async () => {
                const input: StartDiagnosisInput = {
                    serviceOrderId: serviceOrderCreatedId,
                    performedById: userCreatedId,
                };

                let diagnosisCreatedId: string | undefined;

                await expect(
                    prisma.$transaction(async (tx) => {
                        const diagnosisCreated = await serviceOrderRepository.createDiagnosis(input, tx);

                        diagnosisCreatedId = diagnosisCreated.id;

                        throw new Error("rollback");
                    }),
                ).rejects.toThrow("rollback");

                if (diagnosisCreatedId === undefined) {
                    throw new Error("diagnosisCreatedId should have been defined");
                }

                const diagnosisFound = await prisma.diagnosis.findUnique({
                    where: { id: diagnosisCreatedId },
                });

                expect(diagnosisFound).toBeNull();
            });
        });
    });

    describe("Reader repository", () => {
        describe("findById", () => {
            it("should return the service order if a service order with the given ID exists", async () => {
                const userCreated = await prisma.user.create({
                    data: {
                        firstName: "John",
                        lastName: "Doe",
                        email: "john@example.com",
                        role: "ATTENDANT",
                        active: true,
                    },
                });

                const customerCreated = await prisma.customer.create({
                    data: {
                        firstName: "Jane",
                        lastName: "Doe",
                        email: "jane@example.com",
                        phoneNumber: "5521995437105",
                    },
                });

                const deviceCreated = await prisma.device.create({
                    data: {
                        customerId: customerCreated.id,
                        type: "SMARTPHONE",
                        brand: "Samsung",
                        model: "Galaxy S23",
                        serialNumber: "SN-123456",
                        imei: "123456789012345",
                        color: "Black",
                    },
                });

                const serviceOrderCreated = await prisma.serviceOrder.create({
                    data: {
                        customerId: customerCreated.id,
                        deviceId: deviceCreated.id,
                        reportedProblem: "Screen is cracked and touch is not responding.",
                        createdById: userCreated.id,
                    },
                });

                const serviceOrder = await serviceOrderRepository.findById(serviceOrderCreated.id);

                expect(serviceOrder).toBeTruthy();
                expect(serviceOrder?.id).toBe(serviceOrderCreated.id);
                expect(serviceOrder?.customerId).toBe(customerCreated.id);
                expect(serviceOrder?.deviceId).toBe(deviceCreated.id);
                expect(serviceOrder?.reportedProblem).toBe("Screen is cracked and touch is not responding.");
                expect(serviceOrder?.status).toBe("WAITING_DIAGNOSIS");
                expect(serviceOrder?.createdById).toBe(userCreated.id);
                expect(serviceOrder?.cancelledAt).toBeNull();
                expect(serviceOrder?.cancelReason).toBeNull();
                expect(serviceOrder?.finishedAt).toBeNull();
                expect(serviceOrder?.createdAt).toBeTruthy();
                expect(serviceOrder?.updatedAt).toBeNull();
            });

            it("should return null if a service order with the given ID does not exist", async () => {
                const serviceOrder = await serviceOrderRepository.findById("0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa");
                expect(serviceOrder).toBeNull();
            });
        });

        describe("list", () => {
            let userCreatedId: string;
            let customerCreatedId: string;
            let deviceCreatedId: string;

            beforeEach(async () => {
                const userCreated = await prisma.user.create({
                    data: {
                        firstName: "John",
                        lastName: "Doe",
                        email: "john@example.com",
                        role: "ATTENDANT",
                        active: true,
                    },
                });
                userCreatedId = userCreated.id;

                const customerCreated = await prisma.customer.create({
                    data: {
                        firstName: "Jane",
                        lastName: "Doe",
                        email: "jane@example.com",
                        phoneNumber: "5521995437105",
                    },
                });
                customerCreatedId = customerCreated.id;

                const deviceCreated = await prisma.device.create({
                    data: {
                        customerId: customerCreatedId,
                        type: "SMARTPHONE",
                        brand: "Samsung",
                        model: "Galaxy S23",
                        serialNumber: "SN-123456",
                        imei: "123456789012345",
                        color: "Black",
                    },
                });
                deviceCreatedId = deviceCreated.id;
            });

            it("should return service orders ordered by creation date descending and respect the given limit", async () => {
                const now = new Date();

                const serviceOrders = await prisma.serviceOrder.createManyAndReturn({
                    data: [
                        {
                            customerId: customerCreatedId,
                            deviceId: deviceCreatedId,
                            reportedProblem: "Screen is cracked and touch is not responding.",
                            createdById: userCreatedId,
                            createdAt: new Date(now.getTime() - 60 * 60 * 1000),
                            finishedAt: new Date(now.getTime() - 30 * 60 * 1000), // (only 1 Service Order active for the device)
                        },
                        {
                            customerId: customerCreatedId,
                            deviceId: deviceCreatedId,
                            reportedProblem: "Battery drains too fast.",
                            createdById: userCreatedId,
                            createdAt: now,
                        },
                    ],
                });

                const newerServiceOrder = serviceOrders.find(
                    (so) => so.reportedProblem === "Battery drains too fast.",
                )!;

                const result = await serviceOrderRepository.list({
                    options: {
                        limit: 1,
                    },
                });

                expect(result).toHaveLength(1);
                expect(result[0].id).toBe(newerServiceOrder.id);
                expect(result[0].customerId).toBe(newerServiceOrder.customerId);
                expect(result[0].deviceId).toBe(newerServiceOrder.deviceId);
                expect(result[0].reportedProblem).toBe(newerServiceOrder.reportedProblem);
                expect(result[0].status).toBe(newerServiceOrder.status);
                expect(result[0].createdById).toBe(newerServiceOrder.createdById);
                expect(result[0].cancelledAt).toBeNull();
                expect(result[0].cancelReason).toBeNull();
                expect(result[0].finishedAt).toBeNull();
                expect(result[0].createdAt).toBeTruthy();
                expect(result[0].updatedAt).toBeNull();
            });

            it("should default to 100 when limit is not provided", async () => {
                await prisma.serviceOrder.create({
                    data: {
                        customerId: customerCreatedId,
                        deviceId: deviceCreatedId,
                        reportedProblem: "Screen is cracked and touch is not responding.",
                        createdById: userCreatedId,
                    },
                });

                const result = await serviceOrderRepository.list({
                    options: {
                        limit: null,
                    },
                });

                expect(result).toHaveLength(1);
            });
        });

        describe("findDiagnosisById", () => {
            it("should return the diagnosis if a diagnosis with the given ID exists", async () => {
                const userCreated = await prisma.user.create({
                    data: {
                        firstName: "John",
                        lastName: "Doe",
                        email: "john@example.com",
                        role: "TECHNICIAN",
                        active: true,
                    },
                });

                const customerCreated = await prisma.customer.create({
                    data: {
                        firstName: "Jane",
                        lastName: "Doe",
                        email: "jane@example.com",
                        phoneNumber: "5521995437105",
                    },
                });

                const deviceCreated = await prisma.device.create({
                    data: {
                        customerId: customerCreated.id,
                        type: "SMARTPHONE",
                        brand: "Samsung",
                        model: "Galaxy S23",
                        serialNumber: "SN-123456",
                        imei: "123456789012345",
                        color: "Black",
                    },
                });

                const serviceOrderCreated = await prisma.serviceOrder.create({
                    data: {
                        customerId: customerCreated.id,
                        deviceId: deviceCreated.id,
                        reportedProblem: "Screen is cracked and touch is not responding.",
                        createdById: userCreated.id,
                        status: "IN_DIAGNOSIS",
                    },
                });

                const diagnosisCreated = await prisma.diagnosis.create({
                    data: {
                        serviceOrderId: serviceOrderCreated.id,
                        performedById: userCreated.id,
                    },
                });

                const diagnosis = await serviceOrderRepository.findDiagnosisById(diagnosisCreated.id);

                expect(diagnosis).toBeTruthy();
                expect(diagnosis?.id).toBe(diagnosisCreated.id);
                expect(diagnosis?.serviceOrderId).toBe(serviceOrderCreated.id);
                expect(diagnosis?.performedById).toBe(userCreated.id);
                expect(diagnosis?.result).toBeNull();
                expect(diagnosis?.completedAt).toBeNull();
                expect(diagnosis?.createdAt).toBeTruthy();
            });

            it("should return null if a diagnosis with the given ID does not exist", async () => {
                const diagnosis = await serviceOrderRepository.findDiagnosisById("0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa");

                expect(diagnosis).toBeNull();
            });
        });
    });
});