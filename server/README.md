# KaamSetu API

## Setup

1. From `server/`, install packages with `npm install`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` when PostgreSQL is available.
3. Start development mode with `npm run dev`, or use `npm start`.

The API defaults to `http://localhost:4000`.

## Database

Run the schema first, then development seed data:

```bash
psql "$DATABASE_URL" -f src/db/schema.sql
psql "$DATABASE_URL" -f src/db/seed.sql
```

The server starts without PostgreSQL. Configure `DATABASE_URL` before running database scripts.

## Available endpoints

- `GET /api/health`
- `GET /api/workers`
- `GET /api/employers`
- `GET /api/jobs`

The directory endpoints are placeholders until the database-backed services are implemented.
