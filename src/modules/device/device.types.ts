import { Device } from "../../generated/prisma/client.js";

interface CreateDeviceInput {
    customerId: string;
    type: string;
    brand: string;
    model: string;
    color: string;
    serialNumber: string | null;
    imei: string | null;
}

export {
    Device as DeviceRecord,
    CreateDeviceInput,
};