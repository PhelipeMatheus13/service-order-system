import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    CreateCustomerInput,
    UpdateCustomerInput,
    CustomerRecord,
    ListCustomersInput,
} from "../../../../src/modules/customer/customer.types.js";
import customerService from "../../../../src/modules/customer/customer.service.js";

// Mock dependencies
import customerRepository from "../../../../src/modules/customer/customer.repository.js";

vi.mock("../../../../src/modules/customer/customer.repository.js");

describe("Customer Service (Unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createCustomer", () => {
        const validInput: CreateCustomerInput = {
            firstName: "John",
            lastName: "Doe",
            email: "johndoe@hotmail.com",
            phoneNumber: "21988887777",
        };

        it("should throw if fail in customerRepository.existsByEmail ", async () => {
            vi.mocked(customerRepository).existsByEmail.mockRejectedValue(new Error("fake error"));

            await expect(customerService.createCustomer(validInput))
                .rejects.toThrow("fake error");
        });

        it("should throw if email already exists ", async () => {
            vi.mocked(customerRepository).existsByEmail.mockResolvedValue(true);

            await expect(customerService.createCustomer(validInput))
                .rejects.toMatchObject({
                    statusCode: 409,
                    code: "ALREADY_EXISTS",
                    message: "Email already in use",
                });
        });

        it("should throw if fail in customerRepository.create", async () => {
            vi.mocked(customerRepository).existsByEmail.mockResolvedValue(false);
            vi.mocked(customerRepository).create.mockRejectedValue(new Error("fake error"));

            await expect(customerService.createCustomer(validInput))
                .rejects.toThrow("fake error");
        });

        it("should create customer successfully", async () => {
            vi.mocked(customerRepository).existsByEmail.mockResolvedValue(false);

            const mockUserRecord = {
                id: "uuid-123",
                firstName: validInput.firstName,
                lastName: validInput.lastName,
                phoneNumber: validInput.phoneNumber,
                email: validInput.email,
                createdAt: new Date(),
                updatedAt: null,
            } as CustomerRecord;

            vi.mocked(customerRepository).create.mockResolvedValue(mockUserRecord);

            const result = await customerService.createCustomer(validInput);

            expect(customerRepository.existsByEmail).toHaveBeenCalledWith(validInput.email);
            expect(customerRepository.create).toHaveBeenCalledWith(validInput);

            expect(result).toBe(mockUserRecord);
        });
    });

    describe("updateCustomer", () => {
        const validInput: UpdateCustomerInput = {
            customerId: "uuid-123",
            firstName: null,
            lastName: null,
            email: "johndoe10@hotmail.com",
            phoneNumber: null,
        };

        it("should throw if fail in customerRepository.update", async () => {
            vi.mocked(customerRepository).update.mockRejectedValue(new Error("fake error"))

            await expect(customerService.updateCustomer(validInput))
                .rejects.toThrow("fake error");
        });

        it("should throw if not found", async () => {
            vi.mocked(customerRepository).update.mockResolvedValue(null)

            await expect(customerService.updateCustomer(validInput))
                .rejects.toMatchObject({
                    statusCode: 404,
                    code: "NOT_FOUND",
                    message: "Customer not found",
                });
        });

        it("should update customer successfully", async () => {
            const mockUserRecord = {
                id: validInput.customerId,
                firstName: "John",
                lastName: "Doe",
                phoneNumber: "21988887777",
                email: validInput.email,
                createdAt: new Date(),
                updatedAt: null,
            } as CustomerRecord;

            vi.mocked(customerRepository).update.mockResolvedValue(mockUserRecord)

            const result = await customerService.updateCustomer(validInput);


            expect(customerRepository.update).toHaveBeenCalledWith(validInput);
        });
    });

    describe("getCustomerById", () => {
        const customerId = "uuid-123";

        it("should throw if customerRepository.findById fails", async () => {
            vi.mocked(customerRepository).findById.mockRejectedValue(new Error("fake error"));

            await expect(customerService.getCustomerById(customerId))
                .rejects.toThrow("fake error");
        });

        it("should throw NOT_FOUND if customer does not exist", async () => {
            vi.mocked(customerRepository).findById.mockResolvedValue(null);

            await expect(customerService.getCustomerById(customerId))
                .rejects.toMatchObject({
                    statusCode: 404,
                    code: "NOT_FOUND",
                    message: "Customer not found",
                });
        });

        it("should return customer", async () => {
            const mockCustomerRecord = {
                id: customerId,
                firstName: "John",
                lastName: "Doe",
                phoneNumber: "21988887777",
                email: "johndoe@hotmail.com",
                createdAt: new Date(),
                updatedAt: null,
            } as CustomerRecord;

            vi.mocked(customerRepository).findById.mockResolvedValue(mockCustomerRecord);

            const result = await customerService.getCustomerById(customerId);

            expect(customerRepository.findById).toHaveBeenCalledWith(customerId);
            expect(result).toEqual(mockCustomerRecord);
        });
    });

    describe("listCustomers", () => {
        const input: ListCustomersInput = {
            options: {
                limit: 1,
            },
        };

        it("should throw if customerRepository.list fails", async () => {
            vi.mocked(customerRepository).list.mockRejectedValue(new Error("fake error"));

            await expect(customerService.listCustomers(input))
                .rejects.toThrow("fake error");
        });

        it("should return customers", async () => {
            const mockCustomers = [
                {
                    id: "uuid-123",
                    firstName: "John",
                    lastName: "Doe",
                    phoneNumber: "21988887777",
                    email: "johndoe@hotmail.com",
                    createdAt: new Date(),
                    updatedAt: null,
                },
            ] as CustomerRecord[];

            vi.mocked(customerRepository).list.mockResolvedValue(mockCustomers);

            const result = await customerService.listCustomers(input);

            expect(customerRepository.list).toHaveBeenCalledWith(input);
            expect(result).toEqual(mockCustomers);
        });
    });
}); 