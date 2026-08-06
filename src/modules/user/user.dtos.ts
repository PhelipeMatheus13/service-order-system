import type { RegisterRequest } from "./user.schemas.js";
import type { RegisterInput, UserRecord, UserOutput } from "./user.types.js";

// DTOs are exercised through the controller unit tests.
// Since controllers are responsible for invoking these mappings,
// dedicated DTO tests would only duplicate the same assertions.

const registerInputDTO = (body: RegisterRequest): RegisterInput => ({
    name: body.name,
    email: body.email,
    password: body.password,
});

const userOutputDTO = (user: UserRecord): UserOutput => ({
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: String(user.createdAt),
    updatedAt: String(user.updatedAt),
});

export {
    registerInputDTO,
    userOutputDTO,
};