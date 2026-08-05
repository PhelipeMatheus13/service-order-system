import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        testTimeout: 30000,
        coverage: {
            provider: "v8",
            reporter: ["text", "lcov"],
            reportsDirectory: "coverage",
            include: ["src/**/*.ts"],
            exclude: [
                "src/server.ts",
                "src/app.ts",
                "src/shared/config/**",
                "src/shared/middlewares/http-logger.middleware.ts",
                "src/shared/middlewares/rate-limiter.middleware.ts",
                "src/shared/docs/**",
                "src/generated/**",
            ],
        },
    },
});