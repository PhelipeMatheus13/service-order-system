import type { RegisterInput, UserRecord, ListUsersInput } from "./user.types.js";
import userRepository from "./user.repository.js";
import { hashPassword } from "../../shared/services/hash.js";
import { alreadyExists, notFound } from "../../shared/errors/errors.js";


const createUser = async (input: RegisterInput): Promise<UserRecord> => {
    const exists = await userRepository.existsByEmail(input.email);
    if (exists) throw alreadyExists({message: "Email already in use, please choose another"});

    const userCreated = userRepository.create(input);

    return userCreated;
};

const getUserById = async (id: string): Promise<UserRecord> => {
    const user = await userRepository.findById(id);
    if (!user) throw notFound({ message: "User not found" });
    return user;
};

const deleteUserById = async (id:string): Promise<void> => {
    const deleted = await userRepository.deleteById(id);
    if (!deleted) throw notFound({ message: "User not found" });
};

const listUsers = async(input:ListUsersInput): Promise<UserRecord[]> => {
    return userRepository.list(input);
}

export default {
    createUser,
    getUserById,
    deleteUserById,
    listUsers,
};