# Service Order System

REST API for a service order management system. The application's core
infrastructure is complete and validated end-to-end through a full user
lifecycle module — registration, asynchronous email confirmation, and
account activation — backed by an outbox-driven messaging pipeline. The real
domain (service orders, technicians, customers, order status/history) has
not been implemented yet.

## Current Status

The `user` module now covers the full account lifecycle used to validate the
architecture before implementing the real business domain:

- User registration
- Asynchronous email confirmation (outbox pattern + RabbitMQ pub/sub)
- Resend confirmation code
- Account activation (password creation via a short-lived activation token)
- User listing, retrieval, and deletion

Authentication (login/refresh/logout) is not implemented yet. The JWT
service and auth middleware already exist and are exercised by the
activation flow; the remaining work is migrating login/refresh/logout logic
from a previous project into this codebase.

The automated test suite (Vitest) covers the current skeleton and the full
`user` module with unit and integration tests (184 tests, ~99% statement
coverage, 100% function coverage). Integration tests use an ephemeral
PostgreSQL database through Testcontainers and apply the Prisma migrations
before running.

The next step is to model and implement the real business domain.

## Features

- Security headers via Helmet, with a relaxed Content-Security-Policy scoped
  specifically to the Swagger UI route
- Configurable rate limiting (global and per-route) to mitigate brute-force
  and abuse
- Structured logging (Pino) with request context propagation via
  `AsyncLocalStorage`
- Centralized error handling with a custom `AppError` class and
  `asyncHandler` wrapper
- OpenAPI/Swagger documentation generated from Zod schemas with an
  interactive UI
- Transactional outbox pattern: domain events (e.g. user creation) are
  persisted alongside the business write and relayed asynchronously via a
  periodic job, guaranteeing at-least-once delivery even if the message
  broker is temporarily unavailable
- Pub/sub messaging via RabbitMQ (topic exchange), running fully decoupled
  from the HTTP server in its own process (`src/pubsub.ts`)
- Email delivery via SMTP (Nodemailer), used for account confirmation codes
- Strict TypeScript (`strict: true` from the start, ESM/`nodenext` module
  resolution)
- Type-safe database access with Prisma 7 and the PostgreSQL driver adapter
  (`@prisma/adapter-pg`)
- Runtime request validation with Zod, including fully inferred TypeScript
  types shared between validation and DTO mapping
- Unit and integration tests with Vitest, Supertest, and Testcontainers
  (ephemeral PostgreSQL, schema applied via `prisma migrate deploy`)

## Technologies

- Node.js (TypeScript, strict mode, ESM)
- Express
- PostgreSQL
- Prisma (with `@prisma/adapter-pg`)
- RabbitMQ (`amqplib`)
- Nodemailer
- Zod
- `@asteasolutions/zod-to-openapi`
- Swagger UI (`swagger-ui-express`)
- JSON Web Tokens (jsonwebtoken)
- bcrypt
- Helmet
- express-rate-limit
- Pino / pino-http
- Vitest, Supertest, testcontainers

## Project Conventions

- Arrow functions are the default; regular function declarations are reserved for cases with an objective advantage (generics, overloads, generators, hoisting, or `this`-dependent APIs).
- Interfaces are preferred by default; `type` is used when it better represents the construct — unions, intersections, function signatures, or types derived/inferred from another source of truth (e.g. `z.infer<...>`).
- File naming mirrors folder responsibility: no redundant type suffix (`.service`, `.middleware`) inside folders that are already homogeneous by nature (`services/`, `middlewares/`, `utils/`); suffixes are used inside heterogeneous, domain-organized folders (`modules/user/`) where the folder alone does not disambiguate file purpose.
- Environment variables are read through a single, centralized accessor — never `process.env` directly in feature code — so required-vs-optional handling stays consistent and is not duplicated per call site.
- Keep short, route-specific OpenAPI definitions inline; extract large, repeated, or shared definitions into reusable components.
- Background processes (periodic jobs, pub/sub subscribers) are registered through small, generic runner abstractions (`shared/background/periodic-job.ts`, `shared/pubsub/subscriber.ts`) and run in a process fully separate from the HTTP server — never started ad hoc inside `server.ts`.
- Tests prioritize meaningful behavior over duplicating library-provided behavior or already-covered logic. A real (unmocked) collaborator is acceptable when it is small, pure, and deterministic; the choice not to duplicate its coverage elsewhere should be documented.

## Database & Messaging Setup (Development)

Start PostgreSQL and RabbitMQ:
```bash
docker compose up -d
```

RabbitMQ's management UI is available at http://localhost:15672 (credentials from your `.env`).

Run migrations:
```bash
npx prisma migrate dev
```

Run the HTTP API (development):
```bash
npm run dev
```

Run the pub/sub process (development) — required for the email confirmation
flow, since it hosts the outbox relay job and the event subscribers:
```bash
npm run pubsub
```

Build and run (production-style):
```bash
npm run build
npm start
npm run start:pubsub
```

Stop the containers when done:
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

> RabbitMQ was chosen over Kafka for this project's messaging needs: the
> use case (task-queue style — react once to a domain event) maps directly
> onto RabbitMQ's model, whereas Kafka targets high-volume streaming and
> replay, which isn't a requirement here. A topic exchange was used instead
> of a simpler direct exchange in anticipation of additional outbox-driven
> event types sharing the same messaging infrastructure.

> The outbox relay guarantees at-least-once delivery, not exactly-once.
> Subscribers are expected to be idempotent — the email confirmation
> subscriber, for instance, checks for an existing, unexpired validation
> record before generating a new code, so a redelivered event doesn't
> produce duplicate confirmation codes.

> Unit tests intentionally focus on application behavior rather than
> duplicating guarantees already provided by external libraries. For
> example, DTO mapping is validated through controller tests because the
> controller's response and service arguments already exercise the DTO
> behavior. Likewise, Zod's built-in validators such as min, email,
> regex, and trim are not duplicated in unit tests. Application-specific
> validation logic, such as the password confirmation refine, is tested
> explicitly.