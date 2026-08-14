import asyncHandler from "../../shared/utils/async.js";
import userService from "./user.service.js";
import { badRequest } from "../../shared/errors/errors.js";
import { registerInputDTO, userOutputDTO } from "./user.dtos.js";

const register = asyncHandler(async (req, res) => {
    const input = registerInputDTO(req.body);
    const user = await userService.createUser(input);
    res.status(201).json({
        success: true,
        data: userOutputDTO(user),
        message: "User created successfully",
    });
});

const getUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) throw badRequest({ message: "User ID is required" });
    const user = await userService.getUserById(String(id));
    res.status(200).json({
        success: true,
        data: userOutputDTO(user),
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

export default {
    register,
    getUser,
    deleteUser,
};