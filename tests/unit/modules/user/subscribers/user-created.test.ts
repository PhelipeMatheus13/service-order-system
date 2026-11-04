import { vi, describe, beforeEach, it, expect } from "vitest";

import { sendEmailConfirmationCodeSubscriber, sendCode } from "../../../../../src/modules/user/subscribers/user-created.js";

import generateSecure6DigitCode from "../../../../../src/shared/utils/secure-code.js";
import { conflict } from "../../../../../src/shared/errors/errors.js";
import logger from "../../../../../src/shared/config/logger.js";
import userRepository from "../../../../../src/modules/user/user.repository.js";
import { sendConfirmationCode } from "../../../../../src/modules/user/user.emails.js";

vi.mock("../../../../../src/shared/utils/secure-code.js");
vi.mock("../../../../../src/shared/config/logger.js", () => ({
    default: {
        error: vi.fn(),
        warn: vi.fn(),
    },
}));
vi.mock("../../../../../src/modules/user/user.repository.js");
vi.mock("../../../../../src/modules/user/user.emails.js");

describe("User Created Subscriber (Unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("sendCode (Unit)", () => {
        const payload = {
            id: "event-1",
            userId: "user-1",
            action: "INSERT",
            after: {
                id: "user-1",
                email: "jhon@example.com",
                role: "ATTENDANT",
                firstName: "Jhon",
                lastName: "Doe",
            },
        };

        it("should send the confirmation code with the expected payload", async () => {
            vi.mocked(sendConfirmationCode).mockResolvedValue(undefined);

            await sendCode({ payload, code: "123456" });

            expect(sendConfirmationCode).toHaveBeenCalledWith({
                to: "jhon@example.com",
                name: "Jhon Doe",
                code: "123456",
                idempotencyKey: "user-email-verification/user-1",
            });

            expect(logger.warn).not.toHaveBeenCalled();
        });

        it("should throw a non-retriable PubsubError on IDEMPOTENCY_CONFLICT", async () => {
            vi.mocked(sendConfirmationCode).mockRejectedValue(
                conflict({
                    code: "IDEMPOTENCY_CONFLICT",
                    message: "Idempotency key reused with a different payload",
                }),
            );

            await expect(sendCode({ payload, code: "123456" }))
                .rejects.toMatchObject({
                    retriable: false,
                    message: "user-email-verification: idempotency conflict while sending confirmation code",
                });

            expect(logger.warn).not.toHaveBeenCalled();
        });

        it("should log a warning and return on IDEMPOTENCY_IN_PROGRESS", async () => {
            vi.mocked(sendConfirmationCode).mockRejectedValue(
                conflict({
                    code: "IDEMPOTENCY_IN_PROGRESS",
                    message: "A request with the same idempotency key is still being processed",
                }),
            );

            await expect(sendCode({ payload, code: "123456" })).resolves.toBeUndefined();

            expect(logger.warn).toHaveBeenCalledWith(
                { payload },
                "user-email-verification: confirmation code already being sent, skipping",
            );
        });

        it("should rethrow any other error", async () => {
            const error = new Error("SMTP down");

            vi.mocked(sendConfirmationCode).mockRejectedValue(error);

            await expect(sendCode({ payload, code: "123456" })).rejects.toBe(error);

            expect(logger.warn).not.toHaveBeenCalled();
        });
    });

    describe("sendEmailConfirmationCodeSubscriber", () => {
        const messagePayload = {
            topic: "public.users.created",
            content: {
                id: 1,
                eventId: "event-1",
                userId: "user-1",
                action: "INSERT",
                after: {
                    id: "user-1",
                    email: "jhon@example.com",
                    role: "ATTENDANT",
                    firstName: "Jhon",
                    lastName: "Doe",
                },
            },
        }

        const idempotencyKey = "user-email-verification/user-1";

        const now = new Date();

        const resourceValidation = {
            id: "validation-1",
            createdAt: now,
            userId: "user-1",
            resourceType: "EMAIL" as const,
            challengerNumber: "123456",
            expiresAt: new Date(now.getTime() + 10 * 60 * 1000), // 10 min
            confirmedAt: null,
            consumedAt: null,
        }

        it("should have the correct subscriber configuration", () => {
            expect(sendEmailConfirmationCodeSubscriber.config).toEqual({
                topic: "public.users.created",
                queue: "user-email-verification.send-code-to-user",
                prefetch: 1,
            });

            expect(sendEmailConfirmationCodeSubscriber.handler).toEqual(expect.any(Function));

            expect(sendEmailConfirmationCodeSubscriber.onError).toEqual(expect.any(Function));
        });

        it("should log an error when processing the event fails", () => {
            const error = new Error("Failed to process user-created event");

            sendEmailConfirmationCodeSubscriber.onError?.(error, messagePayload);

            expect(logger.error).toHaveBeenCalledWith(
                {
                    err: error,
                    message: messagePayload,
                },
                "user-email-verification: failed to process event",
            );
        });

        it("should throw when the event does not contain an after state", async () => {
            const message = {
                topic: "public.users.created",
                content: {
                    eventId: "event-1",
                    userId: "user-1",
                    action: "INSERT",
                    after: null,
                },
            };

            await expect(sendEmailConfirmationCodeSubscriber.handler(message))
                .rejects.toThrow("user-email-verification: event missing 'after' state");

            expect(logger.error).toHaveBeenCalledWith(
                { payload: message.content },
                "user-email-verification: payload is missing the 'after' state, aborting processing",
            );

            expect(userRepository.findResourceValidationByUserId).not.toHaveBeenCalled();

            expect(userRepository.createResourceValidation).not.toHaveBeenCalled();

            expect(sendConfirmationCode).not.toHaveBeenCalled();
        });

        it("should throw when it fails to find the resource validation", async () => {
            const error = new Error("Failed to find resource validation");

            vi.mocked(userRepository).findResourceValidationByUserId.mockRejectedValue(error);

            await expect(sendEmailConfirmationCodeSubscriber.handler(messagePayload))
                .rejects.toThrow(error);

            expect(generateSecure6DigitCode).not.toHaveBeenCalled();

            expect(userRepository.createResourceValidation).not.toHaveBeenCalled();

            expect(sendConfirmationCode).not.toHaveBeenCalled();
        });

        it("should return when the resource validation is already confirmed", async () => {
            vi.mocked(userRepository).findResourceValidationByUserId.mockResolvedValue({
                ...resourceValidation,
                confirmedAt: new Date(),
            });

            await sendEmailConfirmationCodeSubscriber.handler(messagePayload);

            expect(userRepository.findResourceValidationByUserId)
                .toHaveBeenCalledWith("user-1", "EMAIL");

            expect(generateSecure6DigitCode).not.toHaveBeenCalled();

            expect(userRepository.createResourceValidation).not.toHaveBeenCalled();

            expect(sendConfirmationCode).not.toHaveBeenCalled();
        });

        it("should send the activation email using the existing valid resource validation", async () => {
            vi.mocked(userRepository).findResourceValidationByUserId.mockResolvedValue({
                ...resourceValidation,
                expiresAt: new Date(Date.now() + 60_000),
            });

            vi.mocked(sendConfirmationCode).mockResolvedValue(undefined);

            await sendEmailConfirmationCodeSubscriber.handler(messagePayload);

            expect(userRepository.findResourceValidationByUserId)
                .toHaveBeenCalledWith("user-1", "EMAIL");

            expect(generateSecure6DigitCode).not.toHaveBeenCalled();

            expect(userRepository.createResourceValidation).not.toHaveBeenCalled();

            expect(sendConfirmationCode)
                .toHaveBeenCalledWith({
                    to: "jhon@example.com",
                    name: "Jhon Doe",
                    code: "123456",
                    idempotencyKey,
                });
        });

        it("should throw when it fails to create the resource validation", async () => {
            const error = new Error("Failed to create resource validation");

            vi.mocked(userRepository).findResourceValidationByUserId.mockResolvedValue(null);

            vi.mocked(generateSecure6DigitCode).mockReturnValue("123456");

            vi.mocked(userRepository).createResourceValidation.mockRejectedValue(error);

            await expect(sendEmailConfirmationCodeSubscriber.handler(messagePayload))
                .rejects.toThrow(error);

            expect(userRepository.findResourceValidationByUserId)
                .toHaveBeenCalledWith("user-1", "EMAIL");

            expect(generateSecure6DigitCode).toHaveBeenCalled();

            expect(userRepository.createResourceValidation)
                .toHaveBeenCalledWith({
                    userId: "user-1",
                    challengerNumber: "123456",
                    resourceType: "EMAIL",
                });

            expect(sendConfirmationCode).not.toHaveBeenCalled();
        });

        it("should throw when it fails to send the activation email", async () => {
            const error = new Error("Failed to send activation email");

            vi.mocked(userRepository).findResourceValidationByUserId.mockResolvedValue(null);

            vi.mocked(generateSecure6DigitCode).mockReturnValue("123456");

            vi.mocked(userRepository).createResourceValidation.mockResolvedValue(resourceValidation);

            vi.mocked(sendConfirmationCode).mockRejectedValue(error);

            await expect(sendEmailConfirmationCodeSubscriber.handler(messagePayload))
                .rejects.toThrow(error);

            expect(userRepository.findResourceValidationByUserId)
                .toHaveBeenCalledWith("user-1", "EMAIL");

            expect(userRepository.createResourceValidation)
                .toHaveBeenCalledWith({
                    userId: "user-1",
                    challengerNumber: "123456",
                    resourceType: "EMAIL",
                });

            expect(sendConfirmationCode)
                .toHaveBeenCalledWith({
                    to: "jhon@example.com",
                    name: "Jhon Doe",
                    code: "123456",
                    idempotencyKey,
                });
        });

        it("should create the resource validation and send the activation email", async () => {
            vi.mocked(userRepository).findResourceValidationByUserId.mockResolvedValue(null);

            vi.mocked(generateSecure6DigitCode).mockReturnValue("123456");

            vi.mocked(userRepository).createResourceValidation.mockResolvedValue(resourceValidation);

            vi.mocked(sendConfirmationCode).mockResolvedValue(undefined);

            await sendEmailConfirmationCodeSubscriber.handler(messagePayload);

            expect(userRepository.findResourceValidationByUserId)
                .toHaveBeenCalledWith("user-1", "EMAIL");

            expect(generateSecure6DigitCode).toHaveBeenCalled();

            expect(userRepository.createResourceValidation)
                .toHaveBeenCalledWith({
                    userId: "user-1",
                    challengerNumber: "123456",
                    resourceType: "EMAIL",
                });

            expect(sendConfirmationCode)
                .toHaveBeenCalledWith({
                    to: "jhon@example.com",
                    name: "Jhon Doe",
                    code: "123456",
                    idempotencyKey,
                });
        });
    });
});