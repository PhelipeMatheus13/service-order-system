import { createDeviceRequest, updateDeviceRequest } from "./device.schemas.js";
import { CreateDeviceInput, UpdateDeviceInput } from "./device.types.js";

const createDeviceDTO = (body: createDeviceRequest): CreateDeviceInput => ({
    customerId: body.customerId,
    type: body.type,
    brand: body.brand,
    model: body.model,
    color: body.color,
    serialNumber: body.serialNumber,
    imei: body.imei,
});

const updateDeviceDTO = (body: updateDeviceRequest, id: string): UpdateDeviceInput => ({
    deviceId: id,
    type: body.type,
    brand: body.brand,
    model: body.model,
    color: body.color,
    serialNumber: body.serialNumber,
    imei: body.imei,
});

export default { createDeviceDTO, updateDeviceDTO };