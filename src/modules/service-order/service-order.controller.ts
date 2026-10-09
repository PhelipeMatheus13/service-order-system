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

const cancelServiceOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) throw badRequest({ message: "service order ID is required" });

    const input = serviceOrderDTO.cancelServiceOrderDTO(req.body, String(id), String(req.user?.id));
    
    await serviceOrderService.cancelServiceOrder(input);

    res.status(200).json({
        success: true,
        message: "Service order successfully cancelled",
    });
});

const startDiagnosis = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) throw badRequest({ message: "service order ID is required" });

    const input = serviceOrderDTO.createDiagnosisDTO(String(id), String(req.user?.id));
    
    const diagnosis = await serviceOrderService.startDiagnosis(input);

    res.status(201).json({
        success: true,
        data: diagnosis, // diagnosis does not possess any sensitive data, so we can return directly
        message: "Diagnosis successfully created",
    });
});

const getDiagnosisById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) throw badRequest({ message: "Diagnosis ID is required" });
    const diagnosis = await serviceOrderService.getDiagnosisById(String(id));
    res.status(200).json({
        success: true,
        data: diagnosis,
    });
});

const createFinding = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) throw badRequest({ message: "Diagnosis ID is required" });

    const input = serviceOrderDTO.createFindingDTO(req.body, String(id), String(req.user?.id))

    const finding = await serviceOrderService.createFinding(input);
    res.status(201).json({
        success: true,
        data: finding,  // finding does not possess any sensitive data, so we can return directly
        message: "Finding successfully created",
    });
});

export default {
    createServiceOrder,
    getServiceOrderById,
    listServiceOrders,
    cancelServiceOrder,
    startDiagnosis,
    getDiagnosisById,
    createFinding,
};