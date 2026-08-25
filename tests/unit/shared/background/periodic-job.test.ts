import { vi, describe, beforeEach, afterEach, it, expect } from "vitest";

import { startPeriodicJobs } from "../../../../src/shared/background/periodic-job.js";

import logger from "../../../../src/shared/config/logger.js";

vi.mock("../../../../src/shared/config/logger.js", () => ({
    default: {
        error: vi.fn(),
    },
}));

describe("Periodic Jobs (Unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should run the job immediately", async () => {
        const job = vi.fn().mockResolvedValue(undefined);

        startPeriodicJobs([
            {
                name: "test-job",
                intervalMs: 1000,
                run: job,
            },
        ]);

        await vi.waitFor(() => {
            expect(job).toHaveBeenCalledTimes(1);
        });
    });

    it("should run the job again after the interval", async () => {
        const job = vi.fn().mockResolvedValue(undefined);

        startPeriodicJobs([
            {
                name: "test-job",
                intervalMs: 1000,
                run: job,
            },
        ]);

        await vi.waitFor(() => {
            expect(job).toHaveBeenCalledTimes(1);
        });

        await vi.advanceTimersByTimeAsync(1000);

        expect(job).toHaveBeenCalledTimes(2);
    });

    it("should log an error when the job fails", async () => {
        const error = new Error("Job failed");

        const job = vi.fn().mockRejectedValue(error);

        startPeriodicJobs([
            {
                name: "test-job",
                intervalMs: 1000,
                run: job,
            },
        ]);

        await vi.waitFor(() => {
            expect(logger.error).toHaveBeenCalledWith(
                {
                    err: error,
                    job: "test-job",
                },
                "Periodic job run failed",
            );
        });
    });

    it("should stop the job from running again", async () => {
        const job = vi.fn().mockResolvedValue(undefined);

        const { stop } = startPeriodicJobs([
            {
                name: "test-job",
                intervalMs: 1000,
                run: job,
            },
        ]);

        await vi.waitFor(() => {
            expect(job).toHaveBeenCalledTimes(1);
        });

        stop();

        await vi.advanceTimersByTimeAsync(1000);

        expect(job).toHaveBeenCalledTimes(1);
    });

    it("should stop all jobs", async () => {
        const job1 = vi.fn().mockResolvedValue(undefined);
        const job2 = vi.fn().mockResolvedValue(undefined);

        const { stop } = startPeriodicJobs([
            {
                name: "job-1",
                intervalMs: 1000,
                run: job1,
            },
            {
                name: "job-2",
                intervalMs: 1000,
                run: job2,
            },
        ]);

        await vi.waitFor(() => {
            expect(job1).toHaveBeenCalledTimes(1);
            expect(job2).toHaveBeenCalledTimes(1);
        });

        stop();

        await vi.advanceTimersByTimeAsync(1000);

        expect(job1).toHaveBeenCalledTimes(1);
        expect(job2).toHaveBeenCalledTimes(1);
    });
});