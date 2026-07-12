# Swiss — UI/UX Overhaul Design ("Friendly Native")

**Date:** 2026-07-11
**Status:** Approved (brainstorming) — ready for implementation planning
**Branch:** `ui-overhaul` (off `ui-flat-navbar`, which already flattened the navbar)

## Goal

Swiss works but *feels* "muito full" — dense, technical, cramped. This overhaul
introduces one coherent visual language across all three tools (Download,
Converter, Merge) plus Settings, making the app simpler, friendlier, and easier
to understand — without changing features, the flow, or the backend.

Direction (chosen by the user by comparing rendered mockups):

**"Friendly Native"** = calm/spacious base (macOS-native feel) · Swiss red used
only where it matters · rounded corners + bouncy motion · friendly text labels ·
**truly neutral greys (no color bias)**.

References to consult during implementation: `frontend-design`,
`ui-ux-pro-max`, `vercel-react-best-practices` (React/Next perf patterns —
motion must not cause re-render churn).

## Non-goals (YAGNI)

- No feature changes. No changes to what the tools do.
- No navigation/flow rethink (the navbar was already flattened to 3 direct links).
- No backend changes (`src-tauri/**` untouched).
- No new test framework (there is no frontend test runner; verify via
  `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm tauri dev` smoke).

## Design tokens

Tokens live in **`src/index.css`** as OKLCH custom properties (Tailwind v4,
`@tailwindcss/vite`). The current neutrals are **blue-biased** — hue 250–260 with
chroma 0.005 (e.g. `--background: oklch(0.16 0.005 260)`). That bias is the
"azulado" the user rejected.

### Color

- **Neutralize every neutral token: set chroma to 0** (hue becomes irrelevant),
  e.g. `--background: oklch(0.16 0 0)`, `--muted: oklch(0.22 0 0)`,
  `--border: oklch(0.27 0 0)`, `--foreground: oklch(0.93 0 0)`,
  `--muted-foreground: oklch(0.52 0 0)`, `--border-hover: oklch(0.32 0 0)`.
  Apply to BOTH the light and dark blocks in `src/index.css`.
- **Accent stays Swiss red**: `--primary: oklch(0.5 0.2 20)` (#c41e3a). It is the
  *only* hue in the app. Usage rule — red appears **only** on: the primary action
  (Baixar/Converter/Mesclar button), progress bars, and the active nav item.
  Everything else is neutral grey.
- **Semantic colors are separate from the accent**: success green (completed
  jobs), plus existing destructive/error. Do not use red as both accent and error
  signifier in a way that reads ambiguously — completed = green check, error =
  destructive treatment.

### Type scale

Kill all ad-hoc tiny sizes (`text-[10px]`, `text-[11px]`, `text-[12.5px]`).
Establish a fixed scale and use only it: **12 / 13 / 15 / 18 / 24** (caption,
body-sm, body, title, display). Raise control heights from `h-8`/`h-9` toward
`h-10` for primary inputs/actions. Fonts already present (`@fontsource` DM Sans /
Inter / IBM Plex Mono) — keep, but apply the scale consistently. Data/numbers may
use the mono face where alignment helps (tabular).

### Radius & motion

- Radius scale already exists (`--radius` + `--radius-sm..4xl`). Shift the app
  toward the **rounded** end: cards ~`--radius-xl` (16px), controls ~`--radius-md`
  (12px), pills fully round. Bump `--radius` base if needed so the whole scale
  reads friendlier.
- Add **motion tokens** (new CSS vars or a shared TS constant): a bounce easing
  `cubic-bezier(.34, 1.56, .64, 1)` and standard durations. Motion uses the
  already-installed `motion` library (v12) — no new dependency.

## Simplifications (grounded in real files)

Each is a concrete change to an existing component:

1. **`src/features/downloader/components/download-bar.tsx`** — remove the
   segmented compound control (format + quality + URL input + button glued with
   `rounded-none border-l-0 border-r-0`). Replace with a **paste-first hero**: one
   large rounded URL input with the primary button inside/adjacent, and
   format/quality as pills on a line below (left), save-path pill (right).

2. **Unify the two queue headers into one `<QueueBar>`** — today
   `src/features/downloader/components/queue-header.tsx` and
   `src/components/queue-actions-header.tsx` diverge. One component: count label +
   primary action + clear, used by all three tools.

3. **Unify the job item visual language** across
   `src/features/downloader/components/download-card.tsx` (grid card),
   `src/features/converter/components/file-row.tsx` (list row), and
   `src/features/merge/components/merge-job-row.tsx` — shared card/row styling,
   shared `src/components/job-actions.tsx` and `src/components/job-progress.tsx`.
   Layout (grid vs list) may differ per tool, but the visual vocabulary is one.

4. **Consistent supporting components** across the 3 tools:
   `src/components/empty-queue.tsx`, `src/components/save-path-button.tsx`,
   `src/components/file-drop-zone.tsx`, `src/components/format-select.tsx` (make
   it a friendly pill, not a tiny technical trigger).

5. **Apply the type scale + spacing + neutral tokens** to the route screens:
   `src/routes/downloader.tsx`, `src/routes/converter.tsx`,
   `src/routes/merge.tsx`, `src/routes/settings.tsx`, and
   `src/features/settings/components/version-card.tsx`.

## Motion system

Replace per-screen ad-hoc variants (today `JobQueue` takes `variant="scale"` /
`variant="slideX"` with per-screen `staggerCap` in
`src/components/job-queue.tsx`) with **one motion system**:

- **Route transition** on navigating between the 3 tools.
- **List stagger** on queue items entering.
- **Progress shimmer** on active bars.
- **Hover lift/bounce** on cards/pills (bounce easing).
- **Completion pop** on the done check.

Constraints:
- Respect `prefers-reduced-motion` everywhere (disable transforms/animation).
- **Performance** (`vercel-react-best-practices`): no re-render per progress tick.
  Current stores already update immutably with identity-preserving `.map`, and
  rows select their item by id — preserve that. Memoize rows where a parent might
  re-render for non-tick reasons. Motion runs on the compositor (transform/opacity)
  where possible, not layout-thrashing properties.

## Phasing

Each phase is independently shippable and leaves the app working:

- **F1 — Design tokens.** Neutralize `src/index.css` (chroma 0), confirm red-only
  accent, set type scale + radius + motion tokens. Visible but low-risk.
- **F2 — Shell.** `<QueueBar>` unification, `EmptyQueue`, save-path, format-select
  consistency. (Navbar already flattened.)
- **F3 — The three tools.** Paste-first hero (Downloader) + unified card/row
  language across Download/Converter/Merge, applying tokens + scale.
- **F4 — Motion system.** One system replacing per-screen variants, reduced-motion
  safe, perf-checked.

## Verification (no test runner)

Per phase and at the end:
- `pnpm exec tsc --noEmit` → "No errors found".
- `pnpm lint` → exit 0 (do not introduce new warnings; existing warnings in
  generated `ui/` files and `settings-store` are pre-existing).
- `pnpm exec vite build` → builds clean.
- `pnpm tauri dev` smoke: each of the 3 tools renders, the paste-first hero
  accepts a URL, queue items animate in, a job shows progress→done, reduced-motion
  disables animation. (GUI smoke is manual — the agent environment cannot hold a
  window; the human runs this.)

## Open risks / watch-items

- OKLCH chroma-0 neutrals must be checked for contrast in BOTH themes (light and
  dark) — don't just zero chroma and assume legibility; verify muted-foreground on
  surface still reads.
- The paste-first hero changes a well-worn interaction (`download-bar.tsx` has
  global paste/Enter keyboard handling, lines ~77-99) — that behavior must be
  preserved, not dropped, in the redesign.
- `job-queue.tsx`'s `variant`/`staggerCap` props are consumed by all three routes;
  changing its API means updating `downloader.tsx`, `converter.tsx`, `merge.tsx`
  together.
