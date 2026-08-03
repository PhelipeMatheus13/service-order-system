const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

interface RetryOptions {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: number;
}

/**
 * Executes an async function with retry and exponential backoff.
 * Intermediate failures are silent — only the last error (after exhausting
 * all attempts) is thrown, so the caller decides how/whether to log it.
 *
 * @param fn - Async function to execute.
 * @param options - Optional configuration.
 * @param options.maxAttempts - Total number of attempts (not retries after the first). Defaults to `3`.
 * @param options.delayMs - Initial delay in milliseconds before the first retry. Defaults to `1000`.
 * @param options.backoff - Multiplier applied to the delay after each failed attempt. Defaults to `2`.
 */
async function withRetry<TfnResult>(fn: () => Promise<TfnResult>, options: RetryOptions = {}): Promise<TfnResult> {
    const {
        maxAttempts = 3,
        delayMs = 1000,
        backoff = 2,
    } = options;

    let currentDelay = delayMs;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt < maxAttempts) {
                await sleep(currentDelay);
                currentDelay = currentDelay * backoff;
            }
        }
    }

    throw lastError;
}

export { withRetry };