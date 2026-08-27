import { vi, describe, beforeEach, it, expect } from "vitest";

import { sendEmailConfirmationCodeSubscriber } from "../../../../../src/modules/user/subscribers/user-created.js";

import generateSecure6DigitCode from "../../../../../src/shared/utils/secure-code.js";
import logger from "../../../../../src/shared/config/logger.js";
import userRepository from "../../../../../src/modules/user/user.repository.js";
import { sendConfirmationCode } from "../../../../../src/modules/user/user.emails.js";

vi.mock("../../../../../src/shared/utils/secure-code.js");
vi.mock("../../../../../src/shared/config/logger.js", () => ({
    default: {
        error: vi.fn(),
    },
}));
vi.mock("../../../../../src/modules/user/user.repository.js");
vi.mock("../../../../../src/modules/user/user.emails.js");

describe("User Created Subscriber (Unit)", () => {
    const messagePayload = {
        topic: "public.users.created",
        content: {
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

    const resourceValidation = {
        id: "validation-1",
        createdAt: new Date(),
        userId: "user-1",
        resourceType: "EMAIL" as const,
        challengerNumber: "123456",
        expiresAt: null,
        confirmedAt: null,
    }

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should have the correct subscriber configuration", () => {
        expect(sendEmailConfirmationCodeSubscriber.config).toEqual({
            topic: "public.users.created",
            queue: "user-created.send-email-confirmation-code",
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
            "Failed to process user-created event",
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
            .rejects.toThrow("user-created event missing 'after' state");

        expect(logger.error).toHaveBeenCalledWith(
            { payload: message.content },
            "Failed to process user-created event: payload is missing the 'after' state",
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
            });
    });
});