# PortreAI backend

REST API and image-validation worker. Express + Prisma + Clerk + Cloudflare R2 + Neon.

## Setup

```bash
cp .env.example .env
```

Fill Neon `DATABASE_URL`, Clerk keys, and R2 credentials. Then:

```bash
pnpm install
pnpm db:generate
pnpm db:push
pnpm models:download
pnpm dev
```

API: http://localhost:4000

The worker starts with the API when `RUN_WORKER=true`.

### R2 CORS

Allow the frontend origin (`http://localhost:3000`) for `GET`, `PUT`, and `HEAD`, with `Content-Type` and `Authorization` headers.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | API + worker |
| `pnpm worker` | Worker only |
| `pnpm db:push` | Push Prisma schema to Neon |
| `pnpm models:download` | Face-detection model weights |
| `pnpm lint` / `pnpm typecheck` | Quality checks |
