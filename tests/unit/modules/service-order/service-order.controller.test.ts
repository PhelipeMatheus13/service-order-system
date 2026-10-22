// (Node built‑ins)
import { beforeEach, describe, expect, it, vi } from "vitest";
// (Types)
import { ServiceOrderRecord, DiagnosisRecord, FindingRecord, QuoteRecord, QuoteItemWithComponents } from "../../../../src/modules/service-order/service-order.types.js";
// (local modules)
import serviceOrderController from "../../../../src/modules/service-order/service-order.controller.js";
import serviceOrderService from "../../../../src/modules/service-order/service-order.service.js";
import { Prisma } from "../../../../src/generated/prisma/client.js";

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
                createdById: "uuid-user-123",
                result: null,
                completedById: null,
                completedAt: null,
                createdAt: new Date(),
            } as DiagnosisRecord;

            vi.mocked(serviceOrderService).startDiagnosis.mockResolvedValue(mockDiagnosisRecord);

            await serviceOrderController.startDiagnosis(req, res, next);

            expect(serviceOrderService.startDiagnosis).toHaveBeenCalledWith({
                serviceOrderId: "uuid-service-order-123",
                createdById: "uuid-user-123",
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
                createdById: "uuid-user-123",
                result: null,
                completedById: null,
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

    describe("updateFinding", () => {
        it("should return 200 on successful finding update", async () => {
            req.params.id = "uuid-finding-123";
            req.user = { id: "uuid-user-123" };
            req.body = {
                description: "Battery capacity critically below expected level",
                repairable: false,
            };

            const mockFindingRecord = {
                id: "uuid-finding-123",
                diagnosisId: "uuid-diagnosis-123",
                createdById: "uuid-user-456",
                description: "Battery capacity critically below expected level",
                repairable: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                updatedById: "uuid-user-123",
            } as FindingRecord;

            vi.mocked(serviceOrderService).updateFinding.mockResolvedValue(mockFindingRecord);

            await serviceOrderController.updateFinding(req, res, next);

            expect(serviceOrderService.updateFinding).toHaveBeenCalledWith({
                findingId: "uuid-finding-123",
                description: "Battery capacity critically below expected level",
                repairable: false,
                updatedById: "uuid-user-123",
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockFindingRecord,
                message: "Finding successfully updated",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with badRequest error if id is missing", async () => {
            req.params = {};
            req.user = { id: "uuid-user-123" };
            req.body = {
                description: "Battery capacity critically below expected level",
                repairable: false,
            };

            await serviceOrderController.updateFinding(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                message: "Finding ID is required",
            }));
            expect(serviceOrderService.updateFinding).not.toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should propagate error when service fails", async () => {
            req.params.id = "uuid-finding-123";
            req.user = { id: "uuid-user-123" };
            req.body = {
                description: "Battery capacity critically below expected level",
                repairable: false,
            };

            const error = new Error("Service error");
            vi.mocked(serviceOrderService).updateFinding.mockRejectedValue(error);

            await serviceOrderController.updateFinding(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe("deleteFinding", () => {
        it("should return 200 on successful finding deletion", async () => {
            req.params.id = "uuid-finding-123";

            vi.mocked(serviceOrderService).deleteFinding.mockResolvedValue(undefined);

            await serviceOrderController.deleteFinding(req, res, next);

            expect(serviceOrderService.deleteFinding).toHaveBeenCalledWith("uuid-finding-123");

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Finding successfully deleted",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with badRequest error if id is missing", async () => {
            req.params = {};

            await serviceOrderController.deleteFinding(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                message: "Finding ID is required",
            }));
            expect(serviceOrderService.deleteFinding).not.toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should propagate error when service fails", async () => {
            req.params.id = "uuid-finding-123";

            const error = new Error("Service error");
            vi.mocked(serviceOrderService).deleteFinding.mockRejectedValue(error);

            await serviceOrderController.deleteFinding(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe("completeDiagnosis", () => {
        it("should return 200 on successful diagnosis completion", async () => {
            req.params.id = "uuid-diagnosis-123";
            req.user = { id: "uuid-user-123" };
            req.body = {
                result: "FAULT_FOUND",
            };

            const mockDiagnosisRecord = {
                id: "uuid-diagnosis-123",
                serviceOrderId: "uuid-service-order-123",
                createdById: "uuid-user-456",
                completedById: "uuid-user-123",
                result: "FAULT_FOUND",
                createdAt: new Date(),
                completedAt: new Date(),
            } as DiagnosisRecord;

            vi.mocked(serviceOrderService).completeDiagnosis.mockResolvedValue(mockDiagnosisRecord);

            await serviceOrderController.completeDiagnosis(req, res, next);

            expect(serviceOrderService.completeDiagnosis).toHaveBeenCalledWith({
                diagnosisId: "uuid-diagnosis-123",
                result: "FAULT_FOUND",
                completedById: "uuid-user-123",
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockDiagnosisRecord,
                message: "Diagnosis successfully completed",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with badRequest error if id is missing", async () => {
            req.params = {};
            req.user = { id: "uuid-user-123" };
            req.body = {
                result: "FAULT_FOUND",
            };

            await serviceOrderController.completeDiagnosis(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                message: "Diagnosis ID is required",
            }));
            expect(serviceOrderService.completeDiagnosis).not.toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should propagate error when service fails", async () => {
            req.params.id = "uuid-diagnosis-123";
            req.user = { id: "uuid-user-123" };
            req.body = {
                result: "FAULT_FOUND",
            };

            const error = new Error("Service error");
            vi.mocked(serviceOrderService).completeDiagnosis.mockRejectedValue(error);

            await serviceOrderController.completeDiagnosis(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe("listFindingsByDiagnosisId", () => {
        it("should return 200 with findings data", async () => {
            req.params.id = "uuid-diagnosis-123";

            const mockFindings = [
                {
                    id: "uuid-finding-1",
                    diagnosisId: "uuid-diagnosis-123",
                    createdById: "uuid-user-456",
                    description: "Battery capacity below expected level",
                    repairable: true,
                    createdAt: new Date(),
                    updatedAt: null,
                    updatedById: null,
                },
                {
                    id: "uuid-finding-2",
                    diagnosisId: "uuid-diagnosis-123",
                    createdById: "uuid-user-456",
                    description: "Motherboard corrosion",
                    repairable: false,
                    createdAt: new Date(),
                    updatedAt: null,
                    updatedById: null,
                },
            ] as FindingRecord[];

            vi.mocked(serviceOrderService).listFindingsByDiagnosisId.mockResolvedValue(mockFindings);

            await serviceOrderController.listFindingsByDiagnosisId(req, res, next);

            expect(serviceOrderService.listFindingsByDiagnosisId).toHaveBeenCalledWith({
                diagnosisId: "uuid-diagnosis-123",
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockFindings,
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 200 with an empty array when the diagnosis has no findings", async () => {
            req.params.id = "uuid-diagnosis-123";

            vi.mocked(serviceOrderService).listFindingsByDiagnosisId.mockResolvedValue([]);

            await serviceOrderController.listFindingsByDiagnosisId(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: [],
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with badRequest error if id is missing", async () => {
            req.params = {};

            await serviceOrderController.listFindingsByDiagnosisId(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                message: "Diagnosis ID is required",
            }));
            expect(serviceOrderService.listFindingsByDiagnosisId).not.toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should propagate error when service fails", async () => {
            req.params.id = "uuid-diagnosis-123";

            const error = new Error("Service error");
            vi.mocked(serviceOrderService).listFindingsByDiagnosisId.mockRejectedValue(error);

            await serviceOrderController.listFindingsByDiagnosisId(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe("createQuote", () => {
        it("should return 201 on successful quote creation", async () => {
            req.params.id = "uuid-service-order-123";
            req.user = { id: "uuid-user-123" };
            req.body = {
                diagnosisId: "uuid-diagnosis-123",
            };

            const mockQuoteRecord = {
                id: "uuid-quote-123",
                serviceOrderId: "uuid-service-order-123",
                diagnosisId: "uuid-diagnosis-123",
                status: "DRAFT",
                submittedAt: null,
                respondedAt: null,
                createdById: "uuid-user-123",
                createdAt: new Date(),
                updatedAt: null,
            } as QuoteRecord;

            vi.mocked(serviceOrderService).createQuote.mockResolvedValue(mockQuoteRecord);

            await serviceOrderController.createQuote(req, res, next);

            expect(serviceOrderService.createQuote).toHaveBeenCalledWith({
                serviceOrderId: "uuid-service-order-123",
                diagnosisId: "uuid-diagnosis-123",
                createdById: "uuid-user-123",
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockQuoteRecord,
                message: "Quote successfully created",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with badRequest error if id is missing", async () => {
            req.params = {};
            req.user = { id: "uuid-user-123" };
            req.body = {
                diagnosisId: "uuid-diagnosis-123",
            };

            await serviceOrderController.createQuote(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                message: "Service order ID is required",
            }));
            expect(serviceOrderService.createQuote).not.toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should propagate error when service fails", async () => {
            req.params.id = "uuid-service-order-123";
            req.user = { id: "uuid-user-123" };
            req.body = {
                diagnosisId: "uuid-diagnosis-123",
            };

            const error = new Error("Service error");
            vi.mocked(serviceOrderService).createQuote.mockRejectedValue(error);

            await serviceOrderController.createQuote(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe("createQuoteItem", () => {
        it("should return 201 on successful quote item creation", async () => {
            req.params.id = "uuid-quote-123";
            req.user = { id: "uuid-user-123" };
            req.body = {
                findingId: "uuid-finding-123",
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
            };

            const mockQuoteItem = {
                id: "uuid-quote-item-123",
                quoteId: "uuid-quote-123",
                findingId: "uuid-finding-123",
                description: "Battery replacement",
                decision: "PENDING",
                createdById: "uuid-user-123",
                createdAt: new Date(),
                updatedById: null,
                updatedAt: null,
                quoteItemComponents: [
                    {
                        id: "uuid-component-1",
                        quoteItemId: "uuid-quote-item-123",
                        type: "PART",
                        description: "Battery",
                        quantity: 1,
                        unitPrice: new Prisma.Decimal(80),
                        createdAt: new Date(),
                        updatedAt: null,
                    },
                    {
                        id: "uuid-component-2",
                        quoteItemId: "uuid-quote-item-123",
                        type: "LABOR",
                        description: "Battery replacement labor",
                        quantity: 1,
                        unitPrice: new Prisma.Decimal(20),
                        createdAt: new Date(),
                        updatedAt: null,
                    },
                ],
            } as QuoteItemWithComponents;

            vi.mocked(serviceOrderService).createQuoteItem.mockResolvedValue(mockQuoteItem);

            await serviceOrderController.createQuoteItem(req, res, next);

            expect(serviceOrderService.createQuoteItem).toHaveBeenCalledWith({
                quoteId: "uuid-quote-123",
                findingId: "uuid-finding-123",
                description: "Battery replacement",
                createdById: "uuid-user-123",
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

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockQuoteItem,
                message: "Quote item successfully created",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with badRequest error if id is missing", async () => {
            req.params = {};
            req.user = { id: "uuid-user-123" };
            req.body = {
                findingId: "uuid-finding-123",
                description: "Battery replacement",
                components: [
                    {
                        type: "PART",
                        description: "Battery",
                        quantity: 1,
                        unitPrice: 80.0,
                    },
                ],
            };

            await serviceOrderController.createQuoteItem(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                message: "Quote ID is required",
            }));
            expect(serviceOrderService.createQuoteItem).not.toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should propagate error when service fails", async () => {
            req.params.id = "uuid-quote-123";
            req.user = { id: "uuid-user-123" };
            req.body = {
                findingId: "uuid-finding-123",
                description: "Battery replacement",
                components: [
                    {
                        type: "PART",
                        description: "Battery",
                        quantity: 1,
                        unitPrice: 80.0,
                    },
                ],
            };

            const error = new Error("Service error");
            vi.mocked(serviceOrderService).createQuoteItem.mockRejectedValue(error);

            await serviceOrderController.createQuoteItem(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe("getQuoteById", () => {
        it("should return 200 with quote data", async () => {
            req.params.id = "uuid-quote-123";

            const mockQuoteRecord = {
                id: "uuid-quote-123",
                serviceOrderId: "uuid-service-order-123",
                diagnosisId: "uuid-diagnosis-123",
                status: "DRAFT",
                submittedAt: null,
                respondedAt: null,
                createdById: "uuid-user-123",
                createdAt: new Date(),
                updatedAt: null,
            } as QuoteRecord;

            vi.mocked(serviceOrderService).getQuoteById.mockResolvedValue(mockQuoteRecord);

            await serviceOrderController.getQuoteById(req, res, next);

            expect(serviceOrderService.getQuoteById).toHaveBeenCalledWith("uuid-quote-123");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockQuoteRecord,
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with badRequest error if id is missing", async () => {
            req.params = {};

            await serviceOrderController.getQuoteById(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                message: "Quote ID is required",
            }));
            expect(serviceOrderService.getQuoteById).not.toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should propagate error when service fails", async () => {
            req.params.id = "uuid-quote-123";

            const error = new Error("Service error");
            vi.mocked(serviceOrderService).getQuoteById.mockRejectedValue(error);

            await serviceOrderController.getQuoteById(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe("listQuotesByServiceOrderId", () => {
        it("should return 200 with quotes data", async () => {
            req.params.id = "uuid-service-order-123";

            const mockQuotes = [
                {
                    id: "uuid-quote-1",
                    serviceOrderId: "uuid-service-order-123",
                    diagnosisId: "uuid-diagnosis-123",
                    status: "SUPERSEDED",
                    submittedAt: new Date(),
                    respondedAt: null,
                    createdById: "uuid-user-123",
                    createdAt: new Date(),
                    updatedAt: null,
                },
                {
                    id: "uuid-quote-2",
                    serviceOrderId: "uuid-service-order-123",
                    diagnosisId: "uuid-diagnosis-123",
                    status: "DRAFT",
                    submittedAt: null,
                    respondedAt: null,
                    createdById: "uuid-user-123",
                    createdAt: new Date(),
                    updatedAt: null,
                },
            ] as QuoteRecord[];

            vi.mocked(serviceOrderService).listQuotesByServiceOrderId.mockResolvedValue(mockQuotes);

            await serviceOrderController.listQuotesByServiceOrderId(req, res, next);

            expect(serviceOrderService.listQuotesByServiceOrderId).toHaveBeenCalledWith({
                serviceOrderId: "uuid-service-order-123",
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockQuotes,
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with badRequest error if id is missing", async () => {
            req.params = {};

            await serviceOrderController.listQuotesByServiceOrderId(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                message: "Service order ID is required",
            }));
            expect(serviceOrderService.listQuotesByServiceOrderId).not.toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should propagate error when service fails", async () => {
            req.params.id = "uuid-service-order-123";

            const error = new Error("Service error");
            vi.mocked(serviceOrderService).listQuotesByServiceOrderId.mockRejectedValue(error);

            await serviceOrderController.listQuotesByServiceOrderId(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
        });
    });
});