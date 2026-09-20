import { DeviceRecord, CreateDeviceInput } from "./device.types.js";
import { notFound, alreadyExists } from "../../shared/errors/errors.js";
import { isForeignKeyConstraintOn,isUniqueConstraintOn } from "../../shared/utils/prisma-error.js";
import deviceRepository from "./device.repository.js";

const createDevice = async (input: CreateDeviceInput): Promise<DeviceRecord> => {
    try {
        return await deviceRepository.create(input);
    } catch (error) {
        if (isForeignKeyConstraintOn(error, "customer_id")) {
            throw notFound({ message: "Customer not found" });
        }
        if (isUniqueConstraintOn(error, "serial_number")) {
            throw alreadyExists({ message: "Device with this serial number already exists" });
        }

        if (isUniqueConstraintOn(error, "imei")) {
            throw alreadyExists({ message: "Device with this IMEI already exists" });
        }

        throw error;
    }
};

const getDeviceById = async (id: string): Promise<DeviceRecord> => {
    const device = await deviceRepository.findById(id);
    if (!device) throw notFound({ message: "Device not found" });
    return device;
};

export default {
    createDevice,
    getDeviceById,
};