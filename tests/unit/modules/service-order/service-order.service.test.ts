// (Node built‑ins)
import { beforeEach, describe, expect, it, vi } from "vitest";
// (Types)
import {
    CreateServiceOrderInput,
    ServiceOrderRecord,
    ListServiceOrdersInput,
    CancelServiceOrderInput,
    StartDiagnosisInput,
    DiagnosisRecord,
    CreateFindingInput,
    FindingRecord,
    UpdateFindingInput,
    CompleteDiagnosisInput,
    QuoteRecord,
    CreateQuoteInput,
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
                    code: "CONFLICT",
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
                cancelledAt: new Date(),
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

    describe("startDiagnosis", () => {
        const validInput: StartDiagnosisInput = {
            serviceOrderId: "uuid-service-order-123",
            createdById: "uuid-user-123",
        };

        const mockServiceOrderRecord = {
            id: validInput.serviceOrderId,
            customerId: "uuid-customer-123",
            deviceId: "uuid-device-123",
            reportedProblem: "Screen is cracked and touch is not responding.",
            status: "WAITING_DIAGNOSIS",
            createdById: "uuid-user-456",
            cancelledAt: null,
            cancelReason: null,
            finishedAt: null,
            createdAt: new Date(),
            updatedAt: null,
        } as ServiceOrderRecord;

        const mockDiagnosisRecord = {
            id: "uuid-diagnosis-123",
            serviceOrderId: validInput.serviceOrderId,
            createdById: validInput.createdById,
            result: null,
            completedById: null,
            completedAt: null,
            createdAt: new Date(),
        } as DiagnosisRecord;

        const setupCreateDiagnosisMocks = () => {
            const tx = {} as any;

            vi.mocked(serviceOrderRepository.findById).mockResolvedValue(mockServiceOrderRecord);
            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async (callback) => callback(tx)),
            } as any);
            vi.mocked(serviceOrderRepository.createDiagnosis).mockResolvedValue(mockDiagnosisRecord);
            vi.mocked(serviceOrderRepository.updateServiceOrderStatus).mockResolvedValue(true);
            vi.mocked(serviceOrderRepository.createServiceOrderStatusHistory).mockResolvedValue({
                id: "uuid-history-123",
                serviceOrderId: validInput.serviceOrderId,
                fromStatus: "WAITING_DIAGNOSIS",
                toStatus: "IN_DIAGNOSIS",
                changeSource: "USER",
                changedById: validInput.createdById,
                createdAt: new Date(),
            });

            return { tx };
        };

        it("should throw NOT_FOUND if service order does not exist", async () => {
            vi.mocked(serviceOrderRepository.findById).mockResolvedValue(null);

            await expect(serviceOrderService.startDiagnosis(validInput))
                .rejects.toMatchObject({
                    statusCode: 404,
                    message: "Service order not found",
                });

            expect(getPrisma).not.toHaveBeenCalled();
        });

        it("should throw CONFLICT if service order is not WAITING_DIAGNOSIS", async () => {
            vi.mocked(serviceOrderRepository.findById).mockResolvedValue({
                ...mockServiceOrderRecord,
                status: "IN_DIAGNOSIS",
            });

            await expect(serviceOrderService.startDiagnosis(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    message: "Service order is not waiting for diagnosis",
                });

            expect(getPrisma).not.toHaveBeenCalled();
        });

        it("should throw CONFLICT if status update fails (race condition)", async () => {
            const { tx } = setupCreateDiagnosisMocks();
            vi.mocked(serviceOrderRepository.updateServiceOrderStatus).mockResolvedValue(false);

            await expect(serviceOrderService.startDiagnosis(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    message: "Service order is no longer available to start diagnosis",
                });

            expect(serviceOrderRepository.createDiagnosis).toHaveBeenCalledWith(validInput, tx);
            expect(serviceOrderRepository.createServiceOrderStatusHistory).not.toHaveBeenCalled();
        });

        it("should throw UNAUTHORIZED if performed_by foreign key is violated", async () => {
            const dbError = new Error("Foreign key constraint failed");
            vi.mocked(serviceOrderRepository.findById).mockResolvedValue(mockServiceOrderRecord);
            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async () => { throw dbError; }),
            } as any);
            vi.mocked(isForeignKeyConstraintOn).mockImplementation(
                (_error, field) => field === "created_by",
            );

            await expect(serviceOrderService.startDiagnosis(validInput))
                .rejects.toMatchObject({
                    statusCode: 401,
                    message: "Authenticated user no longer exists",
                    code: "USER_NOT_FOUND",
                });

            expect(isForeignKeyConstraintOn).toHaveBeenCalledWith(dbError, "created_by");
        });

        it("should throw NOT_FOUND if service_order_id foreign key is violated", async () => {
            const dbError = new Error("Foreign key constraint failed");
            vi.mocked(serviceOrderRepository.findById).mockResolvedValue(mockServiceOrderRecord);
            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async () => { throw dbError; }),
            } as any);
            vi.mocked(isForeignKeyConstraintOn).mockImplementation(
                (_error, field) => field === "service_order_id",
            );

            await expect(serviceOrderService.startDiagnosis(validInput))
                .rejects.toMatchObject({
                    statusCode: 404,
                    message: "Service order not found",
                });

            expect(isForeignKeyConstraintOn).toHaveBeenCalledWith(dbError, "service_order_id");
        });

        it("should throw CONFLICT if a diagnosis already exists for the service order", async () => {
            const dbError = new Error("Unique constraint failed");
            vi.mocked(serviceOrderRepository.findById).mockResolvedValue(mockServiceOrderRecord);
            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async () => { throw dbError; }),
            } as any);
            vi.mocked(isForeignKeyConstraintOn).mockReturnValue(false);
            vi.mocked(isUniqueConstraintOn).mockImplementation(
                (_error, field) => field === "service_order_id",
            );

            await expect(serviceOrderService.startDiagnosis(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    message: "A diagnosis already exists for this service order",
                });

            expect(isUniqueConstraintOn).toHaveBeenCalledWith(dbError, "service_order_id");
        });

        it("should propagate error if it is not a known constraint violation", async () => {
            const error = new Error("fake error");
            vi.mocked(serviceOrderRepository.findById).mockResolvedValue(mockServiceOrderRecord);
            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async () => { throw error; }),
            } as any);
            vi.mocked(isForeignKeyConstraintOn).mockReturnValue(false);
            vi.mocked(isUniqueConstraintOn).mockReturnValue(false);

            await expect(serviceOrderService.startDiagnosis(validInput))
                .rejects.toThrow(error);
        });

        it("should propagate error when createServiceOrderStatusHistory fails", async () => {
            const { tx } = setupCreateDiagnosisMocks();
            const error = new Error("History creation failed");
            vi.mocked(serviceOrderRepository.createServiceOrderStatusHistory).mockRejectedValue(error);

            await expect(serviceOrderService.startDiagnosis(validInput))
                .rejects.toThrow(error);

            expect(serviceOrderRepository.createDiagnosis).toHaveBeenCalledWith(validInput, tx);
        });

        it("should create diagnosis and transition status in a transaction", async () => {
            const { tx } = setupCreateDiagnosisMocks();

            const result = await serviceOrderService.startDiagnosis(validInput);

            expect(serviceOrderRepository.findById).toHaveBeenCalledWith(validInput.serviceOrderId);
            expect(serviceOrderRepository.createDiagnosis).toHaveBeenCalledWith(validInput, tx);
            expect(serviceOrderRepository.updateServiceOrderStatus).toHaveBeenCalledWith(
                {
                    serviceOrderId: validInput.serviceOrderId,
                    expectedStatuses: ["WAITING_DIAGNOSIS"],
                    toStatus: "IN_DIAGNOSIS",
                },
                tx,
            );
            expect(serviceOrderRepository.createServiceOrderStatusHistory).toHaveBeenCalledWith(
                {
                    serviceOrderId: validInput.serviceOrderId,
                    fromStatus: "WAITING_DIAGNOSIS",
                    toStatus: "IN_DIAGNOSIS",
                    changeSource: "USER",
                    changedById: validInput.createdById,
                },
                tx,
            );
            expect(result).toBe(mockDiagnosisRecord);
        });
    });

    describe("getDiagnosisById", () => {
        const diagnosisId = "uuid-diagnosis-123";

        it("should throw if serviceOrderRepository.findDiagnosisById fails", async () => {
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockRejectedValue(new Error("fake error"));

            await expect(serviceOrderService.getDiagnosisById(diagnosisId))
                .rejects.toThrow("fake error");
        });

        it("should throw NOT_FOUND if diagnosis does not exist", async () => {
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockResolvedValue(null);

            await expect(serviceOrderService.getDiagnosisById(diagnosisId))
                .rejects.toMatchObject({
                    statusCode: 404,
                    message: "Diagnosis not found",
                });
        });

        it("should return diagnosis", async () => {
            const mockDiagnosisRecord = {
                id: diagnosisId,
                serviceOrderId: "uuid-service-order-123",
                createdById: "uuid-user-123",
                result: null,
                completedById: null,
                completedAt: null,
                createdAt: new Date(),
            } as DiagnosisRecord;

            vi.mocked(serviceOrderRepository.findDiagnosisById).mockResolvedValue(mockDiagnosisRecord);

            const result = await serviceOrderService.getDiagnosisById(diagnosisId);

            expect(serviceOrderRepository.findDiagnosisById).toHaveBeenCalledWith(diagnosisId);
            expect(result).toEqual(mockDiagnosisRecord);
        });
    });

    describe("createFinding", () => {
        const validInput: CreateFindingInput = {
            diagnosisId: "uuid-diagnosis-123",
            createdById: "uuid-user-123",
            description: "Battery capacity below expected level",
            repairable: true,
        };

        const mockDiagnosisRecord = {
            id: validInput.diagnosisId,
            serviceOrderId: "uuid-service-order-123",
            createdById: "uuid-user-456",
            completedById: null,
            result: null,
            createdAt: new Date(),
            completedAt: null,
        } as DiagnosisRecord;

        const mockFindingRecord = {
            id: "uuid-finding-123",
            diagnosisId: validInput.diagnosisId,
            createdById: validInput.createdById,
            description: validInput.description,
            repairable: validInput.repairable,
            createdAt: new Date(),
            updatedAt: null,
            updatedById: null,
        } as FindingRecord;

        it("should throw if serviceOrderRepository.findDiagnosisById fails", async () => {
            const error = new Error("fake error");
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockRejectedValue(error);

            await expect(serviceOrderService.createFinding(validInput))
                .rejects.toThrow(error);
        });

        it("should throw NOT_FOUND if diagnosis does not exist", async () => {
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockResolvedValue(null);

            await expect(serviceOrderService.createFinding(validInput))
                .rejects.toMatchObject({
                    statusCode: 404,
                    message: "Diagnosis not found",
                });

            expect(serviceOrderRepository.createFinding).not.toHaveBeenCalled();
        });

        it("should throw CONFLICT if diagnosis is already completed", async () => {
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockResolvedValue({
                ...mockDiagnosisRecord,
                result: "FAULT_FOUND",
                completedAt: new Date(),
            });

            await expect(serviceOrderService.createFinding(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    message: "Diagnosis already completed",
                });

            expect(serviceOrderRepository.createFinding).not.toHaveBeenCalled();
        });

        it("should throw CONFLICT if repository returns null (race condition)", async () => {
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockResolvedValue(mockDiagnosisRecord);
            vi.mocked(serviceOrderRepository.createFinding).mockResolvedValue(null);

            await expect(serviceOrderService.createFinding(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    message: "Finding can no longer be created in its current state",
                });
        });

        it("should throw UNAUTHORIZED if created_by foreign key is violated", async () => {
            const dbError = new Error("Foreign key constraint failed");
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockResolvedValue(mockDiagnosisRecord);
            vi.mocked(serviceOrderRepository.createFinding).mockRejectedValue(dbError);
            vi.mocked(isForeignKeyConstraintOn).mockImplementation(
                (_error, field) => field === "created_by",
            );

            await expect(serviceOrderService.createFinding(validInput))
                .rejects.toMatchObject({
                    statusCode: 401,
                    message: "Authenticated user no longer exists",
                    code: "USER_NOT_FOUND",
                });

            expect(isForeignKeyConstraintOn).toHaveBeenCalledWith(dbError, "created_by");
        });

        it("should propagate error if it is not a known constraint violation", async () => {
            const error = new Error("fake error");
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockResolvedValue(mockDiagnosisRecord);
            vi.mocked(serviceOrderRepository.createFinding).mockRejectedValue(error);
            vi.mocked(isForeignKeyConstraintOn).mockReturnValue(false);

            await expect(serviceOrderService.createFinding(validInput))
                .rejects.toThrow(error);
        });

        it("should create finding successfully", async () => {
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockResolvedValue(mockDiagnosisRecord);
            vi.mocked(serviceOrderRepository.createFinding).mockResolvedValue(mockFindingRecord);

            const result = await serviceOrderService.createFinding(validInput);

            expect(serviceOrderRepository.findDiagnosisById).toHaveBeenCalledWith(validInput.diagnosisId);
            expect(serviceOrderRepository.createFinding).toHaveBeenCalledWith(validInput);
            expect(result).toBe(mockFindingRecord);
        });
    });

    describe("updateFinding", () => {
        const validInput: UpdateFindingInput = {
            findingId: "uuid-finding-123",
            description: "Battery capacity critically below expected level",
            repairable: false,
            updatedById: "uuid-user-123",
        };

        const mockFindingRecord = {
            id: validInput.findingId,
            diagnosisId: "uuid-diagnosis-123",
            createdById: "uuid-user-456",
            description: "Battery capacity below expected level",
            repairable: true,
            createdAt: new Date(),
            updatedAt: null,
            updatedById: null,
        } as FindingRecord;

        const mockUpdatedFindingRecord = {
            ...mockFindingRecord,
            description: validInput.description,
            repairable: validInput.repairable,
            updatedById: validInput.updatedById,
            updatedAt: new Date(),
        } as FindingRecord;

        it("should throw if serviceOrderRepository.findFindingById fails", async () => {
            const error = new Error("fake error");
            vi.mocked(serviceOrderRepository.findFindingById).mockRejectedValue(error);

            await expect(serviceOrderService.updateFinding(validInput))
                .rejects.toThrow(error);
        });

        it("should throw NOT_FOUND if finding does not exist", async () => {
            vi.mocked(serviceOrderRepository.findFindingById).mockResolvedValue(null);

            await expect(serviceOrderService.updateFinding(validInput))
                .rejects.toMatchObject({
                    statusCode: 404,
                    message: "Finding not found",
                });

            expect(serviceOrderRepository.updateFinding).not.toHaveBeenCalled();
        });

        it("should throw CONFLICT if repository returns null (race condition)", async () => {
            vi.mocked(serviceOrderRepository.findFindingById).mockResolvedValue(mockFindingRecord);
            vi.mocked(serviceOrderRepository.updateFinding).mockResolvedValue(null);

            await expect(serviceOrderService.updateFinding(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    message: "Finding can no longer be updated in its current state",
                });
        });

        it("should throw UNAUTHORIZED if updated_by foreign key is violated", async () => {
            const dbError = new Error("Foreign key constraint failed");
            vi.mocked(serviceOrderRepository.findFindingById).mockResolvedValue(mockFindingRecord);
            vi.mocked(serviceOrderRepository.updateFinding).mockRejectedValue(dbError);
            vi.mocked(isForeignKeyConstraintOn).mockImplementation(
                (_error, field) => field === "updated_by",
            );

            await expect(serviceOrderService.updateFinding(validInput))
                .rejects.toMatchObject({
                    statusCode: 401,
                    message: "Authenticated user no longer exists",
                    code: "USER_NOT_FOUND",
                });

            expect(isForeignKeyConstraintOn).toHaveBeenCalledWith(dbError, "updated_by");
        });

        it("should propagate error if it is not a known constraint violation", async () => {
            const error = new Error("fake error");
            vi.mocked(serviceOrderRepository.findFindingById).mockResolvedValue(mockFindingRecord);
            vi.mocked(serviceOrderRepository.updateFinding).mockRejectedValue(error);
            vi.mocked(isForeignKeyConstraintOn).mockReturnValue(false);

            await expect(serviceOrderService.updateFinding(validInput))
                .rejects.toThrow(error);
        });

        it("should update finding successfully", async () => {
            vi.mocked(serviceOrderRepository.findFindingById).mockResolvedValue(mockFindingRecord);
            vi.mocked(serviceOrderRepository.updateFinding).mockResolvedValue(mockUpdatedFindingRecord);

            const result = await serviceOrderService.updateFinding(validInput);

            expect(serviceOrderRepository.findFindingById).toHaveBeenCalledWith(validInput.findingId);
            expect(serviceOrderRepository.updateFinding).toHaveBeenCalledWith(validInput);
            expect(result).toBe(mockUpdatedFindingRecord);
        });
    });

    describe("deleteFinding", () => {
        const findingId = "uuid-finding-123";

        const mockFindingRecord = {
            id: findingId,
            diagnosisId: "uuid-diagnosis-123",
            createdById: "uuid-user-456",
            description: "Battery capacity below expected level",
            repairable: true,
            createdAt: new Date(),
            updatedAt: null,
            updatedById: null,
        } as FindingRecord;

        it("should throw if serviceOrderRepository.findFindingById fails", async () => {
            const error = new Error("fake error");
            vi.mocked(serviceOrderRepository.findFindingById).mockRejectedValue(error);

            await expect(serviceOrderService.deleteFinding(findingId))
                .rejects.toThrow(error);
        });

        it("should throw NOT_FOUND if finding does not exist", async () => {
            vi.mocked(serviceOrderRepository.findFindingById).mockResolvedValue(null);

            await expect(serviceOrderService.deleteFinding(findingId))
                .rejects.toMatchObject({
                    statusCode: 404,
                    message: "Finding not found",
                });

            expect(serviceOrderRepository.deleteFindingById).not.toHaveBeenCalled();
        });

        it("should throw CONFLICT if repository returns false (race condition)", async () => {
            vi.mocked(serviceOrderRepository.findFindingById).mockResolvedValue(mockFindingRecord);
            vi.mocked(serviceOrderRepository.deleteFindingById).mockResolvedValue(false);

            await expect(serviceOrderService.deleteFinding(findingId))
                .rejects.toMatchObject({
                    statusCode: 409,
                    message: "Finding can no longer be deleted in its current state",
                });
        });

        it("should propagate error if repository throws an unknown error", async () => {
            const error = new Error("fake error");
            vi.mocked(serviceOrderRepository.findFindingById).mockResolvedValue(mockFindingRecord);
            vi.mocked(serviceOrderRepository.deleteFindingById).mockRejectedValue(error);

            await expect(serviceOrderService.deleteFinding(findingId))
                .rejects.toThrow(error);
        });

        it("should delete finding successfully", async () => {
            vi.mocked(serviceOrderRepository.findFindingById).mockResolvedValue(mockFindingRecord);
            vi.mocked(serviceOrderRepository.deleteFindingById).mockResolvedValue(true);

            await expect(serviceOrderService.deleteFinding(findingId))
                .resolves.toBeUndefined();

            expect(serviceOrderRepository.findFindingById).toHaveBeenCalledWith(findingId);
            expect(serviceOrderRepository.deleteFindingById).toHaveBeenCalledWith(findingId);
        });
    });

    describe("resolveStatusAfterDiagnosis", () => {
        it("should return AWAITING_QUOTE when result is FAULT_FOUND and there are repairable findings", () => {
            expect(serviceOrderService.resolveStatusAfterDiagnosis("FAULT_FOUND", 1)).toBe("AWAITING_QUOTE");
        });

        it("should return AWAITING_DELIVERY when result is FAULT_FOUND but no repairable findings", () => {
            expect(serviceOrderService.resolveStatusAfterDiagnosis("FAULT_FOUND", 0)).toBe("AWAITING_DELIVERY");
        });

        it("should return AWAITING_DELIVERY when result is NO_FAULT_FOUND", () => {
            expect(serviceOrderService.resolveStatusAfterDiagnosis("NO_FAULT_FOUND", 0)).toBe("AWAITING_DELIVERY");
            expect(serviceOrderService.resolveStatusAfterDiagnosis("NO_FAULT_FOUND", 5)).toBe("AWAITING_DELIVERY");
        });

        it("should return AWAITING_DELIVERY when result is INCONCLUSIVE", () => {
            expect(serviceOrderService.resolveStatusAfterDiagnosis("INCONCLUSIVE", 0)).toBe("AWAITING_DELIVERY");
            expect(serviceOrderService.resolveStatusAfterDiagnosis("INCONCLUSIVE", 5)).toBe("AWAITING_DELIVERY");
        });
    });

    describe("completeDiagnosis", () => {
        const validInput: CompleteDiagnosisInput = {
            diagnosisId: "uuid-diagnosis-123",
            result: "FAULT_FOUND",
            completedById: "uuid-user-123",
        };

        const mockDiagnosisRecord = {
            id: validInput.diagnosisId,
            serviceOrderId: "uuid-service-order-123",
            createdById: "uuid-user-456",
            completedById: null,
            result: null,
            createdAt: new Date(),
            completedAt: null,
        } as DiagnosisRecord;

        const mockCompletedDiagnosisRecord = {
            ...mockDiagnosisRecord,
            result: "FAULT_FOUND",
            completedById: validInput.completedById,
            completedAt: new Date(),
        } as DiagnosisRecord;

        const setupCompleteDiagnosisMocks = () => {
            const tx = {} as any;

            vi.mocked(getPrisma).mockReturnValue({
                $transaction: vi.fn(async (callback) => callback(tx)),
            } as any);
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockResolvedValue(mockDiagnosisRecord);
            vi.mocked(serviceOrderRepository.completeDiagnosis).mockResolvedValue(mockCompletedDiagnosisRecord);
            vi.mocked(serviceOrderRepository.countRepairableFindings).mockResolvedValue(1);
            vi.mocked(serviceOrderRepository.updateServiceOrderStatus).mockResolvedValue(true);
            vi.mocked(serviceOrderRepository.createServiceOrderStatusHistory).mockResolvedValue({
                id: "uuid-history-123",
                serviceOrderId: mockDiagnosisRecord.serviceOrderId,
                fromStatus: "IN_DIAGNOSIS",
                toStatus: "AWAITING_QUOTE",
                changeSource: "USER",
                changedById: validInput.completedById,
                createdAt: new Date(),
            });

            return { tx };
        };

        it("should throw if serviceOrderRepository.findDiagnosisById fails", async () => {
            const error = new Error("fake error");
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockRejectedValue(error);

            await expect(serviceOrderService.completeDiagnosis(validInput))
                .rejects.toThrow(error);
        });

        it("should throw NOT_FOUND if diagnosis does not exist", async () => {
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockResolvedValue(null);

            await expect(serviceOrderService.completeDiagnosis(validInput))
                .rejects.toMatchObject({
                    statusCode: 404,
                    message: "Diagnosis not found",
                });

            expect(getPrisma).not.toHaveBeenCalled();
        });

        it("should throw CONFLICT if diagnosis is already completed", async () => {
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockResolvedValue({
                ...mockDiagnosisRecord,
                result: "NO_FAULT_FOUND",
                completedAt: new Date(),
            });

            await expect(serviceOrderService.completeDiagnosis(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    message: "Diagnosis already completed",
                });

            expect(getPrisma).not.toHaveBeenCalled();
        });

        it("should throw CONFLICT if repository returns null (race condition)", async () => {
            setupCompleteDiagnosisMocks();
            vi.mocked(serviceOrderRepository.completeDiagnosis).mockResolvedValue(null);

            await expect(serviceOrderService.completeDiagnosis(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    message: "Diagnosis can no longer be completed in its current state",
                });

            expect(serviceOrderRepository.countRepairableFindings).not.toHaveBeenCalled();
        });

        it("should throw if serviceOrderRepository.countRepairableFindings fails", async () => {
            const error = new Error("fake error");
            setupCompleteDiagnosisMocks();
            vi.mocked(serviceOrderRepository.countRepairableFindings).mockRejectedValue(error);

            await expect(serviceOrderService.completeDiagnosis(validInput))
                .rejects.toThrow(error);
        });

        it("should throw CONFLICT if updateServiceOrderStatus returns false (race condition)", async () => {
            setupCompleteDiagnosisMocks();
            vi.mocked(serviceOrderRepository.updateServiceOrderStatus).mockResolvedValue(false);

            await expect(serviceOrderService.completeDiagnosis(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    message: "Service order is no longer in diagnosis",
                });

            expect(serviceOrderRepository.createServiceOrderStatusHistory).not.toHaveBeenCalled();
        });

        it("should throw if serviceOrderRepository.createServiceOrderStatusHistory fails", async () => {
            const error = new Error("fake error");
            setupCompleteDiagnosisMocks();
            vi.mocked(serviceOrderRepository.createServiceOrderStatusHistory).mockRejectedValue(error);

            await expect(serviceOrderService.completeDiagnosis(validInput))
                .rejects.toThrow(error);
        });

        it("should throw UNAUTHORIZED if completed_by foreign key is violated", async () => {
            const dbError = new Error("Foreign key constraint failed");
            setupCompleteDiagnosisMocks();
            vi.mocked(serviceOrderRepository.completeDiagnosis).mockRejectedValue(dbError);
            vi.mocked(isForeignKeyConstraintOn).mockImplementation(
                (_error, field) => field === "completed_by",
            );

            await expect(serviceOrderService.completeDiagnosis(validInput))
                .rejects.toMatchObject({
                    statusCode: 401,
                    message: "Authenticated user no longer exists",
                    code: "USER_NOT_FOUND",
                });

            expect(isForeignKeyConstraintOn).toHaveBeenCalledWith(dbError, "completed_by");
        });

        it("should propagate error if it is not a known constraint violation", async () => {
            const error = new Error("fake error");
            setupCompleteDiagnosisMocks();
            vi.mocked(serviceOrderRepository.completeDiagnosis).mockRejectedValue(error);
            vi.mocked(isForeignKeyConstraintOn).mockReturnValue(false);

            await expect(serviceOrderService.completeDiagnosis(validInput))
                .rejects.toThrow(error);
        });

        it("should complete diagnosis and move to AWAITING_QUOTE when there are repairable findings", async () => {
            const { tx } = setupCompleteDiagnosisMocks();
            vi.mocked(serviceOrderRepository.countRepairableFindings).mockResolvedValue(2);

            const result = await serviceOrderService.completeDiagnosis(validInput);

            expect(serviceOrderRepository.findDiagnosisById).toHaveBeenCalledWith(validInput.diagnosisId);
            expect(serviceOrderRepository.completeDiagnosis).toHaveBeenCalledWith(validInput, tx);
            expect(serviceOrderRepository.countRepairableFindings).toHaveBeenCalledWith(mockDiagnosisRecord.id, tx);
            expect(serviceOrderRepository.updateServiceOrderStatus).toHaveBeenCalledWith(
                {
                    serviceOrderId: mockDiagnosisRecord.serviceOrderId,
                    expectedStatuses: ["IN_DIAGNOSIS"],
                    toStatus: "AWAITING_QUOTE",
                },
                tx,
            );
            expect(serviceOrderRepository.createServiceOrderStatusHistory).toHaveBeenCalledWith(
                {
                    serviceOrderId: mockDiagnosisRecord.serviceOrderId,
                    fromStatus: "IN_DIAGNOSIS",
                    toStatus: "AWAITING_QUOTE",
                    changeSource: "USER",
                    changedById: validInput.completedById,
                },
                tx,
            );
            expect(result).toBe(mockCompletedDiagnosisRecord);
        });

        it("should complete diagnosis and move to AWAITING_DELIVERY when there are no repairable findings", async () => {
            const { tx } = setupCompleteDiagnosisMocks();
            vi.mocked(serviceOrderRepository.countRepairableFindings).mockResolvedValue(0);

            const result = await serviceOrderService.completeDiagnosis(validInput);

            expect(serviceOrderRepository.updateServiceOrderStatus).toHaveBeenCalledWith(
                {
                    serviceOrderId: mockDiagnosisRecord.serviceOrderId,
                    expectedStatuses: ["IN_DIAGNOSIS"],
                    toStatus: "AWAITING_DELIVERY",
                },
                tx,
            );
            expect(serviceOrderRepository.createServiceOrderStatusHistory).toHaveBeenCalledWith(
                {
                    serviceOrderId: mockDiagnosisRecord.serviceOrderId,
                    fromStatus: "IN_DIAGNOSIS",
                    toStatus: "AWAITING_DELIVERY",
                    changeSource: "USER",
                    changedById: validInput.completedById,
                },
                tx,
            );
            expect(result).toBe(mockCompletedDiagnosisRecord);
        });
    });

    describe("listFindingsByDiagnosisId", () => {
        const diagnosisId = "uuid-diagnosis-123";

        const mockDiagnosisRecord = {
            id: diagnosisId,
            serviceOrderId: "uuid-service-order-123",
            createdById: "uuid-user-456",
            completedById: null,
            result: null,
            createdAt: new Date(),
            completedAt: null,
        } as DiagnosisRecord;

        const mockFindings = [
            {
                id: "uuid-finding-1",
                diagnosisId,
                createdById: "uuid-user-456",
                description: "Battery capacity below expected level",
                repairable: true,
                createdAt: new Date("2026-01-01T10:00:00Z"),
                updatedAt: null,
                updatedById: null,
            },
            {
                id: "uuid-finding-2",
                diagnosisId,
                createdById: "uuid-user-456",
                description: "Motherboard corrosion",
                repairable: false,
                createdAt: new Date("2026-01-01T11:00:00Z"),
                updatedAt: null,
                updatedById: null,
            },
        ] as FindingRecord[];

        it("should throw if serviceOrderRepository.findDiagnosisById fails", async () => {
            const error = new Error("fake error");
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockRejectedValue(error);

            await expect(serviceOrderService.listFindingsByDiagnosisId(diagnosisId))
                .rejects.toThrow(error);
        });

        it("should throw NOT_FOUND if diagnosis does not exist", async () => {
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockResolvedValue(null);

            await expect(serviceOrderService.listFindingsByDiagnosisId(diagnosisId))
                .rejects.toMatchObject({
                    statusCode: 404,
                    message: "Diagnosis not found",
                });

            expect(serviceOrderRepository.listFindingsByDiagnosisId).not.toHaveBeenCalled();
        });

        it("should throw if serviceOrderRepository.listFindingsByDiagnosisId fails", async () => {
            const error = new Error("fake error");
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockResolvedValue(mockDiagnosisRecord);
            vi.mocked(serviceOrderRepository.listFindingsByDiagnosisId).mockRejectedValue(error);

            await expect(serviceOrderService.listFindingsByDiagnosisId(diagnosisId))
                .rejects.toThrow(error);
        });

        it("should return findings", async () => {
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockResolvedValue(mockDiagnosisRecord);
            vi.mocked(serviceOrderRepository.listFindingsByDiagnosisId).mockResolvedValue(mockFindings);

            const result = await serviceOrderService.listFindingsByDiagnosisId(diagnosisId);

            expect(serviceOrderRepository.findDiagnosisById).toHaveBeenCalledWith(diagnosisId);
            expect(serviceOrderRepository.listFindingsByDiagnosisId).toHaveBeenCalledWith(diagnosisId);
            expect(result).toBe(mockFindings);
        });

        it("should return an empty array when the diagnosis has no findings", async () => {
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockResolvedValue(mockDiagnosisRecord);
            vi.mocked(serviceOrderRepository.listFindingsByDiagnosisId).mockResolvedValue([]);

            const result = await serviceOrderService.listFindingsByDiagnosisId(diagnosisId);

            expect(result).toEqual([]);
        });
    });

    describe("createQuote", () => {
        const validInput: CreateQuoteInput = {
            serviceOrderId: "uuid-service-order-123",
            diagnosisId: "uuid-diagnosis-123",
            createdById: "uuid-user-123",
        };

        const mockDiagnosisRecord = {
            id: validInput.diagnosisId,
            serviceOrderId: validInput.serviceOrderId,
            result: "FAULT_FOUND",
            createdById: "uuid-user-456",
            createdAt: new Date(),
            completedById: "uuid-user-456",
            completedAt: new Date(),
        } as DiagnosisRecord;

        const mockQuoteRecord = {
            id: "uuid-quote-123",
            serviceOrderId: validInput.serviceOrderId,
            diagnosisId: validInput.diagnosisId,
            status: "DRAFT",
            submittedAt: null,
            respondedAt: null,
            createdById: validInput.createdById,
            createdAt: new Date(),
            updatedAt: null,
        } as QuoteRecord;

        const setupCreateQuoteMocks = () => {
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockResolvedValue(mockDiagnosisRecord);
            vi.mocked(serviceOrderRepository.createQuote).mockResolvedValue(mockQuoteRecord);
        };

        it("should throw if serviceOrderRepository.findDiagnosisById fails", async () => {
            const error = new Error("fake error");
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockRejectedValue(error);

            await expect(serviceOrderService.createQuote(validInput))
                .rejects.toThrow(error);
        });

        it("should throw NOT_FOUND if diagnosis does not exist", async () => {
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockResolvedValue(null);

            await expect(serviceOrderService.createQuote(validInput))
                .rejects.toMatchObject({
                    statusCode: 404,
                    message: "Diagnosis not found",
                });

            expect(serviceOrderRepository.createQuote).not.toHaveBeenCalled();
        });

        it("should throw CONFLICT if diagnosis does not belong to the service order", async () => {
            vi.mocked(serviceOrderRepository.findDiagnosisById).mockResolvedValue({
                ...mockDiagnosisRecord,
                serviceOrderId: "uuid-other-service-order",
            });

            await expect(serviceOrderService.createQuote(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    message: "Diagnosis does not belong to this service order",
                });

            expect(serviceOrderRepository.createQuote).not.toHaveBeenCalled();
        });

        it("should throw CONFLICT if repository returns null (race condition)", async () => {
            setupCreateQuoteMocks();
            vi.mocked(serviceOrderRepository.createQuote).mockResolvedValue(null);

            await expect(serviceOrderService.createQuote(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    message: "Service order is no longer awaiting quote",
                });
        });

        it("should throw CONFLICT if a current quote already exists for the service order", async () => {
            const dbError = new Error("Unique constraint failed");
            setupCreateQuoteMocks();
            vi.mocked(serviceOrderRepository.createQuote).mockRejectedValue(dbError);
            vi.mocked(isUniqueConstraintOn).mockImplementation(
                (_error, field) => field === "service_order_id",
            );

            await expect(serviceOrderService.createQuote(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    message: "Service order already has a current quote",
                });

            expect(isUniqueConstraintOn).toHaveBeenCalledWith(dbError, "service_order_id");
        });

        it("should throw UNAUTHORIZED if created_by foreign key is violated", async () => {
            const dbError = new Error("Foreign key constraint failed");
            setupCreateQuoteMocks();
            vi.mocked(serviceOrderRepository.createQuote).mockRejectedValue(dbError);
            vi.mocked(isUniqueConstraintOn).mockReturnValue(false);
            vi.mocked(isForeignKeyConstraintOn).mockImplementation(
                (_error, field) => field === "created_by",
            );

            await expect(serviceOrderService.createQuote(validInput))
                .rejects.toMatchObject({
                    statusCode: 401,
                    message: "Authenticated user no longer exists",
                    code: "USER_NOT_FOUND",
                });

            expect(isForeignKeyConstraintOn).toHaveBeenCalledWith(dbError, "created_by");
        });

        it("should propagate error if it is not a known constraint violation", async () => {
            const error = new Error("fake error");
            setupCreateQuoteMocks();
            vi.mocked(serviceOrderRepository.createQuote).mockRejectedValue(error);
            vi.mocked(isUniqueConstraintOn).mockReturnValue(false);
            vi.mocked(isForeignKeyConstraintOn).mockReturnValue(false);

            await expect(serviceOrderService.createQuote(validInput))
                .rejects.toThrow(error);
        });

        it("should create quote successfully", async () => {
            setupCreateQuoteMocks();

            const result = await serviceOrderService.createQuote(validInput);

            expect(serviceOrderRepository.findDiagnosisById).toHaveBeenCalledWith(validInput.diagnosisId);
            expect(serviceOrderRepository.createQuote).toHaveBeenCalledWith(validInput);
            expect(result).toBe(mockQuoteRecord);
        });
    });
});