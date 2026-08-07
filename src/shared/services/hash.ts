import bcrypt  from "bcrypt";
import logger from "../config/logger.js";
import { internal } from "../errors/errors.js";

const hashPassword = async (password: string): Promise<string> => {
    try {
        const salt = await bcrypt.genSalt(12);
        return bcrypt.hash(password, salt);
    } catch (error) {
        logger.error({err: error}, "Unexpected error while hashing password");
        throw internal();
    }
};

const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    try {
        // Await ensures rejected promises are caught by this try/catch.
        return await bcrypt.compare(password, hash);
    } catch (error) {
        logger.error({ err: error }, "Unexpected error while compare password");
        throw internal();
    }
};

export { hashPassword, comparePassword };