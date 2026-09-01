import type { RegisterRequest, confirmEmailRequest, activateUserRequest } from "./user.schemas.js";
import { AuthenticatedUser } from "../../shared/types/auth.js";
import type { 
    RegisterInput, 
    UserRecord, 
    UserOutput, 
    ConfirmEmailInput,
    ActivateUserInput,
} from "./user.types.js";

// DTOs are exercised through the controller unit tests.
// Since controllers are responsible for invoking these mappings,
// dedicated DTO tests would only duplicate the same assertions.

const sanitizePhoneNumber = (phone: string | null): string | null => {
    if (!phone) return null;
    return phone.replace(/\D/g, "");
};

const registerInputDTO = (body: RegisterRequest): RegisterInput => ({
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phoneNumber: sanitizePhoneNumber(body.phoneNumber),
    role: body.role,
});

const userOutputDTO = (user: UserRecord): UserOutput => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: String(user.createdAt),
    updatedAt: user.updatedAt ? String(user.updatedAt) : null,
});


const usersOutputDTO = (users: UserRecord[]): UserOutput[] =>
    users.map((user) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role,
        active: user.active,
        createdAt: String(user.createdAt),
        updatedAt: user.updatedAt ? String(user.updatedAt) : null,
    }));

const confirmEmailDTO = (body: confirmEmailRequest): ConfirmEmailInput => ({
    email: body.email,
    challengerNumber: body.challengerNumber,
});

const activateUserDTO = (user: AuthenticatedUser, jti: string, body: activateUserRequest): ActivateUserInput => ({
    userId: user.id,
    jti,
    password: body.password,
});

export default {
    registerInputDTO,
    userOutputDTO,
    usersOutputDTO,
    confirmEmailDTO,
    activateUserDTO,
};