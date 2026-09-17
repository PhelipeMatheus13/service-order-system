import { CreateCustomerRequest, UpdateCustomerRequest } from "./customer.schemas.js";
import type { CreateCustomerInput, UpdateCustomerInput } from "./customer.types.js";
import { sanitizePhoneNumber } from "../../shared/utils/phone.js";

const createCustomerDTO = (body: CreateCustomerRequest): CreateCustomerInput => ({
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phoneNumber: sanitizePhoneNumber(body.phoneNumber) as string // already validated by zod schema, so it will never be null
});

const updateCustomerDTO = (body: UpdateCustomerRequest, id: string): UpdateCustomerInput => ({
    customerId: id,
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phoneNumber: sanitizePhoneNumber(body.phoneNumber)
});


export default { createCustomerDTO, updateCustomerDTO };