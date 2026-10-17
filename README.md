# SprintFlow

A centralized platform for managing software projects using **Agile Scrum** practices.
Create user stories, plan sprints, assign tasks, update statuses, and view reports
through a single dashboard.

![SprintFlow](https://img.shields.io/badge/SprintFlow-Agile%20Sprint%20%26%20Task%20Management-4f46e5)

## Features

- **Authentication** — email/password accounts (Supabase Auth)
- **Projects & teams** — create projects, invite teammates by email, owner/member roles
- **Backlog & user stories** — title, description, acceptance criteria, story points, assignee
- **Sprints** — name, goal, start/end dates, status (planned / active / completed)
- **Tasks** — sub-tasks per story with their own status and assignee
- **Kanban board** — five-column board (Backlog → To Do → In Progress → In Review → Done) with points per column
- **Dashboard** — active sprint, velocity, per-status breakdown, team overview
- **Reports** — sprint health (actual vs. ideal progress), member contribution, **CSV export**
- **Security** — PostgreSQL Row Level Security: every row is scoped to the user's projects

## Tech stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18 + TypeScript + Vite |
| Database  | PostgreSQL (Supabase) with Row Level Security |
| API       | Supabase (PostgREST) — no custom backend needed |
| Auth      | Supabase Auth (email + password) |
| Hosting   | GitHub Pages (static) |

## Getting started

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Open the **SQL Editor** and run the entire contents of [`supabase/schema.sql`](supabase/schema.sql).
   This creates all tables, indexes, triggers, and Row Level Security policies.
3. In **Project Settings → API**, copy the **Project URL** and the **anon public key**.

### 2. Configure the app

The app reads two environment variables at build time:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

For local development, create a `.env` file in the project root:

```bash
cp .env.example .env   # then fill in your values
npm install
npm run dev
```

> The **anon key is safe to ship in the browser** — it is a public key, and all
> data access is protected by Row Level Security plus Supabase Auth.

### 3. Deploy

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`)
that builds and deploys to **GitHub Pages** on every push to `main`.

To wire the database into the deployed site, set these as **repository variables**
(Settings → Secrets and variables → Actions → Variables):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then push again — the workflow bakes them into the build.

## Project structure

```
src/
  lib/          # types, Supabase client, API layer
  context/      # Auth + Project data contexts
  components/   # Layout, Modal, banners
  pages/        # Auth, Projects, Dashboard, Backlog, Sprint, Board, Team, Reports
supabase/
  schema.sql    # production schema — run this in your Supabase SQL editor
scripts/
  verify-schema.mjs   # runs the schema against a real PostgreSQL engine (PGlite)
  smoke-ssr.mjs       # renders every page with mock data to catch runtime errors
```

## Verification

- `node scripts/verify-schema.mjs` — applies `supabase/schema.sql` to a real
  PostgreSQL engine and checks: DDL, RLS policy definitions, membership/owner
  helper logic, user-lookup view scoping, cascades, triggers, and constraints.
- `node scripts/smoke-ssr.mjs` — server-renders every page with representative
  data to catch runtime errors.

## License

MIT