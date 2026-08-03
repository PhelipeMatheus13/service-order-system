import type { RegisterInput, UserRecord, UserOutput } from "./user.types.js";

const registerInputDTO = (body: RegisterInput): RegisterInput => ({
    name: body.name,
    email: body.email,
    password: body.password,
});

const userOutputDTO = (user: UserRecord): UserOutput => ({
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
});

export {
    registerInputDTO,
    userOutputDTO,
};