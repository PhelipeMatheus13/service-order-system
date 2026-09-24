import asyncHandler from "../../shared/utils/async.js";
import serviceOrderDTO from "./service-order.dtos.js";
import serviceOrderService from "./service-order.service.js";

const CreateServiceOrder = asyncHandler(async (req, res) => {
    const input = serviceOrderDTO.createServiceOrderDTO(req.body, String(req.user?.id));
    const serviceOrder = await serviceOrderService.CreateServiceOrder(input);
    res.status(201).json({
        success: true,
        data: serviceOrder, // service order does not possess any sensitive data, so we can return directly
        message: "service order created successfully",
    });
});

export default {
    CreateServiceOrder,
};