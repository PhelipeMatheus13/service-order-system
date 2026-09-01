import registry  from "../registry.js";

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

const tokenReuseDetected = registry.registerComponent("examples", "tokenReuseDetected", {
    summary: "Token reuse detected",
    value: {
        success: false,
        error: {
            code: "TOKEN_REUSE_DETECTED",
            message: "Token reuse detected",
        },
    },
});

export {
    invalidChallengerNumber,
    challengerNumberExpired,
    missingActivationToken,
    activationTokenExpired,
    invalidActivationToken,
    tokenReuseDetected,
};