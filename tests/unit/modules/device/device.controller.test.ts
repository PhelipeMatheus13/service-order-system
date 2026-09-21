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

    describe("getDevice", () => {
        it("should return 200 with device data", async () => {
            req.params.id = "uuid-123";

            const mockDeviceRecord = {
                id: "uuid-123",
                customerId: "uuid-customer-123",
                type: "SMARTPHONE",
                brand: "Samsung",
                model: "Galaxy S23",
                serialNumber: "SN-123456",
                imei: "123456789012345",
                color: "Black",
                createdAt: new Date(),
                updatedAt: null,
            } as DeviceRecord;

            vi.mocked(deviceService).getDeviceById.mockResolvedValue(mockDeviceRecord);

            await deviceController.getDevice(req, res, next);

            expect(deviceService.getDeviceById).toHaveBeenCalledWith("uuid-123");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockDeviceRecord,
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with badRequest error if id is missing", async () => {
            await deviceController.getDevice(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                code: "BAD_REQUEST",
                message: "Device ID is required",
            }));
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe("listDevices", () => {
        it("should return 200 with devices data", async () => {
            req.query.limit = "1";

            const mockDevices = [
                {
                    id: "uuid-123",
                    customerId: "uuid-customer-123",
                    type: "SMARTPHONE",
                    brand: "Samsung",
                    model: "Galaxy S23",
                    serialNumber: "SN-123456",
                    imei: "123456789012345",
                    color: "Black",
                    createdAt: new Date(),
                    updatedAt: null,
                },
            ] as DeviceRecord[];

            vi.mocked(deviceService).listDevices.mockResolvedValue(mockDevices);

            await deviceController.listDevices(req, res, next);

            expect(deviceService.listDevices).toHaveBeenCalledWith({
                options: {
                    limit: 1,
                },
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockDevices,
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should default limit to null when query.limit is absent", async () => {
            const mockDevices = [] as DeviceRecord[];

            vi.mocked(deviceService).listDevices.mockResolvedValue(mockDevices);

            await deviceController.listDevices(req, res, next);

            expect(deviceService.listDevices).toHaveBeenCalledWith({
                options: {
                    limit: null,
                },
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockDevices,
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe("updateDevice", () => {
        it("should return 200 on successful update", async () => {
            req.params.id = "uuid-123";
            req.body = {
                type: "LAPTOP",
                brand: null,
                model: null,
                serialNumber: null,
                imei: null,
                color: null,
            };

            const mockDeviceRecord = {
                id: "uuid-123",
                customerId: "uuid-customer-123",
                type: "LAPTOP",
                brand: "Samsung",
                model: "Galaxy S23",
                serialNumber: "SN-123456",
                imei: "123456789012345",
                color: "Black",
                createdAt: new Date(),
                updatedAt: new Date(),
            } as DeviceRecord;

            vi.mocked(deviceService).updateDevice.mockResolvedValue(mockDeviceRecord);

            await deviceController.updateDevice(req, res, next);

            expect(deviceService.updateDevice).toHaveBeenCalledWith({
                deviceId: "uuid-123",
                type: "LAPTOP",
                brand: null,
                model: null,
                serialNumber: null,
                imei: null,
                color: null,
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockDeviceRecord,
                message: "Device updated successfully",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with badRequest error if id is missing", async () => {
            req.params = {};

            await deviceController.updateDevice(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                code: "BAD_REQUEST",
                message: "Device ID is required",
            }));
            expect(res.status).not.toHaveBeenCalled();
        });
    });
});