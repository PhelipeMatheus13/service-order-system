import type { RegisterInput, UserRecord } from "./user.types.js";
import userRepository from "./user.repository.js";
import { hashPassword } from "../../shared/services/hash.service.js";
import { alreadyExists, notFound } from "../../shared/errors/errors.js";


const createUser = async (data: RegisterInput): Promise<string> => {
    const exists = await userRepository.existsByEmail(data.email);
    if (exists) throw alreadyExists({message: "Email already in use, please choose another"});

    // Hash the password before saving the user
    const hashedPassword = await hashPassword(data.password);

    return userRepository.create({
        ...data,
        password: hashedPassword
    });
};

const getUserById = async (id: string): Promise<UserRecord> => {
    const user = await userRepository.findById(id);
    if (!user) throw notFound({ message: "User not found" });
    return user;
};

const deleteUserById = async (id:string): Promise<void> => {
    const deletedRows = await userRepository.deleteById(id);

    if (deletedRows === 0) {
        throw notFound({ message: "User not found" });
    }
};

export default {
    createUser,
    getUserById,
    deleteUserById,
};