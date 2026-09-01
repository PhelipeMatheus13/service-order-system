import { vi, describe, beforeEach, it, expect } from "vitest";

import {
    mapUserOutboxState,
    getAndPushUnconsumedUserEvents,
} from "../../../../../src/modules/user/jobs/outbox-relay.js";

import userRepository from "../../../../../src/modules/user/user.repository.js";
import { publish } from "../../../../../src/shared/pubsub/publisher.js";
import { withRetry } from "../../../../../src/shared/utils/retry.js";
import logger from "../../../../../src/shared/config/logger.js";

vi.mock("../../../../../src/modules/user/user.repository.js");
vi.mock("../../../../../src/shared/pubsub/publisher.js");
vi.mock("../../../../../src/shared/utils/retry.js");

vi.mock("../../../../../src/shared/config/logger.js", () => ({
    default: {
        error: vi.fn(),
    },
}));

describe("User Outbox (Unit)", () => {
    const userEvent = {
        id: 1,
        userId: "user-1",
        action: "INSERT" as const,
        beforeState: null,
        afterState: {
            id: "user-1",
            first_name: "Jhon",
            last_name: "Doe",
            phone_number: "5521995437105",
            email: "jhon@example.com",
            role: "ATTENDANT",
            active: false,
            created_at: "2026-08-23T12:00:00.000Z",
            updated_at: null,
        },
        createdAt: new Date(),
        consumedAt: null,
        retriedAt: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("mapUserOutboxState", () => {
        it("should return null when raw state is null", () => {
            expect(mapUserOutboxState(null)).toBeNull();
        });

        it("should return null when raw state is not an object", () => {
            expect(mapUserOutboxState("invalid")).toBeNull();
            expect(mapUserOutboxState(123)).toBeNull();
            expect(mapUserOutboxState(undefined)).toBeNull();
        });

        it("should map a raw user outbox state to the application format", () => {
            const raw = {
                id: "user-123",
                first_name: "Jhon",
                last_name: "Doe",
                phone_number: null,
                email: "jhon@example.com",
                role: "ATTENDANT",
                active: false,
                created_at: "2026-08-23T12:00:00.000Z",
                updated_at: null,
            };

            const result = mapUserOutboxState(raw);

            expect(result).toEqual({
                id: "user-123",
                firstName: "Jhon",
                lastName: "Doe",
                phoneNumber: null,
                email: "jhon@example.com",
                role: "ATTENDANT",
                active: false,
                createdAt: "2026-08-23T12:00:00.000Z",
                updatedAt: null,
            });
        });
    });

    describe("getAndPushUnconsumedUserEvents", () => {
        it("should stop processing when it fails to fetch unprocessed events", async () => {
            const error = new Error("fake error");

            vi.mocked(userRepository).listOutboxUserUnconsumed.mockRejectedValue(error);

            await expect(getAndPushUnconsumedUserEvents())
                .rejects.toThrow(error);

            expect(publish).not.toHaveBeenCalled();
            expect(userRepository.markOutboxUserAsConsumed).not.toHaveBeenCalled();
        });

        it("should return without publishing when there are no unconsumed events", async () => {
            vi.mocked(userRepository).listOutboxUserUnconsumed.mockResolvedValue([]);

            await getAndPushUnconsumedUserEvents();

            expect(publish).not.toHaveBeenCalled();
            expect(userRepository.markOutboxUserAsConsumed).not.toHaveBeenCalled();
        });

        it("should log an error when publishing fails", async () => {
            const error = new Error("Pubsub unavailable");

            vi.mocked(userRepository).listOutboxUserUnconsumed.mockResolvedValue([userEvent]);

            vi.mocked(publish).mockRejectedValue(error);
            vi.mocked(withRetry).mockImplementation(async (fn) => fn());

            await getAndPushUnconsumedUserEvents();

            expect(withRetry).toHaveBeenCalledWith(expect.any(Function));

            expect(logger.error).toHaveBeenCalledWith(
                {
                    err: error,
                    outboxId: 1,
                    action: "INSERT",
                },
                "Outbox event publish failed after retries, aborting batch",
            );

            expect(userRepository.markOutboxUserAsConsumed).toHaveBeenCalledWith([]);
        });

        it("should throw when it fails to mark events as consumed", async () => {
            const error = new Error("Failed to mark events as consumed");

            vi.mocked(userRepository).listOutboxUserUnconsumed.mockResolvedValue([userEvent]);

            vi.mocked(withRetry).mockImplementation(async (fn) => fn());
            vi.mocked(publish).mockResolvedValue(undefined);
            vi.mocked(userRepository).markOutboxUserAsConsumed.mockRejectedValue(error);

            await getAndPushUnconsumedUserEvents();

            expect(publish).toHaveBeenCalledWith(
                "public.users.created",
                {
                    userId: "user-1",
                    action: "INSERT",
                    before: null,
                    after: {
                        id: "user-1",
                        firstName: "Jhon",
                        lastName: "Doe",
                        phoneNumber: "5521995437105",
                        email: "jhon@example.com",
                        role: "ATTENDANT",
                        active: false,
                        createdAt: "2026-08-23T12:00:00.000Z",
                        updatedAt: null,
                    },
                },
            );

            expect(userRepository.markOutboxUserAsConsumed).toHaveBeenCalledWith([1]);

            expect(logger.error).toHaveBeenCalledWith(
                {
                    err: error,
                    publishedIds: [1],
                },
                "Failed to mark published outbox events as consumed after retries",
            );
        });

        it("should publish the event and mark it as consumed", async () => {
            vi.mocked(userRepository).listOutboxUserUnconsumed.mockResolvedValue([userEvent]);

            vi.mocked(withRetry).mockImplementation(async (fn) => fn());
            vi.mocked(publish).mockResolvedValue(undefined);
            vi.mocked(userRepository).markOutboxUserAsConsumed.mockResolvedValue(undefined);

            await getAndPushUnconsumedUserEvents();

            expect(withRetry).toHaveBeenCalledWith(expect.any(Function));

            expect(publish).toHaveBeenCalledWith(
                "public.users.created",
                {
                    userId: "user-1",
                    action: "INSERT",
                    before: null,
                    after: {
                        id: "user-1",
                        firstName: "Jhon",
                        lastName: "Doe",
                        phoneNumber: "5521995437105",
                        email: "jhon@example.com",
                        role: "ATTENDANT",
                        active: false,
                        createdAt: "2026-08-23T12:00:00.000Z",
                        updatedAt: null,
                    },
                },
            );

            expect(userRepository.markOutboxUserAsConsumed).toHaveBeenCalledWith([1]);
        });
    });
});