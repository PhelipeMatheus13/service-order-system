// (Node built‑ins)
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
// (Types)
import type { CreateServiceOrderInput } from "../../../../src/modules/service-order/service-order.types.js";
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
                    createdBy: userCreatedId,
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
                expect(serviceOrderFound?.createdById).toBe(userCreatedId);
                expect(serviceOrderFound?.status).toBe("RECEIVED");
                expect(serviceOrderFound?.createdAt).toBeTruthy();
                expect(serviceOrderFound?.updatedAt).toBeNull();
            });

            it("should return the record with camelCase fields", async () => {
                const input: CreateServiceOrderInput = {
                    deviceId: deviceCreatedId,
                    reportedProblem: "Battery drains too fast.",
                    createdBy: userCreatedId,
                };

                const serviceOrderCreated = await serviceOrderRepository.create(input);

                expect(serviceOrderCreated).toHaveProperty("customerId");
                expect(serviceOrderCreated).toHaveProperty("deviceId");
                expect(serviceOrderCreated).toHaveProperty("reportedProblem");
                expect(serviceOrderCreated).toHaveProperty("createdBy");
                expect(serviceOrderCreated).toHaveProperty("createdAt");
                expect(serviceOrderCreated).toHaveProperty("updatedAt");
                expect(serviceOrderCreated).not.toHaveProperty("customer_id");
                expect(serviceOrderCreated).not.toHaveProperty("device_id");
            });

            it("should return null when the device does not exist", async () => {
                const input: CreateServiceOrderInput = {
                    deviceId: "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa",
                    reportedProblem: "Screen is cracked.",
                    createdBy: userCreatedId,
                };

                const serviceOrderCreated = await serviceOrderRepository.create(input);

                expect(serviceOrderCreated).toBeNull();

                const count = await prisma.serviceOrder.count();
                expect(count).toBe(0);
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
                expect(serviceOrder?.reportedProblem).toBe("Screen is cracked and touch is not responding.");
                expect(serviceOrder?.status).toBe("RECEIVED");
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
    });
});