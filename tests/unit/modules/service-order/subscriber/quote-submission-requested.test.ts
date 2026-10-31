import { vi, describe, beforeEach, it, expect } from "vitest";

import { ServiceOrderStatus, QuoteStatus } from "../../../../../src/modules/service-order/service-order.types.js";
import { sendQuoteToCustomerSubscriber } from "../../../../../src/modules/service-order/subscribers/quote-submission-requested.js";

import serviceOrderRepository from "../../../../../src/modules/service-order/service-order.repository.js";
import { sendQuoteToCustomer } from "../../../../../src/modules/service-order/service-order.emails.js";
import { getPrisma } from "../../../../../src/shared/config/database.js";
import logger from "../../../../../src/shared/config/logger.js";

vi.mock("../../../../../src/modules/service-order/service-order.repository.js");
vi.mock("../../../../../src/modules/service-order/service-order.emails.js");
vi.mock("../../../../../src/shared/config/database.js");

vi.mock("../../../../../src/shared/config/logger.js", () => ({
    default: {
        error: vi.fn(),
    },
}));

describe("Quote Submission Subscriber (Unit)", () => {
    const tx = {} as any;

    const message = {
        topic: "public.quotes.submission_requested",
        content: {
            id: "1",
            quoteId: "quote-123",
            eventType: "public.quotes.submission_requested",
            action: "UPDATE",
            before: { status: QuoteStatus.DRAFT, submissionRequestedBy: null },
            after: { status: QuoteStatus.SUBMISSION_PENDING, submissionRequestedBy: "user-1" },
        },
    };

    const quote = {
        id: "quote-123",
        serviceOrderId: "so-123",
        diagnosisId: "diag-123",
        status: QuoteStatus.SUBMISSION_PENDING,
        submissionRequestedById: "user-1",
        submittedAt: null,
        respondedAt: null,
        createdById: "user-1",
        createdAt: new Date(),
        updatedAt: null,
    };

    const quoteEmailPayload = {
        customer: {
            id: "cust-1",
            firstName: "Jane",
            lastName: "Doe",
            email: "jane@example.com",
        },
        device: {
            id: "dev-1",
            type: "SMARTPHONE",
            brand: "Samsung",
            model: "Galaxy S23",
            color: "Black",
            serialNumber: "SN-1",
        },
        serviceOrder: {
            id: "so-123",
            status: ServiceOrderStatus.AWAITING_QUOTE,
            reportedProblem: "Screen broken",
            diagnosis: { id: "diag-123", result: "FAULT_FOUND", findings: [] },
            quoteItems: [],
        },
    };

    const setupsendQuoteToCustomerMock = () => {
        vi.mocked(getPrisma).mockReturnValue({
            $transaction: vi.fn(async (callback: any) => callback(tx)),
        } as any);
        vi.mocked(serviceOrderRepository.findQuoteById).mockResolvedValue(quote);
        vi.mocked(serviceOrderRepository.findQuoteEmailPayloadById).mockResolvedValue(quoteEmailPayload as any);
        vi.mocked(sendQuoteToCustomer).mockResolvedValue(undefined);
        vi.mocked(serviceOrderRepository.markQuoteSubmittedById).mockResolvedValue(true);
        vi.mocked(serviceOrderRepository.updateServiceOrderStatus).mockResolvedValue(true);
        vi.mocked(serviceOrderRepository.createServiceOrderStatusHistory).mockResolvedValue({} as any);
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should throw non-retriable when payload is missing quoteId", async () => {
        const messageWithoutQuoteId = {
            ...message,
            content: { ...message.content, quoteId: undefined },
        };

        await expect(sendQuoteToCustomerSubscriber.handler(messageWithoutQuoteId))
            .rejects.toMatchObject({
                retriable: false,
                message: "quote-submission event missing 'quoteId'",
            });

        expect(serviceOrderRepository.findQuoteById).not.toHaveBeenCalled();
    });

    it("should throw non-retriable when quote does not exist", async () => {
        vi.mocked(serviceOrderRepository.findQuoteById).mockResolvedValue(null);

        await expect(sendQuoteToCustomerSubscriber.handler(message))
            .rejects.toMatchObject({
                retriable: false,
                message: "Quote not found",
            });

        expect(sendQuoteToCustomer).not.toHaveBeenCalled();
    });

    it("should return early when quote is SENT and submittedAt is set", async () => {
        vi.mocked(serviceOrderRepository.findQuoteById).mockResolvedValue({
            ...quote,
            status: QuoteStatus.SENT,
            submittedAt: new Date(),
        });

        await expect(sendQuoteToCustomerSubscriber.handler(message))
            .resolves.toBeUndefined();

        expect(serviceOrderRepository.findQuoteEmailPayloadById).not.toHaveBeenCalled();
        expect(sendQuoteToCustomer).not.toHaveBeenCalled();
    });

    it("should throw non-retriable when quote is in an unexpected status", async () => {
        vi.mocked(serviceOrderRepository.findQuoteById).mockResolvedValue({
            ...quote,
            status: QuoteStatus.DECIDED,
        });

        await expect(sendQuoteToCustomerSubscriber.handler(message))
            .rejects.toMatchObject({
                retriable: false,
                message: "Quote is in an unexpected status",
            });

        expect(logger.error).toHaveBeenCalledWith(
            { payload: message.content, quoteStatus: QuoteStatus.DECIDED },
            "Cannot process quote-submission event: quote is in an unexpected status",
        );

        expect(sendQuoteToCustomer).not.toHaveBeenCalled();
    });

    it("should throw non-retriable when quote email payload is not found", async () => {
        vi.mocked(serviceOrderRepository.findQuoteById).mockResolvedValue(quote);
        vi.mocked(serviceOrderRepository.findQuoteEmailPayloadById).mockResolvedValue(null);

        await expect(sendQuoteToCustomerSubscriber.handler(message))
            .rejects.toMatchObject({
                retriable: false,
                message: "Quote email payload not found",
            });

        expect(sendQuoteToCustomer).not.toHaveBeenCalled();
    });

    it("should throw non-retriable when service order is not AWAITING_QUOTE", async () => {
        vi.mocked(serviceOrderRepository.findQuoteById).mockResolvedValue(quote);
        vi.mocked(serviceOrderRepository.findQuoteEmailPayloadById).mockResolvedValue({
            ...quoteEmailPayload,
            serviceOrder: { ...quoteEmailPayload.serviceOrder, status: ServiceOrderStatus.CANCELLED },
        } as any);

        await expect(sendQuoteToCustomerSubscriber.handler(message))
            .rejects.toMatchObject({
                retriable: false,
                message: "Service order is not in AWAITING_QUOTE",
            });

        expect(sendQuoteToCustomer).not.toHaveBeenCalled();
    });

    it("should propagate the error when sending the email fails", async () => {
        setupsendQuoteToCustomerMock();
        const emailError = new Error("SMTP down");
        vi.mocked(sendQuoteToCustomer).mockRejectedValue(emailError);

        await expect(sendQuoteToCustomerSubscriber.handler(message))
            .rejects.toThrow(emailError);

        expect(serviceOrderRepository.markQuoteSubmittedById).not.toHaveBeenCalled();
    });

    it("should throw retriable when markQuoteSubmittedById returns false (race)", async () => {
        setupsendQuoteToCustomerMock();
        vi.mocked(serviceOrderRepository.markQuoteSubmittedById).mockResolvedValue(false);

        await expect(sendQuoteToCustomerSubscriber.handler(message))
            .rejects.toMatchObject({
                retriable: true,
                message: "Quote status changed concurrently",
            });

        expect(sendQuoteToCustomer).toHaveBeenCalledWith({
            to: "jane@example.com",
            name: "Jane Doe",
            payload: quoteEmailPayload,
        });

        expect(serviceOrderRepository.updateServiceOrderStatus).not.toHaveBeenCalled();
        expect(serviceOrderRepository.createServiceOrderStatusHistory).not.toHaveBeenCalled();
    });

    it("should throw retriable when updateServiceOrderStatus returns false", async () => {
        setupsendQuoteToCustomerMock();
        vi.mocked(serviceOrderRepository.updateServiceOrderStatus).mockResolvedValue(false);

        await expect(sendQuoteToCustomerSubscriber.handler(message))
            .rejects.toMatchObject({
                retriable: true,
                message: "Service order status changed concurrently",
            });

        expect(serviceOrderRepository.createServiceOrderStatusHistory).not.toHaveBeenCalled();
    });

    it("should propagate the error when createServiceOrderStatusHistory fails", async () => {
        setupsendQuoteToCustomerMock();
        const historyError = new Error("DB failure");
        vi.mocked(serviceOrderRepository.createServiceOrderStatusHistory).mockRejectedValue(historyError);

        await expect(sendQuoteToCustomerSubscriber.handler(message))
            .rejects.toThrow(historyError);
    });

    it("should send the email and commit the transaction on the happy path", async () => {
        setupsendQuoteToCustomerMock();

        await expect(sendQuoteToCustomerSubscriber.handler(message))
            .resolves.toBeUndefined();

        expect(sendQuoteToCustomer).toHaveBeenCalledWith({
            to: "jane@example.com",
            name: "Jane Doe",
            payload: quoteEmailPayload,
        });

        expect(serviceOrderRepository.markQuoteSubmittedById).toHaveBeenCalledWith(
            "quote-123",
            tx,
        );
        expect(serviceOrderRepository.updateServiceOrderStatus).toHaveBeenCalledWith(
            {
                serviceOrderId: "so-123",
                expectedStatuses: [ServiceOrderStatus.AWAITING_QUOTE],
                toStatus: ServiceOrderStatus.AWAITING_APPROVAL,
            },
            tx,
        );
        expect(serviceOrderRepository.createServiceOrderStatusHistory).toHaveBeenCalledWith(
            {
                serviceOrderId: "so-123",
                fromStatus: ServiceOrderStatus.AWAITING_QUOTE,
                toStatus: ServiceOrderStatus.AWAITING_APPROVAL,
                changeSource: "SYSTEM",
                changedById: null,
            },
            tx,
        );
    });

    it("should log the error in onError", () => {
        const error = new Error("boom");

        sendQuoteToCustomerSubscriber.onError?.(error, message);

        expect(logger.error).toHaveBeenCalledWith(
            { err: error, message },
            "Failed to process quote-submission event",
        );
    });
});