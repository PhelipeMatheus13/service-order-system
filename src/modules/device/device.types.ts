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

interface ListDevicesOption {
    limit: number | null;
}

interface ListDevicesInput {
    options: ListDevicesOption;
}

interface UpdateDeviceInput {
    deviceId: string;
    type: string | null;
    brand: string | null;
    model: string | null;
    color: string | null;
    serialNumber: string | null;
    imei: string | null;
}

export {
    Device as DeviceRecord,
    CreateDeviceInput,
    ListDevicesInput,
    UpdateDeviceInput,
};