import type { CreateServiceOrderInput, ServiceOrderRecord } from "./service-order.types.ts";
import { getPrisma } from "../../shared/config/database.js";

// Writer
const create = async (input: CreateServiceOrderInput): Promise<ServiceOrderRecord | null> => {
    const prisma = getPrisma();

    const rows = await prisma.$queryRaw<ServiceOrderRecord[]>`
        INSERT INTO service_orders (device_id, customer_id, reported_problem, created_by)
        SELECT d.id, d.customer_id, ${input.reportedProblem}, ${input.createdBy}::uuid
        FROM devices d
        WHERE d.id = ${input.deviceId}::uuid
        RETURNING
            id,
            customer_id      AS "customerId",
            device_id        AS "deviceId",
            reported_problem AS "reportedProblem",
            status,
            created_by       AS "createdBy",
            created_at       AS "createdAt",
            updated_at       AS "updatedAt"
    `;

    return rows[0] ?? null;
};


export default {
    // Writer
    create,
};