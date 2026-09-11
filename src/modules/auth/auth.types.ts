
interface LoginInput {
    email: string;
    password: string;
}

interface TokensOutput {
    accessToken: string;
    refreshToken: string;
}

export type {
    LoginInput,
    TokensOutput
}