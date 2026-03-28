# Contributing to Volt

Thank you for your interest in contributing to Volt — the infinite-canvas AI agent workspace!

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) >= 1.3
- Node.js >= 20
- macOS, Windows, or Linux

### Setup
```bash
git clone https://github.com/your-org/volt
cd volt
bun install
bun run dev
```

## Development Workflow

### Project Structure
```
apps/desktop/src/
├── main/           # Electron main process (IPC handlers, PTY, Git, Browser)
├── preload/        # Electron preload bridge (exposes APIs to renderer)
├── shared/         # Types shared between main and renderer
└── renderer/src/
    ├── workbench/  # Core UI features (canvas, source-control)
    ├── components/ # Shared UI components (ui/, layout/, editors/, tree/)
    ├── platform/   # Cross-cutting concerns (context, hooks)
    ├── lib/        # Utilities (utils, theme, i18n, ai-presets)
    ├── types/      # Shared type definitions
    └── locales/    # i18n translation files
```

### Adding a New Feature
1. Create a new folder under `workbench/contrib/<feature-name>/`
2. Add `index.ts` barrel export
3. Register any IPC handlers in `main/`
4. Add translations to `locales/en/translation.json`
5. Update `ARCHITECTURE.md` if needed

### One Component Per File
Each `.tsx` file must export exactly one React component. Helper sub-components should be in their own files.

### Styling
- Use Tailwind CSS utility classes exclusively
- No inline styles except for dynamic values (e.g., D3 transforms)
- Use the `cn()` helper from `lib/utils` for conditional classes
- Dark mode via `dark:` Tailwind prefix
- Theme-aware colors via CSS variables

### Commit Conventions
```
feat: add new feature
fix: bug fix
refactor: code refactor (no behavior change)
style: formatting/styling only
chore: maintenance
```

## Pull Request Guidelines
- One feature/fix per PR
- All TypeScript errors must be resolved
- Run `bun run build` before submitting
- Add a short description of what changed and why

## Code of Conduct
Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.
