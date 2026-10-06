# Daymark design decisions

Daymark is a personal project and task workspace, built with Next.js, Expo, and Supabase. Its routes and required project/task fields are preserved.

The visual foundation is the user-supplied [Minimal Type Gallery](https://github.com/sammy-ryed/fullpower-taste-department/tree/main/skills/minimal-type-gallery). The [Taste Skill](https://github.com/Leonxlnx/taste-skill) redesign audit adds improvements to hierarchy, interaction states, navigation, and content density. The package is installed locally through `npx skills add Leonxlnx/taste-skill --agent codex --yes`; installed agent files are not runtime dependencies.

## Audit and response

- Unequal brand and account widths pulled the navigation away from the center. Desktop now uses equal outer grid columns. Mobile moves navigation onto its own full-width row.
- The authentication screen created excess vertical scrolling. A header/content/footer grid now fills the viewport while allowing natural scrolling on smaller screens.
- Task status changes required opening an editor. Themed Radix selects now update status directly with keyboard navigation, type-ahead, and collision-aware positioning.
- The old circular completion control did not explain its action. A visible Mark done label now accompanies the check icon, with a clear Completed state.
- Form scrollbars and native calendars felt disconnected from the visual system. Forms now have an internal scroll region, fixed action bar, and a themed DayPicker calendar with quick date choices.
- The dashboard showed counts without clear next actions. The new Up next section orders unfinished work by deadline, with actionable overdue/today counts.
- Long task collections lacked useful views. List/board switching, project and deadline filters, sorting, and CSV export share the same data.
- Actions lacked visible success feedback. Live-region notifications confirm mutations; empty/error/loading states explain what to do next.
- Browser autofill extensions injected `fdprocessedid` on authentication controls. Hydration suppression is limited to those controls; page-level hydration checks remain enabled.

## Visual rules

White canvas, near-black text, one coral accent. Serif display typography follows the supplied type-gallery reference; supporting UI uses the system sans-serif stack. Cards use 2rem radii, inner controls .75rem, and action buttons the pill token. All dimensional CSS uses rem or responsive units. The root font size remains the browser default.

Taste configuration: design variance 5, motion intensity 3, visual density 5. This is a working product, so landing-page recommendations for photography, glass, scroll hijacking, and ornamental animation do not apply. Keep the supplied typographic headline ripple on authentication pages and brief hover/notification feedback elsewhere. Reduced motion removes animation and transform feedback.

## Interaction details

- Alt + N opens the relevant creation form. Alt + K focuses list search.
- List/board choice is stored locally after hydration. Filters act on the current loaded dataset.
- Board status selection is keyboard accessible; drag-and-drop is not required.
- Overdue and upcoming filters exclude completed work and use local calendar dates.
- CSV exports only the current filtered/sorted task view and neutralizes formula prefixes.
- Dialogs support Escape and restore focus. Saving cannot be dismissed accidentally.
