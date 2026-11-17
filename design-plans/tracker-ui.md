# Reuse the existing component system on the tracker

Written against: 3ddf00f. User explicitly requested implementation.

## Evidence chain
- Surface: `/tracker` and its `/demo` representation.
- Problem: user-provided screenshot and feedback reject the generic stats tiles, icon placeholders, and repetitive boxed target/progress treatment.
- Design evidence: existing `components/ui/{button,input,card,dialog,autocomplete}.tsx`, `components/charts/area-chart.tsx`, `components/charts/tooltip/chart-tooltip.tsx` and typography tokens in `app/layout.tsx`.
- Owner: `components/tracker-content.tsx`, `components/tracked-products.tsx`, `components/product-card.tsx`.
- Scope: tracker surfaces only. All landing owners are excluded. The existing chart accepts a new optional range; only tracker consumers supply it, and its default scale is preserved.
- Uncertainty: final density and chart presentation require rendered inspection.

## Design decision
Use a white, product-led watchlist with compact inline counts, recognizable product photographs, a two-column card grid, an existing interactive chart, and a single target line. Replace the parallel hand-built inputs/buttons with the available primitives. Keep all current filters, alerts, empty states and backend behavior.

## Reuse
- Card, Button, Input, Dialog primitives; Autocomplete for product search.
- Existing AreaChart, Area, Grid, XAxis, ChartTooltip and chart context.
- Existing Inter and Charm fonts; existing blue brand color.

## Changes
1. TrackerContent: title, compact counts, watchlist/activity switch, add-product dialog. Remove slogan and metric tiles.
2. TrackedProducts: existing autocomplete search, status tabs, functional filters, sorting and keyed product grid.
3. ProductCard: actual photo, readable product name and price, interactive compact history, understated target/alert controls.
4. Demo data: frozen public retailer product photographs with clearly labeled sample prices; no user identities.

## Scope
Exclude `app/page.tsx`, common header, global primitive definitions, landing components, and product-detail layout. New chart styling lives in tracker-only consumers.

## Validation
Desktop/mobile rendering, empty and failure states, search/store/price/status filters, sorting, target editor, chart hover, keyboard focus, typecheck and build. Verify landing owner diffs remain empty.

## Stop conditions
Do not widen the route scope to solve a visual issue. Do not change tracking data to improve appearances.

## Design documentation
This plan records the accepted tracker direction. No shared design documentation changes.

## User revision
The accepted revision adds permanent sidebar navigation and filters, removes the cursive heading, replaces native selects with official shadcn Select, restores the existing smooth orange chart, and navigates product images/titles to full detail routes. Mobile filters use shadcn Sheet. The marketing footer is hidden on app routes through a route wrapper; the landing footer and landing header variant render unchanged.

## Fixed workspace verification
The tracker uses the viewport below a 64px app header. Sidebar and product results have separate overflow regions with Lenis prevented inside them. In the browser, product scroll advanced from 0 to 602px while sidebar top stayed 141.328px and document scroll stayed 0. Empty watchlists omit useless filters/sorting and show an add-product action. Card footer is one area with target, explicit alert state, last check and grouped actions. Full-page demo product navigation was verified at `/demo/p/demo-0`.
