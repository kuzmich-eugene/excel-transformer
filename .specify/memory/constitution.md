<!-- Sync Impact Report
Version change: 1.0.0 → 1.0.1
Modified principles:
  - I. Angular 21 + Standalone Components — clarified that standalone: true MUST be omitted
    (it is the Angular 21 default and explicit declaration is redundant/noise)
Templates requiring updates: none
Deferred TODOs: none
-->

# ExcelTransformer Constitution

## Core Principles

### I. Angular 21 + Standalone Components

Every component, directive, and pipe is a standalone Angular artifact by default in
Angular 21. The `standalone: true` property MUST be omitted from all `@Component`,
`@Directive`, and `@Pipe` decorators — it is redundant and constitutes noise. NgModules
are PROHIBITED in new code; existing NgModules MUST be migrated on any substantive
modification. Components MUST import only what they directly use — no barrel re-exports
that pull in unused dependencies. All lazy-loaded routes MUST use `loadComponent` or
`loadChildren` with standalone route configs.

**Rationale**: `standalone: true` is the implicit default in Angular 21. Omitting it
keeps decorators concise and avoids the false implication that the property is meaningful
or optional. NgModule boundaries add cognitive overhead and indirection with no benefit.

### II. Signals-First State Management

Application state MUST be expressed as Angular Signals (`signal()`, `computed()`,
`effect()`). RxJS SHOULD be reserved for inherently stream-oriented operations (HTTP,
WebSockets, DOM event streams); when bridging, use `toSignal()` / `toObservable()` at
the boundary only. Global state MUST live in injectable signal-based services, not in
component fields. Mutable signal updates MUST go through `.set()` or `.update()` —
direct mutation of signal-held objects without a signal update call is PROHIBITED.

**Rationale**: Signals are Angular 21's primary reactivity primitive. They provide
fine-grained change tracking, eliminate zone-based overhead, and integrate directly
with OnPush change detection for optimal rendering performance.

### III. OnPush Change Detection

Every component MUST declare `changeDetection: ChangeDetectionStrategy.OnPush`.
Default change detection is PROHIBITED in new components. Template expressions MUST be
pure and side-effect-free; use `computed()` signals or pure `pipe`s for derivations
instead of method calls in templates. Impure pipes are PROHIBITED.

**Rationale**: OnPush is a prerequisite for signal-based rendering performance. Without
it, fine-grained signal tracking is bypassed and the silent, unbounded re-render costs
that accumulate in large Angular applications are reintroduced.

### IV. Tailwind CSS — Utility-First Styling

All UI styling MUST use Tailwind CSS utility classes directly in component templates.
Custom CSS files MUST only define design tokens (`@layer base`, `@layer components`,
`@layer utilities`) where Tailwind utilities are genuinely insufficient. Inline `style`
bindings are PROHIBITED except for values that cannot be expressed as Tailwind utilities
(e.g., runtime-computed pixel values from user data). The shared `tailwind.config.ts`
file is the single source of truth for design tokens (colors, spacing, typography,
breakpoints).

**Rationale**: Utility-first styling co-locates appearance with structure, eliminates
dead CSS, and enforces visual consistency through a shared token layer without requiring
a separate component library or design system runtime.

### V. Accessibility — WCAG 2.1 AA Compliance

Every UI component MUST meet WCAG 2.1 Level AA. Non-negotiable requirements:

- All interactive elements MUST have accessible names via visible text, `aria-label`,
  or `aria-labelledby`.
- Keyboard navigation MUST be fully functional; focus order MUST be logical and
  follow DOM order unless explicitly justified.
- Color contrast ratios MUST meet AA minimums: 4.5:1 for normal text, 3:1 for large
  text and UI components.
- Dynamic content changes MUST be announced via ARIA live regions or deliberate focus
  management.
- All images MUST have descriptive `alt` text; purely decorative images MUST use
  `alt=""` and `role="presentation"`.
- Automated accessibility validation MUST run in CI using axe-core; zero violations
  of impact level "critical" or "serious" are permitted on merge.

**Rationale**: Accessibility is a non-negotiable baseline, not an afterthought. It
ensures the application is usable by all users, meets legal compliance requirements,
and is more robust for keyboard and assistive-technology users.

### VI. Test-Driven Quality Gates

Unit tests MUST be written for all signal-based services and computed state logic before
or alongside implementation — never deferred. Component tests MUST include axe-core
accessibility assertions and cover primary interaction scenarios. Test runner: Vitest
(`ng test`). E2E tests MUST cover at minimum the critical P1 user journeys. Zero
untested signal-based service methods are permitted at PR merge.

**Rationale**: Signal-based state and OnPush components require deliberate test coverage
because standard change-detection testing assumptions no longer apply. Accessibility
regression is most cheaply caught at test time, not in QA.

## Technology Stack

**Framework**: Angular 21 (standalone components, signals API, OnPush everywhere)
**Styling**: Tailwind CSS — utility-first; single `tailwind.config.ts` as token source
**Language**: TypeScript — strict mode enabled; `any` is PROHIBITED
**State**: Angular Signals — no NgRx, no BehaviorSubject-based global state stores
**HTTP**: Angular `HttpClient` with fully typed response generics; bridged to signals
  via `toSignal()` at the service boundary
**Testing**: Vitest (unit + component), ng e2e (end-to-end), axe-core (accessibility)
**Build**: Angular CLI 21 (`ng build`); production builds MUST have optimization enabled
**Runtime**: Node LTS as declared in `.nvmrc` or the `engines` field in `package.json`

## Development Workflow

- **Branching**: Feature branches off `main`; branch names follow `###-feature-name`
  convention matching the spec folder name.
- **Commits**: Conventional Commits format (`feat:`, `fix:`, `docs:`, `refactor:`,
  `test:`, `a11y:`).
- **Code Review**: All PRs MUST verify compliance with all six Core Principles before
  approval.
- **Accessibility Gate**: Automated axe-core checks MUST pass in CI before merge.
- **Linting**: ESLint with Angular-specific rules MUST pass; zero-warnings policy.
- **Complexity Justification**: Any deviation from a Core Principle MUST be documented
  in the feature plan's Complexity Tracking table with an explicit rationale.

## Governance

This constitution supersedes all other style guides, README conventions, and ad-hoc
coding standards for this project. It applies to all contributors and all code merged
into the `main` branch.

**Amendment Procedure**: Amendments require (1) a written proposal citing the principle
affected, (2) documented rationale and migration impact, (3) a version increment per
the policy below, and (4) an update to this file with today's date as `LAST_AMENDED_DATE`.

**Versioning Policy**:
- MAJOR — Removal or backward-incompatible redefinition of a Core Principle.
- MINOR — Addition of a new principle or materially expanded guidance in an existing one.
- PATCH — Clarifications, wording corrections, or non-semantic refinements.

**Compliance Review**: Compliance is reviewed at PR time. The Constitution Check section
in each `plan.md` gates Phase 0 research and MUST be re-verified after Phase 1 design.
Runtime development guidance lives in `README.md` and feature-level `quickstart.md` files.

**Version**: 1.0.1 | **Ratified**: 2026-03-01 | **Last Amended**: 2026-03-01
