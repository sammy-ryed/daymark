# Daymark

**A little less noise. A little more progress.**

A personal workspace for projects, tasks, and deadlines. Built with Next.js, Expo Go, Express, and Supabase. Typography and motion follow Minimal Type Gallery and Taste Skill.

[Open Daymark](https://daymark-by-sammy.vercel.app) · [Source](https://github.com/sammy-ryed/daymark) · [Design](docs/DESIGN.md) · [Verification](docs/VERIFICATION.md)

![Daymark sign-in screen](docs/images/sign-in.jpg)

## Your work, at a glance

See projects, pending work, upcoming deadlines, and progress without opening every project. Switch between a task list and a board, filter the work that matters, and use **Mark done** to finish a task.

![Daymark overview with sample projects and deadlines](docs/images/dashboard.jpg)

## Made for the details

- Create, edit, and delete projects and tasks with validation and deletion warnings.
- Organize tasks by status, priority, project, and deadline. Search, sort, and export the current view as CSV.
- Switch between list and board layouts; your layout preference is remembered.
- Use themed dropdowns with keyboard navigation and a calendar with Today, Tomorrow, and In a week shortcuts.
- Keep Save within reach in scrollable mobile forms.
- Edit your display name, inspect your account email, and request a password reset.
- See task status changes immediately. Failed saves restore the previous state.
- Navigate with visible focus, accessible labels, and shortcuts: **Alt + N** creates, **Alt + K** searches.
- Use a responsive layout with rem dimensions and a reduced-motion fallback.

![Daymark task board with explicit completion actions](docs/images/task-board.jpg)

Screenshots show the actual application. The overview and board use an isolated sample workspace for documentation, with no real user data or seeded production records.

## Live deployment

**Web:** https://daymark-by-sammy.vercel.app  
**API:** https://daymark-by-sammy.vercel.app/api  
**Health:** https://daymark-by-sammy.vercel.app/api/health

Vercel builds `apps/web` from GitHub `main`. Next.js serves Express through `/api/[...path]`, keeping browser cookies on the same origin. Functions run in Mumbai (`bom1`), near Supabase. Static assets use platform caching; private API responses use `Cache-Control: no-store`.

**Email delivery is intentionally limited for now.** The owner chose to retain Supabase's default sender. It only delivers to pre-authorized Supabase team addresses and is not a public production email service. Public signup confirmation and recovery require [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp). Existing confirmed accounts can sign in. Email confirmation remains enabled.

## Run locally

Use Node.js 22.12+ or Node.js 24 and npm.

```sh
npm ci
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
npm run dev
```

Set the Supabase URL and publishable key in both environment files. Set `WEB_ORIGIN=http://localhost:3000`. Open http://localhost:3000. The web app includes its same-origin API; the standalone API on port 4000 remains available for mobile development. Set `API_ORIGIN` only if you want the web app to proxy a separate Express server.

On this Windows workspace, source stays at `C:\Users\lenovo\Desktop\project` while dependencies and caches live on D:

```powershell
powershell -File scripts/install-dependencies.ps1
```

Use this installer instead of reinstalling over the `node_modules` junction. Keep `.next` on C: and stop the dev server before building. The launcher preserves module paths across the junction. React is pinned consistently across workspaces to avoid duplicate server-renderer runtimes.

## Expo Go

The Android companion uses the same accounts and API. It supports project viewing, task management, filters, dashboard metrics, and pull-to-refresh.

```sh
cp apps/mobile/.env.example apps/mobile/.env
npm run mobile
```

Set `EXPO_PUBLIC_API_URL=https://daymark-by-sammy.vercel.app/api` to use the hosted API. Alternatively, use `http://YOUR_COMPUTER_LAN_IP:4000/api` with the local API running. Scan Metro's QR code with Expo Go compatible with SDK 57. Restart Metro after changing environment variables. Physical Android verification and an APK are still outstanding.

## Supabase and authentication

For a fresh project, apply the SQL files in `supabase/migrations` in order. They create owner-isolating row-level policies, validation constraints, and a security-invoker dashboard function. The existing project already has these migrations applied through SQL Editor; its CLI migration history has not been synchronized. Do not reapply them blindly.

The application uses a publishable key plus the signed-in user's JWT. It never uses a service-role key. Never commit environment files or tokens.

Supabase Authentication URL Configuration:

- Site URL: `https://daymark-by-sammy.vercel.app`
- Redirect URL: `https://daymark-by-sammy.vercel.app/reset-password`
- Add `http://localhost:3000/reset-password` only when testing recovery locally.

Web access and refresh tokens use HttpOnly, SameSite cookies with Secure enabled in production. Expired web access tokens refresh on the next request. Recovery removes tokens from the URL fragment immediately, validates them server-side, and requests global session sign-out after resetting the password. Already issued access JWTs can remain valid until expiry. Mobile stores its access token in Expo SecureStore and asks for sign-in again at expiry.

## Performance and security

- One workspace request replaces the old profile-to-three-request loading sequence. Independent database reads run in parallel.
- React Query retains private data in memory with a 60-second freshness window. Logout clears it. Private workspace data is not persisted in localStorage.
- Status changes are optimistic, with rollback on failure and background reconciliation.
- Workspace reads page through PostgREST results to avoid silent row truncation. Search remains client-side; very large workspaces need server pagination and virtualized lists before scale testing.
- Schemas validate every mutation. Supabase RLS enforces ownership independently of the UI.
- Cookie writes require the trusted origin and a custom header. Native clients use bearer tokens.
- Auth limits skip read-only requests. Vercel's trusted proxy supplies client IPs. The application limiter is instance-local; Supabase Auth limits also apply.
- Security headers, bounded JSON bodies, sanitized errors, and request IDs are included. Logs omit bodies and credentials.

## Checks

```sh
npm run typecheck
npm test
npm run build
npm audit --omit=dev --workspace @project/web --workspace @project/api
```

GitHub Actions checks web/API changes on pushes and pull requests. Vercel performs its own production build. On 6 October 2026, all 20 tests passed, TypeScript passed across web/API/mobile, the deployment was ready, and the web/API production audit reported zero vulnerabilities. The Expo tree still has upstream advisories. See [verification details and limits](docs/VERIFICATION.md).

## API reference

Routes use the `/api` prefix and JSON. Web writes send `X-Project-Client: web` and the configured Origin. Mobile sends `X-Project-Client: mobile` and `Authorization: Bearer <token>` after login.

| Route | Purpose |
| --- | --- |
| POST `/auth/register` | Register with `{fullName,email,password}` |
| POST `/auth/login` | Sign in with `{email,password}` |
| POST `/auth/logout` | Revoke the current refresh session and clear cookies |
| GET `/auth/me` | Read the safe profile |
| PATCH `/auth/profile` | Update `{fullName}` |
| POST `/auth/forgot-password` | Request recovery with `{email}` |
| POST `/auth/reset-password` | Validate recovery tokens and change password |
| GET `/workspace` | Profile, projects, tasks, and dashboard together |
| GET, POST `/projects` | List or create projects |
| GET, PUT, DELETE `/projects/:id` | Read, update, or delete an owned project |
| GET, POST `/tasks` | List or create tasks |
| GET, PUT, DELETE `/tasks/:id` | Read, update, or delete an owned task |
| GET `/dashboard` | Five owner-scoped counts |
| GET `/health` | Process status and configuration availability |

Project statuses: Not Started, In Progress, Completed. Task statuses: Pending, In Progress, Completed. Priorities: Low, Medium, High. Dates: `YYYY-MM-DD`. Validation contracts live in `packages/contracts`.

```mermaid
erDiagram
  AUTH_USERS ||--o{ PROJECTS : owns
  PROJECTS ||--o{ TASKS : contains
  AUTH_USERS { uuid id PK }
  PROJECTS { uuid id PK uuid owner_id FK text name text status date start_date date end_date }
  TASKS { uuid id PK uuid project_id FK text name text status text priority date due_date }
```

### Expo Go on your phone

The native Daymark app includes project creation/editing, task management, a compact overview, date selection, profile editing, and password recovery through the web app. It uses the same live account and data as the website.

Run `npm run mobile -- --go --lan` and connect your phone to the computer's Wi-Fi. Open the displayed QR code in Expo Go. The mobile entry explicitly resolves `./app`, which also supports this workspace's dependencies on a separate drive. Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your deployed API URL, then restart Expo after changing it. If route changes appear stale, restart with `npm run mobile -- --go --lan --clear`.
