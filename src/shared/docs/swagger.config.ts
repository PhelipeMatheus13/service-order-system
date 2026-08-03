import swaggerJsdoc, { type OAS3Options } from "swagger-jsdoc";


const options: OAS3Options = {
  	definition: {
    	openapi: "3.0.0",
		info: {
			title: "servicer order system",
			version: "1.0.0",
			description: "REST API for Service order management system",
			contact: {
				name: "Phelipe Matheus",
				email: "phelipematheus134@gmail.com",
				url: "https://github.com/PhelipeMatheus13",
			},
		},
		servers: [
			{
				url: "http://localhost:3000",
				description: "Development server",
			},
		],
		tags: [
			{
				name: "User",
				description: "User manegement",
			},
		],
		components: {
			securitySchemes: {
				BearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
				},
			},
		},
    	security: [{ BearerAuth: [] }],
  	},
	apis: [
		"./src/modules/**/*.routes.ts",
    	"./src/shared/docs/components/*.yaml",
	], 
};

export default swaggerJsdoc(options);