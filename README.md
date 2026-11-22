# Announcements Board REST API

A JSON REST API for an announcements board with JWT authentication, authorization and ownership checks. Built as a master's course assignment.

## Overview

A pure JSON API with no HTML rendering. The backend serves any client (React apps, mobile apps, etc.) over HTTP.

- **Anonymous visitors** can browse the list of announcements and view each one.
- **Registered users** can create announcements.
- **Only the author** can edit or delete an announcement.

Authentication uses JWT with refresh tokens:

- **Access token** — valid for 15 minutes, sent as `Authorization: Bearer <token>` to protected routes.
- **Refresh token** — valid for 7 days, stored in the database, exchanged for a new token pair via `/auth/refresh`.
- **Token rotation** — every refresh deletes the old refresh token, so a stolen token cannot be reused.

## Tech stack

| Technology                     | Purpose                         |
| ------------------------------ | ------------------------------- |
| Node.js + TypeScript (tsx)     | Runtime                         |
| Express 5                      | Web framework                   |
| Prisma 7                       | ORM (PostgreSQL)                |
| Zod 4                          | Input validation                |
| bcrypt                         | Password hashing                |
| jsonwebtoken                   | JWT authentication              |
| @asteasolutions/zod-to-openapi | OpenAPI docs generated from Zod |
| swagger-ui-express             | Swagger UI                      |
| dotenv                         | Environment variables           |

## Getting started

### 1. Start PostgreSQL with Docker

```bash
docker run --name postgres-dev \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=announcements \
  -p 5432:5432 \
  -d postgres
```

After a reboot, start the existing container with `docker start postgres-dev`.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

| Variable       | Description                                  | Example                                                                    |
| -------------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string                 | `postgresql://postgres:password@localhost:5432/announcements?schema=public` |
| `JWT_SECRET`   | Secret used to sign JWTs (long random value) | `your-secret-key-at-least-256-bits-long`                                   |
| `PORT`         | Server port (optional, default `3000`)       | `3000`                                                                     |

To generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Apply migrations and generate Prisma Client

```bash
npm run prisma:migrate
npm run prisma:generate
```

> With Prisma 7, `migrate dev` no longer generates the client automatically, so both commands are required.

### 5. Run the server

```bash
npm run dev
```

The API runs at http://localhost:3000, and the docs are at http://localhost:3000/api-docs.

## API routes

🔒 = requires `Authorization: Bearer <accessToken>`

### Auth

| Method | Path             | Description                                  | Auth |
| ------ | ---------------- | -------------------------------------------- | ---- |
| POST   | `/auth/register` | Register a user, returns user + token pair   | —    |
| POST   | `/auth/login`    | Log in, returns user + new token pair        | —    |
| POST   | `/auth/refresh`  | Exchange a refresh token for a new pair      | —    |
| POST   | `/auth/logout`   | Invalidate the current user's refresh token  | 🔒   |
| GET    | `/auth/me`       | Current user profile                         | 🔒   |

### Announcements

| Method | Path                 | Description                                  | Auth |
| ------ | -------------------- | -------------------------------------------- | ---- |
| GET    | `/announcements`     | List with pagination, search and sorting     | —    |
| GET    | `/announcements/:id` | Announcement details with author             | —    |
| POST   | `/announcements`     | Create an announcement                       | 🔒   |
| PATCH  | `/announcements/:id` | Partially update own announcement            | 🔒   |
| DELETE | `/announcements/:id` | Delete own announcement                      | 🔒   |

### Status codes

| Code | When                                                                     |
| ---- | ------------------------------------------------------------------------ |
| 200  | Success                                                                  |
| 201  | User or announcement created                                             |
| 204  | Logout or delete succeeded (no response body)                            |
| 400  | Validation failed or malformed JSON                                      |
| 401  | Missing/invalid/expired access token, wrong credentials, bad refresh token |
| 403  | Trying to update or delete another user's announcement                   |
| 404  | Announcement or route not found                                          |
| 409  | Username or email already taken                                          |

Errors share one shape:

```json
{ "error": "Access denied" }
```

Validation errors also include details per request part:

```json
{
  "error": "Validation failed",
  "details": {
    "body": ["title: Too small: expected string to have >=5 characters"]
  }
}
```

## Request parameters

### GET /announcements

| Parameter | In    | Description                                          |
| --------- | ----- | ---------------------------------------------------- |
| `search`  | query | Case-insensitive substring search in `title`         |
| `sort`    | query | `newest` (default) or `oldest`, by `createdAt`       |
| `page`    | query | Page number, integer > 0 (default `1`), 10 per page  |

Response:

```json
{
  "data": [ { "id": 5, "title": "...", "user": { "id": 1, "username": "..." } } ],
  "pagination": { "total": 23, "page": 2, "totalPages": 3, "perPage": 10 }
}
```

### POST /auth/register

| Field      | Rules                            |
| ---------- | -------------------------------- |
| `username` | string, required, 3–30 chars     |
| `email`    | valid email, required            |
| `password` | string, required, min 6 chars    |
| `name`     | string, required, min 2 chars    |

### POST /auth/login

| Field      | Rules            |
| ---------- | ---------------- |
| `username` | string, required |
| `password` | string, required |

A wrong username and a wrong password return the same `401 Invalid credentials`.

### POST /auth/refresh

| Field          | Rules            |
| -------------- | ---------------- |
| `refreshToken` | string, required |

### POST /announcements

| Field         | Rules                                              |
| ------------- | -------------------------------------------------- |
| `title`       | string, required, 5–50 chars                       |
| `description` | string, required, min 10 chars                     |
| `price`       | number, required, > 0                              |
| `category`    | required, one of `sale`, `service`, `job`, `other` |

The author is always taken from the access token, never from the request body.

### PATCH /announcements/:id

Same rules as `POST`, but every field is optional. At least one field is required, so an empty `{}` returns `400`.

## Data model

Three Prisma models (see [`prisma/schema.prisma`](prisma/schema.prisma)):

- **User** — `id`, `username` (unique), `email` (unique), `password` (bcrypt hash), `name`, `createdAt`
- **RefreshToken** — `id`, `token` (unique), `userId` → User, `createdAt`
- **Announcement** — `id`, `title`, `description`, `price`, `category` (enum), `userId` → User (required), `createdAt`, `updatedAt` (`@updatedAt`)

Deleting a user also deletes their announcements and refresh tokens (`onDelete: Cascade`).

## Project structure

```
hw-02-announcements-board/
├── prisma/
│   ├── schema.prisma               # Data models
│   ├── client.ts                   # Shared Prisma Client instance
│   └── migrations/                 # SQL migrations
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts      # register, login, refresh, logout, me
│   │   └── announcements.controller.ts  # CRUD + ownership check
│   ├── middleware/
│   │   ├── authenticate.ts         # Bearer token check, sets req.user
│   │   └── validate.ts             # validateBody / validateParams / validateQuery
│   ├── routes/
│   │   ├── auth.routes.ts          # Auth routes + OpenAPI docs
│   │   └── announcements.routes.ts # Announcement routes + OpenAPI docs
│   ├── utils/
│   │   └── tokens.ts               # JWT sign/verify helpers
│   ├── validators/
│   │   ├── auth.validator.ts       # Zod schemas for auth
│   │   └── announcements.validator.ts  # Zod schemas for announcements
│   └── openapi.ts                  # OpenAPI registry and bearerAuth scheme
├── generated/prisma/               # Generated Prisma Client (git-ignored)
├── app.ts                          # Express app entry point
├── prisma.config.ts                # Prisma CLI config
├── .env.example
├── package.json
└── tsconfig.json
```

## Scripts

| Command                   | Description                         |
| ------------------------- | ----------------------------------- |
| `npm run dev`             | Start with hot reload (`tsx --watch`) |
| `npm start`               | Start the server (`tsx`)            |
| `npm run prisma:migrate`  | Create and apply migrations         |
| `npm run prisma:generate` | Generate Prisma Client              |

## API documentation

Swagger UI: http://localhost:3000/api-docs

To call protected routes from Swagger UI:

1. Call `POST /auth/login` (or `/auth/register`) and copy `accessToken` from the response.
2. Click **Authorize** at the top of the page and paste the token.
3. Routes marked with a lock now send the token automatically.

## License

ISC
