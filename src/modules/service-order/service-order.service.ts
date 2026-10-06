import {
    CreateServiceOrderInput,
    ServiceOrderRecord,
    ListServiceOrdersInput,
    CancelServiceOrderInput
} from "./service-order.types.js";
import { ServiceOrderStatus } from "./service-order.types.js";
import { getPrisma } from "../../shared/config/database.js";
import { notFound, unauthorized, conflict } from "../../shared/errors/errors.js";
import { isForeignKeyConstraintOn, isUniqueConstraintOn, isNotFoundError } from "../../shared/utils/prisma-error.js";
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

const cancelableStatuses: ServiceOrderStatus[] = [
    ServiceOrderStatus.WAITING_DIAGNOSIS,
    ServiceOrderStatus.IN_DIAGNOSIS,
    ServiceOrderStatus.AWAITING_QUOTE,
    ServiceOrderStatus.AWAITING_APPROVAL,
    ServiceOrderStatus.AWAITING_MAINTENANCE,
];

const cancelServiceOrder = async (input: CancelServiceOrderInput): Promise<void> => {
    const serviceOrder = await serviceOrderRepository.findById(input.serviceOrderId);

    if (!serviceOrder) {
        throw notFound({ message: "Service order not found" });
    }

    if (serviceOrder.status === ServiceOrderStatus.CANCELLED) {
        throw conflict({ message: "Service order is already cancelled" });
    }

    if (!cancelableStatuses.includes(serviceOrder.status)) {
        throw conflict({ message: "Service order cannot be cancelled in its current status" });
    }

    await getPrisma().$transaction(async (tx) => {
        const cancelled = await serviceOrderRepository.cancelServiceOrder(
            input,
            tx,
        );

        if (!cancelled) {
            throw conflict({ message: "Service order could not be cancelled because its status changed" });
        }

        await serviceOrderRepository.createServiceOrderStatusHistory(
            {
                serviceOrderId: input.serviceOrderId,
                fromStatus: serviceOrder.status,
                toStatus: ServiceOrderStatus.CANCELLED,
                changeSource: "USER",
                changedById: input.cancelById,
            },
            tx,
        );
    });
};


export default {
    createServiceOrder,
    getServiceOrderById,
    listServiceOrders,
    cancelServiceOrder,
};