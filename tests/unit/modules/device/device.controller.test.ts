// (Node built‑ins)
import { beforeEach, describe, expect, it, vi } from "vitest";
// (Types)
import { DeviceRecord } from "../../../../src/modules/device/device.types.js";
// (local modules)
import deviceController from "../../../../src/modules/device/device.controller.js";
import deviceService from "../../../../src/modules/device/device.service.js";

vi.mock("../../../../src/modules/device/device.service.js");

describe("Device Controller (Unit)", () => {
    let req: any;
    let res: any;
    let next: any;

    beforeEach(() => {
        req = { body: {}, params: {}, query: {} };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };
        next = vi.fn();
        vi.clearAllMocks();
    });

    describe("createDevice", () => {
        it("should return 201 on successful creation", async () => {
            const requestBody = {
                customerId: "uuid-customer-123",
                type: "SMARTPHONE",
                brand: "Samsung",
                model: "Galaxy S23",
                serialNumber: "SN-123456",
                imei: "123456789012345",
                color: "Black",
            };
            req.body = requestBody;

            const mockDeviceRecord = {
                id: "uuid-device-123",
                customerId: requestBody.customerId,
                type: requestBody.type,
                brand: requestBody.brand,
                model: requestBody.model,
                serialNumber: requestBody.serialNumber,
                imei: requestBody.imei,
                color: requestBody.color,
                createdAt: new Date(),
                updatedAt: null,
            } as DeviceRecord;

            vi.mocked(deviceService).createDevice.mockResolvedValue(mockDeviceRecord);

            await deviceController.createDevice(req, res, next);

            expect(deviceService.createDevice).toHaveBeenCalledWith({
                customerId: requestBody.customerId,
                type: requestBody.type,
                brand: requestBody.brand,
                model: requestBody.model,
                serialNumber: requestBody.serialNumber,
                imei: requestBody.imei,
                color: requestBody.color,
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockDeviceRecord,
                message: "Device created successfully",
            });
            expect(next).not.toHaveBeenCalled();
        });
    });
});