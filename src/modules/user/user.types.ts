interface RegisterInput {
    name: string;
    email: string;
    password: string;
}

// Database-facing shape, what is stored in the database
interface UserRecord {
    id: string;
    name: string;
    email: string;
    password: string;
    created_at: string;
    updated_at?: string;
}

// API-facing shape, what the client receives
interface UserOutput {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    updatedAt?: string;
}


export type {
    RegisterInput,
    UserRecord,
    UserOutput,
};