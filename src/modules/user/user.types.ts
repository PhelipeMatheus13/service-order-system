import type { User, Role } from "../../generated/prisma/client.js";

interface RegisterInput {
    firstName: string;
    lastName: string;
    phoneNumber: string | null ;
    email: string;
    role: Role;
}

interface UserOutput {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    email: string;
    role: Role;
    active: boolean;
    createdAt: string;
    updatedAt: string | null;
}

export type { 
    RegisterInput, 
    UserOutput,
    User as UserRecord,
};
