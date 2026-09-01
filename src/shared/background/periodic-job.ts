import logger from "../config/logger.js";

interface PeriodicJob {
    name: string;
    intervalMs: number;
    run: () => Promise<void>;
}

const startPeriodicJob = (job: PeriodicJob): (() => void) => {
    let stopped = false;

    const run = async (): Promise<void> => {
        while (!stopped) {
            try {
                await job.run();
            } catch (error) {
                logger.error(
                    { err: error, job: job.name },
                    "Periodic job run failed",
                );
            }

            if (stopped) return;

            await new Promise<void>((resolve) => {
                setTimeout(resolve, job.intervalMs);
            });
        }
    };

    void run();

    return () => {
        stopped = true;
    };
};
/**
 * Starts every job in the list and returns a single stop() that clears
 * all intervals — used for graceful shutdown.
 */
const startPeriodicJobs = (jobs: PeriodicJob[]): { stop: () => void } => {
    const stops = jobs.map(startPeriodicJob);

    return {
        stop: () => {
            stops.forEach((stop) => stop());
        },
    };
};

export { startPeriodicJobs };
export type { PeriodicJob };