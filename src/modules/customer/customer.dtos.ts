import { CreateCustomerRequest, UpdateCustomerRequest } from "./customer.schemas.js";
import type { CreateCustomerInput, UpdateCustomerInput } from "./customer.types.js";

const sanitizePhoneNumber = (phone: string | null): string | null => {
    if (!phone) return null;
    return phone.replace(/\D/g, "");
};

const createCustomerDTO = (body: CreateCustomerRequest): CreateCustomerInput => ({
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phoneNumber: sanitizePhoneNumber(body.phoneNumber)
});

const updateCustomerDTO = (body: UpdateCustomerRequest, id: string): UpdateCustomerInput => ({
    customerId: id,
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phoneNumber: sanitizePhoneNumber(body.phoneNumber)
});


export default { createCustomerDTO, updateCustomerDTO };