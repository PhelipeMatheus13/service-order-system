import {
    CustomerRecord,
    CreateCustomerInput,
    UpdateCustomerInput,
    ListCustomersInput,
} from "./customer.types.js";
import { alreadyExists, notFound } from "../../shared/errors/errors.js";
import { isUniqueConstraintOn } from "../../shared/utils/prisma-error.js";
import customerRepository from "./customer.repository.js";

const createCustomer = async (input: CreateCustomerInput): Promise<CustomerRecord> => {
    try {
        return await customerRepository.create(input);
    } catch (error) {
        if (isUniqueConstraintOn(error, "email")) {
            throw alreadyExists({ message: "Email already in use" });
        }
        throw error;
    }
};

const updateCustomer = async (input: UpdateCustomerInput): Promise<CustomerRecord> => {
    let customer: CustomerRecord | null;

    try {
        customer = await customerRepository.update(input);
    } catch (error) {
        if (isUniqueConstraintOn(error, "email")) {
            throw alreadyExists({ message: "Email already in use" });
        }

        throw error;
    }

    if (!customer) {
        throw notFound({ message: "Customer not found" });
    }

    return customer;
};

const getCustomerById = async (id: string): Promise<CustomerRecord> => {
    const customer = await customerRepository.findById(id);
    if (!customer) throw notFound({ message: "Customer not found" });
    return customer;
};

const listCustomers = async (input: ListCustomersInput): Promise<CustomerRecord[]> => {
    return customerRepository.list(input);
};

export default {
    createCustomer,
    updateCustomer,
    getCustomerById,
    listCustomers,
};