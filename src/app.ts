import express from "express";
import helmet from "helmet";
import httpLogger from "./shared/middlewares/http-logger.js";
import errorHandler from "./shared/middlewares/error.js";
import requestContextMiddleware from "./shared/middlewares/request-context.js";
import { globalLimiter } from "./shared/middlewares/rate-limiter.js";

// Import routes
import swaggerRoutes from "./shared/docs/swagger.routes.js";
import userRoutes from "./modules/user/user.routes.js";

const app = express();

// Log every incoming request/response
app.use(httpLogger);

// Add request context middleware to propagate requestId through async calls
app.use(requestContextMiddleware);

// Security headers com config default (CSP restritivo incluso).
app.use(helmet());

// Global rate limit, applied before body parsing for performance reasons
app.use(globalLimiter);

// Transform the body of the request into JSON
app.use(express.json());

// Public route
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to the API",
    });
});

// config routes
app.use("/users", userRoutes);
app.use("/api-docs", swaggerRoutes);


// handler for error
app.use(errorHandler); 

export default app;