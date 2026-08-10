import { z } from "zod";
import registry  from "../../shared/docs/registry.js";

const registerSchema = registry.register(
    "RegisterInput",
    z.object({
        name: z
            .string()
            .trim()
            .min(3, "Name must be at least 3 characters long")
            .openapi({example: "John Doe"}),

        email: z
            .email("Please provide a valid email address")
            .trim()
            .openapi({example: "johndoe@hotmail.com"}),

        password: z
            .string()
            .min(6, "Password must be at least 6 characters long")
            .regex(
                /[!@#$%^&*(),.?":{}|<>]/,
                "Password must contain at least one special character",
            )
            .openapi({example: "Str0ng!Pass"}),

        confirmPassword: z.string().openapi({ example: "Str0ng!Pass" }),
    })
    .refine(
        (data) => data.password === data.confirmPassword,
        { path: ["confirmPassword"], message: "Passwords do not match" }
    ),
);


const userSchema = registry.register(
    "User",
    z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
    })
);
   
// Represents the validated request body received by the API.
// This type belongs to the transport layer and may differ from
// the domain input used by the service layer.
type RegisterRequest = z.infer<typeof registerSchema>;    

export { 
    registerSchema, 
    userSchema,
};

export type { RegisterRequest };