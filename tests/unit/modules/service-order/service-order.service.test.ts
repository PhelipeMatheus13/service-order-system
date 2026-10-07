// (Node built‑ins)
import { beforeEach, describe, expect, it, vi } from "vitest";
// (Types)
import {
    CreateServiceOrderInput,
    ServiceOrderRecord,
    ListServiceOrdersInput,
    CancelServiceOrderInput
} from "../../../../src/modules/service-order/service-order.types.js";
// (shared)
import { getPrisma } from "../../../../src/shared/config/database.js";
import { isForeignKeyConstraintOn, isUniqueConstraintOn } from "../../../../src/shared/utils/prisma-error.js";
// (local modules)
import serviceOrderService from "../../../../src/modules/service-order/service-order.service.js";
import serviceOrderRepository from "../../../../src/modules/service-order/service-order.repository.js";

vi.mock("../../../../src/shared/config/database.js");
vi.mock("../../../../src/shared/utils/prisma-error.js");
vi.mock("../../../../src/modules/service-order/service-order.repository.js");


describe("Service Order Service (Unit)", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe("createServiceOrder", () => {
        const validInput: CreateServiceOrderInput = {
            deviceId: "uuid-device-123",
            reportedProblem: "Screen is cracked and touch is not responding.",
            createdById: "uuid-user-123",
        };

        const mockServiceOrderRecord = {
            id: "uuid-service-order-123",
            customerId: "uuid-customer-123",
            deviceId: validInput.deviceId,
            reportedProblem: validInput.reportedProblem,
            status: "WAITING_DIAGNOSIS",
            createdById: validInput.createdById,
            cancelledAt: null,
            cancelReason: null,
            finishedAt: null,
            createdAt: new Date(),
            updatedAt: null,
        } as ServiceOrderRecord;

        const setupCreateServiceOrderMocks = () => {
            const tx = {} as any;

            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async (callback) => callback(tx)),
            } as any);
            vi.mocked(serviceOrderRepository.create).mockResolvedValue(mockServiceOrderRecord);
            vi.mocked(serviceOrderRepository.createServiceOrderStatusHistory).mockResolvedValue({
                id: "uuid-history-123",
                serviceOrderId: mockServiceOrderRecord.id,
                fromStatus: null,
                toStatus: "WAITING_DIAGNOSIS",
                changeSource: "USER",
                changedById: validInput.createdById,
                createdAt: new Date(),
            });

            return { tx };
        };

        it("should throw NOT_FOUND if repository returns null", async () => {
            setupCreateServiceOrderMocks();
            vi.mocked(serviceOrderRepository.create).mockResolvedValue(null);

            await expect(serviceOrderService.createServiceOrder(validInput))
                .rejects.toMatchObject({
                    statusCode: 404,
                    code: "NOT_FOUND",
                    message: "Device not found",
                });

            expect(serviceOrderRepository.createServiceOrderStatusHistory).not.toHaveBeenCalled();
        });

        it("should throw UNAUTHORIZED if created_by foreign key constraint is violated", async () => {
            const dbError = new Error("Foreign key constraint failed");
            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async () => { throw dbError; }),
            } as any);
            vi.mocked(isForeignKeyConstraintOn).mockImplementation(
                (_error, field) => field === "created_by",
            );

            await expect(serviceOrderService.createServiceOrder(validInput))
                .rejects.toMatchObject({
                    statusCode: 401,
                    code: "USER_NOT_FOUND",
                    message: "Authenticated user no longer exists",
                });

            expect(isForeignKeyConstraintOn).toHaveBeenCalledWith(dbError, "created_by");
        });

        it("should throw CONFLICT if the device already has an active service order", async () => {
            const dbError = new Error("Unique constraint failed");
            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async () => { throw dbError; }),
            } as any);
            vi.mocked(isForeignKeyConstraintOn).mockReturnValue(false);
            vi.mocked(isUniqueConstraintOn).mockImplementation(
                (_error, field) => field === "device_id",
            );

            await expect(serviceOrderService.createServiceOrder(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    code: "DEVICE_ALREADY_IN_SERVICE",
                    message: "This device already has an active service order",
                });

            expect(isUniqueConstraintOn).toHaveBeenCalledWith(dbError, "device_id");
        });

        it("should propagate error when creating the status history fails", async () => {
            const { tx } = setupCreateServiceOrderMocks();
            const error = new Error("History creation failed");
            vi.mocked(serviceOrderRepository.createServiceOrderStatusHistory).mockRejectedValue(error);

            await expect(serviceOrderService.createServiceOrder(validInput))
                .rejects.toThrow(error);

            expect(serviceOrderRepository.create).toHaveBeenCalledWith(validInput, tx);
            expect(serviceOrderRepository.createServiceOrderStatusHistory).toHaveBeenCalledWith(
                {
                    serviceOrderId: mockServiceOrderRecord.id,
                    fromStatus: null,
                    toStatus: "WAITING_DIAGNOSIS",
                    changeSource: "USER",
                    changedById: validInput.createdById,
                },
                tx,
            );
        });

        it("should propagate error if it is not a known constraint violation", async () => {
            const error = new Error("fake error");
            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async () => { throw error; }),
            } as any);
            vi.mocked(isForeignKeyConstraintOn).mockReturnValue(false);
            vi.mocked(isUniqueConstraintOn).mockReturnValue(false);

            await expect(serviceOrderService.createServiceOrder(validInput))
                .rejects.toThrow(error);
        });

        it("should create service order and status history in a transaction", async () => {
            const { tx } = setupCreateServiceOrderMocks();

            const result = await serviceOrderService.createServiceOrder(validInput);

            expect(serviceOrderRepository.create).toHaveBeenCalledWith(validInput, tx);
            expect(serviceOrderRepository.createServiceOrderStatusHistory).toHaveBeenCalledWith(
                {
                    serviceOrderId: mockServiceOrderRecord.id,
                    fromStatus: null,
                    toStatus: "WAITING_DIAGNOSIS",
                    changeSource: "USER",
                    changedById: validInput.createdById,
                },
                tx,
            );
            expect(result).toBe(mockServiceOrderRecord);
        });
    });

    describe("getServiceOrderById", () => {
        const serviceOrderId = "uuid-123";

        it("should throw if serviceOrderRepository.findById fails", async () => {
            vi.mocked(serviceOrderRepository).findById.mockRejectedValue(new Error("fake error"));

            await expect(serviceOrderService.getServiceOrderById(serviceOrderId))
                .rejects.toThrow("fake error");
        });

        it("should throw NOT_FOUND if service order does not exist", async () => {
            vi.mocked(serviceOrderRepository).findById.mockResolvedValue(null);

            await expect(serviceOrderService.getServiceOrderById(serviceOrderId))
                .rejects.toMatchObject({
                    statusCode: 404,
                    code: "NOT_FOUND",
                    message: "Service order not found",
                });
        });

        it("should return service order", async () => {
            const mockServiceOrderRecord = {
                id: serviceOrderId,
                customerId: "uuid-customer-123",
                deviceId: "uuid-device-123",
                reportedProblem: "Screen is cracked and touch is not responding.",
                status: "WAITING_DIAGNOSIS",
                createdById: "uuid-user-123",
                cancelledAt: null,
                cancelReason: null,
                finishedAt: null,
                createdAt: new Date(),
                updatedAt: null,
            } as ServiceOrderRecord;

            vi.mocked(serviceOrderRepository).findById.mockResolvedValue(mockServiceOrderRecord);

            const result = await serviceOrderService.getServiceOrderById(serviceOrderId);

            expect(serviceOrderRepository.findById).toHaveBeenCalledWith(serviceOrderId);
            expect(result).toEqual(mockServiceOrderRecord);
        });
    });

    describe("listServiceOrders", () => {
        const input: ListServiceOrdersInput = {
            options: {
                limit: 1,
            },
        };

        it("should throw if serviceOrderRepository.list fails", async () => {
            vi.mocked(serviceOrderRepository).list.mockRejectedValue(new Error("fake error"));

            await expect(serviceOrderService.listServiceOrders(input))
                .rejects.toThrow("fake error");
        });

        it("should return service orders", async () => {
            const mockServiceOrders = [
                {
                    id: "uuid-service-order-123",
                    customerId: "uuid-customer-123",
                    deviceId: "uuid-device-123",
                    reportedProblem: "Screen is cracked and touch is not responding.",
                    status: "WAITING_DIAGNOSIS",
                    createdById: "uuid-user-123",
                    cancelledAt: null,
                    cancelReason: null,
                    finishedAt: null,
                    createdAt: new Date(),
                    updatedAt: null,
                },
            ] as ServiceOrderRecord[];

            vi.mocked(serviceOrderRepository).list.mockResolvedValue(mockServiceOrders);

            const result = await serviceOrderService.listServiceOrders(input);

            expect(serviceOrderRepository.list).toHaveBeenCalledWith(input);
            expect(result).toEqual(mockServiceOrders);
        });
    });

    describe("cancelServiceOrder", () => {
        const validInput: CancelServiceOrderInput = {
            serviceOrderId: "uuid-service-order-123",
            reason: "Customer requested cancellation.",
            cancelById: "uuid-user-123",
        };

        const mockServiceOrderRecord = {
            id: validInput.serviceOrderId,
            customerId: "uuid-customer-123",
            deviceId: "uuid-device-123",
            reportedProblem: "Screen is cracked and touch is not responding.",
            status: "WAITING_DIAGNOSIS",
            createdById: "uuid-user-123",
            cancelledAt: null,
            cancelReason: null,
            finishedAt: null,
            createdAt: new Date(),
            updatedAt: null,
        } as ServiceOrderRecord;

        const setupCancelServiceOrderMocks = () => {
            const tx = {} as any;

            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async (callback) => callback(tx)),
            } as any);
            vi.mocked(serviceOrderRepository.findById).mockResolvedValue(mockServiceOrderRecord);
            vi.mocked(serviceOrderRepository.cancelServiceOrder).mockResolvedValue(true);
            vi.mocked(serviceOrderRepository.createServiceOrderStatusHistory).mockResolvedValue({
                id: "uuid-history-123",
                serviceOrderId: mockServiceOrderRecord.id,
                fromStatus: "WAITING_DIAGNOSIS",
                toStatus: "CANCELLED",
                changeSource: "USER",
                changedById: validInput.cancelById,
                createdAt: new Date(),
            });

            return { tx };
        };

        it("should propagate error when findById fails", async () => {
            const error = new Error("fake error");
            vi.mocked(serviceOrderRepository.findById).mockRejectedValue(error);

            await expect(serviceOrderService.cancelServiceOrder(validInput))
                .rejects.toThrow(error);
        });

        it("should throw NOT_FOUND if service order does not exist", async () => {
            vi.mocked(serviceOrderRepository.findById).mockResolvedValue(null);

            await expect(serviceOrderService.cancelServiceOrder(validInput))
                .rejects.toMatchObject({
                    statusCode: 404,
                    code: "NOT_FOUND",
                    message: "Service order not found",
                });

            expect(getPrisma).not.toHaveBeenCalled();
        });

        it("should throw CONFLICT if service order is already cancelled", async () => {
            vi.mocked(serviceOrderRepository.findById).mockResolvedValue({
                ...mockServiceOrderRecord,
                status: "CANCELLED",
            });

            await expect(serviceOrderService.cancelServiceOrder(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    code: "CONFLICT",
                    message: "Service order is already cancelled",
                });

            expect(getPrisma).not.toHaveBeenCalled();
        });

        it("should throw CONFLICT if the current status does not allow cancellation", async () => {
            vi.mocked(serviceOrderRepository.findById).mockResolvedValue({
                ...mockServiceOrderRecord,
                status: "DELIVERED",
            });

            await expect(serviceOrderService.cancelServiceOrder(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    code: "CONFLICT",
                    message: "Service order cannot be cancelled in its current status",
                });

            expect(getPrisma).not.toHaveBeenCalled();
        });

        it("should throw CONFLICT if repository returns false (race condition)", async () => {
            const { tx } = setupCancelServiceOrderMocks();
            vi.mocked(serviceOrderRepository.cancelServiceOrder).mockResolvedValue(false);

            await expect(serviceOrderService.cancelServiceOrder(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    code: "CONFLICT",
                    message: "Service order could not be cancelled because its status changed",
                });

            expect(serviceOrderRepository.cancelServiceOrder).toHaveBeenCalledWith(validInput, tx);
            expect(serviceOrderRepository.createServiceOrderStatusHistory).not.toHaveBeenCalled();
        });

        it("should propagate error when createServiceOrderStatusHistory fails", async () => {
            const { tx } = setupCancelServiceOrderMocks();
            const error = new Error("History creation failed");
            vi.mocked(serviceOrderRepository.createServiceOrderStatusHistory).mockRejectedValue(error);

            await expect(serviceOrderService.cancelServiceOrder(validInput))
                .rejects.toThrow(error);

            expect(serviceOrderRepository.cancelServiceOrder).toHaveBeenCalledWith(validInput, tx);
        });

        it("should cancel service order and create status history in a transaction", async () => {
            const { tx } = setupCancelServiceOrderMocks();

            await serviceOrderService.cancelServiceOrder(validInput);

            expect(serviceOrderRepository.findById).toHaveBeenCalledWith(validInput.serviceOrderId);
            expect(serviceOrderRepository.cancelServiceOrder).toHaveBeenCalledWith(validInput, tx);
            expect(serviceOrderRepository.createServiceOrderStatusHistory).toHaveBeenCalledWith(
                {
                    serviceOrderId: validInput.serviceOrderId,
                    fromStatus: "WAITING_DIAGNOSIS",
                    toStatus: "CANCELLED",
                    changeSource: "USER",
                    changedById: validInput.cancelById,
                },
                tx,
            );
        });
    });
});