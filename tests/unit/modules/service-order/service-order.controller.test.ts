// (Node built‑ins)
import { beforeEach, describe, expect, it, vi } from "vitest";
// (Types)
import { ServiceOrderRecord } from "../../../../src/modules/service-order/service-order.types.js";
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
                status: "RECEIVED",
                createdById: "uuid-user-123",
                createdAt: new Date(),
                updatedAt: null,
            } as ServiceOrderRecord;

            vi.mocked(serviceOrderService).createServiceOrder.mockResolvedValue(mockServiceOrderRecord);

            await serviceOrderController.createServiceOrder(req, res, next);

            expect(serviceOrderService.createServiceOrder).toHaveBeenCalledWith({
                deviceId: "uuid-device-123",
                reportedProblem: "Screen is cracked and touch is not responding.",
                createdBy: "uuid-user-123",
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
                status: "RECEIVED",
                createdById: "uuid-user-123",
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
                    status: "RECEIVED",
                    createdById: "uuid-user-123",
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
});