import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import  registry  from "./registry.js";

import "./components/response.js";
import "../../modules/user/user.routes.js";
 
const generateOpenApiDocument = () => {
    return new OpenApiGeneratorV3(registry.definitions).generateDocument({
        openapi: "3.0.0",
        info: {
            title: "servicer order system",
            version: "1.0.0",
            description: "REST API for Service order management system",
        },
        servers: [{ url: "http://localhost:3000" }],
    });
}

export { generateOpenApiDocument }