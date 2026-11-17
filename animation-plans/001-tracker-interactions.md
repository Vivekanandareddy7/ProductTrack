# 001 — Make tracker state changes responsive

- Status: DONE
- Commit: 3ddf00f
- Severity: MEDIUM
- Category: Interruptibility, performance, accessibility
- Estimated scope: tracker consumers and one route-scoped CSS file

## Problem
`components/product-card.tsx` uses `transition` broadly while `components/tracked-products.tsx` mounts filters abruptly. Custom cards duplicate the existing chart and tooltip, losing their interactive presentation. User explicitly requested implementation and limited it to the tracker.

## Target
Use existing chart components for hover feedback. UI entrances stay at 180–250ms; exits at 150ms. Animate opacity and full transform strings, avoid layout-property transitions. Strong ease-out: cubic-bezier(0.23,1,0.32,1). Modal scale begins at .96. Press feedback scale .97 at 160ms. The tab indicator uses the existing chart spring {stiffness:300,damping:30}. Typing updates results immediately without a stagger or fade delay.

## Repo conventions
Reuse motion/react already installed, shared Radix dialogs, and existing chart animation/tooltip spring config. transitions-dev icon-swap CSS is copied verbatim. Its semantic variables are scoped to `.tracker-surface`/`.tracker-dialog` because the user explicitly excluded the landing page.

## Steps
1. Add a tracker-local stylesheet. Add no styles to shared component definitions or app/globals.css.
2. Wire icon-swap into the filter trigger. Keep both icons mounted.
3. Use a shared-layout tab underline and transform-only press feedback.
4. Give tracker dialogs 250ms open, 150ms close, scale .96, with a reduced-motion opacity-only path.
5. Use keyed position layout animation only for discrete sort/tab changes; never animate every keystroke or stagger the initial grid.
6. Respect reduced motion in charts, layout changes and transitions.

## Boundaries
No landing files, no command palette changes, no new animation dependencies, no autoplay decorations or shimmer loops. The backend and existing alert behavior stay intact.

## Verification
Run `pnpm typecheck` and `pnpm build`; scoped lint must have no new errors. Feel-check repeated filters/tab toggles, sort reorder, dialog open/close and chart hover. Inspect 390px/1440px layouts. Reduced motion must remove movement and retain immediate state feedback.

## Done when
The tracker reuses existing components, discrete transitions are interruptible, and the landing page is unchanged.

## Verified

Tracker typecheck and scoped lint passed. Browser checks verified images, chart rendering, store filtering, target filtering, autocomplete search, sort order, history/editor dialogs, and a 390px viewport without horizontal overflow. All landing-owner diffs are empty.
