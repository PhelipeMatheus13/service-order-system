import {
    CustomerRecord,
    CreateCustomerInput,
    UpdateCustomerInput,
    ListCustomersInput,
} from "./customer.types.js";
import { alreadyExists, notFound } from "../../shared/errors/errors.js";
import customerRepository from "./customer.repository.js";

const createCustomer = async (input: CreateCustomerInput): Promise<CustomerRecord> => {
    const exists = await customerRepository.existsByEmail(input.email);
    if (exists) throw alreadyExists({ message: "Email already in use" });

    return customerRepository.create(input);
};

const updateCustomer = async (input: UpdateCustomerInput): Promise<CustomerRecord> => {
    const customer = await customerRepository.update(input);

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