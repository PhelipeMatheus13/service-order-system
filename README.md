# Service Order System

REST API for a service order management system. The core infrastructure
(authentication, messaging, logging, documentation, tests, CI) is in place and
the business domain is partially implemented: customers, devices, service
orders, the diagnosis stage (diagnoses and findings), and the quote stage
(creation, revision, submission, and customer decision) are working
end-to-end. The later stages of a service order (maintenance, delivery) have
not been implemented yet.

## Current Status

### Infrastructure / account lifecycle

The `user` module covers the full account lifecycle, originally used to
validate the architecture before implementing the business domain:

- User registration (ADMIN only)
- Asynchronous email confirmation (outbox pattern + RabbitMQ pub/sub)
- Resend confirmation code
- Account activation (password creation via a short-lived activation token)
- User listing, retrieval, and deletion

The `auth` module implements the authentication flow:

- Login (email + password), returning an access token and a refresh token
- Refresh token rotation: each refresh revokes the used token and issues a
  new pair
- Reuse detection: presenting an already revoked refresh token revokes all
  of that user's sessions
- Logout (current session) and logout-all (every session of the user)

Refresh tokens are persisted as SHA-256 hashes, never in plain text.

### Business domain

- `customer`: create, update, retrieval, and listing
- `device`: create, update, retrieval, and listing — each device belongs to
  a customer and may carry a unique serial number and/or IMEI
- `service-order`:
  - Create a service order for a device (the customer is derived from the
    device) and cancel it with a reason
  - Status history: every status transition is recorded
  - Diagnosis: start a diagnosis (moves the order to `IN_DIAGNOSIS`),
    complete it with a result (`FAULT_FOUND`, `NO_FAULT_FOUND` or
    `INCONCLUSIVE`) and retrieve it
  - Findings: create, update, delete, and list the findings of a diagnosis
  - On diagnosis completion the order moves to `AWAITING_QUOTE` when the
    result is `FAULT_FOUND` and there is at least one repairable finding;
    otherwise it moves to `AWAITING_DELIVERY`
  - Pre-approved flow: create a service order directly in `AWAITING_QUOTE`
    with an empty `DRAFT` quote, skipping diagnosis and approval
- `quote`:
  - Create a quote for a service order (`AWAITING_QUOTE`), and create,
    update, delete and list its items and item components
  - Submit a quote (`DRAFT → SUBMISSION_PENDING`); delivery is handled
    by an outbox-driven subscriber that marks the quote `SENT` and moves
    the order to `AWAITING_APPROVAL`
  - Revise a submitted quote before the customer decides: the current
    quote is superseded and a new `DRAFT` revision is cloned from it
    (items and components are cloned; decisions are reset to `PENDING`)
  - Register the customer's decision for every item of the quote at once
    (`APPROVED`/`DECLINED`): the quote moves to `DECIDED` and the order
    moves to `AWAITING_MAINTENANCE` when at least one item is approved,
    otherwise to `AWAITING_DELIVERY`
  - Pre-approved quotes: items are created already `APPROVED` and the
    finalization moves the quote to `DECIDED` and the order directly to
    `AWAITING_MAINTENANCE`

Business rules enforced at the database level:

- Only one active service order (`finished_at IS NULL`) per device
- Only one non-superseded quote per service order (partial unique index)
- A service order's `(device_id, customer_id)` pair must match an existing
  device (composite foreign key)
- A diagnosis is unique per service order

State-sensitive writes (cancel, status updates, finding create/update/delete,
diagnosis completion, quote submit/revise/decision, pre-approved finalize)
use atomic guards — the validation runs as part of the
`UPDATE`/`INSERT`/`DELETE` itself, so concurrent requests cannot overwrite
each other's state transitions.

### Access control

| Area | Write | Read |
| --- | --- | --- |
| Users | `ADMIN` (register, delete); activation via activation token | `ADMIN` (list); `ADMIN` or the owner (by id) |
| Customers / Devices | `ADMIN`, `ATTENDANT` | any authenticated user |
| Service orders (create, cancel) | `ADMIN`, `ATTENDANT` | any authenticated user |
| Diagnoses / Findings (create, update, complete, delete) | `ADMIN`, `TECHNICIAN` | any authenticated user |
| Quotes / Quote items (create, update, delete, submit, revise, decision) | `ADMIN`, `ATTENDANT` | any authenticated user |

### Not implemented yet

Statuses such as `IN_MAINTENANCE` and `DELIVERED` already exist in the data
model, but the flows that drive a service order through them (maintenance,
delivery) are not implemented.

### Tests and CI

The automated test suite (Vitest) covers the shared infrastructure and the
`user`, `auth`, `refresh-token`, `customer`, `device`, and `service-order`
modules with unit and integration tests. Integration tests use an ephemeral
PostgreSQL database through Testcontainers and apply the Prisma migrations
before running.

GitHub Actions runs the unit and integration test suites on pull requests and
pushes to `main` (`.github/workflows/test.yml`). Dependabot checks npm
dependencies weekly.

## Features

- Security headers via Helmet, with a relaxed Content-Security-Policy scoped
  specifically to the Swagger UI route
- Configurable rate limiting (global and per-route) to mitigate brute-force
  and abuse
- JWT authentication with short-lived access tokens and rotating refresh
  tokens (hashed at rest, reuse detection revokes all sessions)
- Role-based authorization (`ADMIN`, `ATTENDANT`, `TECHNICIAN`) through a
  dedicated middleware
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
  and quote submission to the customer
- Database seeding through Prisma (seed files under `prisma/seeds/`), used
  to create the initial admin user
- Strict TypeScript (`strict: true` from the start, ESM/`nodenext` module
  resolution)
- Type-safe database access with Prisma 7 and the PostgreSQL driver adapter
  (`@prisma/adapter-pg`), with raw SQL where atomicity requires it
- Runtime request validation with Zod, including fully inferred TypeScript
  types shared between validation and DTO mapping
- Unit and integration tests with Vitest, Supertest, and Testcontainers
  (ephemeral PostgreSQL, schema applied via `prisma migrate deploy`)
- Continuous integration with GitHub Actions

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
- libphonenumber-js
- Helmet
- express-rate-limit
- Pino / pino-http
- Vitest, Supertest, testcontainers
- GitHub Actions, Dependabot

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

Seed the initial admin user:
```bash
npm run prisma:seed
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
npm test                  # watch mode (with coverage)
npm run test:unit         # unit tests only
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

> Service order creation, status updates, and finding writes use raw SQL
> (`$queryRaw`) in a few places because Prisma's query API cannot express
> `INSERT ... SELECT` or conditional writes guarded by joined state in a
> single atomic statement. Doing a read followed by a write would open a race
> window between the check and the write.

> Unit tests intentionally focus on application behavior rather than
> duplicating guarantees already provided by external libraries. For
> example, DTO mapping is validated through controller tests because the
> controller's response and service arguments already exercise the DTO
> behavior. Likewise, Zod's built-in validators such as min, email,
> regex, and trim are not duplicated in unit tests. Application-specific
> validation logic, such as the password confirmation refine, is tested
> explicitly.