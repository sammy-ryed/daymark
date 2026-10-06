# Project Management System Implementation Plan

Build the PDF's project and task management system with Next.js, Expo Go, and one Express REST API backed by Supabase Auth and PostgreSQL. Source stays in C:\Users\lenovo\Desktop\project. Main dependencies, npm downloads, and Android export output use D:\codex-project-deps\project-management. The Next.js .next cache stays local because a cross-drive cache junction broke routing.

## Current architecture

- apps/web: Next.js App Router, React Query, responsive rem-based CSS, HttpOnly authentication cookie, same-origin proxy to Express.
- apps/mobile: React Native and Expo Router, Expo Go SDK 57, SecureStore access token, pull-to-refresh, native controls and scalable text.
- apps/api: Express, Zod request validation, authentication rate limiting, safe errors and logs. Supabase validates tokens and executes data requests with the user's token, preserving RLS.
- packages/contracts: shared field schemas, enums, types, and progress calculation.
- packages/api-client: shared JSON requests, timeout handling, and authentication-error handling.
- supabase/migrations: relational schema, explicit grants, ownership policies, dashboard function, and restriction of the generated internal RLS helper.

Supabase replaces the original proposed Prisma/password/session implementation. Supabase Auth manages password hashing, unique email addresses, and signed tokens. Full-name metadata is for display only. Project ownership derives from the verified user id; task ownership derives from the parent project. There is no service-role key in the app. The connected new project is project-management, reference mulxqpqzwdrzplnuhddn, in Mumbai.

## Required behavior

Web supports registration/login/logout, project create/view/edit/delete, task create/view/edit/delete, task completion, search/filter controls, project details, and all five dashboard counts. Mobile supports the same account, dashboard, project viewing, task management, status/priority changes, search/filter, and refresh. Mobile project editing remains optional under the PDF.

Preserve project statuses Not Started, In Progress, Completed; task statuses Pending, In Progress, Completed; and priorities Low, Medium, High. Pending Tasks counts exactly Pending. Project status is explicitly editable. Progress is completed tasks divided by total tasks. Deleting a project cascades to its tasks after a clear confirmation. Start date must not exceed end date. Due dates are calendar dates and are not constrained to the project's date range.

Both clients use /api/auth/register, /api/auth/login, /api/auth/logout, /api/auth/me, /api/projects, /api/projects/:id, /api/tasks, /api/tasks/:id, and /api/dashboard. README documents methods, payloads, responses, and environment variables.

## Design and accessibility

Follow the bundled minimal-type-gallery skill and its written references: white canvas, near-black text, restrained coral actions, system sans-serif UI, serif display heading with a sharp coral echo, 2rem cards, 1.5rem padding, and the supplied subtle shadow. Preserve actual project/task content. Do not introduce a font marketplace or unrelated product.

The web entry heading has one semantic heading and hidden decorative slices with one entry ripple. Reduced motion removes the ripple and leaves a static echo. Controls are not distorted. Layouts adapt to phone and desktop widths; forms have labels and keyboard focus, and native dialogs manage focus. Native styling uses a rem-to-density-independent-unit adapter and normal font scaling. The screenshot referenced by the skill was missing from the ZIP, so exact visual comparison remains pending.

## Completed implementation stages

1. Created the three-app TypeScript workspace and shared contracts/API client.
2. Connected a new Supabase project; applied project/task schema, ownership policies, dashboard RPC, and advisor correction.
3. Implemented authentication and required REST operations, validation, protected requests, and error states.
4. Implemented web auth, dashboard, project and task screens, forms, confirmations, search/filter, and refresh.
5. Implemented the Expo auth/workspace/task flows and secure storage integration.
6. Passed type checks, 9 contract/API tests, Expo compatibility checks, Android bundle export, live database isolation tests, and a production web build. Browser auth screen inspected at wide and narrow widths.

## Remaining acceptance and delivery

1. Use a confirmed test account to exercise the complete web registration/login and project/task workflow through the rendered interface.
2. Open the mobile app on physical Android with Expo Go. Test secure persistence, session expiry, logout, keyboard avoidance, no-network recovery, pull-to-refresh, TalkBack, and enlarged text.
3. Verify cross-platform synchronization in both directions with the same account. Confirm counts after task updates and project deletion.
4. Test reduced-motion preference at runtime and compare the display effect if the missing screenshot becomes available.
5. Review compatible fixes for the documented Expo transitive dependency advisories. Add pagination before datasets exceed the Supabase configured response cap.
6. Authenticate Supabase CLI and reconcile migration history. Do not reapply schema SQL to the existing project.
7. Prepare full OpenAPI output, deployment configuration, public repository, web/API URLs, Android APK or stable Expo distribution link, and the PDF's five-minute screen recording. Use only test data. No publishing has been performed in this implementation stage.

## Session and operational choices

Access tokens expire at Supabase's configured deadline; refresh-token rotation is deferred. Web cookies are HttpOnly, Secure in production, and SameSite Lax. Cookie mutations require a trusted Origin and custom client header. Mobile uses SecureStore and bearer authentication. Supabase logout revokes refresh sessions, while issued access tokens may remain valid until expiration; immediate JWT revocation is not claimed.

A physical phone uses the computer's LAN address or deployed HTTPS API, never its own localhost. The local mobile environment is configured for 192.168.1.12:4000 and needs updating if that address changes. The Expo Metro tunnel alone does not expose Express. Keep secrets out of client environment variables; the app requires only the project URL and publishable key on the API server.

Optional bonuses remain Docker, CI/CD, sorting, audit logs, roles, refresh tokens, push notifications, offline viewing, iOS support, and mobile project editing. Required PDF behavior takes priority. See docs/VERIFICATION.md for actual evidence and unverified behavior.
