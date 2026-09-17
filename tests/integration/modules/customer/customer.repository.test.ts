// (Node built‑ins)
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
// (Types)
import type {
    CreateCustomerInput,
    CustomerRecord,
    UpdateCustomerInput,
} from "../../../../src/modules/customer/customer.types.js";
// (shared / infra)
import { PrismaClient } from "../../../../src/generated/prisma/client.js";
import { setPrismaInstance } from "../../../../src/shared/config/database.js";
import { setupTestDatabase } from "../../../helpers/testDatabase.js";
// (local modules)
import customerRepository from "../../../../src/modules/customer/customer.repository.js";

describe("Customer Repository (Integration)", () => {
    let db: Awaited<ReturnType<typeof setupTestDatabase>>;
    let prisma: PrismaClient;

    beforeAll(async () => {
        db = await setupTestDatabase();
        prisma = db.prismaClient;
        setPrismaInstance(prisma);
    });

    afterAll(async () => {
        await db.stop();
    });

    beforeEach(async () => {
        await prisma.customer.deleteMany();
    });

    describe("Writer repository", () => {
        describe("create", () => {
            it("should insert a new customer into the database", async () => {
                const customerData: CreateCustomerInput = {
                    firstName: "John",
                    lastName: "Doe",
                    email: "john@example.com",
                    phoneNumber: "5521995437105",
                };

                const customerCreated = await customerRepository.create(customerData);

                expect(customerCreated).toBeTruthy();
                expect(customerCreated.id).toBeTruthy();
                expect(customerCreated.firstName).toBe(customerData.firstName);
                expect(customerCreated.lastName).toBe(customerData.lastName);
                expect(customerCreated.email).toBe(customerData.email);
                expect(customerCreated.phoneNumber).toBe(customerData.phoneNumber);
                expect(customerCreated.createdAt).toBeTruthy();
                expect(customerCreated.updatedAt).toBeNull();
            });
        });

        describe("update", () => {
            let customerCreatedId: string;

            beforeEach(async () => {
                const customerCreated = await prisma.customer.create({
                    data: {
                        firstName: "John",
                        lastName: "Doe",
                        email: "john@example.com",
                        phoneNumber: "5521995437105",
                    },
                });

                customerCreatedId = customerCreated.id;
            });

            it("should update all provided fields", async () => {
                const updateData: UpdateCustomerInput = {
                    customerId: customerCreatedId,
                    firstName: "Jane",
                    lastName: "Smith",
                    email: "jane@example.com",
                    phoneNumber: "5521995437106",
                };

                const customerUpdated = await customerRepository.update(updateData);

                expect(customerUpdated).toBeTruthy();
                expect(customerUpdated?.id).toBe(customerCreatedId);
                expect(customerUpdated?.firstName).toBe(updateData.firstName);
                expect(customerUpdated?.lastName).toBe(updateData.lastName);
                expect(customerUpdated?.email).toBe(updateData.email);
                expect(customerUpdated?.phoneNumber).toBe(updateData.phoneNumber);
                expect(customerUpdated?.updatedAt).toBeTruthy();
            });

            it("should update only the provided fields", async () => {
                const updateData: UpdateCustomerInput = {
                    customerId: customerCreatedId,
                    firstName: "Jane",
                    lastName: null,
                    email: null,
                    phoneNumber: null,
                };

                const customerUpdated = await customerRepository.update(updateData);

                expect(customerUpdated).toBeTruthy();
                expect(customerUpdated?.firstName).toBe("Jane");
                expect(customerUpdated?.lastName).toBe("Doe");
                expect(customerUpdated?.email).toBe("john@example.com");
                expect(customerUpdated?.phoneNumber).toBe("5521995437105");
            });

            it("should return null when the customer does not exist", async () => {
                const nonExistentId = "0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa";

                const updateData: UpdateCustomerInput = {
                    customerId: nonExistentId,
                    firstName: "Jane",
                    lastName: null,
                    email: null,
                    phoneNumber: null,
                };

                const customerUpdated = await customerRepository.update(updateData);

                expect(customerUpdated).toBeNull();
            });
        });
    });

    describe("Reader repository", () => {
        describe("findById", () => {
            it("should return the customer if a customer with the given ID exists", async () => {
                const customerCreated = await prisma.customer.create({
                    data: {
                        firstName: "John",
                        lastName: "Doe",
                        email: "john@example.com",
                        phoneNumber: "5521995437105",
                    },
                });

                const customer = await customerRepository.findById(customerCreated.id);

                expect(customer?.id).toBe(customerCreated.id);
                expect(customer?.firstName).toBe(customerCreated.firstName);
                expect(customer?.lastName).toBe(customerCreated.lastName);
                expect(customer?.email).toBe(customerCreated.email);
                expect(customer?.phoneNumber).toBe(customerCreated.phoneNumber);
                expect(customer?.createdAt).toBeTruthy();
                expect(customer?.updatedAt).toBeNull();
            });

            it("should return null if a customer with the given ID does not exist", async () => {
                const customer = await customerRepository.findById("0c6f9075-b4f9-46fb-bd17-f8659cfbd6aa");
                expect(customer).toBeNull();
            });
        });

        describe("list", () => {
            it("should return customers ordered by creation date descending and respect the given limit", async () => {
                const now = new Date();

                const customers = await prisma.customer.createManyAndReturn({
                    data: [
                        {
                            firstName: "John",
                            lastName: "Doe",
                            email: "john@example.com",
                            phoneNumber: "5521995437105",
                            createdAt: new Date(now.getTime() - 60 * 60 * 1000),
                        },
                        {
                            firstName: "Jane",
                            lastName: "Doe",
                            email: "jane@example.com",
                            phoneNumber: "5521995437106",
                            createdAt: now,
                        },
                    ],
                });

                const newerCustomer = customers.find((c) => c.email === "jane@example.com")!;

                const result = await customerRepository.list({
                    options: {
                        limit: 1,
                    },
                });

                expect(result).toHaveLength(1);
                expect(result[0].id).toBe(newerCustomer.id);
                expect(result[0].firstName).toBe(newerCustomer.firstName);
                expect(result[0].lastName).toBe(newerCustomer.lastName);
                expect(result[0].email).toBe(newerCustomer.email);
                expect(result[0].phoneNumber).toBe(newerCustomer.phoneNumber);
                expect(result[0].createdAt).toBeTruthy();
                expect(result[0].updatedAt).toBeNull();
            });

            it("should default to 100 when limit is not provided", async () => {
                await prisma.customer.create({
                    data: {
                        firstName: "John",
                        lastName: "Doe",
                        email: "john@example.com",
                        phoneNumber: "5521995437105",
                    },
                });

                const result = await customerRepository.list({
                    options: {
                        limit: null,
                    },
                });

                expect(result).toHaveLength(1);
            });
        });
    });
});