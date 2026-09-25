import {
    CreateServiceOrderInput,
    ServiceOrderRecord,
    ListServiceOrdersInput
} from "./service-order.types.js";
import { notFound, unauthorized } from "../../shared/errors/errors.js";
import { isForeignKeyConstraintOn } from "../../shared/utils/prisma-error.js";
import serviceOrderRepository from "./service-order.repository.js";

const createServiceOrder = async (input: CreateServiceOrderInput): Promise<ServiceOrderRecord> => {
    try {
        const serviceOrder = await serviceOrderRepository.create(input);

        if (!serviceOrder) {
            throw notFound({ message: "Device not found" });
        }

        return serviceOrder;
    } catch (error) {
        if (isForeignKeyConstraintOn(error, "created_by")) {
            throw unauthorized({
                message: "Authenticated user no longer exists",
                code: "USER_NOT_FOUND",
            });
        }

        throw error;
    }
};

const getServiceOrderById = async (id: string): Promise<ServiceOrderRecord> => {
    const serviceOrder = await serviceOrderRepository.findById(id);
    if (!serviceOrder) throw notFound({ message: "Service order not found" });
    return serviceOrder;
};

const listServiceOrders = async (input: ListServiceOrdersInput): Promise<ServiceOrderRecord[]> => {
    return serviceOrderRepository.list(input);
};

export default {
    createServiceOrder,
    getServiceOrderById,
    listServiceOrders,
};