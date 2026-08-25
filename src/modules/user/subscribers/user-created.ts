import type { Subscriber } from "../../../shared/pubsub/subscriber.js";
import PubsubError from "../../../shared/pubsub/error.js";
import generateSecure6DigitCode from "../../../shared/utils/secure-code.js";
import logger from "../../../shared/config/logger.js";
import userRepository from "../user.repository.js";
import { sendActivationEmail } from "../user.emails.js";

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

const sendActivationEmailSubscriber: Subscriber = {
    config: {
        topic: "public.users.created",
        queue: "user-created.send-activation-email",
        prefetch: 1,
    },
    handler: async (message) => {
        const payload = message.content as UserCreatedPayload;

        if (!payload.after) {
            logger.error({ payload }, "Failed to process user-created event: payload is missing the 'after' state");
            throw new PubsubError("user-created event missing 'after' state", false);
        }

        const resourceValidation = await userRepository.findResourceValidation(payload.userId, "EMAIL");

        if (resourceValidation?.confirmedAt) {
            return;
        }

        if (resourceValidation && resourceValidation.expiresAt !== null && resourceValidation.expiresAt > new Date()) {
            await sendActivationEmail({
                to: payload.after.email,
                name: `${payload.after.firstName} ${payload.after.lastName}`,
                code: resourceValidation.challengerNumber,
            });
            return;
        }

        const verificationCode = generateSecure6DigitCode();

        await userRepository.createResourceValidation({
            userId: payload.userId,
            challengerNumber: verificationCode,
            resourceType: "EMAIL",
        });

        await sendActivationEmail({
            to: payload.after.email,
            name: `${payload.after.firstName} ${payload.after.lastName}`,
            code: verificationCode,
        });
    },
    onError: (error, message) => {
        logger.error({ err: error, message }, "Failed to process user-created event");
    },
};

export { sendActivationEmailSubscriber };