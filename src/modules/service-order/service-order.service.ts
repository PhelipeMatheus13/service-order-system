import {
    CreateServiceOrderInput,
    ServiceOrderRecord,
    ListServiceOrdersInput,
    CancelServiceOrderInput,
    DiagnosisRecord,
    StartDiagnosisInput,
    FindingRecord,
    CreateFindingInput
} from "./service-order.types.js";
import { ServiceOrderStatus } from "./service-order.types.js";
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
                    toStatus: ServiceOrderStatus.WAITING_DIAGNOSIS,
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

    if (serviceOrder.cancelledAt) {
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

const startDiagnosis = async (input: StartDiagnosisInput): Promise<DiagnosisRecord> => {
    const serviceOrder = await serviceOrderRepository.findById(input.serviceOrderId);

    if (!serviceOrder) {
        throw notFound({ message: "Service order not found" });
    }

    if (serviceOrder.status !== ServiceOrderStatus.WAITING_DIAGNOSIS) {
        throw conflict({
            message: "Service order is not waiting for diagnosis",
        });
    }

    try {
        return await getPrisma().$transaction(async (tx) => {
            const diagnosis = await serviceOrderRepository.createDiagnosis(input, tx);

            const statusUpdated = await serviceOrderRepository.updateServiceOrderStatus(
                {
                    serviceOrderId: input.serviceOrderId,
                    expectedStatuses: [ServiceOrderStatus.WAITING_DIAGNOSIS],
                    toStatus: ServiceOrderStatus.IN_DIAGNOSIS,
                },
                tx,
            );

            if (!statusUpdated) {
                throw conflict({
                    message: "Service order is no longer available to start diagnosis",
                });
            }

            await serviceOrderRepository.createServiceOrderStatusHistory(
                {
                    serviceOrderId: input.serviceOrderId,
                    fromStatus: ServiceOrderStatus.WAITING_DIAGNOSIS,
                    toStatus: ServiceOrderStatus.IN_DIAGNOSIS,
                    changeSource: "USER",
                    changedById: input.performedById,
                },
                tx,
            );

            return diagnosis;
        });
    } catch (error) {
        if (isForeignKeyConstraintOn(error, "performed_by")) {
            throw unauthorized({
                message: "Authenticated user no longer exists",
                code: "USER_NOT_FOUND",
            });
        }

        if (isForeignKeyConstraintOn(error, "service_order_id")) {
            throw notFound({
                message: "Service order not found",
            });
        }

        if (isUniqueConstraintOn(error, "service_order_id")) {
            throw conflict({
                message: "A diagnosis already exists for this service order",
            });
        }

        throw error;
    }
};

const getDiagnosisById = async (id: string): Promise<DiagnosisRecord> => {
    const diagnosis = await serviceOrderRepository.findDiagnosisById(id);
    if (!diagnosis) throw notFound({ message: "Diagnosis not found" });
    return diagnosis;
};

const createFinding = async (input: CreateFindingInput): Promise<FindingRecord> => {
    const diagnosis = await serviceOrderRepository.findDiagnosisById(input.diagnosisId);
    if (!diagnosis) {
        throw notFound({ message: "Diagnosis not found" });
    }

    if (diagnosis.completedAt) {
        throw conflict({ message: "Diagnosis already completed" });
    }

    const serviceOrder = await serviceOrderRepository.findById(diagnosis.serviceOrderId);
    // The FK guarantees a diagnosis always has a service order. This check
    // exists only to narrow the type from `ServiceOrderRecord | null` to `ServiceOrderRecord` for the compiler.
    if (!serviceOrder) {
        throw notFound({ message: "Service order not found" });
    }

    if (serviceOrder?.status !== ServiceOrderStatus.IN_DIAGNOSIS) {
        throw conflict({ message: "Service order is not in diagnosis" });
    }

    try {
        const finding = await serviceOrderRepository.createFinding(input);

        if (!finding) {
            throw conflict({ message: "Diagnosis state changed, cannot create finding" });
        }

        return finding;
    } catch (error) {
        if (isForeignKeyConstraintOn(error, "created_by")) {
            throw unauthorized({ message: "Authenticated user no longer exists" });
        }

        if (isForeignKeyConstraintOn(error, "diagnosis_id")) {
            throw notFound({ message: "Diagnosis not found" });
        }

        throw error;
    }
};


export default {
    createServiceOrder,
    getServiceOrderById,
    listServiceOrders,
    cancelServiceOrder,
    startDiagnosis,
    getDiagnosisById,
    createFinding,
};