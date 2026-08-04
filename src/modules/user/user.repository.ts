import { getKnex } from "../../shared/config/database.js";
import type { RegisterInput, UserRecord } from "./user.types.js";

// Writer
const create = async (userData: RegisterInput): Promise<string> => {
    const knex = getKnex();
    const [response] = await knex("users")
        .insert({
            name:  userData.name,
            email: userData.email,
            password: userData.password
        })
        .returning("id");

    return response.id;
};

const deleteById = async (id: string): Promise<number> => {
    const knex = getKnex();
    return knex("users")
        .where({ id })
        .del();
};

// Reader
const existsByEmail = async(email: string): Promise<boolean>  => {
    const knex = getKnex();
    const result = await knex("users")
        .select("id")
        .where({ email })
        .first();

    return !!result;
};

const findById = async(id: string): Promise<UserRecord> => {
    const knex = getKnex();
    return knex("users")
        .select("id", "name", "email", "password", "created_at", "updated_at")
        .where({id: id})
        .first();
}; 

export default {
    // Writer
    create,
    deleteById,
    // Reader
    existsByEmail,
    findById,
};