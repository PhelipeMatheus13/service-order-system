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


export {
    Device as DeviceRecord,
    CreateDeviceInput,
    ListDevicesInput,
};