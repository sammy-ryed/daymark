# Implementation verification

Evidence recorded on 6 October 2026. Latest verified application commit: [`74f6066`](https://github.com/sammy-ryed/daymark/commit/74f6066). Documentation and screenshot changes do not change application behavior.

## Automated and deployment checks

| Check | Result |
| --- | --- |
| API, web and mobile TypeScript | Passed |
| Contracts, API security, recovery validation, deadline filters, sorting and CSV safety | 22 tests passed |
| Next.js production build | Passed |
| Android development bundle | HTTP 200, including Daymark routes and updated forms |
| Expo dependency compatibility | Passed |
| GitHub Actions | Web/API checks passed for `74f6066` |
| Vercel deployment | Successful, functions in Mumbai |
| Same-origin API health | HTTP 200, configured true, locally and on Vercel |
| Unauthenticated production workspace request | HTTP 401 with `Cache-Control: no-store` |
| Live Supabase anonymous access | Projects, tasks and dashboard RPC denied access |
| Live two-user database isolation | Reads, updates, deletes, nested task insertion and dashboard isolation passed |
| Owner mutation and counts | Owner task completion updated the dashboard count |
| Database test cleanup | Rollback transaction left no fixture accounts or rows |
| Supabase Security Advisor | Zero errors and warnings after restricting the dashboard RLS helper |

Four integration tests exercise the real Supabase SDK against an isolated local Auth protocol fixture. They cover HttpOnly/Secure cookies without token leakage in JSON, refresh when the access cookie is missing, profile updates using the verified user's JWT, and recovery validation before password updates. They send no email and create no real account.

The last web/API production dependency audit reported zero vulnerabilities. The full workspace reported 29 transitive Expo findings: 19 high, 10 moderate and no critical. Incompatible Expo changes proposed by npm were not applied. These are dated results, not a guarantee about future advisories.

## Web behavior

The signed-in production workspace and profile were inspected in the owner's browser. Saving the existing display name succeeded without changing it. Registration reloaded without hydration errors. Recovery and profile routes responded on the deployment.

An isolated in-memory API fixture exercised the actual Next.js UI without writing to Supabase. Verified flows included task creation, inline status changes and board movement, overdue shortcuts, clearing filters and URL state, project filtering, keyboard selection, quick date selection, initial dialog focus, Escape and focus restoration, and Alt + N. No console errors were reported in that fixture session. Desktop navigation and header centers differed by less than one CSS pixel.

Dirty Cancel and Escape actions opened the discard prompt. Keep editing retained the draft; Discard closed without saving; unchanged forms closed directly. Browser refresh/tab closing uses the browser's native warning. SPA browser Back protection is not claimed.

### Short screens and keyboards

Web dialogs follow VisualViewport height and offset, with scrolling fields and persistent actions. Inputs use at least 1rem on phones to avoid iOS focus zoom. The viewport requests content resizing on supported browsers.

At both 390 x 360 and 320 x 360 CSS pixels, the project dialog measured top 8 / bottom 352, Save remained at bottom 343.2, and the document had no horizontal overflow. At 390 x 360, the calendar stayed between y=11.8 and y=208.2 and scrolled its 537px content internally. Login at 320 x 360 remained vertically scrollable with no horizontal overflow; its password toggle changed the input type successfully.

These are reduced-height browser checks, not physical keyboard emulation.

## Expo Go on Android

The owner supplied physical Android captures showing the current Daymark overview, project details and task list loading live workspace data. Three unedited images are included in the [README](../README.md#in-your-pocket):

- [Overview](images/expo-overview.jpg)
- [Project details](images/expo-project.jpg)
- [Task list](images/expo-tasks.jpg)

The displayed sample projects and humorous tasks were created explicitly at the owner's request. These captures confirm rendering and data loading, not every interaction or persistence edge case.

The native implementation includes project creation/editing, task management, full-screen selection sheets, a local-date calendar, profile editing and password recovery through the web flow. Save remains outside the scrolling editor. Task completion is optimistic and rolls back on failure. Mobile reads the workspace in one request, preserves data between tabs, uses a 60-second foreground freshness window and renders lists in batches of 30.

Android auth, workspace and editor screens use bounded keyboard-aware layouts. Shared scrolling reveals focused inputs after keyboard/layout changes and allows dragging while the keyboard stays open. Auth includes Next/Done actions, password visibility, disabled credential autocorrect and keyboard dismissal on submit. Standalone Android configuration uses resize mode.

Project/task editors and profile navigation guard dirty changes. Android Back uses the same editor confirmation. Force-closing the app cannot be intercepted. Physical testing of keyboard scrolling, discard confirmations, SecureStore persistence and token expiry is still pending. iOS, large system text and screen-reader traversal have not been verified. Native modal transitions are static.

The explicit native `./app` entry fixes route discovery across the C:/D: dependency junction. API filters now come from the request URL, excluding Next.js catch-all `path` metadata while still rejecting unknown or duplicate public filters.

## Screenshot provenance

Web sign-in is a hosted-page capture. Web overview and board captures use isolated fixture data. Expo Go screenshots are owner-provided physical Android captures with authorized sample content. None are design mockups. Private account/profile captures and local-network QR codes are not published.

## Remaining release limits

- **Email:** The owner chose Supabase's default sender. Public signup and recovery delivery remain restricted; custom SMTP is required for broad public use. A delivered recovery email, credential reset and refresh across real token expiry have not been tested end to end.
- **Native release:** Upstream Expo advisories need reassessment before distribution. No APK, full iOS pass or five-minute demonstration recording is included.
- **Accessibility:** Web focus and keyboard flows were checked, but full screen-reader and operating-system reduced-motion testing remain open. CSS reduced-motion fallbacks are implemented.
- **Scale:** Caching and parallel reads are implementation improvements, not a measured performance benchmark. Large workspaces still need server pagination, virtualization and load testing. Application auth throttling is instance-local; Supabase Auth limits also apply.
- **Database operations:** Existing migrations were applied through SQL Editor. CLI migration history is not synchronized; do not blindly reapply them.
- **Local builds:** Dependencies and caches live on D:, while `.next` must stay local on C:. Stop the development server before a production build against the same `.next` folder. Consistent React versions and preserved module paths are required across the junction.

[Public repository](https://github.com/sammy-ryed/daymark) · [Live application](https://daymark-by-sammy.vercel.app)
