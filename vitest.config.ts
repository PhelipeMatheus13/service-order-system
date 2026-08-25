import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        testTimeout: 30000,
        hookTimeout: 30000,
        coverage: {
            provider: "v8",
            reporter: ["text", "lcov"],
            reportsDirectory: "coverage",
            include: ["src/**/*.ts"],
            exclude: [
                "src/server.ts",
                "src/pubsub.ts",
                "src/app.ts",
                "src/shared/config/**",
                "src/shared/middlewares/http-logger.ts",
                "src/shared/middlewares/rate-limiter.ts",
                "src/shared/pubsub/connection.ts",
                "src/shared/docs/**",
                "src/generated/**",
                "src/modules/user/user.types.ts",
            ],
        },
    },
});