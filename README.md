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

The next step is to update the automated tests.

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
  (@prisma/adapter-pg)
- Runtime request validation with Zod, including fully inferred TypeScript
  types shared between validation and DTO mapping

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
- Jest, Supertest, testcontainers (currently not runnable against the
  migrated codebase — see Notes)

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

## Notes

> Automated tests are currently unavailable. The next planned step is
> migrating the existing test suite to Vitest and restoring full unit and
> integration test coverage for the TypeScript codebase.