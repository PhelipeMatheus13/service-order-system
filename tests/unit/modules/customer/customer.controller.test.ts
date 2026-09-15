import { beforeEach, describe, expect, it, vi } from "vitest";

import { CustomerRecord } from "../../../../src/modules/customer/customer.types.js";

import customerController from "../../../../src/modules/customer/customer.controller.js";
import customerService from "../../../../src/modules/customer/customer.service.js";

vi.mock("../../../../src/modules/customer/customer.service.js");

describe("Customer Controller (Unit)", () => {
    let req: any;
    let res: any;
    let next: any;

    beforeEach(() => {
        req = { body: {}, params: {}, query: {} };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };
        next = vi.fn();
        vi.clearAllMocks();
    });

    describe("createCustomer", () => {
        it("should return 201 on successful creation", async () => {
            const requestBody = {
                firstName: "John",
                lastName: "Doe",
                email: "johndoe@hotmail.com",
                phoneNumber: null,
            };
            req.body = requestBody;

            const mockCustomerRecord = {
                id: "uuid-123",
                firstName: requestBody.firstName,
                lastName: requestBody.lastName,
                email: requestBody.email,
                phoneNumber: requestBody.phoneNumber,
                createdAt: new Date(),
                updatedAt: null,
            } as CustomerRecord;

            vi.mocked(customerService).createCustomer.mockResolvedValue(mockCustomerRecord);

            await customerController.createCustomer(req, res, next);

            expect(customerService.createCustomer).toHaveBeenCalledWith({
                firstName: requestBody.firstName,
                lastName: requestBody.lastName,
                email: requestBody.email,
                phoneNumber: requestBody.phoneNumber,
            });

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockCustomerRecord,
                message: "Customer created successfully",
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe("updateCustomer", () => {
        it("should return 201 on successful update", async () => {
            req.params.id = "uuid-123";
            req.body = {
                firstName: "Jane",
                lastName: null,
                email: null,
                phoneNumber: null,
            };

            const mockCustomerRecord = {
                id: "uuid-123",
                firstName: "Jane",
                lastName: "Doe",
                email: "johndoe@hotmail.com",
                phoneNumber: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as CustomerRecord;

            vi.mocked(customerService).updateCustomer.mockResolvedValue(mockCustomerRecord);

            await customerController.updateCustomer(req, res, next);

            expect(customerService.updateCustomer).toHaveBeenCalledWith({
                customerId: "uuid-123",
                firstName: "Jane",
                lastName: null,
                email: null,
                phoneNumber: null,
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockCustomerRecord,
                message: "Customer updated successfully",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with badRequest error if id is missing", async () => {
            await customerController.updateCustomer(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                code: "BAD_REQUEST",
                message: "Customer ID is required",
            }));
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe("getCustomer", () => {
        it("should return 201 with customer data", async () => {
            req.params.id = "uuid-123";

            const mockCustomerRecord = {
                id: "uuid-123",
                firstName: "John",
                lastName: "Doe",
                email: "johndoe@hotmail.com",
                phoneNumber: null,
                createdAt: new Date(),
                updatedAt: null,
            } as CustomerRecord;

            vi.mocked(customerService).getCustomerById.mockResolvedValue(mockCustomerRecord);

            await customerController.getCustomer(req, res, next);

            expect(customerService.getCustomerById).toHaveBeenCalledWith("uuid-123");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockCustomerRecord,
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should call next with badRequest error if id is missing", async () => {
            await customerController.getCustomer(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                statusCode: 400,
                code: "BAD_REQUEST",
                message: "Customer ID is required",
            }));
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe("listCustomers", () => {
        it("should return 200 with customers data", async () => {
            req.query = {
                limit: "1",
            };

            const mockCustomerRecords = [
                {
                    id: "uuid-123",
                    firstName: "John",
                    lastName: "Doe",
                    phoneNumber: "5521995437105",
                    email: "johndoe@hotmail.com",
                    createdAt: new Date(),
                    updatedAt: null,
                },
            ] as CustomerRecord[];

            vi.mocked(customerService).listCustomers.mockResolvedValue(mockCustomerRecords);

            await customerController.listCustomers(req, res, next);

            expect(customerService.listCustomers).toHaveBeenCalledWith({
                options: {
                    limit: 1,
                },
            });

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: [
                    {
                        id: mockCustomerRecords[0].id,
                        firstName: mockCustomerRecords[0].firstName,
                        lastName: mockCustomerRecords[0].lastName,
                        phoneNumber: mockCustomerRecords[0].phoneNumber,
                        email: mockCustomerRecords[0].email,
                        createdAt: mockCustomerRecords[0].createdAt,
                        updatedAt: null,
                    },
                ],
            });

            expect(next).not.toHaveBeenCalled();
        });
    });
});