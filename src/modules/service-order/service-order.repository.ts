import type {
    CreateServiceOrderInput,
    ServiceOrderRecord,
    ListServiceOrdersInput,
    ServiceOrderStatusHistoryRecord,
    CreateServiceOrderStatusHistoryData,
    CancelServiceOrderData,
    StartDiagnosisInput,
    DiagnosisRecord,
    UpdateServiceOrderStatusData,
    FindingRecord,
    CreateFindingInput,
    UpdateFindingInput,
    CompleteDiagnosisInput,
    QuoteRecord,
    CreateQuoteInput,
    QuoteItemRecord,
    QuoteItemWithComponents,
    CreateQuoteItemAndComponentsInput,
    ListQuotesByServiceOrderIdInput,
    ListFidingsByDiagnosisId,
    ListQuoteItemsWithComponentsByQuoteIdInput,
    UpdateQuoteItemAndComponentsInput,
    UpdateQuoteStatusData,
    RequestQuoteSubmissionInput,
    OutboxQuoteRecord,
    QuoteEmailPayload,
    ListQuoteItemByQuoteId,
    ApplyQuoteItemDecisionsData,
    CreatePreApprovedServiceOrderData,
    CreatePreApprovedQuoteData,
    CreatePreApprovedQuoteItemAndComponentsInput,
} from "./service-order.types.ts";
import { ServiceOrderStatus, QuoteStatus, QuoteItemDecision } from "./service-order.types.js";
import { getPrisma } from "../../shared/config/database.js";
import { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { isNotFoundError } from "../../shared/utils/prisma-error.js";
import { notFound } from "../../shared/errors/errors.js";

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

// Writer
const create = async (input: CreateServiceOrderInput, tx?: Prisma.TransactionClient): Promise<ServiceOrderRecord | null> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();

    // Raw SQL because we need the customer_id to be derived from the device
    // atomically. Prisma's `create` cannot do INSERT...SELECT, and doing a
    // findUnique + create would open a race window. This single statement
    // copies d.customer_id from devices and lets the composite FK validate
    // the pair (device_id, customer_id) at the database level.
    const rows = await prisma.$queryRaw<ServiceOrderRecord[]>`
        INSERT INTO service_orders (device_id, customer_id, reported_problem, created_by)
        SELECT d.id, d.customer_id, ${input.reportedProblem}, ${input.createdById}::uuid
        FROM devices d
        WHERE d.id = ${input.deviceId}::uuid
        RETURNING
            id,
            customer_id      AS "customerId",
            device_id        AS "deviceId",
            reported_problem AS "reportedProblem",
            status,
            created_by       AS "createdBy",
            cancelled_at     AS "cancelledAt",
            cancel_reason    AS "cancelReason",
            finished_at      AS "finishedAt",
            created_at       AS "createdAt",
            updated_at       AS "updatedAt"
    `;

    return rows[0] ?? null;
};

const createServiceOrderStatusHistory = async (input: CreateServiceOrderStatusHistoryData, tx?: Prisma.TransactionClient): Promise<ServiceOrderStatusHistoryRecord> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();
    return prisma.serviceOrderStatusHistory.create({
        data: {
            serviceOrderId: input.serviceOrderId,
            fromStatus: input.fromStatus,
            toStatus: input.toStatus,
            changeSource: input.changeSource,
            changedById: input.changedById
        },
    });
};

const cancelServiceOrder = async (input: CancelServiceOrderData, tx?: Prisma.TransactionClient): Promise<boolean> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();

    // Atomic guard: the UPDATE only succeeds if the current status is one
    // of the expected ones. This prevents concurrent operations from
    // overwriting each other's state transitions.
    const result = await prisma.serviceOrder.updateMany({
        where: {
            id: input.serviceOrderId,
            status: {
                in: [
                    ServiceOrderStatus.WAITING_DIAGNOSIS,
                    ServiceOrderStatus.IN_DIAGNOSIS,
                    ServiceOrderStatus.AWAITING_QUOTE,
                    ServiceOrderStatus.AWAITING_APPROVAL,
                    ServiceOrderStatus.AWAITING_MAINTENANCE,
                ],
            },
            cancelledAt: null, // Prevents double-cancelling the same service order
        },
        data: {
            status: ServiceOrderStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelReason: input.reason,
            updatedAt: new Date(),
        },
    });

    return result.count > 0;
};

const updateServiceOrderStatus = async (input: UpdateServiceOrderStatusData, tx?: Prisma.TransactionClient): Promise<boolean> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();

    // Atomic guard: the UPDATE only succeeds if the current status is one
    // of the expected ones. This prevents concurrent operations from
    // overwriting each other's state transitions.
    const result = await prisma.serviceOrder.updateMany({
        where: {
            id: input.serviceOrderId,
            status: {
                in: input.expectedStatuses,
            },
        },
        data: {
            status: input.toStatus,
            updatedAt: new Date(),
        },
    });

    return result.count > 0;
};

const createDiagnosis = async (input: StartDiagnosisInput, tx?: Prisma.TransactionClient): Promise<DiagnosisRecord> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();
    return prisma.diagnosis.create({
        data: {
            serviceOrderId: input.serviceOrderId,
            createdById: input.createdById,
        },
    });
};

const createFinding = async (input: CreateFindingInput): Promise<FindingRecord | null> => {
    const prisma = getPrisma();

    // Atomic guard: validates the diagnosis and service order state as part
    // of the INSERT, so no race window exists between check and write.
    const rows = await prisma.$queryRaw<FindingRecord[]>`
        INSERT INTO findings (diagnosis_id, created_by, description, repairable)
        SELECT ${input.diagnosisId}::uuid, ${input.createdById}::uuid, ${input.description}, ${input.repairable}
        WHERE EXISTS (
            SELECT 1
            FROM diagnoses d
            JOIN service_orders so ON so.id = d.service_order_id
            WHERE d.id = ${input.diagnosisId}::uuid
              AND d.completed_at IS NULL
              AND so.status = 'IN_DIAGNOSIS'
        )
        RETURNING
            id,
            diagnosis_id AS "diagnosisId",
            description,
            repairable,
            created_at   AS "createdAt",
            created_by   AS "createdById",
            updated_at   AS "updatedAt",
            updated_by   AS "updatedById"
    `;

    return rows[0] ?? null;
};

const updateFinding = async (input: UpdateFindingInput): Promise<FindingRecord | null> => {
    const prisma = getPrisma();
    // Atomic guard: validates the diagnosis and service order state as part
    // of the UPDATE, so no race window exists between check and write.
    const rows = await prisma.$queryRaw<FindingRecord[]>`
        UPDATE findings f
        SET description = ${input.description},
            repairable  = ${input.repairable},
            updated_by  = ${input.updatedById}::uuid,
            updated_at  = NOW()
        FROM diagnoses d
        JOIN service_orders so ON so.id = d.service_order_id
        WHERE f.id = ${input.findingId}::uuid
          AND f.diagnosis_id = d.id
          AND d.completed_at IS NULL
          AND so.status = 'IN_DIAGNOSIS'
        RETURNING
            f.id,
            f.diagnosis_id AS "diagnosisId",
            f.created_by   AS "createdById",
            f.description,
            f.repairable,
            f.created_at   AS "createdAt",
            f.updated_at   AS "updatedAt",
            f.updated_by   AS "updatedById"
    `;

    return rows[0] ?? null;
};

const deleteFindingById = async (id: string): Promise<boolean> => {
    const prisma = getPrisma();

    // Atomic guard: validates the diagnosis and service order state as part
    // of the DELETE, so no race window exists between check and write.
    const rows = await prisma.$queryRaw<{ id: string }[]>`
        DELETE FROM findings f
        USING diagnoses d, service_orders so
        WHERE f.id = ${id}::uuid
          AND f.diagnosis_id = d.id
          AND d.service_order_id = so.id
          AND d.completed_at IS NULL
          AND so.status = 'IN_DIAGNOSIS'
        RETURNING f.id
    `;

    return rows.length > 0;
};

const completeDiagnosis = async (input: CompleteDiagnosisInput, tx?: PrismaClientOrTx): Promise<DiagnosisRecord | null> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();

    // Atomic guard: the UPDATE only succeeds if the diagnosis has not been
    // completed yet (completed_at IS NULL). This prevents two concurrent
    // "complete" requests from both writing a result. No race window exists
    // between check and write because the validation runs as part of the UPDATE.
    const rows = await prisma.$queryRaw<DiagnosisRecord[]>`
        UPDATE diagnoses
        SET result       = ${input.result}::"diagnosis_result_enum",
            completed_by = ${input.completedById}::uuid,
            completed_at = NOW()
        WHERE id = ${input.diagnosisId}::uuid
          AND completed_at IS NULL
        RETURNING
            id,
            service_order_id AS "serviceOrderId",
            created_by       AS "createdById",
            completed_by     AS "completedById",
            result,
            created_at       AS "createdAt",
            completed_at     AS "completedAt"
    `;

    return rows[0] ?? null;
};

const createQuote = async (input: CreateQuoteInput, tx?: Prisma.TransactionClient): Promise<QuoteRecord | null> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();

    // Atomic guard: the INSERT only succeeds if the diagnosis exists, belongs
    // to the service order, and the service order is currently AWAITING_QUOTE.
    // A findUnique + create would leave a window where the status could
    // change between check and write. Same pattern as createFinding.
    const rows = await prisma.$queryRaw<QuoteRecord[]>`
        INSERT INTO quotes (service_order_id, diagnosis_id, created_by)
        SELECT
            ${input.serviceOrderId}::uuid,
            ${input.diagnosisId}::uuid,
            ${input.createdById}::uuid
        WHERE EXISTS (
            SELECT 1
            FROM diagnoses d
            JOIN service_orders so ON so.id = d.service_order_id
            WHERE d.id = ${input.diagnosisId}::uuid
              AND d.service_order_id = ${input.serviceOrderId}::uuid
              AND so.status = 'AWAITING_QUOTE'
        )
        RETURNING
            id,
            service_order_id AS "serviceOrderId",
            diagnosis_id     AS "diagnosisId",
            status,
            submitted_at     AS "submittedAt",
            responded_at     AS "respondedAt",
            created_by       AS "createdById",
            created_at       AS "createdAt",
            updated_at       AS "updatedAt"
    `;

    return rows[0] ?? null;
};

const lockQuoteIfDraft = async (quoteId: string, tx: Prisma.TransactionClient): Promise<boolean> => {
    // UPDATE acquires a row lock. Any concurrent write on this row (e.g.
    // submitQuote) will block until this transaction commits/rolls back.
    // The updatedAt bump is a side effect; the lock is the goal.
    const result = await tx.quote.updateMany({
        where: { id: quoteId, status: "DRAFT" },
        data: { updatedAt: new Date() },
    });

    return result.count > 0;
};

const createQuoteItemAndComponents = async (input: CreateQuoteItemAndComponentsInput, tx?: Prisma.TransactionClient): Promise<QuoteItemWithComponents> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();
    return prisma.quoteItem.create({
        data: {
            quoteId: input.quoteId,
            findingId: input.findingId,
            description: input.description,
            createdById: input.createdById,
            quoteItemComponents: {
                create: input.components.map((component) => ({
                    type: component.type,
                    description: component.description,
                    quantity: component.quantity,
                    unitPrice: component.unitPrice,
                })),
            },
        },
        include: {
            quoteItemComponents: true,
        },
    });
};



const updateQuoteItemAndComponents = async (
    input: UpdateQuoteItemAndComponentsInput,
    tx: Prisma.TransactionClient
): Promise<QuoteItemWithComponents> => {
    // QuoteItem and QuoteItemComponent live in separate tables but are
    // exposed to the API as a single entity. The item and its components
    // must be updated atomically, so the caller (service) opens the
    // transaction and passes the tx down.
    await tx.quoteItem.update({
        where: { id: input.quoteItemId },
        data: {
            ...(input.description !== null && { description: input.description }),
            updatedById: input.updatedById,
            updatedAt: new Date(),
        },
    });

    for (const component of input.components) {
        await tx.quoteItemComponent.update({
            where: { id: component.componentId },
            data: {
                ...(component.type !== null && { type: component.type }),
                ...(component.description !== null && { description: component.description }),
                ...(component.quantity !== null && { quantity: component.quantity }),
                ...(component.unitPrice !== null && { unitPrice: component.unitPrice }),
                updatedAt: new Date(),
            },
        });
    }

    return tx.quoteItem.findUniqueOrThrow({
        where: { id: input.quoteItemId },
        include: { quoteItemComponents: true },
    });
};

const deleteQuoteItemById = async (id: string, tx: Prisma.TransactionClient): Promise<boolean> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();
    try {
        await prisma.quoteItem.delete({ where: { id } });
        return true
    } catch (error) {
        if (isNotFoundError(error)) return false;
        throw error
    }
};

const updateQuoteStatus = async (input: UpdateQuoteStatusData): Promise<boolean> => {
    const prisma = getPrisma();

    // Atomic guard: the UPDATE only succeeds if the current status is one
    // of the expected ones. This prevents concurrent operations from
    // overwriting each other's state transitions.
    const result = await prisma.quote.updateMany({
        where: {
            id: input.quoteId,
            status: {
                in: input.expectedStatuses,
            },
        },
        data: {
            status: input.toStatus,
            updatedAt: new Date(),
        },
    });

    return result.count > 0;
};

const requestQuoteSubmission = async (input: RequestQuoteSubmissionInput): Promise<boolean> => {
    const prisma = getPrisma();

    // Atomic guard: only transitions DRAFT → SUBMISSION_PENDING.
    // submission_requested_by is mandatory here because this is the
    // only flow that records who requested the submission.
    const result = await prisma.quote.updateMany({
        where: {
            id: input.quoteId,
            status: QuoteStatus.DRAFT,
        },
        data: {
            status: QuoteStatus.SUBMISSION_PENDING,
            submissionRequestedById: input.submissionRequestedBy,
            updatedAt: new Date(),
        },
    });

    return result.count > 0;
};

const markOutboxQuoteAsConsumed = async (ids: number[]): Promise<void> => {
    if (ids.length === 0) return;

    const prisma = getPrisma();
    await prisma.outboxQuote.updateMany({
        where: { id: { in: ids } },
        data: { consumedAt: new Date() },
    });
};

const markQuoteSubmittedById = async (id: string, tx: Prisma.TransactionClient): Promise<boolean> => {
    const result = await tx.quote.updateMany({
        where: {
            id,
            status: QuoteStatus.SUBMISSION_PENDING,
            submittedAt: null,
        },
        data: {
            submittedAt: new Date(),
            status: QuoteStatus.SENT,
            updatedAt: new Date(),
        }
    });

    return result.count > 0;
};

const lockServiceOrderIfInStatuses = async (
    serviceOrderId: string,
    allowedStatuses: ServiceOrderStatus[],
    tx: Prisma.TransactionClient
): Promise<ServiceOrderStatus | null> => {
    // Same pattern as lockQuoteIfDraft: the UPDATE acquires the row lock,
    // the WHERE status guard validates, and RETURNING gives the real
    // status (read under lock) for use as fromStatus in the audit history.
    // Raw SQL because updateMany doesn't support RETURNING.
    const rows = await tx.$queryRaw<{ status: ServiceOrderStatus }[]>`
        UPDATE service_orders
        SET updated_at = NOW()
        WHERE id = ${serviceOrderId}::uuid
          AND status::text = ANY(${allowedStatuses}::text[])
        RETURNING status
    `;

    return rows[0]?.status ?? null;
};

const supersedeQuote = async (quoteId: string, tx: Prisma.TransactionClient): Promise<boolean> => {
    const result = await tx.quote.updateMany({
        where: {
            id: quoteId,
            status: {
                in: [QuoteStatus.SENT, QuoteStatus.SUBMISSION_PENDING],
            },
        },
        data: {
            status: QuoteStatus.SUPERSEDED,
            updatedAt: new Date(),
        },
    });

    return result.count > 0;
};

// Returns only the QuoteRecord (v1). The front-end hasn't been built
// yet, so we don't know if a full payload (items + components) will be
// needed here or fetched separately via GET. Revisit when that's clear.
const cloneQuote = async (quoteId: string, revisedById: string, tx: Prisma.TransactionClient): Promise<QuoteRecord> => {
    // Single statement to clone quote, items and components. item_map
    // MATERIALIZED fixes (old_id, new_id) once so both inserts share the
    // same mapping. finding_id can't be used for correlation: it is
    // nullable and not unique per quote.
    const rows = await tx.$queryRaw<QuoteRecord[]>`
        WITH
        item_map AS MATERIALIZED (
            SELECT
                id                AS old_id,
                gen_random_uuid() AS new_id,
                finding_id,
                description
            FROM quote_items
            WHERE quote_id = ${quoteId}::uuid
        ),
        new_quote AS (
            INSERT INTO quotes (
                service_order_id,
                diagnosis_id,
                status,
                created_by,
                created_at
            )
            SELECT
                q.service_order_id,
                q.diagnosis_id,
                'DRAFT',
                ${revisedById}::uuid,
                NOW()
            FROM quotes q
            WHERE q.id = ${quoteId}::uuid
            RETURNING
                id,
                service_order_id AS "serviceOrderId",
                diagnosis_id     AS "diagnosisId",
                status,
                submitted_at     AS "submittedAt",
                responded_at     AS "respondedAt",
                created_by       AS "createdById",
                created_at       AS "createdAt",
                updated_at       AS "updatedAt"
        ),
        new_items AS (
            INSERT INTO quote_items (
                id, quote_id, finding_id, description, decision, created_by, created_at
            )
            SELECT
                im.new_id,
                nq.id,
                im.finding_id,
                im.description,
                'PENDING',
                ${revisedById}::uuid,
                NOW()
            FROM item_map im
            CROSS JOIN new_quote nq
            RETURNING id
        ),
        new_components AS (
            INSERT INTO quote_item_components (
                quote_item_id, type, description, quantity, unit_price, created_at
            )
            SELECT
                im.new_id,
                qic.type,
                qic.description,
                qic.quantity,
                qic.unit_price,
                NOW()
            FROM item_map im
            JOIN quote_item_components qic ON qic.quote_item_id = im.old_id
            RETURNING id
        )
        SELECT * FROM new_quote;
    `;

    // Unreachable in practice: supersedeQuote already hit this id in the
    // same transaction. Throw (not null) so the contract fails loudly.
    if (!rows[0]) {
        throw notFound({ message: "Quote not found" });
    }

    return rows[0];
};

const markQuoteDecided = async (id: string, tx: Prisma.TransactionClient): Promise<boolean> => {
    const result = await tx.quote.updateMany({
        where: {
            id,
            status: QuoteStatus.SENT,
            respondedAt: null,
        },
        data: {
            status: QuoteStatus.DECIDED,
            respondedAt: new Date(),
            updatedAt: new Date(),
        },
    });

    return result.count > 0;
};

const applyQuoteItemDecisions = async (input: ApplyQuoteItemDecisionsData, tx: Prisma.TransactionClient): Promise<boolean> => {
    // quoteId is part of the WHERE on every update so an item id from a
    // different quote can't be silently updated. Returns false if any
    // update matches zero rows — the caller decides what that means.
    for (const d of input.itemDecisions) {
        const result = await tx.quoteItem.updateMany({
            where: { id: d.quoteItemId, quoteId: input.quoteId },
            data: { decision: d.decision, updatedAt: new Date() },
        });

        if (result.count === 0) return false;
    }

    return true;
};

const createPreApproved = async (input: CreatePreApprovedServiceOrderData, tx: Prisma.TransactionClient): Promise<ServiceOrderRecord | null> => {
    // Same rationale as `create`: derive customer_id from the device
    // atomically. The only difference is the initial status — pre-approved
    // service orders skip diagnosis and approval, so they start at
    // AWAITING_QUOTE.
    const rows = await tx.$queryRaw<ServiceOrderRecord[]>`
        INSERT INTO service_orders (device_id, customer_id, reported_problem, status, created_by)
        SELECT d.id, d.customer_id, ${input.reportedProblem}, 'AWAITING_QUOTE', ${input.createdById}::uuid
        FROM devices d
        WHERE d.id = ${input.deviceId}::uuid
        RETURNING
            id,
            customer_id      AS "customerId",
            device_id        AS "deviceId",
            reported_problem AS "reportedProblem",
            status,
            created_by       AS "createdBy",
            cancelled_at     AS "cancelledAt",
            cancel_reason    AS "cancelReason",
            finished_at      AS "finishedAt",
            created_at       AS "createdAt",
            updated_at       AS "updatedAt"
    `;

    return rows[0] ?? null;
};

const createPreApprovedQuote = async (input: CreatePreApprovedQuoteData, tx: Prisma.TransactionClient): Promise<QuoteRecord | null> => {
    const rows = await tx.$queryRaw<QuoteRecord[]>`
        INSERT INTO quotes (service_order_id, diagnosis_id, status, created_by)
        SELECT
            ${input.serviceOrderId}::uuid,
            NULL, -- diagnosis is null in direct flow
            'DRAFT', 
            ${input.createdById}::uuid
        WHERE EXISTS (
            SELECT 1
            FROM service_orders so
            WHERE so.id = ${input.serviceOrderId}::uuid
              AND so.status = 'AWAITING_QUOTE' -- Guarantee that the service order is in the correct state for creating a pre-approved quote
        )
        RETURNING
            id,
            service_order_id AS "serviceOrderId",
            diagnosis_id     AS "diagnosisId",
            status,
            submitted_at     AS "submittedAt",
            responded_at     AS "respondedAt",
            created_by       AS "createdById",
            created_at       AS "createdAt",
            updated_at       AS "updatedAt"
    `;

    return rows[0] ?? null;
};

const createPreApprovedQuoteItemAndComponents = async (
    input: CreatePreApprovedQuoteItemAndComponentsInput,
    tx: Prisma.TransactionClient,
): Promise<QuoteItemWithComponents> => {
    return tx.quoteItem.create({
        data: {
            quoteId: input.quoteId,
            findingId: null, // Pre-approved quote items do not have an associated finding
            description: input.description,
            decision: QuoteItemDecision.APPROVED, // Pre-approved quote items are automatically approved
            createdById: input.createdById,
            quoteItemComponents: {
                create: input.components.map((component) => ({
                    type: component.type,
                    description: component.description,
                    quantity: component.quantity,
                    unitPrice: component.unitPrice,
                })),
            },
        },
        include: {
            quoteItemComponents: true,
        },
    });
};


const finalizePreApprovedQuote = async (
    quoteId: string,
    tx: Prisma.TransactionClient,
): Promise<boolean> => {
    // diagnosis_id = null is the atomic flow guard: only pre-approved
    // quotes (direct flow) can be finalized this way. The EXISTS on
    // quote_items guarantees at least one item atomically with the status
    // transition — closes the window where an item could be deleted
    // between the service-level count and this update.
    const rows = await tx.$queryRaw<{ id: string }[]>`
        UPDATE quotes
        SET status       = 'DECIDED',
            responded_at = NOW(),
            updated_at   = NOW()
        WHERE id = ${quoteId}::uuid
          AND status = 'DRAFT'
          AND diagnosis_id IS NULL
          AND EXISTS (
              SELECT 1
              FROM quote_items qi
              WHERE qi.quote_id = ${quoteId}::uuid
          )
        RETURNING id
    `;

    return rows.length > 0;
};

// Reader
const findById = async (id: string): Promise<ServiceOrderRecord | null> => {
    const prisma = getPrisma();
    return prisma.serviceOrder.findUnique({ where: { id } });
};

const list = async (input: ListServiceOrdersInput): Promise<ServiceOrderRecord[]> => {
    const prisma = getPrisma();

    const limit = input.options.limit ?? 100;

    return prisma.serviceOrder.findMany({
        take: limit,
        orderBy: {
            createdAt: "desc",
        },
    });
};

const findDiagnosisById = async (id: string): Promise<DiagnosisRecord | null> => {
    const prisma = getPrisma();
    return prisma.diagnosis.findUnique({ where: { id } });
};

const findFindingById = async (id: string): Promise<FindingRecord | null> => {
    const prisma = getPrisma();
    return prisma.finding.findUnique({ where: { id } });
};

const countRepairableFindings = async (diagnosisId: string, tx?: PrismaClientOrTx): Promise<number> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();
    return prisma.finding.count({
        where: {
            diagnosisId,
            repairable: true
        }
    });
};

const listFindingsByDiagnosisId = async (input: ListFidingsByDiagnosisId): Promise<FindingRecord[]> => {
    const prisma = getPrisma();
    return prisma.finding.findMany({
        where: {
            diagnosisId: input.diagnosisId,
        },
        orderBy: {
            createdAt: "asc",
        },
    });
};

const findQuoteById = async (id: string): Promise<QuoteRecord | null> => {
    const prisma = getPrisma();
    return prisma.quote.findUnique({ where: { id } });
};

const listQuotesByServiceOrderId = async (input: ListQuotesByServiceOrderIdInput): Promise<QuoteRecord[]> => {
    const prisma: PrismaClientOrTx = getPrisma();
    return prisma.quote.findMany({
        where: {
            serviceOrderId: input.serviceOrderId,
        },
        orderBy: {
            createdAt: "asc",
        },
    });
};

const findQuoteItemById = async (id: string): Promise<QuoteItemWithComponents | null> => {
    const prisma = getPrisma();
    return prisma.quoteItem.findUnique({
        where: { id },
        include: {
            quoteItemComponents: true,
        },
    });
};

const listQuoteItemsByQuoteId = async (input: ListQuoteItemByQuoteId): Promise<QuoteItemRecord[]> => {
    const prisma = getPrisma();
    return prisma.quoteItem.findMany({
        where: { quoteId: input.quoteId },
        orderBy: {
            createdAt: "asc",
        },
    });
};

const listQuoteItemsWithComponentsByQuoteId = async (input: ListQuoteItemsWithComponentsByQuoteIdInput): Promise<QuoteItemWithComponents[]> => {
    const prisma = getPrisma();
    return prisma.quoteItem.findMany({
        where: { quoteId: input.quoteId },
        orderBy: {
            createdAt: "asc",
        },
        include: {
            quoteItemComponents: true,
        },
    });
};

const listOutboxQuoteUnconsumed = async (): Promise<OutboxQuoteRecord[]> => {
    const prisma = getPrisma();
    return prisma.outboxQuote.findMany({
        where: { consumedAt: null },
        orderBy: { createdAt: "asc" },
    });
};

const findQuoteEmailPayloadById = async (quoteId: string): Promise<QuoteEmailPayload | null> => {
    const prisma = getPrisma();

    const rows = await prisma.$queryRaw<Array<{ payload: QuoteEmailPayload }>>`
        SELECT jsonb_build_object(
            'customer', jsonb_build_object(
                'id', c.id,
                'firstName', c.first_name,
                'lastName', c.last_name,
                'email', c.email
            ),
            'device', jsonb_build_object(
                'id', d.id,
                'type', d.type,
                'brand', d.brand,
                'model', d.model,
                'color', d.color,
                'serialNumber', d.serial_number
            ),
            'serviceOrder', jsonb_build_object(
                'id', so.id,
                'reportedProblem', so.reported_problem,
                'status', so.status,
                'diagnosis',
                    CASE
                        WHEN diag.id IS NULL THEN NULL
                        ELSE jsonb_build_object(
                            'id', diag.id,
                            'result', diag.result,
                            'findings', (
                                SELECT COALESCE(
                                    jsonb_agg(
                                        jsonb_build_object(
                                            'id', f.id,
                                            'description', f.description,
                                            'repairable', f.repairable
                                        )
                                        ORDER BY f.created_at
                                    ),
                                    '[]'::jsonb
                                )
                                FROM findings f
                                WHERE f.diagnosis_id = diag.id
                            )
                        )
                    END,
                'quoteItems', (
                    SELECT COALESCE(
                        jsonb_agg(
                            jsonb_build_object(
                                'id', qi.id,
                                'description', qi.description,
                                'findingId', qi.finding_id,
                                'components', (
                                    SELECT COALESCE(
                                        jsonb_agg(
                                            jsonb_build_object(
                                                'id', qic.id,
                                                'type', qic.type,
                                                'description', qic.description,
                                                'quantity', qic.quantity,
                                                'unitPrice', qic.unit_price::text
                                            )
                                            ORDER BY qic.created_at
                                        ),
                                        '[]'::jsonb
                                    )
                                    FROM quote_item_components qic
                                    WHERE qic.quote_item_id = qi.id
                                )
                            )
                            ORDER BY qi.created_at
                        ),
                        '[]'::jsonb
                    )
                    FROM quote_items qi
                    WHERE qi.quote_id = q.id
                )
            )
        ) AS payload
        FROM quotes q
        JOIN service_orders so ON so.id = q.service_order_id
        JOIN devices d ON d.id = so.device_id
        JOIN customers c ON c.id = d.customer_id
        LEFT JOIN diagnoses diag ON diag.id = q.diagnosis_id
        WHERE q.id = ${quoteId}::uuid
    `;

    return rows[0]?.payload ?? null;
};

export default {
    // Writer
    create,
    createServiceOrderStatusHistory,
    cancelServiceOrder,
    updateServiceOrderStatus,
    createDiagnosis,
    createFinding,
    updateFinding,
    deleteFindingById,
    completeDiagnosis,
    createQuote,
    lockQuoteIfDraft,
    createQuoteItemAndComponents,
    updateQuoteItemAndComponents,
    deleteQuoteItemById,
    updateQuoteStatus,
    requestQuoteSubmission,
    markOutboxQuoteAsConsumed,
    markQuoteSubmittedById,
    lockServiceOrderIfInStatuses,
    supersedeQuote,
    cloneQuote,
    markQuoteDecided,
    applyQuoteItemDecisions,
    createPreApproved,
    createPreApprovedQuote,
    createPreApprovedQuoteItemAndComponents,
    // Reader
    findById,
    list,
    findDiagnosisById,
    findFindingById,
    countRepairableFindings,
    listFindingsByDiagnosisId,
    findQuoteById,
    listQuotesByServiceOrderId,
    findQuoteItemById,
    listQuoteItemsByQuoteId,
    listQuoteItemsWithComponentsByQuoteId,
    listOutboxQuoteUnconsumed,
    findQuoteEmailPayloadById,
    finalizePreApprovedQuote,
};