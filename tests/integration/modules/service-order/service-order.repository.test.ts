// (Node built‑ins)
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
// (Types)
import type {
    CreateServiceOrderInput,
    CreateServiceOrderStatusHistoryData,
    CancelServiceOrderData,
    StartDiagnosisInput,
    UpdateServiceOrderStatusData,
    CreateFindingInput,
    UpdateFindingInput,
    CompleteDiagnosisInput,
    DiagnosisRecord,
    CreateQuoteInput,
    CreateQuoteItemInput,
} from "../../../../src/modules/service-order/service-order.types.js";
// (shared / infra)
import { PrismaClient } from "../../../../src/generated/prisma/client.js";
import { setPrismaInstance } from "../../../../src/shared/config/database";
import { setupTestDatabase } from "../../../helpers/testDatabase.js";
import { ServiceOrderBuilder } from "./fixture/serviceOrderBuilder.js";
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
        await prisma.finding.deleteMany();
        await prisma.diagnosis.deleteMany();
        await prisma.serviceOrderStatusHistory.deleteMany();
        await prisma.serviceOrder.deleteMany();
        await prisma.device.deleteMany();
        await prisma.customer.deleteMany();
        await prisma.user.deleteMany();
    });

    describe("Writer repository", () => {
        describe("create", () => {
            it("should insert a service order deriving customerId from the device", async () => {
                const { user, customer, device } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .build();

                const input: CreateServiceOrderInput = {
                    deviceId: device.id,
                    reportedProblem: "Screen is cracked and touch is not responding.",
                    createdById: user.id,
                };

                const serviceOrderCreated = await serviceOrderRepository.create(input);

                expect(serviceOrderCreated).toBeTruthy();

                const serviceOrderFound = await prisma.serviceOrder.findUnique({
                    where: { id: serviceOrderCreated!.id },
                });

                expect(serviceOrderFound).not.toBeNull();
                expect(serviceOrderFound?.id).toBe(serviceOrderCreated!.id);
                expect(serviceOrderFound?.deviceId).toBe(device.id);
                expect(serviceOrderFound?.customerId).toBe(customer.id);
                expect(serviceOrderFound?.reportedProblem).toBe(input.reportedProblem);
                expect(serviceOrderFound?.status).toBe("WAITING_DIAGNOSIS");
                expect(serviceOrderFound?.createdById).toBe(user.id);
                expect(serviceOrderFound?.cancelledAt).toBeNull();
                expect(serviceOrderFound?.cancelReason).toBeNull();
                expect(serviceOrderFound?.finishedAt).toBeNull();
                expect(serviceOrderFound?.createdAt).toBeTruthy();
                expect(serviceOrderFound?.updatedAt).toBeNull();
            });

            it("should return the record with camelCase fields", async () => {
                const { user, device } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .build();

                const input: CreateServiceOrderInput = {
                    deviceId: device.id,
                    reportedProblem: "Battery drains too fast.",
                    createdById: user.id,
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
                const { user } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .build();

                const input: CreateServiceOrderInput = {
                    deviceId: "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa",
                    reportedProblem: "Screen is cracked.",
                    createdById: user.id,
                };

                const serviceOrderCreated = await serviceOrderRepository.create(input);

                expect(serviceOrderCreated).toBeNull();

                const count = await prisma.serviceOrder.count();
                expect(count).toBe(0);
            });

            it("should use the transaction client when provided", async () => {
                const { user, device } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .build();

                const input: CreateServiceOrderInput = {
                    deviceId: device.id,
                    reportedProblem: "Screen is cracked and touch is not responding.",
                    createdById: user.id,
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
            let userId: string;
            let serviceOrderId: string;

            beforeEach(async () => {
                const { user, serviceOrder } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder()
                    .build();

                userId = user.id;
                serviceOrderId = serviceOrder!.id;
            });

            it("should insert a status history entry with all fields populated", async () => {
                const input: CreateServiceOrderStatusHistoryData = {
                    serviceOrderId,
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
                expect(historyFound?.serviceOrderId).toBe(serviceOrderId);
                expect(historyFound?.fromStatus).toBe("AWAITING_APPROVAL");
                expect(historyFound?.toStatus).toBe("AWAITING_MAINTENANCE");
                expect(historyFound?.changeSource).toBe("SYSTEM");
                expect(historyFound?.changedById).toBeNull();
                expect(historyFound?.createdAt).toBeTruthy();
            });

            it("should insert a status history entry with null fromStatus (initial status)", async () => {
                const input: CreateServiceOrderStatusHistoryData = {
                    serviceOrderId,
                    fromStatus: null,
                    toStatus: "WAITING_DIAGNOSIS",
                    changeSource: "USER",
                    changedById: userId,
                };

                const historyCreated = await serviceOrderRepository.createServiceOrderStatusHistory(input);

                const historyFound = await prisma.serviceOrderStatusHistory.findUnique({
                    where: { id: historyCreated.id },
                });

                expect(historyFound).not.toBeNull();
                expect(historyFound?.fromStatus).toBeNull();
                expect(historyFound?.toStatus).toBe("WAITING_DIAGNOSIS");
                expect(historyFound?.changeSource).toBe("USER");
                expect(historyFound?.changedById).toBe(userId);
            });

            it("should use the transaction client when provided", async () => {
                const input: CreateServiceOrderStatusHistoryData = {
                    serviceOrderId,
                    fromStatus: null,
                    toStatus: "WAITING_DIAGNOSIS",
                    changeSource: "USER",
                    changedById: userId,
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
            it("should cancel a service order when its status allows cancellation and return true", async () => {
                const { serviceOrder } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder()
                    .build();

                const input: CancelServiceOrderData = {
                    serviceOrderId: serviceOrder!.id,
                    reason: "Customer requested cancellation.",
                };

                const cancelled = await serviceOrderRepository.cancelServiceOrder(input);

                expect(cancelled).toBe(true);

                const serviceOrderFound = await prisma.serviceOrder.findUnique({
                    where: { id: serviceOrder!.id },
                });

                expect(serviceOrderFound).not.toBeNull();
                expect(serviceOrderFound?.status).toBe("CANCELLED");
                expect(serviceOrderFound?.cancelReason).toBe(input.reason);
                expect(serviceOrderFound?.cancelledAt).toBeTruthy();
                expect(serviceOrderFound?.updatedAt).toBeTruthy();
            });

            it("should return false when the current status does not allow cancellation", async () => {
                const { serviceOrder } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "DELIVERED" })
                    .build();

                const input: CancelServiceOrderData = {
                    serviceOrderId: serviceOrder!.id,
                    reason: "Customer requested cancellation.",
                };

                const cancelled = await serviceOrderRepository.cancelServiceOrder(input);

                expect(cancelled).toBe(false);

                const serviceOrderFound = await prisma.serviceOrder.findUnique({
                    where: { id: serviceOrder!.id },
                });

                expect(serviceOrderFound?.status).toBe("DELIVERED");
                expect(serviceOrderFound?.cancelledAt).toBeNull();
                expect(serviceOrderFound?.cancelReason).toBeNull();
            });

            it("should return false when the service order is already cancelled", async () => {
                const { serviceOrder } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder()
                    .build();

                await serviceOrderRepository.cancelServiceOrder({
                    serviceOrderId: serviceOrder!.id,
                    reason: "First cancellation.",
                });

                const cancelled = await serviceOrderRepository.cancelServiceOrder({
                    serviceOrderId: serviceOrder!.id,
                    reason: "Second cancellation attempt.",
                });

                expect(cancelled).toBe(false);

                const serviceOrderFound = await prisma.serviceOrder.findUnique({
                    where: { id: serviceOrder!.id },
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
                const { serviceOrder } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder()
                    .build();

                const input: CancelServiceOrderData = {
                    serviceOrderId: serviceOrder!.id,
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
                    where: { id: serviceOrder!.id },
                });

                expect(serviceOrderFound?.status).toBe("WAITING_DIAGNOSIS");
                expect(serviceOrderFound?.cancelledAt).toBeNull();
                expect(serviceOrderFound?.cancelReason).toBeNull();
            });
        });

        describe("updateServiceOrderStatus", () => {
            it("should update the status when the current status is in expectedStatuses and return true", async () => {
                const { serviceOrder } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder()
                    .build();

                const input: UpdateServiceOrderStatusData = {
                    serviceOrderId: serviceOrder!.id,
                    expectedStatuses: ["WAITING_DIAGNOSIS"],
                    toStatus: "IN_DIAGNOSIS",
                };

                const updated = await serviceOrderRepository.updateServiceOrderStatus(input);

                expect(updated).toBe(true);

                const serviceOrderFound = await prisma.serviceOrder.findUnique({
                    where: { id: serviceOrder!.id },
                });

                expect(serviceOrderFound?.status).toBe("IN_DIAGNOSIS");
                expect(serviceOrderFound?.updatedAt).toBeTruthy();
            });

            it("should return false when the current status is not in expectedStatuses", async () => {
                const { serviceOrder } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "DELIVERED" })
                    .build();

                const input: UpdateServiceOrderStatusData = {
                    serviceOrderId: serviceOrder!.id,
                    expectedStatuses: ["WAITING_DIAGNOSIS", "IN_DIAGNOSIS"],
                    toStatus: "IN_DIAGNOSIS",
                };

                const updated = await serviceOrderRepository.updateServiceOrderStatus(input);

                expect(updated).toBe(false);

                const serviceOrderFound = await prisma.serviceOrder.findUnique({
                    where: { id: serviceOrder!.id },
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
                const { serviceOrder } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_QUOTE" })
                    .build();

                const input: UpdateServiceOrderStatusData = {
                    serviceOrderId: serviceOrder!.id,
                    expectedStatuses: ["WAITING_DIAGNOSIS", "IN_DIAGNOSIS", "AWAITING_QUOTE"],
                    toStatus: "AWAITING_APPROVAL",
                };

                const updated = await serviceOrderRepository.updateServiceOrderStatus(input);

                expect(updated).toBe(true);

                const serviceOrderFound = await prisma.serviceOrder.findUnique({
                    where: { id: serviceOrder!.id },
                });

                expect(serviceOrderFound?.status).toBe("AWAITING_APPROVAL");
            });

            it("should use the transaction client when provided", async () => {
                const { serviceOrder } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder()
                    .build();

                const input: UpdateServiceOrderStatusData = {
                    serviceOrderId: serviceOrder!.id,
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
                    where: { id: serviceOrder!.id },
                });

                expect(serviceOrderFound?.status).toBe("WAITING_DIAGNOSIS");
                expect(serviceOrderFound?.updatedAt).toBeNull();
            });
        });

        describe("createDiagnosis", () => {
            let userId: string;
            let serviceOrderId: string;

            beforeEach(async () => {
                const { user, serviceOrder } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "IN_DIAGNOSIS" })
                    .build();

                userId = user.id;
                serviceOrderId = serviceOrder!.id;
            });

            it("should insert a new diagnosis into the database", async () => {
                const input: StartDiagnosisInput = {
                    serviceOrderId,
                    createdById: userId,
                };

                const diagnosisCreated = await serviceOrderRepository.createDiagnosis(input);

                expect(diagnosisCreated).toBeTruthy();

                const diagnosisFound = await prisma.diagnosis.findUnique({
                    where: { id: diagnosisCreated.id },
                });

                expect(diagnosisFound).not.toBeNull();
                expect(diagnosisFound?.id).toBe(diagnosisCreated.id);
                expect(diagnosisFound?.serviceOrderId).toBe(serviceOrderId);
                expect(diagnosisFound?.createdById).toBe(userId);
                expect(diagnosisFound?.result).toBeNull();
                expect(diagnosisFound?.completedAt).toBeNull();
                expect(diagnosisFound?.createdAt).toBeTruthy();
            });

            it("should throw when a diagnosis already exists for the service order", async () => {
                const input: StartDiagnosisInput = {
                    serviceOrderId,
                    createdById: userId,
                };

                await serviceOrderRepository.createDiagnosis(input);

                await expect(serviceOrderRepository.createDiagnosis(input))
                    .rejects.toThrow();
            });

            it("should use the transaction client when provided", async () => {
                const input: StartDiagnosisInput = {
                    serviceOrderId,
                    createdById: userId,
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

        describe("createFinding", () => {
            it("should insert a new finding into the database", async () => {
                const { user, diagnosis } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "IN_DIAGNOSIS" })
                    .withDiagnosis()
                    .build();

                const input: CreateFindingInput = {
                    diagnosisId: diagnosis!.id,
                    createdById: user.id,
                    description: "Battery capacity below expected level",
                    repairable: true,
                };

                const findingCreated = await serviceOrderRepository.createFinding(input);

                expect(findingCreated).toBeTruthy();
                expect(findingCreated?.id).toBeTruthy();
                expect(findingCreated?.diagnosisId).toBe(diagnosis!.id);
                expect(findingCreated?.createdById).toBe(user.id);
                expect(findingCreated?.description).toBe(input.description);
                expect(findingCreated?.repairable).toBe(true);
                expect(findingCreated?.createdAt).toBeTruthy();
                expect(findingCreated?.updatedAt).toBeNull();
                expect(findingCreated?.updatedById).toBeNull();

                const findingFound = await prisma.finding.findUnique({
                    where: { id: findingCreated!.id },
                });

                expect(findingFound).not.toBeNull();
            });

            it("should return null when the diagnosis does not exist", async () => {
                const { user } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .build();

                const input: CreateFindingInput = {
                    diagnosisId: "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa",
                    createdById: user.id,
                    description: "Battery capacity below expected level",
                    repairable: true,
                };

                const findingCreated = await serviceOrderRepository.createFinding(input);

                expect(findingCreated).toBeNull();
            });

            it("should return null when the diagnosis is already completed", async () => {
                const { user, diagnosis } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "IN_DIAGNOSIS" })
                    .withDiagnosis({ result: "FAULT_FOUND", completedAt: new Date() })
                    .build();

                const input: CreateFindingInput = {
                    diagnosisId: diagnosis!.id,
                    createdById: user.id,
                    description: "Battery capacity below expected level",
                    repairable: true,
                };

                const findingCreated = await serviceOrderRepository.createFinding(input);

                expect(findingCreated).toBeNull();

                const count = await prisma.finding.count();
                expect(count).toBe(0);
            });

            it("should return null when the service order is not IN_DIAGNOSIS", async () => {
                const { user, diagnosis } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_DELIVERY" })
                    .withDiagnosis()
                    .build();

                const input: CreateFindingInput = {
                    diagnosisId: diagnosis!.id,
                    createdById: user.id,
                    description: "Battery capacity below expected level",
                    repairable: true,
                };

                const findingCreated = await serviceOrderRepository.createFinding(input);

                expect(findingCreated).toBeNull();

                const count = await prisma.finding.count();
                expect(count).toBe(0);
            });

            it("should throw when the authenticated user does not exist", async () => {
                const { diagnosis } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "IN_DIAGNOSIS" })
                    .withDiagnosis()
                    .build();

                const input: CreateFindingInput = {
                    diagnosisId: diagnosis!.id,
                    createdById: "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa",
                    description: "Battery capacity below expected level",
                    repairable: true,
                };

                await expect(serviceOrderRepository.createFinding(input))
                    .rejects.toThrow();

                const count = await prisma.finding.count();
                expect(count).toBe(0);
            });
        });

        describe("updateFinding", () => {
            it("should update the finding and set updatedById and updatedAt", async () => {
                const { user, findings } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "IN_DIAGNOSIS" })
                    .withDiagnosis()
                    .withFinding()
                    .build();

                const findingId = findings[0].id;

                const input: UpdateFindingInput = {
                    findingId,
                    description: "Battery capacity critically below expected level",
                    repairable: false,
                    updatedById: user.id,
                };

                const findingUpdated = await serviceOrderRepository.updateFinding(input);

                expect(findingUpdated).toBeTruthy();
                expect(findingUpdated?.id).toBe(findingId);
                expect(findingUpdated?.description).toBe("Battery capacity critically below expected level");
                expect(findingUpdated?.repairable).toBe(false);
                expect(findingUpdated?.createdById).toBe(user.id);
                expect(findingUpdated?.updatedById).toBe(user.id);
                expect(findingUpdated?.updatedAt).toBeTruthy();

                const findingFound = await prisma.finding.findUnique({
                    where: { id: findingId },
                });

                expect(findingFound?.description).toBe("Battery capacity critically below expected level");
                expect(findingFound?.repairable).toBe(false);
                expect(findingFound?.updatedById).toBe(user.id);
                expect(findingFound?.updatedAt).toBeTruthy();
            });

            it("should return null when the finding does not exist", async () => {
                const { user } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .build();

                const input: UpdateFindingInput = {
                    findingId: "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa",
                    description: "Battery capacity critically below expected level",
                    repairable: false,
                    updatedById: user.id,
                };

                const findingUpdated = await serviceOrderRepository.updateFinding(input);

                expect(findingUpdated).toBeNull();
            });

            it("should return null when the diagnosis is already completed", async () => {
                const { user, findings } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "IN_DIAGNOSIS" })
                    .withDiagnosis({ result: "FAULT_FOUND", completedAt: new Date() })
                    .withFinding()
                    .build();

                const findingId = findings[0].id;

                const input: UpdateFindingInput = {
                    findingId,
                    description: "Battery capacity critically below expected level",
                    repairable: false,
                    updatedById: user.id,
                };

                const findingUpdated = await serviceOrderRepository.updateFinding(input);

                expect(findingUpdated).toBeNull();

                const findingFound = await prisma.finding.findUnique({
                    where: { id: findingId },
                });

                expect(findingFound?.description).toBe("Battery capacity below expected level");
                expect(findingFound?.repairable).toBe(true);
                expect(findingFound?.updatedById).toBeNull();
                expect(findingFound?.updatedAt).toBeNull();
            });

            it("should return null when the service order is not IN_DIAGNOSIS", async () => {
                const { user, findings } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_DELIVERY" })
                    .withDiagnosis()
                    .withFinding()
                    .build();

                const findingId = findings[0].id;

                const input: UpdateFindingInput = {
                    findingId,
                    description: "Battery capacity critically below expected level",
                    repairable: false,
                    updatedById: user.id,
                };

                const findingUpdated = await serviceOrderRepository.updateFinding(input);

                expect(findingUpdated).toBeNull();

                const findingFound = await prisma.finding.findUnique({
                    where: { id: findingId },
                });

                expect(findingFound?.description).toBe("Battery capacity below expected level");
                expect(findingFound?.updatedById).toBeNull();
            });

            it("should throw when the updated_by user does not exist", async () => {
                const { findings } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "IN_DIAGNOSIS" })
                    .withDiagnosis()
                    .withFinding()
                    .build();

                const findingId = findings[0].id;

                const input: UpdateFindingInput = {
                    findingId,
                    description: "Battery capacity critically below expected level",
                    repairable: false,
                    updatedById: "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa",
                };

                await expect(serviceOrderRepository.updateFinding(input))
                    .rejects.toThrow();

                const findingFound = await prisma.finding.findUnique({
                    where: { id: findingId },
                });

                expect(findingFound?.description).toBe("Battery capacity below expected level");
                expect(findingFound?.updatedById).toBeNull();
            });
        });

        describe("deleteFindingById", () => {
            it("should delete the finding and return true", async () => {
                const { findings } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "IN_DIAGNOSIS" })
                    .withDiagnosis()
                    .withFinding()
                    .build();

                const findingId = findings[0].id;

                const deleted = await serviceOrderRepository.deleteFindingById(findingId);

                expect(deleted).toBe(true);

                const findingFound = await prisma.finding.findUnique({
                    where: { id: findingId },
                });

                expect(findingFound).toBeNull();
            });

            it("should return false when the finding does not exist", async () => {
                const deleted = await serviceOrderRepository.deleteFindingById("0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa");

                expect(deleted).toBe(false);
            });

            it("should return false when the diagnosis is already completed", async () => {
                const { findings } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "IN_DIAGNOSIS" })
                    .withDiagnosis({ result: "FAULT_FOUND", completedAt: new Date() })
                    .withFinding()
                    .build();

                const findingId = findings[0].id;

                const deleted = await serviceOrderRepository.deleteFindingById(findingId);

                expect(deleted).toBe(false);

                const findingFound = await prisma.finding.findUnique({
                    where: { id: findingId },
                });

                expect(findingFound).not.toBeNull();
            });

            it("should return false when the service order is not IN_DIAGNOSIS", async () => {
                const { findings } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_DELIVERY" })
                    .withDiagnosis()
                    .withFinding()
                    .build();

                const findingId = findings[0].id;

                const deleted = await serviceOrderRepository.deleteFindingById(findingId);

                expect(deleted).toBe(false);

                const findingFound = await prisma.finding.findUnique({
                    where: { id: findingId },
                });

                expect(findingFound).not.toBeNull();
            });
        });

        describe("completeDiagnosis", () => {
            it("should complete the diagnosis and return the updated record", async () => {
                const { user, diagnosis } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "IN_DIAGNOSIS" })
                    .withDiagnosis()
                    .build();

                const input: CompleteDiagnosisInput = {
                    diagnosisId: diagnosis!.id,
                    result: "FAULT_FOUND",
                    completedById: user.id,
                };

                const diagnosisCompleted = await serviceOrderRepository.completeDiagnosis(input);

                expect(diagnosisCompleted).toBeTruthy();
                expect(diagnosisCompleted?.id).toBe(diagnosis!.id);
                expect(diagnosisCompleted?.result).toBe("FAULT_FOUND");
                expect(diagnosisCompleted?.completedById).toBe(user.id);
                expect(diagnosisCompleted?.completedAt).toBeTruthy();

                const diagnosisFound = await prisma.diagnosis.findUnique({
                    where: { id: diagnosis!.id },
                });

                expect(diagnosisFound?.result).toBe("FAULT_FOUND");
                expect(diagnosisFound?.completedById).toBe(user.id);
                expect(diagnosisFound?.completedAt).toBeTruthy();
            });

            it("should return null when the diagnosis does not exist", async () => {
                const input: CompleteDiagnosisInput = {
                    diagnosisId: "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa",
                    result: "FAULT_FOUND",
                    completedById: "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa",
                };

                const diagnosisCompleted = await serviceOrderRepository.completeDiagnosis(input);

                expect(diagnosisCompleted).toBeNull();
            });

            it("should return null when the diagnosis is already completed", async () => {
                const completedBy = await prisma.user.create({
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

                const { user, diagnosis } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "IN_DIAGNOSIS" })
                    .withDiagnosis({
                        result: "NO_FAULT_FOUND",
                        completedAt: new Date(),
                        completedById: completedBy.id,
                    })
                    .build();

                const input: CompleteDiagnosisInput = {
                    diagnosisId: diagnosis!.id,
                    result: "FAULT_FOUND",
                    completedById: user.id,
                };

                const diagnosisCompleted = await serviceOrderRepository.completeDiagnosis(input);

                expect(diagnosisCompleted).toBeNull();

                const diagnosisFound = await prisma.diagnosis.findUnique({
                    where: { id: diagnosis!.id },
                });

                expect(diagnosisFound?.result).toBe("NO_FAULT_FOUND");
            });

            it("should throw when the completed_by user does not exist", async () => {
                const { diagnosis } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "IN_DIAGNOSIS" })
                    .withDiagnosis()
                    .build();

                const input: CompleteDiagnosisInput = {
                    diagnosisId: diagnosis!.id,
                    result: "FAULT_FOUND",
                    completedById: "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa",
                };

                await expect(serviceOrderRepository.completeDiagnosis(input))
                    .rejects.toThrow();

                const diagnosisFound = await prisma.diagnosis.findUnique({
                    where: { id: diagnosis!.id },
                });

                expect(diagnosisFound?.result).toBeNull();
                expect(diagnosisFound?.completedById).toBeNull();
                expect(diagnosisFound?.completedAt).toBeNull();
            });

            it("should use the transaction client when provided", async () => {
                const { user, diagnosis } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "IN_DIAGNOSIS" })
                    .withDiagnosis()
                    .build();

                const input: CompleteDiagnosisInput = {
                    diagnosisId: diagnosis!.id,
                    result: "FAULT_FOUND",
                    completedById: user.id,
                };

                const captured: { diagnosis: DiagnosisRecord | null } = { diagnosis: null };

                await expect(
                    prisma.$transaction(async (tx) => {
                        captured.diagnosis = await serviceOrderRepository.completeDiagnosis(input, tx);

                        throw new Error("rollback");
                    }),
                ).rejects.toThrow("rollback");

                expect(captured.diagnosis).toBeTruthy();
                expect(captured.diagnosis?.result).toBe("FAULT_FOUND");
                expect(captured.diagnosis?.completedById).toBe(user.id);
                expect(captured.diagnosis?.completedAt).toBeTruthy();

                const diagnosisAfterRollback = await prisma.diagnosis.findUnique({
                    where: { id: diagnosis!.id },
                });

                expect(diagnosisAfterRollback?.result).toBeNull();
                expect(diagnosisAfterRollback?.completedById).toBeNull();
                expect(diagnosisAfterRollback?.completedAt).toBeNull();
            });
        });

        describe("createQuote", () => {
            it("should insert a new quote into the database", async () => {
                const { user, serviceOrder, diagnosis } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_QUOTE" })
                    .withDiagnosis()
                    .build();

                const input: CreateQuoteInput = {
                    serviceOrderId: serviceOrder!.id,
                    diagnosisId: diagnosis!.id,
                    createdById: user.id,
                };

                const quoteCreated = await serviceOrderRepository.createQuote(input);

                expect(quoteCreated).toBeTruthy();
                expect(quoteCreated?.id).toBeTruthy();
                expect(quoteCreated?.serviceOrderId).toBe(serviceOrder!.id);
                expect(quoteCreated?.diagnosisId).toBe(diagnosis!.id);
                expect(quoteCreated?.createdById).toBe(user.id);
                expect(quoteCreated?.status).toBe("DRAFT");
                expect(quoteCreated?.submittedAt).toBeNull();
                expect(quoteCreated?.respondedAt).toBeNull();
                expect(quoteCreated?.createdAt).toBeTruthy();
                expect(quoteCreated?.updatedAt).toBeNull();

                const quoteFound = await prisma.quote.findUnique({
                    where: { id: quoteCreated!.id },
                });

                expect(quoteFound).not.toBeNull();
            });

            it("should return null when the diagnosis does not exist", async () => {
                const { user, serviceOrder } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_QUOTE" })
                    .build();

                const input: CreateQuoteInput = {
                    serviceOrderId: serviceOrder!.id,
                    diagnosisId: "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa",
                    createdById: user.id,
                };

                const quoteCreated = await serviceOrderRepository.createQuote(input);

                expect(quoteCreated).toBeNull();

                const count = await prisma.quote.count();
                expect(count).toBe(0);
            });

            it("should return null when the diagnosis belongs to a different service order", async () => {
                const scenarioA = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_QUOTE" })
                    .withDiagnosis()
                    .build();

                const scenarioB = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT", email: "jasondoe@example.com" }) // different email
                    .withCustomer({ email: "marysmith@example.com" })
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_QUOTE" })
                    .withDiagnosis()
                    .build();

                const input: CreateQuoteInput = {
                    serviceOrderId: scenarioA.serviceOrder!.id,
                    diagnosisId: scenarioB.diagnosis!.id,
                    createdById: scenarioA.user.id,
                };

                const quoteCreated = await serviceOrderRepository.createQuote(input);

                expect(quoteCreated).toBeNull();

                const count = await prisma.quote.count();
                expect(count).toBe(0);
            });

            it("should return null when the service order is not AWAITING_QUOTE", async () => {
                const { user, serviceOrder, diagnosis } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_APPROVAL" })
                    .withDiagnosis()
                    .build();

                const input: CreateQuoteInput = {
                    serviceOrderId: serviceOrder!.id,
                    diagnosisId: diagnosis!.id,
                    createdById: user.id,
                };

                const quoteCreated = await serviceOrderRepository.createQuote(input);

                expect(quoteCreated).toBeNull();

                const count = await prisma.quote.count();
                expect(count).toBe(0);
            });

            it("should throw when the service order already has a current quote", async () => {
                const { user, serviceOrder, diagnosis } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_QUOTE" })
                    .withDiagnosis()
                    .build();

                const input: CreateQuoteInput = {
                    serviceOrderId: serviceOrder!.id,
                    diagnosisId: diagnosis!.id,
                    createdById: user.id,
                };

                await serviceOrderRepository.createQuote(input);

                await expect(serviceOrderRepository.createQuote(input))
                    .rejects.toThrow();
            });

            it("should throw when the created_by user does not exist", async () => {
                const { serviceOrder, diagnosis } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_QUOTE" })
                    .withDiagnosis()
                    .build();

                const input: CreateQuoteInput = {
                    serviceOrderId: serviceOrder!.id,
                    diagnosisId: diagnosis!.id,
                    createdById: "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa", // not exist
                };

                await expect(serviceOrderRepository.createQuote(input))
                    .rejects.toThrow();
            });
        });

        describe("lockQuoteIfDraft", () => {
            it("should return true and lock the row when the quote is DRAFT", async () => {
                const { quote } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_QUOTE" })
                    .withDiagnosis()
                    .withQuote({ status: "DRAFT" })
                    .build();

                await prisma.$transaction(async (tx) => {
                    const locked = await serviceOrderRepository.lockQuoteIfDraft(quote!.id, tx);

                    expect(locked).toBe(true);
                });

                const quoteFound = await prisma.quote.findUnique({
                    where: { id: quote!.id },
                });

                expect(quoteFound?.updatedAt).toBeTruthy();
            });

            it("should return false when the quote is not DRAFT", async () => {
                const { quote } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_APPROVAL" })
                    .withDiagnosis()
                    .withQuote({ status: "SENT", submittedAt: new Date() })
                    .build();

                await prisma.$transaction(async (tx) => {
                    const locked = await serviceOrderRepository.lockQuoteIfDraft(quote!.id, tx);

                    expect(locked).toBe(false);
                });

                const quoteFound = await prisma.quote.findUnique({
                    where: { id: quote!.id },
                });

                expect(quoteFound?.updatedAt).toBeNull();
            });

            it("should return false when the quote does not exist", async () => {
                await prisma.$transaction(async (tx) => {
                    const locked = await serviceOrderRepository.lockQuoteIfDraft(
                        "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa",
                        tx,
                    );

                    expect(locked).toBe(false);
                });
            });
        });

        describe("createQuoteItem", () => {
            it("should insert a quote item with its components into the database", async () => {
                const { user, findings, quote } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_QUOTE" })
                    .withDiagnosis()
                    .withFinding({ repairable: true })
                    .withQuote()
                    .build();

                const input: CreateQuoteItemInput = {
                    quoteId: quote!.id,
                    findingId: findings[0].id,
                    description: "Battery replacement",
                    createdById: user.id,
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
                };

                const quoteItemCreated = await serviceOrderRepository.createQuoteItem(input);

                expect(quoteItemCreated).toBeTruthy();
                expect(quoteItemCreated.id).toBeTruthy();
                expect(quoteItemCreated.quoteId).toBe(quote!.id);
                expect(quoteItemCreated.findingId).toBe(findings[0].id);
                expect(quoteItemCreated.description).toBe("Battery replacement");
                expect(quoteItemCreated.decision).toBe("PENDING");
                expect(quoteItemCreated.createdById).toBe(user.id);
                expect(quoteItemCreated.createdAt).toBeTruthy();
                expect(quoteItemCreated.updatedById).toBeNull();
                expect(quoteItemCreated.updatedAt).toBeNull();
                expect(quoteItemCreated.quoteItemComponents).toHaveLength(2);

                const partComponent = quoteItemCreated.quoteItemComponents.find(
                    (c) => c.type === "PART",
                );
                expect(partComponent).toBeTruthy();
                expect(partComponent?.description).toBe("Battery");
                expect(partComponent?.quantity).toBe(1);
                expect(partComponent?.unitPrice.toString()).toBe("80");

                const laborComponent = quoteItemCreated.quoteItemComponents.find(
                    (c) => c.type === "LABOR",
                );
                expect(laborComponent).toBeTruthy();
                expect(laborComponent?.description).toBe("Battery replacement labor");
                expect(laborComponent?.quantity).toBe(1);
                expect(laborComponent?.unitPrice.toString()).toBe("20");

                const quoteItemFound = await prisma.quoteItem.findUnique({
                    where: { id: quoteItemCreated.id },
                    include: { quoteItemComponents: true },
                });

                expect(quoteItemFound).not.toBeNull();
                expect(quoteItemFound?.quoteItemComponents).toHaveLength(2);
            });

            it("should insert a quote item when called with a transaction client", async () => {
                const { user, findings, quote } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_QUOTE" })
                    .withDiagnosis()
                    .withFinding({ repairable: true })
                    .withQuote()
                    .build();

                const input: CreateQuoteItemInput = {
                    quoteId: quote!.id,
                    findingId: findings[0].id,
                    description: "Screen replacement",
                    createdById: user.id,
                    components: [
                        {
                            type: "PART",
                            description: "Replacement screen",
                            quantity: 1,
                            unitPrice: 120.0,
                        },
                    ],
                };

                const quoteItemCreated = await prisma.$transaction((tx) =>
                    serviceOrderRepository.createQuoteItem(input, tx),
                );

                expect(quoteItemCreated.id).toBeTruthy();
                expect(quoteItemCreated.quoteItemComponents).toHaveLength(1);
                expect(quoteItemCreated.quoteItemComponents[0].unitPrice.toString()).toBe("120");

                const quoteItemFound = await prisma.quoteItem.findUnique({
                    where: { id: quoteItemCreated.id },
                });

                expect(quoteItemFound).not.toBeNull();
            });

            it("should rollback the quote item when the transaction throws", async () => {
                const { user, findings, quote } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_QUOTE" })
                    .withDiagnosis()
                    .withFinding({ repairable: true })
                    .withQuote()
                    .build();

                const input: CreateQuoteItemInput = {
                    quoteId: quote!.id,
                    findingId: findings[0].id,
                    description: "Battery replacement",
                    createdById: user.id,
                    components: [
                        {
                            type: "PART",
                            description: "Battery",
                            quantity: 1,
                            unitPrice: 80.0,
                        },
                    ],
                };

                await expect(
                    prisma.$transaction(async (tx) => {
                        await serviceOrderRepository.createQuoteItem(input, tx);

                        throw new Error("rollback");
                    }),
                ).rejects.toThrow("rollback");

                const count = await prisma.quoteItem.count();
                expect(count).toBe(0);

                const componentCount = await prisma.quoteItemComponent.count();
                expect(componentCount).toBe(0);
            });

            it("should throw when the quote does not exist", async () => {
                const { user, findings } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_QUOTE" })
                    .withDiagnosis()
                    .withFinding({ repairable: true })
                    .build();

                const input: CreateQuoteItemInput = {
                    quoteId: "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa",
                    findingId: findings[0].id,
                    description: "Battery replacement",
                    createdById: user.id,
                    components: [
                        {
                            type: "PART",
                            description: "Battery",
                            quantity: 1,
                            unitPrice: 80.0,
                        },
                    ],
                };

                await expect(serviceOrderRepository.createQuoteItem(input))
                    .rejects.toThrow();

                const count = await prisma.quoteItem.count();
                expect(count).toBe(0);
            });

            it("should throw when the finding does not exist", async () => {
                const { user, quote } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_QUOTE" })
                    .withDiagnosis()
                    .withQuote()
                    .build();

                const input: CreateQuoteItemInput = {
                    quoteId: quote!.id,
                    findingId: "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa",
                    description: "Battery replacement",
                    createdById: user.id,
                    components: [
                        {
                            type: "PART",
                            description: "Battery",
                            quantity: 1,
                            unitPrice: 80.0,
                        },
                    ],
                };

                await expect(serviceOrderRepository.createQuoteItem(input))
                    .rejects.toThrow();

                const count = await prisma.quoteItem.count();
                expect(count).toBe(0);
            });
        });
    });

    describe("Reader repository", () => {
        describe("findById", () => {
            it("should return the service order if a service order with the given ID exists", async () => {
                const { user, customer, device, serviceOrder } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder()
                    .build();

                const serviceOrderFound = await serviceOrderRepository.findById(serviceOrder!.id);

                expect(serviceOrderFound).toBeTruthy();
                expect(serviceOrderFound?.id).toBe(serviceOrder!.id);
                expect(serviceOrderFound?.customerId).toBe(customer.id);
                expect(serviceOrderFound?.deviceId).toBe(device.id);
                expect(serviceOrderFound?.reportedProblem).toBe("Screen is cracked and touch is not responding.");
                expect(serviceOrderFound?.status).toBe("WAITING_DIAGNOSIS");
                expect(serviceOrderFound?.createdById).toBe(user.id);
                expect(serviceOrderFound?.cancelledAt).toBeNull();
                expect(serviceOrderFound?.cancelReason).toBeNull();
                expect(serviceOrderFound?.finishedAt).toBeNull();
                expect(serviceOrderFound?.createdAt).toBeTruthy();
                expect(serviceOrderFound?.updatedAt).toBeNull();
            });

            it("should return null if a service order with the given ID does not exist", async () => {
                const serviceOrder = await serviceOrderRepository.findById("0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa");
                expect(serviceOrder).toBeNull();
            });
        });

        describe("list", () => {
            let userId: string;
            let customerId: string;
            let deviceId: string;

            beforeEach(async () => {
                const { user, customer, device } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .build();

                userId = user.id;
                customerId = customer.id;
                deviceId = device.id;
            });

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
                        customerId,
                        deviceId,
                        reportedProblem: "Screen is cracked and touch is not responding.",
                        createdById: userId,
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
                const { user, serviceOrder, diagnosis } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "IN_DIAGNOSIS" })
                    .withDiagnosis()
                    .build();

                const foundDiagnosis = await serviceOrderRepository.findDiagnosisById(diagnosis!.id);

                expect(foundDiagnosis).toBeTruthy();
                expect(foundDiagnosis?.id).toBe(diagnosis!.id);
                expect(foundDiagnosis?.serviceOrderId).toBe(serviceOrder!.id);
                expect(foundDiagnosis?.createdById).toBe(user.id);
                expect(foundDiagnosis?.result).toBeNull();
                expect(foundDiagnosis?.completedAt).toBeNull();
                expect(foundDiagnosis?.createdAt).toBeTruthy();
            });

            it("should return null if a diagnosis with the given ID does not exist", async () => {
                const diagnosis = await serviceOrderRepository.findDiagnosisById("0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa");

                expect(diagnosis).toBeNull();
            });
        });

        describe("findFindingById", () => {
            it("should return the finding if a finding with the given ID exists", async () => {
                const { user, diagnosis, findings } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "IN_DIAGNOSIS" })
                    .withDiagnosis()
                    .withFinding()
                    .build();

                const finding = await serviceOrderRepository.findFindingById(findings[0].id);

                expect(finding).toBeTruthy();
                expect(finding?.id).toBe(findings[0].id);
                expect(finding?.diagnosisId).toBe(diagnosis!.id);
                expect(finding?.createdById).toBe(user.id);
                expect(finding?.description).toBe("Battery capacity below expected level");
                expect(finding?.repairable).toBe(true);
                expect(finding?.createdAt).toBeTruthy();
                expect(finding?.updatedAt).toBeNull();
                expect(finding?.updatedById).toBeNull();
            });

            it("should return null if a finding with the given ID does not exist", async () => {
                const finding = await serviceOrderRepository.findFindingById("0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa");

                expect(finding).toBeNull();
            });
        });

        describe("countRepairableFindings", () => {
            it("should count only repairable findings for the given diagnosis", async () => {
                const { diagnosis } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "IN_DIAGNOSIS" })
                    .withDiagnosis()
                    .withFinding({ description: "Battery capacity below expected level", repairable: true })
                    .withFinding({ description: "Screen is deeply scratched", repairable: true })
                    .withFinding({ description: "Motherboard corrosion", repairable: false })
                    .build();

                const count = await serviceOrderRepository.countRepairableFindings(diagnosis!.id);

                expect(count).toBe(2);
            });

            it("should use the transaction client when provided", async () => {
                const { user, diagnosis } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "IN_DIAGNOSIS" })
                    .withDiagnosis()
                    .build();

                let countInsideTransaction: number | undefined;

                await expect(
                    prisma.$transaction(async (tx) => {
                        await tx.finding.createMany({
                            data: [
                                {
                                    diagnosisId: diagnosis!.id,
                                    createdById: user.id,
                                    description: "Battery capacity below expected level",
                                    repairable: true,
                                },
                                {
                                    diagnosisId: diagnosis!.id,
                                    createdById: user.id,
                                    description: "Motherboard corrosion",
                                    repairable: false,
                                },
                            ],
                        });

                        countInsideTransaction = await serviceOrderRepository.countRepairableFindings(
                            diagnosis!.id,
                            tx,
                        );

                        throw new Error("rollback");
                    }),
                ).rejects.toThrow("rollback");

                expect(countInsideTransaction).toBe(1);

                const countAfterRollback = await serviceOrderRepository.countRepairableFindings(
                    diagnosis!.id,
                    prisma,
                );

                expect(countAfterRollback).toBe(0);

                const totalFindings = await prisma.finding.count();
                expect(totalFindings).toBe(0);
            });

            it("should return 0 when the diagnosis does not exist", async () => {
                const count = await serviceOrderRepository.countRepairableFindings("0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa");

                expect(count).toBe(0);
            });
        });

        describe("listFindingsByDiagnosisId", () => {
            it("should return findings ordered by creation date ascending", async () => {
                const { user, diagnosis } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "TECHNICIAN" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "IN_DIAGNOSIS" })
                    .withDiagnosis()
                    .build();

                const now = new Date();

                const findings = await prisma.finding.createManyAndReturn({
                    data: [
                        {
                            diagnosisId: diagnosis!.id,
                            createdById: user.id,
                            description: "Motherboard corrosion",
                            repairable: false,
                            createdAt: new Date(now.getTime() - 60 * 60 * 1000),
                        },
                        {
                            diagnosisId: diagnosis!.id,
                            createdById: user.id,
                            description: "Battery capacity below expected level",
                            repairable: true,
                            createdAt: now,
                        },
                    ],
                });

                const olderFinding = findings.find((f) => f.description === "Motherboard corrosion")!;
                const newerFinding = findings.find((f) => f.description === "Battery capacity below expected level")!;

                const result = await serviceOrderRepository.listFindingsByDiagnosisId({
                    diagnosisId: diagnosis!.id
                });

                expect(result).toHaveLength(2);
                expect(result[0].id).toBe(olderFinding.id);
                expect(result[0].description).toBe("Motherboard corrosion");
                expect(result[1].id).toBe(newerFinding.id);
                expect(result[1].description).toBe("Battery capacity below expected level");
            });

            it("should return an empty array when the diagnosis has no findings", async () => {
                const findings = await serviceOrderRepository.listFindingsByDiagnosisId({
                    diagnosisId: "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa"
                });

                expect(findings).toEqual([]);
            });
        });

        describe("findQuoteById", () => {
            it("should return the quote if a quote with the given ID exists", async () => {
                const { user, serviceOrder, diagnosis, quote } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_QUOTE" })
                    .withDiagnosis()
                    .withQuote()
                    .build();

                const foundQuote = await serviceOrderRepository.findQuoteById(quote!.id);

                expect(foundQuote).toBeTruthy();
                expect(foundQuote?.id).toBe(quote!.id);
                expect(foundQuote?.serviceOrderId).toBe(serviceOrder!.id);
                expect(foundQuote?.diagnosisId).toBe(diagnosis!.id);
                expect(foundQuote?.createdById).toBe(user.id);
                expect(foundQuote?.status).toBe("DRAFT");
                expect(foundQuote?.submittedAt).toBeNull();
                expect(foundQuote?.respondedAt).toBeNull();
                expect(foundQuote?.createdAt).toBeTruthy();
                expect(foundQuote?.updatedAt).toBeNull();
            });

            it("should return null if a quote with the given ID does not exist", async () => {
                const quote = await serviceOrderRepository.findQuoteById("0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa");

                expect(quote).toBeNull();
            });
        });

        describe("listQuotesByServiceOrderId", () => {
            it("should return quotes ordered by creation date ascending", async () => {
                const { user, serviceOrder, diagnosis } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_QUOTE" })
                    .withDiagnosis()
                    .build();

                const now = new Date();

                const quotes = await prisma.quote.createManyAndReturn({
                    data: [
                        {
                            serviceOrderId: serviceOrder!.id,
                            diagnosisId: diagnosis!.id,
                            createdById: user.id,
                            status: "SUPERSEDED",
                            createdAt: new Date(now.getTime() - 60 * 60 * 1000),
                        },
                        {
                            serviceOrderId: serviceOrder!.id,
                            diagnosisId: diagnosis!.id,
                            createdById: user.id,
                            status: "DRAFT",
                            createdAt: now,
                        },
                    ],
                });

                const olderQuote = quotes.find((q) => q.status === "SUPERSEDED")!;
                const newerQuote = quotes.find((q) => q.status === "DRAFT")!;

                const result = await serviceOrderRepository.listQuotesByServiceOrderId({
                    serviceOrderId: serviceOrder!.id,
                });

                expect(result).toHaveLength(2);
                expect(result[0].id).toBe(olderQuote.id);
                expect(result[0].status).toBe("SUPERSEDED");
                expect(result[1].id).toBe(newerQuote.id);
                expect(result[1].status).toBe("DRAFT");
            });

            it("should return an empty array when the service order has no quotes", async () => {
                const { serviceOrder } = await new ServiceOrderBuilder(prisma)
                    .withUser({ role: "ATTENDANT" })
                    .withCustomer()
                    .withDevice()
                    .withServiceOrder({ status: "AWAITING_QUOTE" })
                    .build();

                const result = await serviceOrderRepository.listQuotesByServiceOrderId({
                    serviceOrderId: serviceOrder!.id,
                });

                expect(result).toEqual([]);
            });

            it("should return an empty array when the service order does not exist", async () => {
                const result = await serviceOrderRepository.listQuotesByServiceOrderId({
                    serviceOrderId: "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa",
                });

                expect(result).toEqual([]);
            });
        });
    });
});