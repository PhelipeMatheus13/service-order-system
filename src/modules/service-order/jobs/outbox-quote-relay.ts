import { publish } from "../../../shared/pubsub/publisher.js";
import { withRetry } from "../../../shared/utils/retry.js";
import serviceOrderRepository from "../service-order.repository.js";
import logger from "../../../shared/config/logger.js";
import type { OutboxActionStatus } from "../../../generated/prisma/client.js";

interface QuoteOutboxState {
    status: string;
    submissionRequestedBy: string | null;
}

const mapQuoteOutboxState = (raw: unknown): QuoteOutboxState | null => {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;

    return {
        status: r.status as string,
        submissionRequestedBy: (r.submission_requested_by as string) ?? null,
    };
};

const ACTION_TOPIC: Record<OutboxActionStatus, string> = {
    INSERT: "public.quotes.created",
    UPDATE: "public.quotes.updated",
    DELETE: "public.quotes.deleted",
};

const getAndPushUnconsumedQuoteEvents = async (): Promise<void> => {
    const events = await serviceOrderRepository.listOutboxQuoteUnconsumed();
    if (events.length === 0) return;

    const publishedIds: number[] = [];

    for (const event of events) {
        // Business-specific events (e.g. submission_requested) carry their own
        // event_type set by the trigger; generic row changes fall back to the
        // action-based topic.
        const topic = event.eventType ?? ACTION_TOPIC[event.action];

        try {
            await withRetry(() =>
                publish(topic, {
                    quoteId: event.quoteId,
                    action: event.action,
                    eventType: event.eventType,
                    before: mapQuoteOutboxState(event.beforeState),
                    after: mapQuoteOutboxState(event.afterState),
                }),
            );

            publishedIds.push(event.id);
        } catch (error) {
            // withRetry already exhausted all attempts for this event.
            // Stop the batch here: this event and any after it (in order)
            // stay unconsumed and will be retried on the next tick.
            logger.error(
                {
                    err: error,
                    outboxId: event.id,
                    action: event.action,
                    eventType: event.eventType,
                },
                "Outbox quote event publish failed after retries, aborting batch",
            );
            break;
        }
    }

    try {
        await withRetry(() => serviceOrderRepository.markOutboxQuoteAsConsumed(publishedIds));
    } catch (error) {
        logger.error(
            { err: error, publishedIds },
            "Failed to mark published outbox quote events as consumed after retries",
        );
    }
};

export {
    getAndPushUnconsumedQuoteEvents,
    mapQuoteOutboxState,
};