// proxy for compatibility with knex cli, which expects a knexfile.js in the root of the project
// useful for executing commands such as: (npx knex migrate:latest) or (npx knex migrate:rollback) 
// logic centered on src/shared/config/database.js
import { config } from "./dist/shared/config/database.js";
export default config;