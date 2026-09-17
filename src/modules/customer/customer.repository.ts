import type {
    CustomerRecord,
    CreateCustomerInput,
    UpdateCustomerInput,
    ListCustomersInput,
} from "./customer.types.js";
import { getPrisma } from "../../shared/config/database.js";
import { isNotFoundError } from "../../shared/utils/prisma-error.js";

// Writer
const create = async (input: CreateCustomerInput): Promise<CustomerRecord> => {
    const prisma = getPrisma();
    const customer = await prisma.customer.create({
        data: {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phoneNumber: input.phoneNumber,
        },
    });

    return customer;
};

const update = async (input: UpdateCustomerInput): Promise<CustomerRecord | null> => {
    const prisma = getPrisma();

    try {
        return await prisma.customer.update({
            where: { id: input.customerId },
            data: {
                ...(input.firstName !== null && { firstName: input.firstName }),
                ...(input.lastName !== null && { lastName: input.lastName }),
                ...(input.email !== null && { email: input.email }),
                ...(input.phoneNumber !== null && { phoneNumber: input.phoneNumber }),
                updatedAt: new Date(),
            },
        });
    } catch (error) {
        if (isNotFoundError(error)) return null;
        throw error;
    }
};

// Reader
const findById = async (id: string): Promise<CustomerRecord | null> => {
    const prisma = getPrisma();
    return prisma.customer.findUnique({ where: { id } });
};

const list = async (input: ListCustomersInput): Promise<CustomerRecord[]> => {
    const prisma = getPrisma();

    const limit = input.options.limit ?? 100;

    return prisma.customer.findMany({
        take: limit,
        orderBy: {
            createdAt: "desc",
        },
    });
};

export default {
    // Writer
    create,
    update,
    // Reader
    findById,
    list,
};