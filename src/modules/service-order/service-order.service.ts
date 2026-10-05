import {
    CreateServiceOrderInput,
    ServiceOrderRecord,
    ListServiceOrdersInput
} from "./service-order.types.js";
import { getPrisma } from "../../shared/config/database.js";
import { notFound, unauthorized, conflict } from "../../shared/errors/errors.js";
import { isForeignKeyConstraintOn, isUniqueConstraintOn } from "../../shared/utils/prisma-error.js";
import serviceOrderRepository from "./service-order.repository.js";


const createServiceOrder = async (input: CreateServiceOrderInput): Promise<ServiceOrderRecord> => {
    try {
        return await getPrisma().$transaction(async (tx) => {
            const serviceOrder = await serviceOrderRepository.create(input, tx);

            if (!serviceOrder) {
                throw notFound({ message: "Device not found" });
            }

            await serviceOrderRepository.createServiceOrderStatusHistory(
                {
                    serviceOrderId: serviceOrder.id,
                    fromStatus: null,
                    toStatus: "WAITING_DIAGNOSIS",
                    changeSource: "USER",
                    changedById: input.createdById,
                },
                tx,
            );

            return serviceOrder;
        });
    } catch (error) {
        if (isForeignKeyConstraintOn(error, "created_by")) {
            throw unauthorized({
                message: "Authenticated user no longer exists",
                code: "USER_NOT_FOUND",
            });
        }

        if (isUniqueConstraintOn(error, "device_id")) {
            throw conflict({
                message: "This device already has an active service order",
                code: "DEVICE_ALREADY_IN_SERVICE",
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