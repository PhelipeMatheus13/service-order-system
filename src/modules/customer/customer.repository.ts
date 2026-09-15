import type { 
    CustomerRecord, 
    CreateCustomerInput, 
    UpdateCustomerInput, 
    ListCustomersInput,
} from "./customer.types.js";
import { getPrisma } from "../../shared/config/database.js";

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

    const customer = await prisma.customer.update({
        where: { id: input.customerId },
        data: {
            ...(input.firstName !== null && {
                firstName: input.firstName,
            }),
            ...(input.lastName !== null && {
                lastName: input.lastName,
            }),
            ...(input.email !== null && {
                email: input.email,
            }),
            ...(input.phoneNumber !== null && {
                phoneNumber: input.phoneNumber,
            }),
            updatedAt: new Date(),
        },
    });

    return customer;
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

const existsByEmail = async (email: string): Promise<boolean> => {
    const prisma = getPrisma();
    const customer = await prisma.customer.findUnique({ where: { email } });

    return !!customer;
};

export default {
    // Writer
    create,
    update,
    // Reader
    findById,
    list,
    existsByEmail
};