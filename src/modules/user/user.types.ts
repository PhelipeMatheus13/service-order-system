import type { User } from "../../generated/prisma/client.js";

interface RegisterInput {
    name: string;
    email: string;
    password: string;
}

interface UserOutput {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    updatedAt?: string;
}

export type { RegisterInput, UserOutput };
export type { User as UserRecord };