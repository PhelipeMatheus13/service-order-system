import asyncHandler from "../../shared/utils/async.js";
import { badRequest } from "../../shared/errors/errors.js";
import customerService from "./customer.service.js";
import customerDTO from "./customer.dtos.js";

const createCustomer = asyncHandler(async (req, res) => {
    const input = customerDTO.createCustomerDTO(req.body);
    const customer = await customerService.createCustomer(input);
    res.status(201).json({
        success: true,
        data: customer, // Customer does not possess any sensitive data, so we can return directly
        message: "Customer created successfully",
    });
});


const updateCustomer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) throw badRequest({ message: "Customer ID is required" });

    const input = customerDTO.updateCustomerDTO(req.body, String(id));

    const customer = await customerService.updateCustomer(input);
    res.status(200).json({
        success: true,
        data: customer, 
        message: "Customer updated successfully",
    });
});

const getCustomer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) throw badRequest({ message: "Customer ID is required" });

    const customer = await customerService.getCustomerById(String(id));
    res.status(200).json({
        success: true,
        data: customer, 
    });
});

const listCustomers = asyncHandler(async (req, res) => {
    const limit = req.query.limit
        ? Number(req.query.limit)
        : null;

    const customers = await customerService.listCustomers({
        options: {
            limit,
        },
    });

    res.status(200).json({
        success: true,
        data: customers,
    });
});

export default {
    createCustomer,
    updateCustomer,
    getCustomer,
    listCustomers,
};