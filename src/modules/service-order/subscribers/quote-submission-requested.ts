import { ServiceOrderStatus, QuoteStatus } from "../service-order.types.js";
import type { Subscriber } from "../../../shared/pubsub/subscriber.js";
import PubsubError from "../../../shared/pubsub/error.js";
import logger from "../../../shared/config/logger.js";
import { getPrisma } from "../../../shared/config/database.js";
import { AppError } from "../../../shared/errors/errors.js";
import serviceOrderRepository from "../service-order.repository.js";
import { sendQuoteToCustomer } from "../service-order.emails.js";

interface QuoteSubmissionRequestedPayload {
    id: string;
    quoteId: string;
    eventType: string;
    action: string;
    before: {
        status: string;
        submissionRequestedBy: string | null;
    }
    after: {
        status: string;
        submissionRequestedBy: string | null;
    }
}

const sendQuoteToCustomerSubscriber: Subscriber = {
    config: {
        topic: "public.quotes.submission_requested",
        queue: "quote-submission.send-quote-to-customer",
        prefetch: 1,
    },
    handler: async (message) => {
        const payload = message.content as QuoteSubmissionRequestedPayload;
        if (!payload.quoteId) {
            logger.error({ payload }, "quote-submission: payload is missing the 'quoteId', aborting processing");
            throw new PubsubError("quote-submission: payload is missing 'quoteId'", false); // DLQ
        }

        const quote = await serviceOrderRepository.findQuoteById(payload.quoteId);
        if (!quote) {
            logger.error({ payload }, "quote-submission: quote not found, aborting processing");
            throw new PubsubError("quote-submission: quote not found", false); // DLQ
        }

        if (quote.status === QuoteStatus.SENT && quote.submittedAt) return; // fully done

        if (quote.status !== QuoteStatus.SUBMISSION_PENDING) {
            logger.error(
                { payload, quoteStatus: quote.status },
                "quote-submission: quote is in an unexpected status, aborting processing",
            );
            throw new PubsubError("quote-submission: quote is in an unexpected status", false); // DLQ
        }

        const quoteEmailPayload = await serviceOrderRepository.findQuoteEmailPayloadById(payload.quoteId);
        if (!quoteEmailPayload) {
            logger.error({ payload }, "quote-submission: quote email payload not found, aborting processing");
            throw new PubsubError("quote-submission: quote email payload not found", false); // DLQ
        }

        if (quoteEmailPayload.serviceOrder.status !== ServiceOrderStatus.AWAITING_QUOTE) {
            logger.error(
                { payload, serviceOrderStatus: quoteEmailPayload.serviceOrder.status },
                "quote-submission: service order is not in AWAITING_QUOTE status, aborting processing",
            );
            throw new PubsubError("quote-submission: service order is not in AWAITING_QUOTE status", false); // DLQ
        }

        try {
            await sendQuoteToCustomer({
                to: quoteEmailPayload.customer.email,
                name: `${quoteEmailPayload.customer.firstName} ${quoteEmailPayload.customer.lastName}`,
                payload: quoteEmailPayload,
                idempotencyKey: `quote-submission/${payload.quoteId}`,
            });
        } catch (error) {
            if (error instanceof AppError && error.code === "IDEMPOTENCY_CONFLICT") {
                throw new PubsubError("quote-submission: idempotency conflict while sending quote aborting processing", false); // DLQ
            }

            if (error instanceof AppError && error.code === "IDEMPOTENCY_IN_PROGRESS") {
                // The request that owns the key is still sending; if it fails, its own message retries.
                logger.warn({ payload }, "quote-submission: quote already being sent, skipping");
                return;
            }
            
            throw error;
        }

        await getPrisma().$transaction(async (tx) => {
            const quoteUpdated = await serviceOrderRepository.markQuoteSubmittedById(payload.quoteId, tx);

            if (!quoteUpdated) {
                // Another consumer already committed the SENT transition (quote has
                // SENT + submittedAt). Retry: early-return fires, no-op.
                throw new PubsubError("quote-submission: quote status changed concurrently", true);
            }

            const serviceOrderUpdated = await serviceOrderRepository.updateServiceOrderStatus({
                serviceOrderId: quote.serviceOrderId,
                expectedStatuses: [ServiceOrderStatus.AWAITING_QUOTE],
                toStatus: ServiceOrderStatus.AWAITING_APPROVAL,
            }, tx);

            if (!serviceOrderUpdated) {
                // Same reasoning: another consumer transitioned the SO. Roll back
                // the quote update (throws → transaction aborts) and retry.
                throw new PubsubError("quote-submission: service order status changed concurrently", true);
            }

            await serviceOrderRepository.createServiceOrderStatusHistory({
                serviceOrderId: quote.serviceOrderId,
                fromStatus: ServiceOrderStatus.AWAITING_QUOTE,
                toStatus: ServiceOrderStatus.AWAITING_APPROVAL,
                changeSource: "SYSTEM",
                changedById: null,
            }, tx);
        });
    },
    onError: (error, message) => {
        logger.error({ err: error, message }, "quote-submission: failed to process event");
    },
};

export { sendQuoteToCustomerSubscriber };
