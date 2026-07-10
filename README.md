# Todo Backend — Shared API for Reminder Bot & Todo Web App

A [NestJS](https://nestjs.com) REST API backed by [Neon](https://neon.com) (serverless
Postgres) via [Drizzle ORM](https://orm.drizzle.team). It sits on the **same database**
as the [Reminder Bot](../TODO_bot) Telegram bot, exposing the same `users`/`tasks` data
over HTTP so the [web todo app](../todo-list_v2) can share tasks with the bot instead of
storing them in `localStorage`.

Users, permissions, and task rules are identical to the bot: a whitelist of Telegram
users, tasks with separate *owner* (recipient) and *author* (creator) roles, ownership
enforced at the SQL level.

---

## How it fits together

```
                 ┌──────────────┐
                 │  Neon (PG)   │   single source of truth: users, tasks
                 └──────┬───────┘
             ┌──────────┴──────────┐
             │                     │
      ┌──────▼──────┐       ┌──────▼───────┐
      │  TODO_bot    │       │ todo_backend │◄──── this repo
      │  (grammY)    │       │  (NestJS)    │
      └──────────────┘       └──────┬───────┘
                                     │ REST + JWT
                              ┌──────▼───────┐
                              │ todo-list_v2 │
                              │  (Next.js)   │
                              └──────────────┘
```

- **Schema** (`src/db/schema.ts`) and migrations (`drizzle/`) are copied from `TODO_bot`
  and must stay in sync with it — both projects point at the same Neon database.
- **Auth**: the site logs a user in via the
  [Telegram Login Widget](https://core.telegram.org/widgets/login). The backend verifies
  the widget's signature with the bot's own token, checks the user is on the whitelist,
  and issues a JWT for subsequent API calls.
- **Business rules** (who may mark a task done / edit / delete) mirror
  `TODO_bot/src/services/tasks.ts` exactly, so the bot and the site behave the same way
  for the same task.

---

## API

All routes are prefixed with `/api`. Except `GET /api` and `POST /api/auth/telegram`,
every route requires `Authorization: Bearer <token>`.

| Method | Route               | Description                                         |
|--------|---------------------|------------------------------------------------------|
| GET    | `/api`              | Health check (public)                                |
| POST   | `/api/auth/telegram`| Verify a Telegram Login Widget payload, return a JWT |
| GET    | `/api/users/me`     | The current authenticated user                       |
| GET    | `/api/users`        | The whole whitelist (e.g. for a task-recipient picker)|
| GET    | `/api/tasks`        | Current user's outstanding tasks (as recipient)       |
| POST   | `/api/tasks`        | Create a task, for yourself or another whitelisted user|
| PATCH  | `/api/tasks/:id`    | Edit task text (author only)                          |
| PATCH  | `/api/tasks/:id/done`| Mark a task done (owner only)                        |
| DELETE | `/api/tasks/:id`    | Delete a task (author only)                           |

---

## Security

- **Auth**: Telegram Login Widget HMAC-SHA256 signature check (timing-safe comparison,
  24h payload freshness window) → JWT session, re-validated against the whitelist on
  every request.
- **Input validation**: global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted`
  — unexpected/extra fields in a request body are rejected outright (no mass assignment).
- **Transport**: `helmet()` security headers, CORS restricted to an explicit origin
  allowlist (`WEB_ORIGIN`).
- **Rate limiting**: global throttling plus a stricter limit on `/api/auth/telegram`.
- **Error handling**: a global exception filter returns a generic 500 for unexpected
  errors (e.g. database failures) — internal details never reach the client, only the
  server log.
- **SQL**: all queries go through Drizzle's parameterized query builder; no raw string
  interpolation.

---

## Configuration (`.env`)

| Variable                 | Required | Description                                                |
|---------------------------|:--------:|--------------------------------------------------------------|
| `DATABASE_URL`             | Yes      | Neon connection string (shared with `TODO_bot`)              |
| `BOT_TOKEN`                | Yes      | Same bot token as `TODO_bot` — verifies Telegram login signatures |
| `JWT_SECRET`               | Yes      | Random secret (32+ chars) signing session JWTs. Rotate to invalidate all sessions |
| `JWT_EXPIRES_IN_SECONDS`   | No       | Session lifetime in seconds (default: `604800`, 7 days)      |
| `WEB_ORIGIN`               | No       | Comma-separated CORS origin allowlist (default `http://localhost:3000`) |
| `PORT`                     | No       | HTTP port (default `3001`)                                   |

---

## Installation and Execution

```bash
pnpm install

# Apply migrations to the shared Neon database (idempotent — safe to re-run)
pnpm run db:migrate

pnpm run start:dev    # development, watch mode
pnpm run build        # compile to dist/
pnpm run start:prod   # production
```

### Scripts

| Script              | Description                                    |
|----------------------|-------------------------------------------------|
| `start:dev`          | Run with auto-reload                            |
| `build`              | Compile to `dist/`                              |
| `start:prod`         | Run the compiled build                          |
| `test` / `test:e2e`  | Unit / end-to-end tests                          |
| `db:generate`        | Generate a migration from schema changes         |
| `db:migrate`         | Apply migrations to the database                 |
| `db:studio`          | Drizzle Studio — inspect data in a browser       |

---

## Project Structure

```
src/
  main.ts               # bootstrap: helmet, CORS, global validation/filters
  config.ts              # reads and validates .env (zod)
  app.module.ts           # wires all feature modules + global guards
  auth/
    auth.controller.ts    # POST /auth/telegram
    auth.service.ts       # verifies signature, issues JWT
    telegram-auth.util.ts # Telegram Login Widget HMAC verification
    strategies/jwt.strategy.ts
    guards/jwt-auth.guard.ts   # global auth guard (@Public() opts out)
  users/                  # whitelist read access
  tasks/                  # task CRUD, mirrors TODO_bot/src/services/tasks.ts
  db/
    schema.ts             # Drizzle schema (users, tasks) — shared with TODO_bot
    client.ts              # Neon connection
    drizzle.module.ts      # NestJS DI provider for the Drizzle client
    migrate.ts              # migration runner
  common/
    filters/all-exceptions.filter.ts  # hides internal error details
drizzle/                  # SQL migrations (shared history with TODO_bot)
```
