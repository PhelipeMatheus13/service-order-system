import registry  from "../registry.js";

// 401
const invalidChallengerNumber = registry.registerComponent("examples", "invalidChallengerNumber", {
    summary: "Invalid challenger number",
    value: {
        success: false,
        error: {
            code: "INVALID_CHALLENGER_NUMBER",
            message: "Invalid challenger number",
        },
    },
});

const challengerNumberExpired = registry.registerComponent("examples", "challengerNumberExpired", {
    summary: "Challenger number expired",
    value: {
        success: false,
        error: {
            code: "CHALLENGER_NUMBER_EXPIRED",
            message: "Challenger number expired",
        },
    },
});

const missingActivationToken = registry.registerComponent("examples", "missingActivationToken", {
    summary: "Missing activation token",
    value: {
        success: false,
        error: {
            code: "MISSING_ACTIVATION_TOKEN",
            message: "Missing activation token",
        },
    },
});

const activationTokenExpired = registry.registerComponent("examples", "activationTokenExpired", {
    summary: "Activation token expired",
    value: {
        success: false,
        error: {
            code: "ACTIVATION_TOKEN_EXPIRED",
            message: "Activation token expired",
        },
    },
});

const invalidActivationToken = registry.registerComponent("examples", "invalidActivationToken", {
    summary: "Invalid activation token",
    value: {
        success: false,
        error: {
            code: "INVALID_ACTIVATION_TOKEN",
            message: "Invalid activation token",
        },
    },
});

const activationTokenReuseDetected = registry.registerComponent("examples", "activationTokenReuseDetected", {
    summary: "Token reuse detected",
    value: {
        success: false,
        error: {
            code: "ACTIVATION_TOKEN_REUSE_DETECTED",
            message: "Activation token reuse detected",
        },
    },
});

const activationTokenNotFound = registry.registerComponent("examples", "activationTokenNotFound", {
    summary: "Activation token not found or does not exist",
    value: {
        success: false,
        error: {
            code: "ACTIVATION_TOKEN_NOT_FOUND",
            message: "Activation token not found",
        },
    },
});

const refreshTokenReuseDetected = registry.registerComponent("examples", "refreshTokenReuseDetected", {
    summary: "Refresh Token reuse detected",
    value: {
        success: false,
        error: {
            code: "REFRESH_TOKEN_REUSE_DETECTED",
            message: "Refresh token reuse detected",
        },
    },
});

const invalidRefreshToken = registry.registerComponent("examples", "invalidRefreshToken", {
    summary: "Invalid refresh token",
    value: {
        success: false,
        error: {
            code: "INVALID_REFRESH_TOKEN",
            message: "Invalid refresh token",
        },
    },
});

const refreshTokenExpired = registry.registerComponent("examples", "refreshTokenExpired", {
    summary: "Refresh token expired",
    value: {
        success: false,
        error: {
            code: "REFRESH_TOKEN_EXPIRED",
            message: "Refresh token expired",
        },
    },
});

const refreshTokenNotFound = registry.registerComponent("examples", "refreshTokenNotFound", {
    summary: "Refresh token not found or does not exist",
    value: {
        success: false,
        error: {
            code: "REFRESH_TOKEN_NOT_FOUND",
            message: "Refresh token not found",
        },
    },
});

const missingAccessToken = registry.registerComponent("examples", "missingAccessToken", {
    summary: "Missing missingAccessToken token",
    value: {
        success: false,
        error: {
            code: "MISSING_ACCESS_TOKEN",
            message: "Missing access token",
        },
    },
});

const invalidAccessToken = registry.registerComponent("examples", "invalidAccessToken", {
    summary: "Invalid access token",
    value: {
        success: false,
        error: {
            code: "INVALID_ACCESS_TOKEN",
            message: "Invalid access token",
        },
    },
});

const accessTokenExpired = registry.registerComponent("examples", "accessTokenExpired", {
    summary: "Access token expired",
    value: {
        success: false,
        error: {
            code: "ACCESS_TOKEN_EXPIRED",
            message: "Access token expired",
        },
    },
});

export {
    invalidChallengerNumber,
    challengerNumberExpired,
    missingActivationToken,
    activationTokenExpired,
    invalidActivationToken,
    activationTokenReuseDetected,
    activationTokenNotFound,
    refreshTokenReuseDetected,
    invalidRefreshToken,
    refreshTokenExpired,
    refreshTokenNotFound,
    missingAccessToken,
    invalidAccessToken,
    accessTokenExpired
};