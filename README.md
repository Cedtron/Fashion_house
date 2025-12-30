## Running the Project with Docker

This project is fully containerized and can be run using Docker Compose. The setup includes three main services:

- **ts-back-end** (NestJS, Node.js v22.13.1)
- **ts-front-end** (React/Vite, Node.js v22.13.1)
- **py-image-service** (Python 3.13)

# Fashion House

Lightweight README to get you up & running quickly.

This repository contains a full-stack application:

- back-end: NestJS + TypeORM (MySQL)
- front-end: React + Vite
- optional: Python image service (image-service)

## Quick Dev Start (no installs)

These scripts assume you've already installed dependencies once. They will NOT run npm install.

- Start both dev servers (backend + frontend):

```bash
npm start
```

- Start only backend (dev watch):

```bash
npm run start:backend
```

- Start only frontend (Vite dev server):

```bash
npm run start:frontend
```

Notes:

- `npm start` uses `concurrently` to run the backend and frontend dev servers. It will NOT run any install step.
- If you need to install dependencies for the first time or update them, run:

```bash
npm run install:all
```

## Production build & run

- Build both apps:

```bash
npm run build
```

- Start production services locally (backend from `dist`, frontend preview):

```bash
npm run start:prod
```

## Docker

You can run the whole stack in Docker Compose (optional):

```bash
docker compose up --build
```

Stop containers:

```bash
docker compose down
```

## Database behavior

- The backend is configured to use MySQL (see `back-end/.env.example`).
- On bootstrap the backend will attempt to create the configured database automatically if it does not exist. This is implemented in `back-end/src/database/database.module.ts` using `mysql2/promise` before TypeORM connects.

Environment variables used by the backend (defaults shown in code):

- DB_HOST (default: localhost)
- DB_PORT (default: 3306)
- DB_USERNAME (default: root)
- DB_PASSWORD (default: empty)
- DB_DATABASE (default: fashion_house)
- DB_SYNCHRONIZE (default: true) — controls TypeORM synchronize

If you prefer the repo to create the DB before starting both servers, run the setup flow once:

```bash
npm run setup
```

This runs `install:all` and the DB setup script.

## Useful scripts (summary)

- `npm start` — start both dev servers (no installs)
- `npm run start:backend` — start backend only (dev)
- `npm run start:frontend` — start frontend only (dev)
- `npm run install:all` — install root, backend, and frontend dependencies
- `npm run setup` — install all + DB setup (manual)
- `npm run build` — build both apps
- `npm run start:prod` — start both in prod mode (backend from dist + frontend preview)

## Troubleshooting

- If backend fails to start because of DB connection issues, verify your MySQL server is running and the env vars are correct.
- To manually create the DB, you can run the SQL command shown in the code or run `back-end/setup-database.js` (this is used by `npm run setup`).
- If `npm start` still runs installs, check for a `prestart` npm hook in `package.json` (none by default in this repo).

## Where to look next

- Backend: `back-end/src` — Nest modules, controllers, services
- Frontend: `front-end/src` — React app (Vite)
- Docker Compose: `compose.yaml`

If you want, I can add a short CONTRIBUTING section or expand the troubleshooting steps with common errors and fixes.

---

Happy hacking — tell me if you want this README expanded or tailored to a deployment (Heroku, ECS, etc.).
