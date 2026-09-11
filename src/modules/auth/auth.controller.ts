import asyncHandler from "../../shared/utils/async.js";

import authService from "./auth.service.js";
import authDTO from "./auth.dtos.js"

const login = asyncHandler(async (req, res) => {
    const input = authDTO.loginInputDTO(req.body);
    const tokens = await authService.login(input);
    res.status(200).json({
        success: true,
        data: authDTO.tokensOutputDTO(tokens)
    });
});

const refresh = asyncHandler(async (req, res) => {
    const { refreshToken: oldRefreshToken } = req.body;
    const tokens = await authService.rotateTokens(oldRefreshToken);
    res.status(200).json({
        success: true,
        data: authDTO.tokensOutputDTO(tokens)
    });
});


const logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    res.status(200).json({
        success: true,
        message: "Logged out successfully"
    });
});

const logoutAll = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    await authService.logoutAll(refreshToken);
    res.status(200).json({
        success: true,
        message: "Logged out from all devices"
    });
});

export default {
    login,
    refresh,
    logout,
    logoutAll,
};