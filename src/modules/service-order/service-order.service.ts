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
    CreateQuoteItemAndComponentsInput,
    QuoteItemWithComponents,
    ListQuotesByServiceOrderIdInput,
    ListQuoteItemsWithComponentsByQuoteIdInput,
    RequestQuoteSubmissionInput,
    UpdateQuoteItemAndComponentsInput,
    ReviseQuoteInput,
    QuoteDecisionInput,
    CreatePreApprovedServiceOrderInput,
    CreatePreApprovedServiceOrderResult,
    CreatePreApprovedQuoteItemAndComponentsInput,
    FinalizePreApprovedQuoteInput,
} from "./service-order.types.js";
import { ServiceOrderStatus, QuoteStatus, QuoteItemDecision } from "./service-order.types.js";
import { getPrisma } from "../../shared/config/database.js";
import { internal, notFound, unauthorized, conflict } from "../../shared/errors/errors.js";
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

// TODO: enforce UNIQUE (quote_id, finding_id) on quote_items — multiple items
// per finding is conceptually wrong, tolerated only because superseded quotes coexist.
const createQuoteItemAndComponents = async (input: CreateQuoteItemAndComponentsInput): Promise<QuoteItemWithComponents> => {
    const quote = await serviceOrderRepository.findQuoteById(input.quoteId);
    if (!quote) {
        throw notFound({ message: "Quote not found" });
    }

    if (quote.status !== QuoteStatus.DRAFT) {
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

            return await serviceOrderRepository.createQuoteItemAndComponents(input, tx);
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
    if (!serviceOrder) throw notFound({ message: "Service order not found" });
    return serviceOrderRepository.listQuotesByServiceOrderId(input);
};

const getQuoteItemById = async (id: string): Promise<QuoteItemWithComponents> => {
    const QuoteItemWithComponents = await serviceOrderRepository.findQuoteItemById(id);
    if (!QuoteItemWithComponents) throw notFound({ message: "Quote item not found" });
    return QuoteItemWithComponents;
};

const listQuoteItemsWithComponentsByQuoteId = async (input: ListQuoteItemsWithComponentsByQuoteIdInput): Promise<QuoteItemWithComponents[]> => {
    const quote = await serviceOrderRepository.findQuoteById(input.quoteId);
    if (!quote) throw notFound({ message: "Quote not found" });
    return serviceOrderRepository.listQuoteItemsWithComponentsByQuoteId(input);
};

const updateQuoteItemAndComponents = async (input: UpdateQuoteItemAndComponentsInput): Promise<QuoteItemWithComponents> => {
    const quoteItem = await serviceOrderRepository.findQuoteItemById(input.quoteItemId);
    if (!quoteItem) {
        throw notFound({ message: "Quote item not found" });
    }

    const quote = await serviceOrderRepository.findQuoteById(quoteItem.quoteId);
    if (!quote) {
        throw notFound({ message: "Quote not found" });
    }

    if (quote.status !== QuoteStatus.DRAFT) {
        throw conflict({ message: "Quote is not in DRAFT status" });
    }

    try {
        return await getPrisma().$transaction(async (tx) => {
            const locked = await serviceOrderRepository.lockQuoteIfDraft(quote.id, tx);
            if (!locked) {
                throw conflict({ message: "Quote is no longer in DRAFT status" });
            }

            return await serviceOrderRepository.updateQuoteItemAndComponents(input, tx);
        });
    } catch (error) {
        if (isForeignKeyConstraintOn(error, "updated_by")) {
            throw unauthorized({
                message: "Authenticated user no longer exists",
                code: "USER_NOT_FOUND",
            });
        }

        if (isNotFoundError(error)) {
            // Component or item deleted between the read and the update.
            throw notFound({ message: "Quote item or component not found" });
        }

        throw error;
    }
};

const deleteQuoteItem = async (quoteItemId: string): Promise<void> => {
    const quoteItem = await serviceOrderRepository.findQuoteItemById(quoteItemId);
    if (!quoteItem) {
        throw notFound({ message: "Quote item not found" });
    }

    return await getPrisma().$transaction(async (tx) => {
        const locked = await serviceOrderRepository.lockQuoteIfDraft(quoteItem.quoteId, tx);
        if (!locked) {
            throw conflict({ message: "Quote is no longer in DRAFT status" });
        }

        const deleted = await serviceOrderRepository.deleteQuoteItemById(quoteItemId, tx);
        if (!deleted) {
            // Race condition: Item was deleted by another request between the pre-check and the delete.
            throw notFound({ message: "Quote item not found" });
        }
    });
};

const requestQuoteSubmission = async (input: RequestQuoteSubmissionInput): Promise<void> => {
    const quote = await serviceOrderRepository.findQuoteById(input.quoteId);
    if (!quote) {
        throw notFound({ message: "Quote not found" });
    }

    if (quote.status !== QuoteStatus.DRAFT) {
        throw conflict({ message: "Quote is not in DRAFT status" });
    }

    const updated = await serviceOrderRepository.requestQuoteSubmission(input);

    if (!updated) {
        throw conflict({ message: "Quote is no longer in DRAFT status" });
    }
};

const reviseQuote = async (input: ReviseQuoteInput): Promise<QuoteRecord> => {
    const quote = await serviceOrderRepository.findQuoteById(input.quoteId);
    if (!quote) {
        throw notFound({ message: "Quote not found" });
    }

    if (quote.status !== QuoteStatus.SUBMISSION_PENDING && quote.status !== QuoteStatus.SENT) {
        throw conflict({ message: "Quote is not in a valid status for revision" });
    }

    const serviceOrder = await serviceOrderRepository.findById(quote.serviceOrderId);
    if (!serviceOrder) {
        throw notFound({ message: "Service order not found" });
    }

    if (serviceOrder.status !== ServiceOrderStatus.AWAITING_QUOTE && serviceOrder.status !== ServiceOrderStatus.AWAITING_APPROVAL) {
        throw conflict({ message: "Service order is not in a valid status for quote revision" });
    }

    // TODO: consider adding try catch to cover error scenarios in the prisma 
    return await getPrisma().$transaction(async (tx) => {
        const suspended = await serviceOrderRepository.supersedeQuote(input.quoteId, tx);
        if (!suspended) {
            throw conflict({ message: "Quote is no longer in a valid status for revision" });
        }

        const newQuote = await serviceOrderRepository.cloneQuote(input.quoteId, input.revisedById, tx);

        // Lock the SO and read its real status under lock. Fixes the stale
        // fromStatus: even if the subscriber transitioned the SO between
        // the pre-check and now, we read what's actually there.
        const fromStatus = await serviceOrderRepository.lockServiceOrderIfInStatuses(
            serviceOrder.id,
            [ServiceOrderStatus.AWAITING_QUOTE, ServiceOrderStatus.AWAITING_APPROVAL],
            tx,
        );

        if (!fromStatus) {
            throw conflict({ message: "Service order is no longer available for quote revision" });
        }

        if (fromStatus === ServiceOrderStatus.AWAITING_QUOTE) {
            return newQuote
        }

        // atomic guard: only succeeds if the service order is still in one
        // of the statuses accepted for revision (held under lock).
        const statusUpdated = await serviceOrderRepository.updateServiceOrderStatus(
            {
                serviceOrderId: serviceOrder.id,
                expectedStatuses: [fromStatus],
                toStatus: ServiceOrderStatus.AWAITING_QUOTE,
            },
            tx,
        );

        if (!statusUpdated) {
            throw conflict({ message: "Service order is no longer available for quote revision" });
        }

        await serviceOrderRepository.createServiceOrderStatusHistory(
            {
                serviceOrderId: serviceOrder.id,
                fromStatus,
                toStatus: ServiceOrderStatus.AWAITING_QUOTE,
                changeSource: "USER",
                changedById: input.revisedById,
            },
            tx,
        );

        return newQuote;
    });
};

const quoteDecision = async (input: QuoteDecisionInput): Promise<void> => {
    const quote = await serviceOrderRepository.findQuoteById(input.quoteId);
    if (!quote) {
        throw notFound({ message: "Quote not found" });
    }

    if (quote.status !== QuoteStatus.SENT) {
        throw conflict({ message: "Quote is not in a valid status for decision" });
    }

    const serviceOrder = await serviceOrderRepository.findById(quote.serviceOrderId);
    if (!serviceOrder) {
        throw notFound({ message: "Service order not found" });
    }

    if (serviceOrder.status !== ServiceOrderStatus.AWAITING_APPROVAL) {
        throw conflict({ message: "Service order is not in a valid status for quote decision" });
    }

    const quoteItems = await serviceOrderRepository.listQuoteItemsByQuoteId({
        quoteId: quote.id,
    });

    // get the IDs persisted in the database and generate an array containing only those IDs
    const persistedIds = new Set(quoteItems.map((i) => i.id));
    // get the IDs from the input payload and generate an array containing only those IDs
    const payloadIds = new Set(input.itemDecisions.map((i) => i.quoteItemId));

    // eliminate duplicates in the payload
    if (payloadIds.size !== input.itemDecisions.length) {
        throw conflict({ message: "Payload contains duplicate quote item ids" });
    }

    // check if the payload contains all the persisted IDs
    const missingIds = quoteItems.filter((i) => !payloadIds.has(i.id)).map((i) => i.id);
    // check if the payload contains any unknown IDs
    const unknownIds = input.itemDecisions.filter((i) => !persistedIds.has(i.quoteItemId)).map((i) => i.quoteItemId);

    // If there are any missing or unknown IDs, throw a conflict error
    if (missingIds.length > 0 || unknownIds.length > 0) {
        throw conflict({
            message: "Payload must include a decision for every quote item and no unknown ids",
            details: {
                missingIds,
                unknownIds,
            },
        });
    }

    const approvedCount = input.itemDecisions.filter(
        (i) => i.decision === QuoteItemDecision.APPROVED,
    ).length;

    const nextServiceOrderStatus = approvedCount > 0
        ? ServiceOrderStatus.AWAITING_MAINTENANCE
        : ServiceOrderStatus.AWAITING_DELIVERY;

    try {
        return await getPrisma().$transaction(async (tx) => {
            const decided = await serviceOrderRepository.markQuoteDecided(quote.id, tx);
            if (!decided) {
                throw conflict({ message: "Quote is no longer in a valid status for decision" });
            }

            const applied = await serviceOrderRepository.applyQuoteItemDecisions(input, tx);
            if (!applied) {
                throw conflict({ message: "Quote item state changed during decision" });
            }

            const statusUpdated = await serviceOrderRepository.updateServiceOrderStatus(
                {
                    serviceOrderId: serviceOrder.id,
                    expectedStatuses: [ServiceOrderStatus.AWAITING_APPROVAL],
                    toStatus: nextServiceOrderStatus,
                },
                tx,
            );

            if (!statusUpdated) {
                throw conflict({ message: "Service order is no longer in a valid status for quote decision" });
            }

            await serviceOrderRepository.createServiceOrderStatusHistory(
                {
                    serviceOrderId: serviceOrder.id,
                    fromStatus: ServiceOrderStatus.AWAITING_APPROVAL,
                    toStatus: nextServiceOrderStatus,
                    changeSource: "USER", // V1: initially a decision must be made by a user "ATENDANT" or "ADMIN".
                    changedById: input.decisionRegisteredById,
                },
                tx,
            );
        });
    } catch (error) {
        if (isForeignKeyConstraintOn(error, "changed_by")) {
            throw unauthorized({
                message: "Authenticated user no longer exists",
                code: "USER_NOT_FOUND",
            });
        }

        throw error;
    }
};

const createPreApprovedServiceOrder = async (input: CreatePreApprovedServiceOrderInput): Promise<CreatePreApprovedServiceOrderResult> => {
    try {
        return await getPrisma().$transaction(async (tx) => {
            const serviceOrder = await serviceOrderRepository.createPreApproved(
                {
                    deviceId: input.deviceId,
                    reportedProblem: input.reportedProblem,
                    createdById: input.createdById,
                },
                tx,
            );

            if (!serviceOrder) {
                throw notFound({ message: "Device not found" });
            }

            await serviceOrderRepository.createServiceOrderStatusHistory(
                {
                    serviceOrderId: serviceOrder.id,
                    fromStatus: null,
                    toStatus: ServiceOrderStatus.AWAITING_QUOTE,
                    changeSource: "USER",
                    changedById: input.createdById,
                },
                tx,
            );

            const quote = await serviceOrderRepository.createPreApprovedQuote(
                {
                    serviceOrderId: serviceOrder.id,
                    createdById: input.createdById,
                },
                tx,
            );

            if (!quote) {
                throw internal({ message: "Pre-approved quote could not be created" });
            }

            return { serviceOrder, quote };
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

const createPreApprovedQuoteItemAndComponents = async (input: CreatePreApprovedQuoteItemAndComponentsInput): Promise<QuoteItemWithComponents> => {
    const quote = await serviceOrderRepository.findQuoteById(input.quoteId);
    if (!quote) {
        throw notFound({ message: "Quote not found" });
    }

    if (quote.status !== QuoteStatus.DRAFT) {
        throw conflict({ message: "Quote is not in DRAFT status" });
    }

    // diagnosis_id is the flow discriminator: createQuote always sets it,
    // createPreApprovedQuote always leaves it null. So a null diagnosis
    // here means this quote belongs to the pre-approved flow — reject
    // otherwise, or this route could inject APPROVED items into a standard
    // quote before the customer decides.
    if (quote.diagnosisId !== null) {
        throw conflict({ message: "Pre-approved quote should not have a diagnosis" });
    }

    try {
        return await getPrisma().$transaction(async (tx) => {
            const locked = await serviceOrderRepository.lockQuoteIfDraft(input.quoteId, tx);
            if (!locked) {
                throw conflict({ message: "Quote is no longer in DRAFT status" });
            }

            return await serviceOrderRepository.createPreApprovedQuoteItemAndComponents(input, tx);
        });
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

const finalizePreApprovedQuote = async (input: FinalizePreApprovedQuoteInput): Promise<void> => {
    const quote = await serviceOrderRepository.findQuoteById(input.quoteId);
    if (!quote) {
        throw notFound({ message: "Quote not found" });
    }

    if (quote.status !== QuoteStatus.DRAFT) {
        throw conflict({ message: "Quote is not in DRAFT status" });
    }

    if (quote.diagnosisId !== null) {
        throw conflict({ message: "Pre-approved quote should not have a diagnosis" });
    }

    const serviceOrder = await serviceOrderRepository.findById(quote.serviceOrderId);
    if (!serviceOrder) {
        throw notFound({ message: "Service order not found" });
    }

    if (serviceOrder.status !== ServiceOrderStatus.AWAITING_QUOTE) {
        throw conflict({ message: "Service order is not in AWAITING_QUOTE status" });
    }

    const quoteItems = await serviceOrderRepository.listQuoteItemsByQuoteId({
        quoteId: quote.id,
    });

    if (quoteItems.length === 0) {
        throw conflict({ message: "Quote must have at least one item to be finalized" });
    }

    const allApproved = quoteItems.every((item) => item.decision === QuoteItemDecision.APPROVED);
    if (!allApproved) {
        throw conflict({ message: "All quote items must be approved to finalize" });
    }

    try {
        return await getPrisma().$transaction(async (tx) => {
            const finalized = await serviceOrderRepository.finalizePreApprovedQuote(quote.id, tx);
            if (!finalized) {
                throw conflict({ message: "Quote is no longer in a valid status for finalization" });
            }

            const statusUpdated = await serviceOrderRepository.updateServiceOrderStatus(
                {
                    serviceOrderId: serviceOrder.id,
                    expectedStatuses: [ServiceOrderStatus.AWAITING_QUOTE],
                    toStatus: ServiceOrderStatus.AWAITING_MAINTENANCE,
                },
                tx,
            );

            if (!statusUpdated) {
                throw conflict({ message: "Service order is no longer in a valid status for finalization" });
            }

            await serviceOrderRepository.createServiceOrderStatusHistory(
                {
                    serviceOrderId: serviceOrder.id,
                    fromStatus: ServiceOrderStatus.AWAITING_QUOTE,
                    toStatus: ServiceOrderStatus.AWAITING_MAINTENANCE,
                    changeSource: "USER",
                    changedById: input.finalizedById,
                },
                tx,
            );
        });
    } catch (error) {
        if (isForeignKeyConstraintOn(error, "changed_by")) {
            throw unauthorized({
                message: "Authenticated user no longer exists",
                code: "USER_NOT_FOUND",
            });
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
    updateFinding,
    deleteFinding,
    completeDiagnosis,
    resolveStatusAfterDiagnosis,
    listFindingsByDiagnosisId,
    createQuote,
    createQuoteItemAndComponents,
    getQuoteById,
    listQuotesByServiceOrderId,
    getQuoteItemById,
    listQuoteItemsWithComponentsByQuoteId,
    updateQuoteItemAndComponents,
    deleteQuoteItem,
    requestQuoteSubmission,
    reviseQuote,
    quoteDecision,
    createPreApprovedServiceOrder,
    createPreApprovedQuoteItemAndComponents,
    finalizePreApprovedQuote,
};