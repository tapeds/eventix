# Eventix -Event Ticketing & Booking System

An Event Ticketing & Booking System built with **Clean Architecture** and **Domain-Driven Design** tactical patterns. Event organizers create and publish events, customers book and pay for tickets, gate officers validate tickets at check-in, and administrators manage refund payouts.

Built with [NestJS](https://nestjs.com/), [TypeORM](https://typeorm.io/), and **PostgreSQL**.

## Architecture

The codebase is organized into the four Clean Architecture layers, each in its own folder under `src/`:

| Layer | Folder | Responsibility |
| --- | --- | --- |
| **Domain** | `src/domain` | Aggregates, entities, value objects, domain events, domain services, repository interfaces. No framework dependencies. |
| **Application** | `src/application` | Commands, command handlers, queries, query handlers, DTOs, and application service interfaces for external systems. |
| **Infrastructure** | `src/infrastructure` | TypeORM persistence, repository implementations, application service implementations, database connection, migrations, and seeds. |
| **Presentation** | `src/presentation` | REST API controllers and HTTP request/response mapping. |

Shared building blocks (`AggregateRoot`, `BaseEntity`, `ValueObject`, `Money`, domain-event publisher) live under `src/common`.

Bounded contexts: **User**, **Event**, **Booking** (including Tickets), and **Refund**.

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/)
- PostgreSQL 14+

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure PostgreSQL

Create a database and a user for the application:

```sql
CREATE USER eventix WITH PASSWORD 'eventix';
CREATE DATABASE eventix OWNER eventix;
```

Copy the example environment file and adjust the values to match your PostgreSQL instance:

```bash
cp .env.example .env
```

`.env` variables:

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_HOST` | `localhost` | PostgreSQL host |
| `DATABASE_PORT` | `5432` | PostgreSQL port |
| `DATABASE_USER` | `eventix` | Database user |
| `DATABASE_PASSWORD` | `eventix` | Database password |
| `DATABASE_NAME` | `eventix` | Database name |
| `PORT` | `3000` | HTTP port for the API (optional) |

### 3. Run database migrations

The schema is managed by TypeORM migrations (`src/infrastructure/database/migrations`). `synchronize` is disabled, so migrations are the source of truth.

```bash
# apply all pending migrations
pnpm migration:run

# revert the last migration
pnpm migration:revert

# generate a new migration from entity changes
pnpm migration:generate src/infrastructure/database/migrations/<Name>
```

Optionally seed sample data:

```bash
pnpm seed
```

### 4. Run the project

```bash
# development
pnpm start

# watch mode
pnpm start:dev

# production
pnpm build
pnpm start:prod
```

The API is served under the `/api` prefix (e.g. `http://localhost:3000/api`).

## Running tests

```bash
# domain & application unit tests
pnpm test

# watch mode
pnpm test:watch

# coverage
pnpm test:cov

# integration tests (require a running PostgreSQL)
pnpm test:integration
```

Domain unit tests live alongside the code as `*.spec.ts` files and cover the required cases (invalid event schedule, non-positive capacity, publishing without an active ticket category, quota exceeding capacity, zero-quantity bookings, payment after deadline, incorrect payment amount, paid bookings not expiring, double check-in, refund after check-in, refund approval state rules, and rejection reason requirement).

## Implemented user stories

| # | User Story | Application handler |
| --- | --- | --- |
| 1 | Create Event | `create-event` |
| 2 | Publish Event | `publish-event` |
| 3 | Cancel Event | `cancel-event` |
| 4 | Create Ticket Category | `create-ticket-category` |
| 5 | Disable Ticket Category | `disable-ticket-category` |
| 6 | View Available Events | `get-available-events` |
| 7 | View Event Details | `get-event-details` |
| 8 | Create Ticket Booking | `create-booking` |
| 9 | Calculate Booking Total Price | `Money` value object (in `create-booking` / `Booking`) |
| 10 | Pay Booking | `pay-booking` |
| 11 | Expire Booking | `expire-booking` |
| 12 | View Purchased Tickets | `get-customer-tickets` |
| 13 | Check In Ticket | `check-in-ticket` |
| 14 | Reject Invalid Ticket Check-in | `check-in-ticket` (validation rules) |
| 15 | Request Refund | `request-refund` |
| 16 | Approve Refund | `approve-refund` |
| 17 | Reject Refund | `reject-refund` |
| 18 | Mark Refund as Paid Out | `mark-refund-paid-out` |
| 19 | View Event Sales Report | `get-sales-report` |
| 20 | View Event Participants | `get-participants` |

Supporting user management (registration, role assignment, profile lookup) is also implemented under `src/application/user`.

## Implemented domain events

| Bounded context | Domain events |
| --- | --- |
| User | `UserRegistered`, `UserRoleChanged` |
| Event | `EventCreated`, `EventPublished`, `EventCancelled`, `TicketCategoryCreated`, `TicketCategoryDisabled` |
| Booking | `TicketReserved`, `BookingPaid`, `BookingExpired`, `TicketCheckedIn` |
| Refund | `RefundRequested`, `RefundApproved`, `RefundRejected`, `RefundPaidOut` |

## Application service interfaces

Interfaces for external systems are declared in the application layer and implemented in the infrastructure layer.

| Interface | Location | Implementation | Purpose |
| --- | --- | --- | --- |
| `IPaymentGateway` | `src/application/booking/services/payment-gateway.interface.ts` | `src/infrastructure/booking/services/payment-gateway.service.ts` | Charge booking payments via the payment gateway. |
| `IRefundPaymentService` | `src/application/refund/services/refund-payment.interface.ts` | `src/infrastructure/refund/services/refund-payment.service.ts` | Process refund payouts via the bank/refund service. |
| `IPasswordHasher` | `src/application/user/services/password-hasher.interface.ts` | `src/infrastructure/user/services/bcrypt-password-hasher.ts` | Hash and verify user passwords. |
| `INotificationService` | `src/application/notification/services/notification.interface.ts` | `src/infrastructure/notification/services/notification.service.ts` | Send email/WhatsApp notifications. |

## REST API endpoints

All routes are prefixed with `/api`.

### Users -`/users`
- `POST /users` -register a user
- `PATCH /users/:id/role` -change a user's role
- `GET /users/by-email` -look up a user by email
- `GET /users/:id` -get a user profile

### Events -`/events`
- `POST /events` -create an event
- `POST /events/:id/publish` -publish an event
- `POST /events/:id/cancel` -cancel an event
- `GET /events` -list available (published) events, filterable by date/location
- `GET /events/:id` -event details
- `GET /events/:id/participants` -participant list
- `GET /events/:id/sales-report` -sales report

### Ticket categories -`/events/:eventId/ticket-categories`
- `POST /events/:eventId/ticket-categories` -create a ticket category
- `POST /events/:eventId/ticket-categories/:categoryId/disable` -disable a ticket category

### Bookings -`/bookings`
- `POST /bookings` -create a booking
- `POST /bookings/:id/pay` -pay a booking
- `POST /bookings/:id/expire` -expire an unpaid booking

### Tickets -`/tickets`
- `GET /tickets` -list a customer's purchased tickets
- `POST /tickets/check-in` -check in a ticket

### Refunds -`/refunds`
- `POST /refunds` -request a refund
- `POST /refunds/:id/approve` -approve a refund
- `POST /refunds/:id/reject` -reject a refund
- `POST /refunds/:id/pay-out` -mark a refund as paid out

## Project scripts

| Script | Description |
| --- | --- |
| `pnpm start` / `start:dev` / `start:prod` | Run the API |
| `pnpm build` | Compile to `dist/` |
| `pnpm test` / `test:cov` / `test:integration` | Run tests |
| `pnpm migration:run` / `migration:revert` / `migration:generate` | Manage migrations |
| `pnpm seed` | Seed sample data |
| `pnpm lint` / `format` | Lint and format |
