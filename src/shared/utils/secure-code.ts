import { randomInt } from "node:crypto";

const generateSecure6DigitCode = (): string => {
    const minValue = 100_000;
    const maxValue = 1_000_000;

    return randomInt(minValue, maxValue).toString();
};

export default generateSecure6DigitCode 