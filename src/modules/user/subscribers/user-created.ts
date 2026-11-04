import type { Subscriber } from "../../../shared/pubsub/subscriber.js";
import PubsubError from "../../../shared/pubsub/error.js";
import generateSecure6DigitCode from "../../../shared/utils/secure-code.js";
import logger from "../../../shared/config/logger.js";
import { AppError } from "../../../shared/errors/errors.js";
import userRepository from "../user.repository.js";
import { sendConfirmationCode } from "../user.emails.js";

interface UserCreatedPayload {
    id: string;
    userId: string;
    action: string;
    after: {
        id: string;
        email: string;
        role: string;
        firstName: string;
        lastName: string;
    } | null;
}

type UserCreatedWithState = UserCreatedPayload & {
    after: NonNullable<UserCreatedPayload["after"]>;
};

interface SendCodeInput {
    payload: UserCreatedWithState;
    code: string;
}

/**
 * Sends the activation code and decides what to do with the mailer's idempotency errors.
 */
const sendCode = async ({ payload, code }: SendCodeInput): Promise<void> => {
    try {
        await sendConfirmationCode({
            to: payload.after.email,
            name: `${payload.after.firstName} ${payload.after.lastName}`,
            code,
            idempotencyKey: `user-email-verification/${payload.userId}`,
        });
    } catch (error) {
        if (error instanceof AppError && error.code === "IDEMPOTENCY_CONFLICT") {
            throw new PubsubError("user-email-verification: idempotency conflict while sending confirmation code", false); // DLQ
        }

        if (error instanceof AppError && error.code === "IDEMPOTENCY_IN_PROGRESS") {
            // The request that owns the key is still sending; if it fails, its own message retries.
            logger.warn({ payload }, "user-email-verification: confirmation code already being sent, skipping");
            return;
        }

        throw error;
    }
};

const sendEmailConfirmationCodeSubscriber: Subscriber = {
    config: {
        topic: "public.users.created",
        queue: "user-email-verification.send-code-to-user",
        prefetch: 1,
    },
    handler: async (message) => {
        const payload = message.content as UserCreatedPayload;

        if (!payload.after) {
            logger.error({ payload }, "user-email-verification: payload is missing the 'after' state, aborting processing");
            throw new PubsubError("user-email-verification: event missing 'after' state", false);  // DLQ
        }

        const payloadWithState = payload as UserCreatedWithState;

        // find the latest resource validation for this user
        const resourceValidation = await userRepository.findResourceValidationByUserId(payload.userId, "EMAIL");

        // already confirmed, no need to send another code
        if (resourceValidation?.confirmedAt) {
            return;
        }

        // If the code is still valid, try resending it
        if (resourceValidation && resourceValidation.expiresAt > new Date()) {
            await sendCode({ payload: payloadWithState, code: resourceValidation.challengerNumber });
            return;
        }

        const verificationCode = generateSecure6DigitCode();

        await userRepository.createResourceValidation({
            userId: payload.userId,
            challengerNumber: verificationCode,
            resourceType: "EMAIL",
        });

        await sendCode({ payload: payloadWithState, code: verificationCode });
    },
    onError: (error, message) => {
        logger.error({ err: error, message }, "user-email-verification: failed to process event");
    },
};

export { 
    sendEmailConfirmationCodeSubscriber, 
    sendCode, // export for testing purposes
};