import { body, validationResult }  from "express-validator";
import type { Request, Response, NextFunction } from "express";
import { unprocessable } from "../../shared/errors/errors.js";

/**
 * Request validation middleware for user registration.
 *
 * Validates the required fields and returns validation errors
 * if any input does not meet the expected criteria.
 */
const validateRegister = [
    body("name")
        .trim()
        .notEmpty().withMessage("Name is required").bail()
        .isLength({ min: 3 }).withMessage("Name must be at least 3 characters long"),

    body("email")
        .trim()
        .notEmpty().withMessage("Email is required").bail()
        .normalizeEmail()
        .isEmail().withMessage("Please provide a valid email address"),

    body("password")
        .notEmpty().withMessage("Password is required").bail()
        .isLength({ min: 6 }).withMessage("Password must be at least 6 characters long").bail()
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage("Password must contain at least one special character"),

    body("confirmPassword")
        .notEmpty().withMessage("Password confirmation is required").bail()
        .custom((value, { req }) => value === req.body.password).withMessage("Passwords do not match"),

    (req: Request, _res: Response, next: NextFunction) => {
        const errors = validationResult(req).formatWith(error => ({
            field: error.type === "field" ? error.path : "",
            message: error.msg,
        }));

        if (!errors.isEmpty()) {
            return next(
                unprocessable({
                    message: "Validation failed",
                    details: errors.array(),
                }),
            );
        }
        next();
    }
];

export { validateRegister };