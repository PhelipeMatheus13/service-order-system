import { DeviceRecord, CreateDeviceInput, ListDevicesInput } from "./device.types.js";
import { getPrisma } from "../../shared/config/database.js";

// Writer
const create = async (input: CreateDeviceInput): Promise<DeviceRecord> => {
    const prisma = getPrisma();
    const device = await prisma.device.create({
        data: {
            customerId: input.customerId,
            type: input.type,
            brand: input.brand,
            model: input.model,
            serialNumber: input.serialNumber,
            imei: input.imei,
            color: input.color,
        },
    });

    return device;
};

// Reader
const findById = async (id: string): Promise<DeviceRecord | null> => {
    const prisma = getPrisma();
    return prisma.device.findUnique({ where: { id } });
};

const list = async (input: ListDevicesInput): Promise<DeviceRecord[]> => {
    const prisma = getPrisma();

    const limit = input.options.limit ?? 100;

    return prisma.device.findMany({
        take: limit,
        orderBy: {
            createdAt: "desc",
        },
    });
};

export default {
    // Writer
    create,
    // Reader
    findById,
    list,
};