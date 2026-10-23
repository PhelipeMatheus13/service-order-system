import {
    CreateServiceOrderInput,
    ServiceOrderRecord,
    ListServiceOrdersInput,
    CancelServiceOrderInput,
    DiagnosisRecord,
    StartDiagnosisInput,
    FindingRecord,
    CreateFindingInput,
    UpdateFindingInput,
    CompleteDiagnosisInput,
    DiagnosisResult,
    ListFidingsByDiagnosisId,
    CreateQuoteInput,
    QuoteRecord,
    CreateQuoteItemInput,
    QuoteItemWithComponents,
    ListQuotesByServiceOrderIdInput,
    ListQuoteItemsByQuoteIdInput,
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

            // atomic guard: only succeeds if the service order is still in WAITING_DIAGNOSIS
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
        // atomic guard: only succeeds if the service order is still in a cancelable status and not already cancelled
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

            // atomic guard: only succeeds if the service order is still in WAITING_DIAGNOSIS
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
                    changedById: input.createdById,
                },
                tx,
            );

            return diagnosis;
        });
    } catch (error) {
        if (isForeignKeyConstraintOn(error, "created_by")) {
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

    try {
        // Atomic guard: only succeeds if the diagnosis is still open and the
        // Diagnosis not completed(completed_at IS NULL) and the service order is in IN_DIAGNOSIS
        const finding = await serviceOrderRepository.createFinding(input);

        if (!finding) {
            throw conflict({ message: "Finding can no longer be created in its current state" });
        }

        return finding;
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

const updateFinding = async (input: UpdateFindingInput): Promise<FindingRecord> => {
    const finding = await serviceOrderRepository.findFindingById(input.findingId);
    if (!finding) {
        throw notFound({ message: "Finding not found" });
    }

    try {
        // Atomic guard: only succeeds if the diagnosis is still open and the
        // Diagnosis not completed(completed_at IS NULL) and the service order is in IN_DIAGNOSIS
        const updated = await serviceOrderRepository.updateFinding(input);

        if (!updated) {
            throw conflict({ message: "Finding can no longer be updated in its current state" });
        }

        return updated;
    } catch (error) {
        if (isForeignKeyConstraintOn(error, "updated_by")) {
            throw unauthorized({
                message: "Authenticated user no longer exists",
                code: "USER_NOT_FOUND",
            });
        }

        throw error;
    }
};

const deleteFinding = async (findingId: string): Promise<void> => {
    const finding = await serviceOrderRepository.findFindingById(findingId);
    if (!finding) {
        throw notFound({ message: "Finding not found" });
    }

    // Atomic guard: only succeeds if the diagnosis is still open and the
    // Diagnosis not completed(completed_at IS NULL) and the service order is in IN_DIAGNOSIS
    const deleted = await serviceOrderRepository.deleteFindingById(findingId);
    if (!deleted) {
        throw conflict({ message: "Finding can no longer be deleted in its current state" });
    }
};

const resolveStatusAfterDiagnosis = (result: DiagnosisResult, repairableFindingsCount: number): ServiceOrderStatus => {
    if (result === DiagnosisResult.FAULT_FOUND && repairableFindingsCount > 0) {
        return ServiceOrderStatus.AWAITING_QUOTE;
    }

    return ServiceOrderStatus.AWAITING_DELIVERY;
};

const completeDiagnosis = async (input: CompleteDiagnosisInput): Promise<DiagnosisRecord> => {
    const diagnosis = await serviceOrderRepository.findDiagnosisById(input.diagnosisId);
    if (!diagnosis) {
        throw notFound({ message: "Diagnosis not found" });
    }

    if (diagnosis.completedAt) {
        throw conflict({ message: "Diagnosis already completed" });
    }

    try {
        return await getPrisma().$transaction(async (tx) => {
            // Only succeeds if the diagnosis is still open and the
            // Diagnosis not completed(completed_at IS NULL)
            const completed = await serviceOrderRepository.completeDiagnosis(input, tx);
            if (!completed) {
                throw conflict({ message: "Diagnosis can no longer be completed in its current state" });
            }

            const repairableCount = await serviceOrderRepository.countRepairableFindings(diagnosis.id, tx);
            const nextStatus = resolveStatusAfterDiagnosis(input.result, repairableCount);

            // Only succeeds if the service order is still in IN_DIAGNOSIS
            const statusUpdated = await serviceOrderRepository.updateServiceOrderStatus(
                {
                    serviceOrderId: diagnosis.serviceOrderId,
                    expectedStatuses: [ServiceOrderStatus.IN_DIAGNOSIS],
                    toStatus: nextStatus,
                },
                tx,
            );

            if (!statusUpdated) {
                throw conflict({ message: "Service order is no longer in diagnosis" });
            }

            await serviceOrderRepository.createServiceOrderStatusHistory(
                {
                    serviceOrderId: diagnosis.serviceOrderId,
                    fromStatus: ServiceOrderStatus.IN_DIAGNOSIS,
                    toStatus: nextStatus,
                    changeSource: "USER",
                    changedById: input.completedById,
                },
                tx,
            );

            return completed;
        });
    } catch (error) {
        if (isForeignKeyConstraintOn(error, "completed_by")) {
            throw unauthorized({
                message: "Authenticated user no longer exists",
                code: "USER_NOT_FOUND",
            });
        }

        throw error;
    }
};

const listFindingsByDiagnosisId = async (input: ListFidingsByDiagnosisId): Promise<FindingRecord[]> => {
    const diagnosis = await serviceOrderRepository.findDiagnosisById(input.diagnosisId);
    if (!diagnosis) {
        throw notFound({ message: "Diagnosis not found" });
    }

    return serviceOrderRepository.listFindingsByDiagnosisId(input);
};

const createQuote = async (input: CreateQuoteInput): Promise<QuoteRecord> => {
    const diagnosis = await serviceOrderRepository.findDiagnosisById(input.diagnosisId);
    if (!diagnosis) {
        throw notFound({ message: "Diagnosis not found" });
    }

    if (diagnosis.serviceOrderId !== input.serviceOrderId) {
        throw conflict({ message: "Diagnosis does not belong to this service order" });
    }

    try {
        // Atomic guard: only succeeds if the service order is still in AWAITING_QUOTE 
        const quote = await serviceOrderRepository.createQuote(input);
        if (!quote) {
            throw conflict({ message: "Service order is no longer awaiting quote" });
        }

        return quote;
    } catch (error) {
        if (isUniqueConstraintOn(error, "service_order_id")) {
            throw conflict({ message: "Service order already has a current quote" });
        }

        if (isForeignKeyConstraintOn(error, "created_by")) {
            throw unauthorized({
                message: "Authenticated user no longer exists",
                code: "USER_NOT_FOUND",
            });
        }

        throw error;
    }
};

const createQuoteItem = async (input: CreateQuoteItemInput): Promise<QuoteItemWithComponents> => {
    const quote = await serviceOrderRepository.findQuoteById(input.quoteId);
    if (!quote) {
        throw notFound({ message: "Quote not found" });
    }

    if (quote.status !== "DRAFT") {
        throw conflict({ message: "Quote is not in DRAFT status" });
    }

    const finding = await serviceOrderRepository.findFindingById(input.findingId);
    if (!finding) {
        throw notFound({ message: "Finding not found" });
    }

    if (finding.diagnosisId !== quote.diagnosisId) {
        throw conflict({ message: "Finding does not belong to this quote's diagnosis" });
    }

    if (!finding.repairable) {
        throw conflict({ message: "Finding is not repairable" });
    }

    try {
        return await getPrisma().$transaction(async (tx) => {
            const locked = await serviceOrderRepository.lockQuoteIfDraft(input.quoteId, tx);
            if (!locked) {
                throw conflict({ message: "Quote is no longer in DRAFT status" });
            }

            return await serviceOrderRepository.createQuoteItem(input, tx);
        });
    } catch (error) {
        if (isForeignKeyConstraintOn(error, "created_by")) {
            throw unauthorized({
                message: "Authenticated user no longer exists",
                code: "USER_NOT_FOUND",
            });
        }

        // Defensive: unreachable through the API flow, covered for out-of-band deletes.
        if (isForeignKeyConstraintOn(error, "finding_id")) {
            throw notFound({ message: "Finding not found" });
        }

        throw error;
    }
};

const getQuoteById = async (id: string): Promise<QuoteRecord> => {
    const quote = await serviceOrderRepository.findQuoteById(id);
    if (!quote) throw notFound({ message: "Quote not found" });
    return quote;
};

const listQuotesByServiceOrderId = async (input: ListQuotesByServiceOrderIdInput): Promise<QuoteRecord[]> => {
    const serviceOrder = await serviceOrderRepository.findById(input.serviceOrderId);
    if (!serviceOrder)  throw notFound({ message: "Service order not found" });
    return serviceOrderRepository.listQuotesByServiceOrderId(input);
};

const getQuoteItemById = async (id: string): Promise<QuoteItemWithComponents> => {
    const QuoteItemWithComponents = await serviceOrderRepository.findQuoteItemById(id);
    if (!QuoteItemWithComponents) throw notFound({ message: "Quote item not found" });
    return QuoteItemWithComponents;
};

const listQuoteItemsByQuoteId = async(input: ListQuoteItemsByQuoteIdInput): Promise<QuoteItemWithComponents[]> => {
    const quote = await serviceOrderRepository.findQuoteById(input.quoteId);
    if (!quote) throw notFound({ message: "Quote not found" });
    return serviceOrderRepository.listQuoteItemsByQuoteId(input);
};

export default {
    createServiceOrder,
    getServiceOrderById,
    listServiceOrders,
    cancelServiceOrder,
    startDiagnosis,
    getDiagnosisById,
    createFinding,
    updateFinding,
    deleteFinding,
    completeDiagnosis,
    resolveStatusAfterDiagnosis,
    listFindingsByDiagnosisId,
    createQuote,
    createQuoteItem,
    getQuoteById,
    listQuotesByServiceOrderId,
    getQuoteItemById,
    listQuoteItemsByQuoteId,
};