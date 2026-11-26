import { vi, describe, beforeEach, it, expect } from "vitest";

import {
    mapQuoteOutboxState,
    getAndPushUnconsumedQuoteEvents,
} from "../../../../../src/modules/service-order/jobs/outbox-quote-relay.js";

import serviceOrderRepository from "../../../../../src/modules/service-order/service-order.repository.js";
import { publish } from "../../../../../src/shared/pubsub/publisher.js";
import { withRetry } from "../../../../../src/shared/utils/retry.js";
import logger from "../../../../../src/shared/config/logger.js";

vi.mock("../../../../../src/modules/service-order/service-order.repository.js");
vi.mock("../../../../../src/shared/pubsub/publisher.js");
vi.mock("../../../../../src/shared/utils/retry.js");

vi.mock("../../../../../src/shared/config/logger.js", () => ({
    default: {
        error: vi.fn(),
    },
}));

describe("Quote Outbox (Unit)", () => {
    const quoteEvent = {
        id: 1,
        quoteId: "quote-1",
        eventType: "public.quotes.submission_requested" as string | null,
        action: "UPDATE" as const,
        beforeState: {
            status: "DRAFT",
            submission_requested_by: null,
        },
        afterState: {
            status: "SUBMISSION_PENDING",
            submission_requested_by: "user-1",
        },
        createdAt: new Date(),
        consumedAt: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("mapQuoteOutboxState", () => {
        it("should return null when raw state is null", () => {
            expect(mapQuoteOutboxState(null)).toBeNull();
        });

        it("should return null when raw state is not an object", () => {
            expect(mapQuoteOutboxState("invalid")).toBeNull();
            expect(mapQuoteOutboxState(123)).toBeNull();
            expect(mapQuoteOutboxState(undefined)).toBeNull();
        });

        it("should map a raw quote outbox state to the application format", () => {
            const raw = {
                status: "SUBMISSION_PENDING",
                submission_requested_by: "user-1",
            };

            const result = mapQuoteOutboxState(raw);

            expect(result).toEqual({
                status: "SUBMISSION_PENDING",
                submissionRequestedBy: "user-1",
            });
        });

        it("should default submissionRequestedBy to null when missing", () => {
            const result = mapQuoteOutboxState({ status: "DRAFT" });

            expect(result).toEqual({
                status: "DRAFT",
                submissionRequestedBy: null,
            });
        });
    });

    describe("getAndPushUnconsumedQuoteEvents", () => {
        it("should stop processing when it fails to fetch unprocessed events", async () => {
            const error = new Error("fake error");

            vi.mocked(serviceOrderRepository).listOutboxQuoteUnconsumed.mockRejectedValue(error);

            await expect(getAndPushUnconsumedQuoteEvents())
                .rejects.toThrow(error);

            expect(publish).not.toHaveBeenCalled();
            expect(serviceOrderRepository.markOutboxQuoteAsConsumed).not.toHaveBeenCalled();
        });

        it("should return without publishing when there are no unconsumed events", async () => {
            vi.mocked(serviceOrderRepository).listOutboxQuoteUnconsumed.mockResolvedValue([]);

            await getAndPushUnconsumedQuoteEvents();

            expect(publish).not.toHaveBeenCalled();
            expect(serviceOrderRepository.markOutboxQuoteAsConsumed).not.toHaveBeenCalled();
        });

        it("should log an error when publishing fails", async () => {
            const error = new Error("Pubsub unavailable");

            vi.mocked(serviceOrderRepository).listOutboxQuoteUnconsumed.mockResolvedValue([quoteEvent]);

            vi.mocked(publish).mockRejectedValue(error);
            vi.mocked(withRetry).mockImplementation(async (fn) => fn());

            await getAndPushUnconsumedQuoteEvents();

            expect(withRetry).toHaveBeenCalledWith(expect.any(Function));

            expect(logger.error).toHaveBeenCalledWith(
                {
                    err: error,
                    outboxId: 1,
                    action: "UPDATE",
                    eventType: "public.quotes.submission_requested",
                },
                "Outbox quote event publish failed after retries, aborting batch",
            );

            expect(serviceOrderRepository.markOutboxQuoteAsConsumed).toHaveBeenCalledWith([]);
        });

        it("should throw when it fails to mark events as consumed", async () => {
            const error = new Error("Failed to mark events as consumed");

            vi.mocked(serviceOrderRepository).listOutboxQuoteUnconsumed.mockResolvedValue([quoteEvent]);

            vi.mocked(withRetry).mockImplementation(async (fn) => fn());
            vi.mocked(publish).mockResolvedValue(undefined);
            vi.mocked(serviceOrderRepository).markOutboxQuoteAsConsumed.mockRejectedValue(error);

            await getAndPushUnconsumedQuoteEvents();

            expect(publish).toHaveBeenCalledWith(
                "public.quotes.submission_requested",
                {
                    quoteId: "quote-1",
                    action: "UPDATE",
                    eventType: "public.quotes.submission_requested",
                    before: {
                        status: "DRAFT",
                        submissionRequestedBy: null,
                    },
                    after: {
                        status: "SUBMISSION_PENDING",
                        submissionRequestedBy: "user-1",
                    },
                },
            );

            expect(serviceOrderRepository.markOutboxQuoteAsConsumed).toHaveBeenCalledWith([1]);

            expect(logger.error).toHaveBeenCalledWith(
                {
                    err: error,
                    publishedIds: [1],
                },
                "Failed to mark published outbox quote events as consumed after retries",
            );
        });

        it("should publish the event and mark it as consumed", async () => {
            vi.mocked(serviceOrderRepository).listOutboxQuoteUnconsumed.mockResolvedValue([quoteEvent]);

            vi.mocked(withRetry).mockImplementation(async (fn) => fn());
            vi.mocked(publish).mockResolvedValue(undefined);
            vi.mocked(serviceOrderRepository).markOutboxQuoteAsConsumed.mockResolvedValue(undefined);

            await getAndPushUnconsumedQuoteEvents();

            expect(withRetry).toHaveBeenCalledWith(expect.any(Function));

            expect(publish).toHaveBeenCalledWith(
                "public.quotes.submission_requested",
                {
                    quoteId: "quote-1",
                    action: "UPDATE",
                    eventType: "public.quotes.submission_requested",
                    before: {
                        status: "DRAFT",
                        submissionRequestedBy: null,
                    },
                    after: {
                        status: "SUBMISSION_PENDING",
                        submissionRequestedBy: "user-1",
                    },
                },
            );

            expect(serviceOrderRepository.markOutboxQuoteAsConsumed).toHaveBeenCalledWith([1]);
        });

        it("should fall back to the action-based topic when eventType is null", async () => {
            const eventWithoutType = { ...quoteEvent, eventType: null };

            vi.mocked(serviceOrderRepository).listOutboxQuoteUnconsumed.mockResolvedValue([eventWithoutType]);

            vi.mocked(withRetry).mockImplementation(async (fn) => fn());
            vi.mocked(publish).mockResolvedValue(undefined);
            vi.mocked(serviceOrderRepository).markOutboxQuoteAsConsumed.mockResolvedValue(undefined);

            await getAndPushUnconsumedQuoteEvents();

            expect(publish).toHaveBeenCalledWith(
                "public.quotes.updated",
                expect.objectContaining({
                    quoteId: "quote-1",
                    eventType: null,
                }),
            );

            expect(serviceOrderRepository.markOutboxQuoteAsConsumed).toHaveBeenCalledWith([1]);
        });

        it("should use the DELETE topic when action is DELETE and eventType is null", async () => {
            const deleteEvent = {
                ...quoteEvent,
                eventType: null,
                action: "DELETE" as const,
                afterState: null,
            };

            vi.mocked(serviceOrderRepository).listOutboxQuoteUnconsumed.mockResolvedValue([deleteEvent]);

            vi.mocked(withRetry).mockImplementation(async (fn) => fn());
            vi.mocked(publish).mockResolvedValue(undefined);
            vi.mocked(serviceOrderRepository).markOutboxQuoteAsConsumed.mockResolvedValue(undefined);

            await getAndPushUnconsumedQuoteEvents();

            expect(publish).toHaveBeenCalledWith(
                "public.quotes.deleted",
                expect.objectContaining({
                    quoteId: "quote-1",
                    action: "DELETE",
                }),
            );
        });

        it("should abort the batch when a publish fails, keeping later events unconsumed", async () => {
            const event1 = { ...quoteEvent, id: 1, quoteId: "quote-1" };
            const event2 = { ...quoteEvent, id: 2, quoteId: "quote-2" };
            const event3 = { ...quoteEvent, id: 3, quoteId: "quote-3" };

            vi.mocked(serviceOrderRepository).listOutboxQuoteUnconsumed
                .mockResolvedValue([event1, event2, event3]);
            vi.mocked(withRetry).mockImplementation(async (fn) => fn());
            vi.mocked(publish)
                .mockResolvedValueOnce(undefined)
                .mockRejectedValueOnce(new Error("publish failed"));
            vi.mocked(serviceOrderRepository).markOutboxQuoteAsConsumed.mockResolvedValue(undefined);

            await getAndPushUnconsumedQuoteEvents();

            expect(publish).toHaveBeenCalledTimes(2);
            expect(serviceOrderRepository.markOutboxQuoteAsConsumed).toHaveBeenCalledWith([event1.id]);
        });
    });
});