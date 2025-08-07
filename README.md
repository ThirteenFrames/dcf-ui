# DCF UI

This project provides an interactive DCF (Discounted Cash Flow) module built with React, Vite, TailwindCSS, and shadcn/ui.

## Local Development

```bash
pnpm i # or npm i / bun i / yarn
pnpm dev
```

## Interface Overview

- `src/components/DCFModule.tsx`: Main interactive module with inputs, charts, and sensitivity table.
- `src/utils/dcf.ts`: Pure functions for DCF math and sensitivity matrix generation.
- `src/types/dcf.d.ts`: Strong TypeScript interfaces for inputs/results.

## Design System

- All color tokens and radii are defined in `src/index.css` using HSL values.
- Keep component-level inline styles minimal; prefer Tailwind tokens.

## Repository Rules (Operational)

Adopted from the Autonomous Agent Prompting Framework by aashari.

1. Phase 0 (Reconnaissance) first: understand the code and config before editing.
2. Keep edits small, typed, and covered: prefer pure functions, add types at boundaries, avoid deep nesting.
3. UI consistency: use Tailwind tokens and shadcn primitives; no ad-hoc CSS outside `index.css`.
4. Accessibility: label inputs, use semantic markup, and provide tooltip content for all info icons.
5. Performance: cancel animations on state changes; avoid unnecessary re-renders; memoize data transforms where needed.
6. DX: no console noise in production; lint clean; keep `README.md` current after UX/API changes.
7. Tests/build: a green local build is required before merging.

See `.cursor/rules` for the full doctrine and playbooks.

# draft for DCF tool
