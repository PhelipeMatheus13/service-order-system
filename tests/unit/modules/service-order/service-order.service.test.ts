// (Node built‑ins)
import { beforeEach, describe, expect, it, vi } from "vitest";
// (Types)
import {
    CreateServiceOrderInput,
    ServiceOrderRecord,
} from "../../../../src/modules/service-order/service-order.types.js";
// (shared)
import { isForeignKeyConstraintOn } from "../../../../src/shared/utils/prisma-error.js";
// (local modules)
import serviceOrderService from "../../../../src/modules/service-order/service-order.service.js";
import serviceOrderRepository from "../../../../src/modules/service-order/service-order.repository.js";

vi.mock("../../../../src/modules/service-order/service-order.repository.js");
vi.mock("../../../../src/shared/utils/prisma-error.js");

describe("Service Order Service (Unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createServiceOrder", () => {
        const validInput: CreateServiceOrderInput = {
            deviceId: "uuid-device-123",
            reportedProblem: "Screen is cracked and touch is not responding.",
            createdBy: "uuid-user-123",
        };

        it("should throw NOT_FOUND if repository returns null", async () => {
            vi.mocked(serviceOrderRepository.create).mockResolvedValue(null);

            await expect(serviceOrderService.createServiceOrder(validInput))
                .rejects.toMatchObject({
                    statusCode: 404,
                    code: "NOT_FOUND",
                    message: "Device not found",
                });

            expect(serviceOrderRepository.create).toHaveBeenCalledWith(validInput);
        });

        it("should throw UNAUTHORIZED if created_by foreign key constraint is violated", async () => {
            const dbError = new Error("Foreign key constraint failed");
            vi.mocked(serviceOrderRepository.create).mockRejectedValue(dbError);
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

        it("should propagate error if it is not a foreign key violation", async () => {
            const error = new Error("fake error");
            vi.mocked(serviceOrderRepository.create).mockRejectedValue(error);
            vi.mocked(isForeignKeyConstraintOn).mockReturnValue(false);

            await expect(serviceOrderService.createServiceOrder(validInput))
                .rejects.toThrow(error);
        });

        it("should create service order successfully", async () => {
            const mockServiceOrderRecord = {
                id: "uuid-service-order-123",
                customerId: "uuid-customer-123",
                deviceId: validInput.deviceId,
                reportedProblem: validInput.reportedProblem,
                status: "RECEIVED",
                createdById: validInput.createdBy,
                createdAt: new Date(),
                updatedAt: null,
            } as ServiceOrderRecord;

            vi.mocked(serviceOrderRepository.create).mockResolvedValue(mockServiceOrderRecord);

            const result = await serviceOrderService.createServiceOrder(validInput);

            expect(serviceOrderRepository.create).toHaveBeenCalledWith(validInput);
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
                status: "RECEIVED",
                createdById: "uuid-user-123",
                createdAt: new Date(),
                updatedAt: null,
            } as ServiceOrderRecord;

            vi.mocked(serviceOrderRepository).findById.mockResolvedValue(mockServiceOrderRecord);

            const result = await serviceOrderService.getServiceOrderById(serviceOrderId);

            expect(serviceOrderRepository.findById).toHaveBeenCalledWith(serviceOrderId);
            expect(result).toEqual(mockServiceOrderRecord);
        });
    });
});