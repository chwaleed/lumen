# Component Checklist

Use this checklist while implementing or refactoring:

1. Structure
- Shared component lives in `frontend/components`.
- Page-only component lives in `frontend/app/<route>/components`.
- Route state hook lives in `frontend/app/<route>/use-<route>-hook.ts`.

2. Naming
- Filenames are lowercase kebab-case.
- No PascalCase component filenames.
- Hook names use `use-<name>-hook.ts`.

3. Component Size and Composition
- Avoid large, monolithic component files.
- If a component grows large, create a folder for it.
- Keep a main composition file and split reusable parts into subcomponents.
- Example: `frontend/components/sidebar/sidebar.tsx`, `sidebar-link.tsx`, `sidebar-button.tsx`.

4. State
- Zustand store uses `create<T>()()`.
- Component reads only needed selectors.
- Keep stores small and scoped to a page or feature.

5. Styling
- Use semantic color tokens only.
- Reject direct palette classes (`zinc`, `blue`, `green`, etc.).
- Reject hardcoded hex colors.

6. Page Implementation
- Keep `page.tsx` focused on composition.
- Move UI blocks to local `components` folder.
- Build login/signup with form component + page hook.

7. Validation
- Run `npm run lint` in `frontend`.
- Fix import paths after moving files.
- Remove unused legacy files when safe.
