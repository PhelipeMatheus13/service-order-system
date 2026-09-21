import { 
    DeviceRecord, 
    CreateDeviceInput, 
    ListDevicesInput, 
    UpdateDeviceInput 
} from "./device.types.js";
import { getPrisma } from "../../shared/config/database.js";
import { isNotFoundError } from "../../shared/utils/prisma-error.js";

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

const update = async (input: UpdateDeviceInput): Promise<DeviceRecord | null> => {
    const prisma = getPrisma();

    try {
        return await prisma.device.update({
            where: { id: input.deviceId },
            data: {
                ...(input.type !== null && { type: input.type }),
                ...(input.brand !== null && { brand: input.brand }),
                ...(input.model !== null && { model: input.model }),
                ...(input.color !== null && { color: input.color }),
                ...(input.imei !== null && { imei: input.imei }),
                ...(input.serialNumber !== null && { serialNumber: input.serialNumber }),
                updatedAt: new Date(),
            },
        });
    } catch (error) {
        if (isNotFoundError(error)) return null;
        throw error;
    }
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
    update,
    // Reader
    findById,
    list,
};