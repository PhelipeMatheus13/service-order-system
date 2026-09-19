import { createDeviceRequest } from "./device.schema.js";
import { CreateDeviceInput } from "./device.types.js";

const createDeviceDTO = (body: createDeviceRequest): CreateDeviceInput => ({
    customerId: body.customerId,
    type: body.type,
    brand: body.brand,
    model: body.model,
    color: body.color,
    serialNumber: body.serialNumber,
    imei: body.imei,
});

export default { createDeviceDTO };