import type {
    User,
    Role,
    OutboxUser,
    UserResourceValidation,
    UserResourceValidationType
} from "../../generated/prisma/client.js";

interface RegisterInput {
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
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

interface ListUsersInput {
    options: ListUsersOption;
}

interface ListUsersOption {
    limit: number | null;
}

interface CreateResourceValidationInput {
    userId: string;
    resourceType: UserResourceValidationType;
    challengerNumber: string;
}

interface ConfirmEmailInput {
    email: string;
    challengerNumber: string;
}

interface ActivateUserInput {
    userId: string;
    validationId: string;
    password: string;
}

export type {
    RegisterInput,
    UserOutput,
    User as UserRecord,
    ListUsersInput,
    OutboxUser as OutboxUserRecord,
    UserResourceValidation as ResourceValidationRecord,
    CreateResourceValidationInput,
    UserResourceValidationType as ResourceValidationType,
    ConfirmEmailInput,
    ActivateUserInput
};
