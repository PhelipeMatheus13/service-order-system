import { Customer } from "../../generated/prisma/client.js";

interface CreateCustomerInput {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string | null;
}

interface UpdateCustomerInput {
    customerId: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phoneNumber: string | null;
}

interface ListCustomersOption {
    limit: number | null;
}

interface ListCustomersInput {
    options: ListCustomersOption;
}

export type {
    Customer as CustomerRecord,
    CreateCustomerInput,
    UpdateCustomerInput,
    ListCustomersInput
};