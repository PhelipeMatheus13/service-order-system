# Service Order System

REST API for a service order management system. Currently in early bootstrap
stage: a reusable, framework-agnostic application skeleton has been migrated
to TypeScript, validated end-to-end with a generic `user` module. The real
domain (service orders, technicians, customers, order status/history) has
not been implemented yet.

## Current Status

This project is derived from a previous JWT authentication API
([node-jwt-auth](https://github.com/PhelipeMatheus13/node-jwt-auth)), reused
here as a starting point for the application's core infrastructure
(security, logging, error handling, request context, documentation setup).

The codebase is being migrated from JavaScript to TypeScript incrementally,
file by file, in dependency order (utils → services → middlewares → config →
docs → modules). This migration is tracked as its own effort, separate from
domain modeling and from planned technology swaps (see Notes below).

## Features

- Security headers via Helmet, with a relaxed Content-Security-Policy scoped
  specifically to the Swagger UI route
- Configurable rate limiting (global and per-route) to mitigate brute-force
  and abuse
- Structured logging (Pino) with request context propagation via
  `AsyncLocalStorage`
- Centralized error handling with a custom `AppError` class and
  `asyncHandler` wrapper
- OpenAPI/Swagger documentation with interactive UI
- Generic `user` module (register/get/delete), used to validate the
  application skeleton end-to-end — not the final domain
- Strict TypeScript (`strict: true` from the start, ESM/`nodenext` module
  resolution)

## Technologies

- Node.js (TypeScript, strict mode, ESM)
- Express
- PostgreSQL
- Knex.js (temporary — see Notes)
- express-validator (temporary — see Notes)
- JSON Web Tokens (jsonwebtoken)
- bcrypt
- Helmet
- express-rate-limit
- Pino / pino-http
- swagger-jsdoc / swagger-ui-express
- Jest, Supertest, testcontainers (currently not runnable against the
  migrated codebase — see Notes)

## Database Setup (Development)

Start the PostgreSQL container:
```bash
docker compose up -d
```

Run migrations:
```bash
npx knex migrate:latest
```

Run the application (development):
```bash
npm run dev
```

Build and run (production-style):
```bash
npm run build
npm start
```

Stop the database when done:
```bash
docker compose down
```

## API Documentation

Once the application is running, the interactive Swagger UI is available at:

http://localhost:3000/api-docs

## Installation

```bash
git clone https://github.com/PhelipeMatheus13/service-order-system
cd service-order-system
npm install
```

## Notes

> **Tests are currently not executable against the migrated codebase.**
> The existing Jest/Supertest suite still targets `.js` module paths and
> plain JavaScript syntax; Jest's default transform does not understand
> TypeScript syntax (`interface`, type annotations, etc.), so every test
> suite fails to parse. This is a known, intentional gap: the test runner
> itself is expected to change to Vitest once the planned technology swaps
> (Knex → Prisma, express-validator → Zod) land, since rewriting the test
> suite now — before those swaps — would mean rewriting it twice. Tests will
> be reintroduced as part of that follow-up work, not forgotten.

> Knex and express-validator are present in this codebase as **temporary**
> dependencies. They were migrated to TypeScript alongside the rest of the
> skeleton (to validate the structure end-to-end against a real database and
> real input validation), but are planned to be replaced by Prisma and Zod
> respectively in a dedicated branch — a deliberate choice to keep the
> "migrate to TypeScript" branch scoped to syntax/tooling only, not mixed
> with a technology swap.

> TypeScript strict mode is enabled from the start of the migration,
> rather than starting permissive and tightening later — this was a
> conscious choice to front-load the friction of proper typing instead of
> accumulating `any`-typed debt that tends to never get paid down.