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
    QuoteItemWithComponents,
    CreateQuoteItemInput,
    ListQuotesByServiceOrderIdInput,
    ListFidingsByDiagnosisId,
    ListQuoteItemsByQuoteIdInput
} from "./service-order.types.ts";
import { ServiceOrderStatus } from "./service-order.types.js";
import { getPrisma } from "../../shared/config/database.js";
import { Prisma, PrismaClient } from "../../generated/prisma/client.js";

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

const createQuoteItem = async (input: CreateQuoteItemInput, tx?: Prisma.TransactionClient): Promise<QuoteItemWithComponents> => {
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
}

const listQuoteItemsByQuoteId = async (input: ListQuoteItemsByQuoteIdInput): Promise<QuoteItemWithComponents[]> => {
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
    createQuoteItem,
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
};