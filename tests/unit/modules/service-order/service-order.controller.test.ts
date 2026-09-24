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

            vi.mocked(serviceOrderService).CreateServiceOrder.mockResolvedValue(mockServiceOrderRecord);

            await serviceOrderController.CreateServiceOrder(req, res, next);

            expect(serviceOrderService.CreateServiceOrder).toHaveBeenCalledWith({
                deviceId: "uuid-device-123",
                reportedProblem: "Screen is cracked and touch is not responding.",
                createdBy: "uuid-user-123",
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockServiceOrderRecord,
                message: "service order created successfully",
            });
            expect(next).not.toHaveBeenCalled();
        });
    });
});