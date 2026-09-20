import asyncHandler from "../../shared/utils/async.js";
import { badRequest } from "../../shared/errors/errors.js";
import deviceService from "./device.service.js";
import deviceDTO from "./device.dtos.js";

const createDevice = asyncHandler(async (req, res) => {
    const input = deviceDTO.createDeviceDTO(req.body);
    const device = await deviceService.createDevice(input);
    res.status(201).json({
        success: true,
        data: device, // device does not possess any sensitive data, so we can return directly
        message: "Device created successfully",
    });
});

const getDevice = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) throw badRequest({ message: "Device ID is required" });

    const device = await deviceService.getDeviceById(String(id));
    res.status(200).json({
        success: true,
        data: device, 
    });
});

export default {
    createDevice,
    getDevice,
};