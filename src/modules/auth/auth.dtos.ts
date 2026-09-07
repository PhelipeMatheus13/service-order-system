import type { LoginRequest, TokensOutputResponse } from "./auth.schemas.js"; 
import type { LoginInput, TokensOutput } from "./auth.types.js";

const loginInputDTO = (body: LoginRequest): LoginInput => ({
    email: body.email,
    password: body.password,
});

const tokensOutputDTO = (tokens: TokensOutput): TokensOutputResponse => ({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
});

export default {
    loginInputDTO,
    tokensOutputDTO,
};