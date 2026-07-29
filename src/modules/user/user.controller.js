const asyncHandler = require("../../shared/utils/async.util");
const userService = require("./user.service");
const { badRequest, forbidden } = require("../../shared/errors/errors");
const { registerInputDTO, userOutputDTO } = require("./user.dtos");


const register = asyncHandler(async (req, res) => {
    const input = registerInputDTO(req.body);
    await userService.createUser(input);
    res.status(201).json({
        success: true,
        message: "User created successfully"
    });
});

const getUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) throw badRequest({ message: "User ID is required" });

    const user = await userService.getUserById(id);

    res.status(200).json({
        success: true,
        data: userOutputDTO(user),
    });
});
const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) throw badRequest({ message: "User ID is required" });

    await userService.deleteUserById(id);
    res.status(200).json({
        success: true,
        message: "User deleted successfully"
    });
});

module.exports = {
    register,
    getUser,
    deleteUser
}