import type {
    CreateServiceOrderInput,
    ServiceOrderRecord,
    ListServiceOrdersInput,
    ServiceOrderStatusHistoryRecord,
    CreateServiceOrderStatusHistoryData,
    CancelServiceOrderData,
    StartDiagnosisInput,
    DiagnosisRecord,
    UpdateServiceOrderStatusData
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

const updateServiceOrderStatus = async (input: UpdateServiceOrderStatusData, tx?: Prisma.TransactionClient):  Promise<boolean> => {
    const prisma: PrismaClientOrTx = tx || getPrisma();

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
            performedById: input.performedById,
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


export default {
    // Writer
    create,
    createServiceOrderStatusHistory,
    cancelServiceOrder,
    updateServiceOrderStatus,
    createDiagnosis,
    // Reader
    findById,
    list,
    findDiagnosisById,
};