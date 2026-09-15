// (Node built‑ins)
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";

// (shared / infra)
import app from "../../../../src/app";
import { PrismaClient } from "../../../../src/generated/prisma/client.js";
import { setupTestDatabase } from "../../../helpers/testDatabase.js";
import { setPrismaInstance } from "../../../../src/shared/config/database";
import { generateAccessToken } from "../../../../src/shared/services/jwt.js";

describe("Customer Routes (Integration)", () => {
    let db: Awaited<ReturnType<typeof setupTestDatabase>>;
    let prisma: PrismaClient;
    let customerId: string;

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

    describe("POST /customers", () => {
        const validCustomer = {
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            phoneNumber: "+55 (21) 98765-4321",
        };

        it("should create a new customer successfully", async () => {
            const accessToken = generateAccessToken("admin-user-id", "ATTENDANT");
            const res = await request(app)
                .post("/customers")
                .set("Authorization", `Bearer ${accessToken}`)
                .send(validCustomer);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe("Customer created successfully");

            const customer = await prisma.customer.findUnique({
                where: { email: validCustomer.email },
            });

            expect(customer).toBeTruthy();
            expect(customer?.id).toBeDefined();
        });
    });

    describe("PATCH /customers/:id", () => {
        beforeEach(async () => {
            const customer = await prisma.customer.create({
                data: {
                    firstName: "John",
                    lastName: "Doe",
                    email: "john@example.com",
                    phoneNumber: "5521995437105",
                },
                select: { id: true },
            });

            customerId = customer.id;
        });

        it("should update the customer successfully", async () => {
            const accessToken = generateAccessToken("admin-user-id", "ATTENDANT");
            const res = await request(app)
                .patch(`/customers/${customerId}`)
                .set("Authorization", `Bearer ${accessToken}`)
                .send({
                    firstName: "Jane",
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            const updated = await prisma.customer.findUnique({
                where: { id: customerId },
            });

            expect(updated?.firstName).toBe("Jane");
            expect(updated?.lastName).toBe("Doe");
        });
    });

    describe("GET /customers/:id", () => {
        beforeEach(async () => {
            const customer = await prisma.customer.create({
                data: {
                    firstName: "John",
                    lastName: "Doe",
                    email: "john@example.com",
                    phoneNumber: "5521995437105",
                },
                select: { id: true },
            });

            customerId = customer.id;
        });

        it("should return the customer data", async () => {
            const accessToken = generateAccessToken("admin-user-id", "ATTENDANT");
            const res = await request(app)
                .get(`/customers/${customerId}`)
                .set("Authorization", `Bearer ${accessToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toMatchObject({
                id: customerId,
                firstName: "John",
                lastName: "Doe",
                email: "john@example.com",
                phoneNumber: "5521995437105",
            });
        });
    });

    describe("GET /customers", () => {
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

            const accessToken = generateAccessToken("admin-user-id", "ATTENDANT");
            const res = await request(app)
                .get("/customers")
                .set("Authorization", `Bearer ${accessToken}`)
                .query({ limit: 1 });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].id).toBe(newerCustomer.id);
            expect(res.body.data[0].firstName).toBe(newerCustomer.firstName);
            expect(res.body.data[0].lastName).toBe(newerCustomer.lastName);
            expect(res.body.data[0].email).toBe(newerCustomer.email);
            expect(res.body.data[0].phoneNumber).toBe(newerCustomer.phoneNumber);
            expect(res.body.data[0].createdAt).toBeTruthy();
            expect(res.body.data[0].updatedAt).toBeNull();
        });
    });
});