import { Prisma } from "../../generated/prisma/client.js";

/**
 * Shape of `error.meta` when Prisma runs on top of a driver adapter
 * (Prisma 7+). The unique constraint info lives under
 * `driverAdapterError.cause.constraint.fields`, not `meta.target`.
 */
export type PrismaDriverAdapterMeta = {
    driverAdapterError?: {
        cause?: {
            constraint?: {
                fields?: string[];
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
    if (error.code !== "P2002") return false;

    // Prisma 7+ with driver adapter
    const meta = error.meta as PrismaDriverAdapterMeta | undefined;
    const fields = meta?.driverAdapterError?.cause?.constraint?.fields;

    return Array.isArray(fields) && fields.includes(field);
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
    isNotFoundError,
}