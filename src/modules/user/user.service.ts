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

    if (resourceValidation.expiresAt && resourceValidation.expiresAt <= new Date()) {
        throw unauthorized({ message: "Challenger number expired", code: "CHALLENGER_NUMBER_EXPIRED" });
    }

    const activationToken = generateActivationToken(resourceValidation.userId);
    await userRepository.confirmResourceValidationById(resourceValidation?.id);

    return activationToken;
};

const activateUser = async (input: ActivateUserInput): Promise<void> => {
    const passwordHash = await hashPassword(input.password);
    await userRepository.activateAndSetPassword(input.userId, passwordHash)
};

export default {
    createUser,
    getUserById,
    deleteUserById,
    listUsers,
    confirmEmail,
    activateUser,
};