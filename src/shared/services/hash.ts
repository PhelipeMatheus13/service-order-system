import bcrypt  from "bcrypt";
import logger from "../utils/logger.js";
import { internal } from "../errors/errors.js";

const hashPassword = async (password: string): Promise<string> => {
    try {
        const salt = await bcrypt.genSalt(12);
        return bcrypt.hash(password, salt);
    } catch (error) {
        logger.error({err: error}, "Bcrypt password hashing error");
        throw internal();
    }
};

const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    try {
        return bcrypt.compare(password, hash);
    } catch (error) {
        logger.error({ err: error }, "Bcrypt password compare error");
        throw internal();
    }
};

export { hashPassword, comparePassword };