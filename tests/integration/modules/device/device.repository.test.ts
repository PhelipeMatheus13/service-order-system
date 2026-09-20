// (Node built‑ins)
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
// (Types)
import type {
    CreateDeviceInput,
    DeviceRecord,
} from "../../../../src/modules/device/device.types.js";
// (shared / infra)
import { PrismaClient } from "../../../../src/generated/prisma/client.js";
import { setPrismaInstance } from "../../../../src/shared/config/database.js";
import { setupTestDatabase } from "../../../helpers/testDatabase.js";
// (local modules)
import deviceRepository from "../../../../src/modules/device/device.repository.js";

describe("Device Repository (Integration)", () => {
    let db: Awaited<ReturnType<typeof setupTestDatabase>>;
    let prisma: PrismaClient;

    beforeAll(async () => {
        db = await setupTestDatabase();
        prisma = db.prismaClient;
        setPrismaInstance(prisma);
    });

    afterAll(async () => {
        await db.stop();
    });

    beforeEach(async () => {
        await prisma.device.deleteMany();
        await prisma.customer.deleteMany();
    });

    describe("Writer repository", () => {
        describe("createDevice", () => {
            let customerCreatedId: string;

            beforeEach(async () => {
                const customerCreated = await prisma.customer.create({
                    data: {
                        firstName: "John",
                        lastName: "Doe",
                        email: "john@example.com",
                        phoneNumber: "5521995437105",
                    },
                });

                customerCreatedId = customerCreated.id;
            });

            it("should insert a new device into the database", async () => {
                const deviceData: CreateDeviceInput = {
                    customerId: customerCreatedId,
                    type: "SMARTPHONE",
                    brand: "Samsung",
                    model: "Galaxy S23",
                    serialNumber: "SN-123456",
                    imei: "123456789012345",
                    color: "Black",
                };

                const deviceCreated = await deviceRepository.create(deviceData);

                expect(deviceCreated).toBeTruthy();

                const deviceFound = await prisma.device.findUnique({
                    where: { id: deviceCreated.id },
                });

                expect(deviceFound).not.toBeNull();
                expect(deviceFound?.id).toBe(deviceCreated.id);
                expect(deviceFound?.customerId).toBe(deviceData.customerId);
                expect(deviceFound?.type).toBe(deviceData.type);
                expect(deviceFound?.brand).toBe(deviceData.brand);
                expect(deviceFound?.model).toBe(deviceData.model);
                expect(deviceFound?.serialNumber).toBe(deviceData.serialNumber);
                expect(deviceFound?.imei).toBe(deviceData.imei);
                expect(deviceFound?.color).toBe(deviceData.color);
                expect(deviceFound?.createdAt).toBeTruthy();
                expect(deviceFound?.updatedAt).toBeNull();
            });
        });
    });

    describe("Reader repository", () => {
        describe("findById", () => {
            let deviceCreatedId: string;

            beforeEach(async () => {
                const customerCreated = await prisma.customer.create({
                    data: {
                        firstName: "John",
                        lastName: "Doe",
                        email: "john@example.com",
                        phoneNumber: "5521995437105",
                    },
                });

                const deviceCreated = await prisma.device.create({
                    data: {
                        customerId: customerCreated.id,
                        type: "SMARTPHONE",
                        brand: "Samsung",
                        model: "Galaxy S23",
                        serialNumber: "SN-123456",
                        imei: "123456789012345",
                        color: "Black",
                    },
                });

                deviceCreatedId = deviceCreated.id;
            });

            it("should return the device if a device with the given ID exists", async () => {
                const device = await deviceRepository.findById(deviceCreatedId);

                expect(device).toBeTruthy();
                expect(device?.id).toBe(deviceCreatedId);
                expect(device?.type).toBe("SMARTPHONE");
                expect(device?.brand).toBe("Samsung");
                expect(device?.model).toBe("Galaxy S23");
                expect(device?.serialNumber).toBe("SN-123456");
                expect(device?.imei).toBe("123456789012345");
                expect(device?.color).toBe("Black");
                expect(device?.createdAt).toBeTruthy();
                expect(device?.updatedAt).toBeNull();
            });

            it("should return null if a device with the given ID does not exist", async () => {
                const device = await deviceRepository.findById("0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa");

                expect(device).toBeNull();
            });
        });
    });
});