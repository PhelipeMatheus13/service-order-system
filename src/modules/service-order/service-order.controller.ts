import asyncHandler from "../../shared/utils/async.js";
import { badRequest } from "../../shared/errors/errors.js";
import serviceOrderDTO from "./service-order.dtos.js";
import serviceOrderService from "./service-order.service.js";

const createServiceOrder = asyncHandler(async (req, res) => {
    const input = serviceOrderDTO.createServiceOrderDTO(req.body, String(req.user?.id));
    const serviceOrder = await serviceOrderService.createServiceOrder(input);
    res.status(201).json({
        success: true,
        data: serviceOrder, // service order does not possess any sensitive data, so we can return directly
        message: "Service order created successfully",
    });
});

const getServiceOrderById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) throw badRequest({ message: "Service order ID is required" });
    const serviceOrder = await serviceOrderService.getServiceOrderById(String(id));
    res.status(200).json({
        success: true,
        data: serviceOrder,
    });
});

const listServiceOrders = asyncHandler(async (req, res) => {
    const limit = req.query.limit
        ? Number(req.query.limit)
        : null;

    const serviceOrders = await serviceOrderService.listServiceOrders({
        options: {
            limit,
        },
    });

    res.status(200).json({
        success: true,
        data: serviceOrders,
    });
}); 

export default {
    createServiceOrder,
    getServiceOrderById,
    listServiceOrders,
};