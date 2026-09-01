// (Node built‑ins)
import { randomUUID } from "node:crypto";
// (Types)
import type {
    ActivateUserInput,
    ConfirmEmailInput,
    ListUsersInput,
    RegisterInput,
    UserRecord,
} from "./user.types.js";
// (shared)
import { getPrisma } from "../../shared/config/database.js";
import logger from "../../shared/config/logger.js";
import { alreadyExists, conflict, notFound, unauthorized } from "../../shared/errors/errors.js";
import { hashPassword } from "../../shared/services/hash.js";
import { generateActivationToken } from "../../shared/services/jwt.js";
import { hashToken } from "../../shared/services/token-hash.js";
import generateSecure6DigitCode from "../../shared/utils/secure-code.js";
// (local modules)
import { resendConfirmationCode } from "./user.emails.js";
import userRepository from "./user.repository.js";

const createUser = async (input: RegisterInput): Promise<UserRecord> => {
    const exists = await userRepository.existsByEmail(input.email);
    if (exists) throw alreadyExists({ message: "Email already in use, please choose another" });

    const userCreated = userRepository.create(input);

    return userCreated;
};

const getUserById = async (id: string): Promise<UserRecord> => {
    const user = await userRepository.findById(id);
    if (!user) throw notFound({ message: "User not found" });
    return user;
};

const deleteUserById = async (id: string): Promise<void> => {
    const deleted = await userRepository.deleteById(id);
    if (!deleted) throw notFound({ message: "User not found" });
};

const listUsers = async (input: ListUsersInput): Promise<UserRecord[]> => {
    return userRepository.list(input);
};

const confirmEmail = async (input: ConfirmEmailInput): Promise<string> => {
    const resourceValidation = await userRepository.findResourceValidationByEmail(input.email);

    if (!resourceValidation) {
        throw notFound({ message: "Resource validation not found" });
    }

    if (resourceValidation.challengerNumber !== input.challengerNumber) {
        throw unauthorized({ message: "Invalid challenger number", code: "INVALID_CHALLENGER_NUMBER" });
    }

    if (resourceValidation.confirmedAt) {
        throw conflict({ message: "Resource validation already confirmed" });
    }

    if (resourceValidation.expiresAt <= new Date()) {
        throw unauthorized({ message: "Challenger number expired", code: "CHALLENGER_NUMBER_EXPIRED" });
    }

    const { activationToken, tokenPayload } = generateActivationToken(resourceValidation.userId, randomUUID());

    await getPrisma().$transaction(async (tx) => {
        const confirmed = await userRepository.confirmResourceValidationById(resourceValidation?.id, tx);

        if (!confirmed) {
            throw conflict({ message: "Resource validation already confirmed" });
        }

        await userRepository.createUserActivationToken({
            userId: resourceValidation.userId,
            jti: tokenPayload.jti,
            tokenHash: hashToken(activationToken),
            expiresAt: new Date(tokenPayload.exp * 1000),
        }, tx)
    });

    return activationToken;
};

const activateUser = async (input: ActivateUserInput): Promise<void> => {
    const activationToken = await userRepository.findUserActivationTokenByJti(input.jti);
    if (!activationToken) {
        throw notFound({ message: "Activation token not found", code: "TOKEN_NOT_FOUND" });
    }

    if (activationToken.consumedAt) {
        logger.error({
            userId: input.userId,
            jti: input.jti,
        }, "Activation token reuse detected");

        throw unauthorized({ message: "Activation token reuse detected", code: "TOKEN_REUSE_DETECTED" });
    }

    const passwordHash = await hashPassword(input.password);

    await getPrisma().$transaction(async (tx) => {
        const consumed = await userRepository.consumeUserActivationTokenByJti(input.jti, tx);

        if (!consumed) {
            logger.error({
                userId: input.userId,
                jti: input.jti,
            }, "Activation token reuse detected: race condition on token consumption");

            throw unauthorized({ message: "Activation token reuse detected", code: "TOKEN_REUSE_DETECTED" });
        }

        await userRepository.activateAndSetPassword(input.userId, passwordHash, tx);
    });
};

const resendEmailConfirmationCode = async (email: string): Promise<void> => {
    const user = await userRepository.findByEmail(email);

    if (!user) {
        // Silently return to prevent email enumeration (security best practice)
        return;
    }

    const verificationCode = generateSecure6DigitCode();

    await getPrisma().$transaction(async (tx) => {
        await userRepository.invalidateActiveEmailValidations(email, tx);

        await userRepository.createResourceValidation(
            {
                userId: user.id,
                challengerNumber: verificationCode,
                resourceType: "EMAIL",
            },
            tx,
        );
    });

    await resendConfirmationCode({
        to: user.email,
        name: `${user.firstName} ${user.lastName}`,
        code: verificationCode,
    });
};

export default {
    createUser,
    getUserById,
    deleteUserById,
    listUsers,
    confirmEmail,
    activateUser,
    resendEmailConfirmationCode,
};