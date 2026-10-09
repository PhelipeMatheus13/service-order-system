// (Node built‑ins)
import { beforeEach, describe, expect, it, vi } from "vitest";
// (Types)
import { ServiceOrderRecord, DiagnosisRecord, FindingRecord } from "../../../../src/modules/service-order/service-order.types.js";
// (local modules)
import serviceOrderController from "../../../../src/modules/service-order/service-order.controller.js";
import serviceOrderService from "../../../../src/modules/service-order/service-order.service.js";

vi.mock("../../../../src/modules/service-order/service-order.service.js");

describe("Service Order Controller (Unit)", () => {
    let req: any;
    let res: any;
    let next: any;

    beforeEach(() => {
        req = { body: {}, params: {}, query: {}, user: {} };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };
        next = vi.fn();
        vi.clearAllMocks();
    });

    describe("CreateServiceOrder", () => {
        it("should return 201 on successful creation", async () => {
            req.user = { id: "uuid-user-123" };
            req.body = {
                deviceId: "uuid-device-123",
                reportedProblem: "Screen is cracked and touch is not responding.",
            };

            const mockServiceOrderRecord = {
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
            } as ServiceOrderRecord;

            vi.mocked(serviceOrderService).createServiceOrder.mockResolvedValue(mockServiceOrderRecord);

            await serviceOrderController.createServiceOrder(req, res, next);

            expect(serviceOrderService.createServiceOrder).toHaveBeenCalledWith({
                deviceId: "uuid-device-123",
                reportedProblem: "Screen is cracked and touch is not responding.",
                createdById: "uuid-user-123",
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockServiceOrderRecord,
                message: "Service order created successfully",
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe("getServiceOrderById", () => {
        it("should return 200 with service order data", async () => {
            req.params.id = "uuid-123";

            const mockServiceOrderRecord = {
                id: "uuid-123",
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

            vi.mocked(serviceOrderService).getServiceOrderById.mockResolvedValue(mockServiceOrderRecord);

            await serviceOrderController.getServiceOrderById(req, res, next);

            expect(serviceOrderService.getServiceOrderById).toHaveBeenCalledWith("uuid-123");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockServiceOrderRecord,
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with badRequest error if id is missing", async () => {
            req.params = {};

            await serviceOrderController.getServiceOrderById(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                code: "BAD_REQUEST",
                message: "Service order ID is required",
            }));
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe("listServiceOrders", () => {
        it("should return 200 with service orders data", async () => {
            req.query.limit = "1";

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

            vi.mocked(serviceOrderService).listServiceOrders.mockResolvedValue(mockServiceOrders);

            await serviceOrderController.listServiceOrders(req, res, next);

            expect(serviceOrderService.listServiceOrders).toHaveBeenCalledWith({
                options: {
                    limit: 1,
                },
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockServiceOrders,
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should default limit to null when query.limit is absent", async () => {
            const mockServiceOrders = [] as ServiceOrderRecord[];

            vi.mocked(serviceOrderService).listServiceOrders.mockResolvedValue(mockServiceOrders);

            await serviceOrderController.listServiceOrders(req, res, next);

            expect(serviceOrderService.listServiceOrders).toHaveBeenCalledWith({
                options: {
                    limit: null,
                },
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockServiceOrders,
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe("cancelServiceOrder", () => {
        it("should return 200 on successful cancellation", async () => {
            req.params.id = "uuid-service-order-123";
            req.user = { id: "uuid-user-123" };
            req.body = {
                reason: "Customer requested cancellation.",
            };

            vi.mocked(serviceOrderService).cancelServiceOrder.mockResolvedValue();

            await serviceOrderController.cancelServiceOrder(req, res, next);

            expect(serviceOrderService.cancelServiceOrder).toHaveBeenCalledWith({
                serviceOrderId: "uuid-service-order-123",
                reason: "Customer requested cancellation.",
                cancelById: "uuid-user-123",
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Service order successfully cancelled",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with badRequest error if id is missing", async () => {
            req.params = {};
            req.user = { id: "uuid-user-123" };
            req.body = { reason: "Customer requested cancellation." };

            await serviceOrderController.cancelServiceOrder(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                code: "BAD_REQUEST",
                message: "service order ID is required",
            }));
            expect(serviceOrderService.cancelServiceOrder).not.toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should propagate error when service fails", async () => {
            req.params.id = "uuid-service-order-123";
            req.user = { id: "uuid-user-123" };
            req.body = { reason: "Customer requested cancellation." };

            const error = new Error("Service error");
            vi.mocked(serviceOrderService).cancelServiceOrder.mockRejectedValue(error);

            await serviceOrderController.cancelServiceOrder(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe("CreateDiagnosis", () => {
        it("should return 201 on successful diagnosis creation", async () => {
            req.params.id = "uuid-service-order-123";
            req.user = { id: "uuid-user-123" };

            const mockDiagnosisRecord = {
                id: "uuid-diagnosis-123",
                serviceOrderId: "uuid-service-order-123",
                performedById: "uuid-user-123",
                result: null,
                completedAt: null,
                createdAt: new Date(),
            } as DiagnosisRecord;

            vi.mocked(serviceOrderService).startDiagnosis.mockResolvedValue(mockDiagnosisRecord);

            await serviceOrderController.startDiagnosis(req, res, next);

            expect(serviceOrderService.startDiagnosis).toHaveBeenCalledWith({
                serviceOrderId: "uuid-service-order-123",
                performedById: "uuid-user-123",
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockDiagnosisRecord,
                message: "Diagnosis successfully created",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with badRequest error if id is missing", async () => {
            req.params = {};
            req.user = { id: "uuid-user-123" };

            await serviceOrderController.startDiagnosis(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                message: "service order ID is required",
            }));
            expect(serviceOrderService.startDiagnosis).not.toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should propagate error when service fails", async () => {
            req.params.id = "uuid-service-order-123";
            req.user = { id: "uuid-user-123" };

            const error = new Error("Service error");
            vi.mocked(serviceOrderService).startDiagnosis.mockRejectedValue(error);

            await serviceOrderController.startDiagnosis(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe("getDiagnosisById", () => {
        it("should return 200 with diagnosis data", async () => {
            req.params.id = "uuid-diagnosis-123";

            const mockDiagnosisRecord = {
                id: "uuid-diagnosis-123",
                serviceOrderId: "uuid-service-order-123",
                performedById: "uuid-user-123",
                result: null,
                completedAt: null,
                createdAt: new Date(),
            } as DiagnosisRecord;

            vi.mocked(serviceOrderService).getDiagnosisById.mockResolvedValue(mockDiagnosisRecord);

            await serviceOrderController.getDiagnosisById(req, res, next);

            expect(serviceOrderService.getDiagnosisById).toHaveBeenCalledWith("uuid-diagnosis-123");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockDiagnosisRecord,
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with badRequest error if id is missing", async () => {
            req.params = {};

            await serviceOrderController.getDiagnosisById(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                message: "Diagnosis ID is required",
            }));
            expect(serviceOrderService.getDiagnosisById).not.toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe("createFinding", () => {
        it("should return 201 on successful finding creation", async () => {
            req.params.id = "uuid-diagnosis-123";
            req.user = { id: "uuid-user-123" };
            req.body = {
                description: "Battery capacity below expected level.",
                repairable: true,
            };

            const mockFindingRecord = {
                id: "uuid-finding-123",
                diagnosisId: "uuid-diagnosis-123",
                createdById: "uuid-user-123",
                description: "Battery capacity below expected level.",
                repairable: true,
                createdAt: new Date(),
                updatedAt: null,
            } as FindingRecord;

            vi.mocked(serviceOrderService).createFinding.mockResolvedValue(mockFindingRecord);

            await serviceOrderController.createFinding(req, res, next);

            expect(serviceOrderService.createFinding).toHaveBeenCalledWith({
                diagnosisId: "uuid-diagnosis-123",
                description: "Battery capacity below expected level.",
                repairable: true,
                createdById: "uuid-user-123",
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockFindingRecord,
                message: "Finding successfully created",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with badRequest error if id is missing", async () => {
            req.params = {};
            req.body = {
                description: "Battery capacity below expected level.",
                repairable: true,
            };

            await serviceOrderController.createFinding(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                message: "Diagnosis ID is required",
            }));
            expect(serviceOrderService.createFinding).not.toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should propagate error when service fails", async () => {
            req.params.id = "uuid-diagnosis-123";
            req.body = {
                description: "Battery capacity below expected level.",
                repairable: true,
            };

            const error = new Error("Service error");
            vi.mocked(serviceOrderService).createFinding.mockRejectedValue(error);

            await serviceOrderController.createFinding(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
        });
    });
});