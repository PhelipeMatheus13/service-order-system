import { Prisma } from "../../generated/prisma/client.js";

/**
 * Shape of `error.meta` when Prisma runs on top of a driver adapter
 * (Prisma 7+). The unique constraint info lives under
 * `driverAdapterError.cause.constraint.fields`, not `meta.target`.
 */
export type PrismaDriverAdapterMeta = {
    driverAdapterError?: {
        cause?: {
            originalCode?: string;
            constraint?: {
                fields?: string[];
                index?: string;
            };
        };
    };
};

/**
 * Checks whether a Prisma error is a unique constraint violation (P2002)
 * on the given field. Works with both legacy (`meta.target`) and
 * driver adapter (`meta.driverAdapterError`) shapes.
 * @param error - The error to check.
 * @param field - The field name to check for unique constraint violation.
 * @returns True if the error is a unique constraint violation on the given field, false otherwise.
 */
const isUniqueConstraintOn = (error: unknown, field: string): boolean => {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;

    const meta = error.meta as PrismaDriverAdapterMeta | undefined;
    const cause = meta?.driverAdapterError?.cause;

    // P2002 → Prisma-managed operations (e.g. prisma.user.create)
    // P2010 → raw queries ($queryRaw) with driver adapter; the original
    //         Postgres code lives under `cause.originalCode`
    const isUnique =
        error.code === "P2002" ||
        (error.code === "P2010" && cause?.originalCode === "23505");

    if (!isUnique) return false;

    const fields = cause?.constraint?.fields;

    return Array.isArray(fields) && fields.includes(field);
};

/**
 * Checks whether a Prisma error is a foreign key violation (P2003)
 * involving the given field. The field is matched against the constraint
 * index name (e.g. `devices_customer_id_fkey` contains `customer_id`).
 * @param error - The error to check.
 * @param field - The field name (snake_case, as declared in the database) to check for foreign key violation.
 * @returns True if the error is a foreign key violation on the given field, false otherwise.
 */
const isForeignKeyConstraintOn = (error: unknown, field: string): boolean => {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;

    const meta = error.meta as PrismaDriverAdapterMeta | undefined;
    const cause = meta?.driverAdapterError?.cause;

    const isFk =
        error.code === "P2003" ||
        (error.code === "P2010" && cause?.originalCode === "23503");

    if (!isFk) return false;

    const index = cause?.constraint?.index;

    return typeof index === "string" && index.includes(field);
};

/**
 * Checks whether a Prisma error is a "record not found" error (P2025).
 * Thrown by `update`, `delete`, and `findUniqueOrThrow` when the target
 * record does not exist.
 */
const isNotFoundError = (error: unknown): boolean => {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
    );
};

export {
    isUniqueConstraintOn,
    isForeignKeyConstraintOn,
    isNotFoundError,
};