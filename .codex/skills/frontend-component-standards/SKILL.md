---
name: frontend-component-standards
description: Optimize and reorganize Next.js frontend components using a strict hierarchy, naming, styling, and component-size system. Use when requests involve component cleanup/refactors, adding new pages, creating login/signup flows, splitting shared vs page-specific components, breaking large components into smaller reusable parts, enforcing lowercase kebab-case filenames, restricting Tailwind colors to global.css tokens, and implementing small page-level Zustand hooks with shadcn/ui conventions.
---

# Frontend Component Standards

Apply these standards while editing the frontend:

- Place reusable/shared components in `frontend/components` (if a repo is already standardized on `app/components`, keep that existing convention consistently).
- Place page-specific components in `frontend/app/<route>/components`.
- Place page-level state hooks in `frontend/app/<route>/use-<route>-hook.ts`.
- Keep filenames lowercase kebab-case (example: `dropdown-menu.tsx`, `login-form.tsx`, `use-login-hook.ts`).
- Do not keep large UI blocks in one file. Break large components into smaller reusable subcomponents.
- When a component grows large, convert it into a folder and split files by responsibility.
- Keep one main export file named after the folder, then add focused sub-files (example: `frontend/components/sidebar/sidebar.tsx`, `sidebar-link.tsx`, `sidebar-button.tsx`).
- Use only semantic color tokens from `app/globals.css` (example: `bg-primary/10`, `text-foreground`, `border-border`).
- Follow Zustand and shadcn best practices.

## Workflow

1. Audit structure and naming.
2. Move shared UI to `frontend/components`.
3. Move route-only UI to `frontend/app/<route>/components`.
4. Split oversized components into folder-based, reusable subcomponents.
5. Add or refactor small page Zustand hooks.
6. Replace non-token colors with semantic token classes.
7. Ensure login/signup pages follow page-folder architecture.
8. Run lint and fix issues.

## Page Structure Pattern

Use this structure for auth and similar pages:

```text
frontend/app/login/
  components/
    login-form.tsx
  page.tsx
  use-login-hook.ts

frontend/app/signup/
  components/
    signup-form.tsx
  page.tsx
  use-signup-hook.ts
```

Keep `page.tsx` thin. Render page-specific components and keep state logic in the route hook file.

## Large Component Pattern

When a component becomes too large, convert it to a folder and split by behavior:

```text
frontend/components/sidebar/
  sidebar.tsx
  sidebar-link.tsx
  sidebar-button.tsx
```

- `sidebar.tsx` stays the main export and composition root.
- Move repeated UI pieces into focused subcomponents.
- Keep each file small and purpose-specific.

## Zustand Rules

- Use `create<T>()()` syntax for TypeScript stores.
- Keep state/actions small and page-focused.
- Use selectors in components (`useStore((state) => state.value)`).
- Avoid creating new objects in selectors.
- Keep actions predictable and side-effect aware.

## shadcn Rules

- Prefer existing shadcn primitives from `frontend/components/ui`.
- Compose pages with `card`, `input`, `label`, `button`, and form-friendly patterns.
- Keep component APIs simple and typed.

## Color and Class Rules

- Do not use direct Tailwind palette classes like `bg-zinc-100`, `text-blue-500`, `bg-green-500/10`.
- Do not use hardcoded hex colors.
- Use semantic classes mapped from `app/globals.css` tokens.
- Allowed examples: `bg-background`, `text-foreground`, `bg-primary/10`, `text-muted-foreground`, `border-border`.

## Reference

Read [component-checklist.md](references/component-checklist.md) before large refactors to run the full checklist quickly.
