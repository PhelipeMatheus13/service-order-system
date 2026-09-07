import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import  registry  from "./registry.js";

import "./components/response.js";
import "./components/examples.js"
import "../../modules/user/user.routes.js";
import "../../modules/auth/auth.routes.js"
 
const generateOpenApiDocument = () => {
    return new OpenApiGeneratorV3(registry.definitions).generateDocument({
        openapi: "3.0.0",
        info: {
            title: "servicer order system",
            version: "1.0.0",
            description: "REST API for Service order management system",
        },
        servers: [{ url: "http://localhost:3000" }],
        tags: [
            { name: "User", description: "User manegement"},
            { name: "Auth", description: "Authentication endpoints"},
        ]
    });
}

export { generateOpenApiDocument }