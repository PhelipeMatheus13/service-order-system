# Service Order System

REST API for a service order management system. Currently in early bootstrap
stage: a reusable, framework-agnostic application skeleton has been migrated
to TypeScript, validated end-to-end with a generic `user` module. The real
domain (service orders, technicians, customers, order status/history) has
not been implemented yet.

## Current Status

Currently, the project provides the application's core infrastructure,
including authentication, validation, database access, logging,
documentation, and error handling.

A generic `user` module is intentionally used to validate the end-to-end
architecture prior to implementing the business domain.

The automated test suite has been migrated to Vitest, covering the current
skeleton and the generic `user` module end-to-end (unit and integration
tests, ~98% statement coverage). The next step is to model and implement
the real business domain.

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
- Generic `user` module used solely to validate the architecture before
  implementing the real business domain
- Strict TypeScript (`strict: true` from the start, ESM/`nodenext` module
  resolution)
- Type-safe database access with Prisma 7 and the PostgreSQL driver adapter
  (`@prisma/adapter-pg`)
- Runtime request validation with Zod, including fully inferred TypeScript
  types shared between validation and DTO mapping
- Unit and integration tests with Vitest, Supertest, and testcontainers
  (ephemeral PostgreSQL, schema applied via `prisma migrate deploy`)

## Technologies

- Node.js (TypeScript, strict mode, ESM)
- Express
- PostgreSQL
- Prisma (with `@prisma/adapter-pg`)
- Zod
- JSON Web Tokens (jsonwebtoken)
- bcrypt
- Helmet
- express-rate-limit
- Pino / pino-http
- swagger-jsdoc / swagger-ui-express
- Vitest, Supertest, testcontainers

## Database Setup (Development)

Start the PostgreSQL container:
```bash
docker compose up -d
```

Run migrations:
```bash
npx prisma migrate dev
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

## Running Tests

```bash
npm test              # watch mode
npm run test:ci       # single run, CI-style
npm run test:unit     # unit tests only
npm run test:integration  # integration tests only (spins up ephemeral Postgres)
```

## Notes

> Knex was migrated to TypeScript alongside the rest of the skeleton (to
> validate the structure end-to-end against a real database), then replaced
> by Prisma in a dedicated branch — a deliberate choice to keep the
> "migrate to TypeScript" branch scoped to syntax/tooling only, not mixed
> with a technology swap. `express-validator` followed the same reasoning
> and was later replaced by Zod in its own branch.

> Prisma 7 requires a driver adapter to connect to the database —
> instantiating `PrismaClient` without one (`new PrismaClient()`) throws a
> constructor validation error in this version; it isn't a stylistic choice
> made in this project. Using `@prisma/adapter-pg` required separating the
> database connection string into its own module (`connection-string.ts`),
> since `prisma.config.ts` is read by the Prisma CLI — including when
> generating the client for the first time, before the generated client
> module exists. Importing the main `database.ts` (which imports the
> generated `PrismaClient`) from `prisma.config.ts` would create a circular
> bootstrap dependency.

> TypeScript strict mode is enabled from the start of the migration,
> rather than starting permissive and tightening later — this was a
> conscious choice to front-load the friction of proper typing instead of
> accumulating `any`-typed debt that tends to never get paid down.

> Some unit tests intentionally exercise real collaborators instead of
> mocking every dependency, where the collaborator is a small, pure,
> deterministic function (e.g. DTO mapping exercised transitively through
> controller tests, or Zod schemas exercised for real in `validate`
> middleware tests). This avoids duplicating coverage across two test files
> without adding protection against any bug the broader test wouldn't
> already catch.