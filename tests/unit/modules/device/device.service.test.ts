// (Node built‑ins)
import { beforeEach, describe, expect, it, vi } from "vitest";
// (Types)
import {
    CreateDeviceInput,
    DeviceRecord,
} from "../../../../src/modules/device/device.types.js";
// (shared)
import { isUniqueConstraintOn, isForeignKeyConstraintOn } from "../../../../src/shared/utils/prisma-error.js";
// (local modules)
import deviceService from "../../../../src/modules/device/device.service.js";
import deviceRepository from "../../../../src/modules/device/device.repository.js";

vi.mock("../../../../src/modules/device/device.repository.js");
vi.mock("../../../../src/shared/utils/prisma-error.js");

describe("Device Service (Unit)", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe("createDevice", () => {
        const validInput: CreateDeviceInput = {
            customerId: "uuid-123",
            type: "SMARTPHONE",
            brand: "Samsung",
            model: "Galaxy S23",
            serialNumber: "SN-123456",
            imei: "123456789012345",
            color: "Black",
        };

        it("should throw NOT_FOUND if customer foreign key constraint is violated", async () => {
            const dbError = new Error("Foreign key constraint failed");
            vi.mocked(deviceRepository.create).mockRejectedValue(dbError);
            vi.mocked(isUniqueConstraintOn).mockReturnValue(false);
            vi.mocked(isForeignKeyConstraintOn).mockImplementation(
                (_error, field) => field === "customer_id",
            );

            await expect(deviceService.createDevice(validInput))
                .rejects.toMatchObject({
                    statusCode: 404,
                    code: "NOT_FOUND",
                    message: "Customer not found",
                });

            expect(isForeignKeyConstraintOn).toHaveBeenCalledWith(dbError, "customer_id");
        });

        it("should throw ALREADY_EXISTS if serial number is a unique constraint violation", async () => {
            const dbError = new Error("Unique constraint failed");
            vi.mocked(deviceRepository.create).mockRejectedValue(dbError);
            vi.mocked(isUniqueConstraintOn).mockImplementation(
                (_error, field) => field === "serial_number",
            );

            await expect(deviceService.createDevice(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    code: "ALREADY_EXISTS",
                    message: "Device with this serial number already exists",
                });

            expect(isUniqueConstraintOn).toHaveBeenCalledWith(dbError, "serial_number");
        });

        it("should throw ALREADY_EXISTS if IMEI is a unique constraint violation", async () => {
            const dbError = new Error("Unique constraint failed");
            vi.mocked(deviceRepository.create).mockRejectedValue(dbError);
            vi.mocked(isUniqueConstraintOn).mockImplementation(
                (_error, field) => field === "imei",
            );

            await expect(deviceService.createDevice(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    code: "ALREADY_EXISTS",
                    message: "Device with this IMEI already exists",
                });

            expect(isUniqueConstraintOn).toHaveBeenCalledWith(dbError, "imei");
        });

        it("should propagate error if it is not a unique constraint violation", async () => {
            const error = new Error("fake error");
            vi.mocked(deviceRepository.create).mockRejectedValue(error);
            vi.mocked(isUniqueConstraintOn).mockReturnValue(false);

            await expect(deviceService.createDevice(validInput))
                .rejects.toThrow(error);
        });

        it("should create device successfully", async () => {
            const mockDeviceRecord = {
                id: "uuid-123",
                customerId: validInput.customerId,
                type: validInput.type,
                brand: validInput.brand,
                model: validInput.model,
                serialNumber: validInput.serialNumber,
                imei: validInput.imei,
                color: validInput.color,
                createdAt: new Date(),
                updatedAt: null,
            } as DeviceRecord;

            vi.mocked(deviceRepository.create).mockResolvedValue(mockDeviceRecord);

            const result = await deviceService.createDevice(validInput);

            expect(deviceRepository.create).toHaveBeenCalledWith(validInput);
            expect(result).toBe(mockDeviceRecord);
        });
    });
});