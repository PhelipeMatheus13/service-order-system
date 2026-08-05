import { getPrisma } from "../../shared/config/database.js";
import { Prisma } from "../../generated/prisma/client.js";
import type { RegisterInput, UserRecord } from "./user.types.js";

// Writer
const create = async (userData: RegisterInput): Promise<string> => {
    const prisma = getPrisma();
    const user = await prisma.user.create({
        data: {
            name: userData.name,
            email: userData.email,
            password: userData.password,
        },
        select: {id: true},
    });

    return user.id;
};

const deleteById = async (id: string): Promise<boolean> => {
    const prisma = getPrisma();
    try {
        await prisma.user.delete({where: { id }});
        return true
    } catch (error) {
        // if the user does not exist, Prisma will throw a known request error with code P2025
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return false;
        }
        throw error
    }
};

// Reader
const existsByEmail = async(email: string): Promise<boolean>  => {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({where: { email }});
    
    return !!user;
};

const findById = async(id: string): Promise<UserRecord | null>  => {
    const prisma = getPrisma();
    return prisma.user.findUnique({ where: { id } });
}; 

export default {
    // Writer
    create,
    deleteById,
    // Reader
    existsByEmail,
    findById,
};