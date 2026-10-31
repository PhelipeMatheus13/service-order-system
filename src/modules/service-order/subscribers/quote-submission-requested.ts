import { ServiceOrderStatus, QuoteStatus } from "../service-order.types.js";
import type { Subscriber } from "../../../shared/pubsub/subscriber.js";
import PubsubError from "../../../shared/pubsub/error.js";
import logger from "../../../shared/config/logger.js";
import { getPrisma } from "../../../shared/config/database.js";
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
            logger.error({ payload }, "Failed to process quote-submission event: payload is missing the 'quoteId'");
            throw new PubsubError("quote-submission event missing 'quoteId'", false);
        }

        const quote = await serviceOrderRepository.findQuoteById(payload.quoteId);
        if (!quote) {
            logger.error({ payload }, "Failed to process quote-submission event: quote not found");
            throw new PubsubError("Quote not found", false);
        }

        if (quote.status === QuoteStatus.SENT && quote.submittedAt) return; // fully done

        if (quote.status !== QuoteStatus.SUBMISSION_PENDING) {
            logger.error(
                { payload, quoteStatus: quote.status },
                "Cannot process quote-submission event: quote is in an unexpected status",
            );
            throw new PubsubError("Quote is in an unexpected status", false); // DLQ
        }

        const quoteEmailPayload = await serviceOrderRepository.findQuoteEmailPayloadById(payload.quoteId);
        if (!quoteEmailPayload) {
            logger.error({ payload }, "Failed to process quote-submission event: quote email payload not found");
            throw new PubsubError("Quote email payload not found", false);
        }

        if (quoteEmailPayload.serviceOrder.status !== ServiceOrderStatus.AWAITING_QUOTE) {
            logger.error(
                { payload, serviceOrderStatus: quoteEmailPayload.serviceOrder.status },
                "Cannot transition quote: service order is not in AWAITING_QUOTE",
            );
            throw new PubsubError("Service order is not in AWAITING_QUOTE", false); // DLQ
        }

        await sendQuoteToCustomer({
            to: quoteEmailPayload.customer.email,
            name: `${quoteEmailPayload.customer.firstName} ${quoteEmailPayload.customer.lastName}`,
            payload: quoteEmailPayload,
        });


        await getPrisma().$transaction(async (tx) => {
            const quoteUpdated = await serviceOrderRepository.markQuoteSubmittedById(payload.quoteId, tx);

            if (!quoteUpdated) {
                // Another consumer already committed the SENT transition (quote has
                // SENT + submittedAt). Retry: early-return fires, no-op.
                throw new PubsubError("Quote status changed concurrently", true);
            }

            const serviceOrderUpdated = await serviceOrderRepository.updateServiceOrderStatus({
                serviceOrderId: quote.serviceOrderId,
                expectedStatuses: [ServiceOrderStatus.AWAITING_QUOTE],
                toStatus: ServiceOrderStatus.AWAITING_APPROVAL,
            }, tx);

            if (!serviceOrderUpdated) {
                // Same reasoning: another consumer transitioned the SO. Roll back
                // the quote update (throws → transaction aborts) and retry.
                throw new PubsubError("Service order status changed concurrently", true);
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
        logger.error({ err: error, message }, "Failed to process quote-submission event");
    },
};


export { sendQuoteToCustomerSubscriber };
