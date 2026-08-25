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

export {
    invalidChallengerNumber,
    challengerNumberExpired,
};