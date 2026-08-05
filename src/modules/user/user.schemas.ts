import * as z from "zod";

const registerSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(3, "Name must be at least 3 characters long"),

        email: z
            .email("Please provide a valid email address")
            .trim(),

        password: z
            .string()
            .min(6, "Password must be at least 6 characters long")
            .regex(
                /[!@#$%^&*(),.?":{}|<>]/,
                "Password must contain at least one special character",
            ),

        confirmPassword: z.string(),
    })
    .refine(
        (data) => data.password === data.confirmPassword,
        { path: ["confirmPassword"], message: "Passwords do not match" }
    );
   
// Represents the validated request body received by the API.
// This type belongs to the transport layer and may differ from
// the domain input used by the service layer.
type RegisterRequest = z.infer<typeof registerSchema>;    

export { registerSchema };

export type { RegisterRequest };