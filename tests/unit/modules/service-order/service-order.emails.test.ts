import { vi, describe, beforeEach, it, expect } from "vitest";

import { sendQuoteToCustomer } from "../../../../src/modules/service-order/service-order.emails.js";
import type { QuoteEmailPayload } from "../../../../src/modules/service-order/service-order.types.js";
import { sendMail } from "../../../../src/shared/services/mailer.js";

vi.mock("../../../../src/shared/services/mailer.js", () => ({
    sendMail: vi.fn(),
}));

const sendMailMock = vi.mocked(sendMail);

describe("Service Order Emails (Unit)", () => {
    describe("sendQuoteToCustomer", () => {
        const idempotencyKey = "quote-submission/quote-1";

        const basePayload: QuoteEmailPayload = {
            customer: {
                id: "customer-1",
                firstName: "Jane",
                lastName: "Doe",
                email: "customer@example.com",
            },
            device: {
                id: "device-1",
                type: "SMARTPHONE",
                brand: "Apple",
                model: "iPhone 13",
                color: "Black",
                serialNumber: "SN123456",
            },
            serviceOrder: {
                id: "service-order-1",
                reportedProblem: "Screen is cracked",
                status: "IN_PROGRESS",
                diagnosis: {
                    id: "diagnosis-1",
                    result: null,
                    findings: [
                        { id: "finding-1", description: "Cracked screen", repairable: true },
                        { id: "finding-2", description: "Water damage", repairable: false },
                    ],
                },
                quoteItems: [
                    {
                        id: "quote-item-1",
                        description: "Screen replacement",
                        findingId: "finding-1",
                        components: [
                            { id: "component-1", quantity: 1, description: "iPhone 13 Screen", type: "PART", unitPrice: "300.00" },
                            { id: "component-2", quantity: 2, description: "Adhesive", type: "OTHER", unitPrice: "15.00" },
                        ],
                    },
                    {
                        id: "quote-item-2",
                        description: "Battery replacement",
                        findingId: null,
                        components: [
                            { id: "component-3", quantity: 1, description: "Battery", type: "PART", unitPrice: "200.00" },
                        ],
                    },
                ],
            },
        };

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should propagate the error when sending the email fails", async () => {
            const error = new Error("Fake error");

            sendMailMock.mockRejectedValue(error);

            await expect(
                sendQuoteToCustomer({
                    to: "customer@example.com",
                    name: "Jane Doe",
                    payload: basePayload,
                    idempotencyKey,
                }),
            ).rejects.toThrow(error);
        });

        it("should send the quote email", async () => {
            sendMailMock.mockResolvedValue(undefined);

            await sendQuoteToCustomer({
                to: "customer@example.com",
                name: "Jane Doe",
                payload: basePayload,
                idempotencyKey,
            });

            const [mail] = sendMailMock.mock.calls[0];

            expect(mail).toMatchObject({
                to: "customer@example.com",
                subject: "Your quote is ready for approval",
                idempotencyKey,
            });

            expect(mail.html).toContain("<p>Hi, Jane Doe!</p>");
            expect(mail.html).toContain("<p>We finished the diagnosis of your device and prepared a quote for you.</p>");

            expect(mail.html).toContain("<h3>Device</h3>");
            expect(mail.html).toContain("<li><strong>Device:</strong> Apple iPhone 13 Black</li>");
            expect(mail.html).toContain("<li><strong>Serial number:</strong> SN123456</li>");

            expect(mail.html).toContain("<h3>Reported problem</h3>");
            expect(mail.html).toContain("<p>Screen is cracked</p>");

            expect(mail.html).toContain("<h3>What we found</h3>");
            expect(mail.html).toContain("<li>Cracked screen</li>");
            expect(mail.html).toContain("<li>Water damage <em>(not repairable)</em></li>");

            expect(mail.html).toContain("<h3>Quote</h3>");
            expect(mail.html).toContain("<strong>Screen replacement</strong> — R$");
            expect(mail.html).toContain("330,00");
            expect(mail.html).toContain("1x iPhone 13 Screen (part)");
            expect(mail.html).toContain("300,00");
            expect(mail.html).toContain("2x Adhesive (other)");
            expect(mail.html).toContain("30,00");
            expect(mail.html).toContain("<strong>Battery replacement</strong> — R$");
            expect(mail.html).toContain("200,00");
            expect(mail.html).toContain("<strong>Total: R$");
            expect(mail.html).toContain("530,00");

            expect(mail.html).toContain("<p>To approve or ask questions about this quote, please contact our store.</p>");
            expect(mail.html).toContain("<p>If you didn't request this, please ignore this email.</p>");
        });

        it("should omit the findings section when there is no diagnosis", async () => {
            sendMailMock.mockResolvedValue(undefined);

            await sendQuoteToCustomer({
                to: "customer@example.com",
                name: "Jane Doe",
                payload: {
                    ...basePayload,
                    serviceOrder: {
                        ...basePayload.serviceOrder,
                        diagnosis: null,
                    },
                },
                idempotencyKey,
            });

            const [mail] = sendMailMock.mock.calls[0];

            expect(mail.html).not.toContain("<h3>What we found</h3>");
        });

        it("should show a fallback message when there are no quote items", async () => {
            sendMailMock.mockResolvedValue(undefined);

            await sendQuoteToCustomer({
                to: "customer@example.com",
                name: "Jane Doe",
                payload: {
                    ...basePayload,
                    serviceOrder: {
                        ...basePayload.serviceOrder,
                        quoteItems: [],
                    },
                },
                idempotencyKey,
            });

            const [mail] = sendMailMock.mock.calls[0];

            expect(mail.html).not.toContain("<h3>Quote</h3>");
            expect(mail.html).not.toContain("<strong>Total:");
            expect(mail.html).toContain("<p>No repair items have been quoted for this service order.</p>");
        });

        it("should filter falsy fields from the device description and omit the serial number when missing", async () => {
            sendMailMock.mockResolvedValue(undefined);

            await sendQuoteToCustomer({
                to: "customer@example.com",
                name: "Jane Doe",
                payload: {
                    ...basePayload,
                    device: {
                        ...basePayload.device,
                        color: "",
                        serialNumber: null,
                    },
                },
                idempotencyKey,
            });

            const [mail] = sendMailMock.mock.calls[0];

            expect(mail.html).toContain("<li><strong>Device:</strong> Apple iPhone 13</li>");
            expect(mail.html).not.toContain("Serial number");
        });
    });
});