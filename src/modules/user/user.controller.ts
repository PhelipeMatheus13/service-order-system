import asyncHandler from "../../shared/utils/async.js";
import userService from "./user.service.js";
import { badRequest, unauthorized } from "../../shared/errors/errors.js";
import userDTO from "./user.dtos.js";

const register = asyncHandler(async (req, res) => {
    const input = userDTO.registerInputDTO(req.body);
    const user = await userService.createUser(input);
    res.status(201).json({
        success: true,
        data: userDTO.userOutputDTO(user),
        message: "User created successfully",
    });
});

const getUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) throw badRequest({ message: "User ID is required" });
    const user = await userService.getUserById(String(id));
    res.status(200).json({
        success: true,
        data: userDTO.userOutputDTO(user),
    });
});

const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) throw badRequest({ message: "User ID is required" })
    await userService.deleteUserById(String(id));
    res.status(200).json({
        success: true,
        message: "User deleted successfully"
    });
});

const listUsers = asyncHandler(async (req, res) => {
    const limit = req.query.limit
        ? Number(req.query.limit)
        : null;

    const users = await userService.listUsers({
        options: {
            limit,
        },
    });

    res.status(200).json({
        success: true,
        data: userDTO.usersOutputDTO(users),
    });
});

const confirmEmail = asyncHandler(async (req, res) => {
    const input = userDTO.confirmEmailDTO(req.body);
    const activationToken = await userService.confirmEmail(input);
    res.status(200).json({
        success: true,
        data: {
            activationToken,
        },
        message: "Email confirmed successfully",
    });
});

const activateUser = asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user) throw unauthorized({ message: "User not authenticated" });
    
    const validationId = res.locals.validationId as string;

    const input = userDTO.activateUserDTO(user, validationId, req.body);
    await userService.activateUser(input);
    res.status(200).json({
        success: true,
        message: "User activated successfully",
    });
});

const resendEmailConfirmationCode = asyncHandler(async (req, res) => {
    const { email } = req.body;
    await userService.resendEmailConfirmationCode(email);
    res.status(200).json({
        success: true,
        message: "If the account is eligible, a new verification code has been sent",
    });
});

export default {
    register,
    getUser,
    deleteUser,
    listUsers,
    confirmEmail,
    activateUser,
    resendEmailConfirmationCode,
};