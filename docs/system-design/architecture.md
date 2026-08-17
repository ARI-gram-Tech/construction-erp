# Architecture — Phase 0/1 decisions

## Stack
React (TS) + Tailwind v4 ↔ REST/JWT ↔ Django + DRF ↔ PostgreSQL
Mobile: Expo/React Native, same REST API, offline queue + sync.

## Tenancy
```
Super Admin (future, Phase 19)
     |
  Company  ── every business record scoped here
     |
  Project  ── every project-level record scoped here, via Project FK
     |
   Site     ── mobile app writes here, syncs up
```

`apps.common.models.CompanyOwnedModel` (abstract) is the enforced pattern:
any model that belongs to one company inherits it and gets a `company` FK
plus a `.for_company()` manager method. This was set up in Phase 1,
before any real business models exist, specifically so Phase 2 onward
never has to retrofit tenant scoping.

## Custom User model
Django's `AUTH_USER_MODEL` was pointed at `apps.accounts.User` before the
first migration, because changing it later requires a painful reset.
The model itself is intentionally minimal right now (email, phone) —
Role/Permission/UserRole tables are added in Phase 3.

## Settings split
`config/settings/base.py` (shared) → `development.py` / `production.py`.
`manage.py`, `wsgi.py`, `asgi.py` default to `development` so a fresh
clone runs immediately; production deploys must set
`DJANGO_SETTINGS_MODULE=config.settings.production` explicitly.

## Frontend layout levels
Matches the UI/UX blueprint's three-tier structure exactly:
- `AuthLayout` — login/reset (Level: pre-company)
- `CompanyLayout` — company HQ sidebar (Level 1)
- `ProjectLayout` — project workspace sidebar, swaps entirely on entry (Level 2)

Design tokens (navy/steel/amber, status colors, Inter) live in
`frontend/src/index.css` as a Tailwind v4 `@theme` block — see the
UI/UX blueprint for the rationale behind each color's role.

## What's verified vs. not
- Backend: `manage.py check` and `makemigrations --dry-run` pass clean
  (tested against a throwaway SQLite config; real dev/prod use Postgres).
- Frontend: `npm run build` passes clean.
- Mobile: scaffolded but **not installed or run** — no Expo/RN toolchain
  in the environment this was built in. Verify locally before relying on it.
