import type {
    RegisterInput,
    UserRecord,
    ListUsersInput,
    ConfirmEmailInput,
    ActivateUserInput,
} from "./user.types.js";
import userRepository from "./user.repository.js";
import { generateActivationToken } from "../../shared/services/jwt.js";
import { hashPassword } from "../../shared/services/hash.js";
import { alreadyExists, notFound, conflict, unauthorized } from "../../shared/errors/errors.js";
import generateSecure6DigitCode from "../../shared/utils/secure-code.js";
import { getPrisma } from "../../shared/config/database.js";
import { resendConfirmationCode } from "./user.emails.js";


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

    const activationToken = generateActivationToken(resourceValidation.userId, resourceValidation.id);
    await userRepository.confirmResourceValidationById(resourceValidation?.id);

    return activationToken;
};

const activateUser = async (input: ActivateUserInput): Promise<void> => {
    const resourceValidation = await userRepository.findResourceValidationById(input.validationId);
    if (!resourceValidation) {
        throw notFound({ message: "Resource validation not found" });
    }

    if (resourceValidation.consumedAt) {
        throw conflict({ message: "Activation token already used" });
    }

    const passwordHash = await hashPassword(input.password);

    await getPrisma().$transaction(async (tx) => {
        const consumed = await userRepository.consumeResourceValidation(input.validationId, tx);

        if (!consumed) {
            // race condition: another transaction might have consumed the validation before this one
            throw conflict({ message: "Activation token already used" });
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