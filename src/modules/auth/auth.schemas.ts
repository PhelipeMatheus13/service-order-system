import { z } from "zod";
import registry from "../../shared/docs/registry.js";

const loginSchema = registry.register(
    "LoginRequest",
    z.object({
        email: z
            .email("Please provide a valid email address")
            .trim()
            .openapi({ example: "johndoe@hotmail.com" }),

        password: z
            .string()
            .min(1, "Password is required")
            .openapi({ example: "Str0ng!P4ss" }),
    })
);

type LoginRequest = z.infer<typeof loginSchema>;

const refreshSchema = registry.register(
    "refreshSchema",
    z.object({
        refreshToken: z
            .string()
            .min(1, "Refresh token is required")
            .openapi({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }),
    })
);

const logoutSchema = registry.register(
    "LogoutInput",
    z.object({
        refreshToken: z
            .string()
            .min(1, "Refresh token is required")
            .openapi({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }),
    })
);

const logoutAllSchema = registry.register(
    "LogoutAllInput",
    z.object({
        refreshToken: z
            .string()
            .min(1, "Refresh token is required")
            .openapi({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }),
    })
);

const tokensOutputSchema = registry.register(
    "TokensOutput",
    z.object({
        accessToken: z.string().openapi({ example: "accessToken" }),
        refreshToken: z.string().openapi({ example: "refreshToken" }),
    })
);

type TokensOutputResponse = z.infer<typeof tokensOutputSchema>;


export {
    loginSchema,
    refreshSchema,
    logoutSchema,
    logoutAllSchema,
    tokensOutputSchema,
};

export type {
    LoginRequest,
    TokensOutputResponse
};