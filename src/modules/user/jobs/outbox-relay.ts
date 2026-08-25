import { publish } from "../../../shared/pubsub/publisher.js";
import { withRetry } from "../../../shared/utils/retry.js";
import userRepository from "../user.repository.js"
import logger from "../../../shared/config/logger.js";
import type { OutboxActionStatus } from "../../../generated/prisma/client.js";

interface UserOutboxState {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    email: string;
    role: string;
    active: boolean;
    createdAt: string;
    updatedAt: string | null;
}


const mapUserOutboxState = (raw: unknown): UserOutboxState | null => {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;

    return {
        id: r.id as string,
        firstName: r.first_name as string,
        lastName: r.last_name as string,
        phoneNumber: (r.phone_number as string) ?? null,
        email: r.email as string,
        role: r.role as string,
        active: r.active as boolean,
        createdAt: r.created_at as string,
        updatedAt: (r.updated_at as string) ?? null,
    };
};

const ACTION_TOPIC: Record<OutboxActionStatus, string> = {
    INSERT: "public.users.created",
    UPDATE: "public.users.updated",
    DELETE: "public.users.deleted",
};

const getAndPushUnconsumedUserEvents = async (): Promise<void> => {
    const events = await userRepository.listOutboxUserUnconsumed();
    if (events.length === 0) return;

    const publishedIds: number[] = [];

    for (const event of events) {
        const topic = ACTION_TOPIC[event.action];

        try {
            await withRetry(() =>
                publish(topic, {
                    userId: event.userId,
                    action: event.action,
                    before: mapUserOutboxState(event.beforeState),
                    after: mapUserOutboxState(event.afterState),
                }),
            );

            publishedIds.push(event.id);
        } catch (error) {
            // withRetry already exhausted all attempts for this event.
            // Stop the batch here: this event and any after it (in order)
            // stay unconsumed and will be retried on the next tick.
            logger.error({ err: error, outboxId: event.id, action: event.action }, "Outbox event publish failed after retries, aborting batch");
            break;
        }
    }

    try {
        await withRetry(() => userRepository.markOutboxUserAsConsumed(publishedIds));
    } catch (error) {
        logger.error({ err: error, publishedIds },"Failed to mark published outbox events as consumed after retries");
    }
};


export {
    getAndPushUnconsumedUserEvents,
    mapUserOutboxState
};