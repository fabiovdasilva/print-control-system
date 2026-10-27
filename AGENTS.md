# Print Control System — agent instructions

## Installed project skills

Before changing this repository, use the relevant installed workflow skill in `.agents/skills/`:

- For feature work and changes to behavior, read `.agents/skills/brainstorming/SKILL.md`. The product owner has authorized implementation directly for this project; use the recorded scope and proceed with sensible defaults.
- For multi-step implementation, read `.agents/skills/writing-plans/SKILL.md` and keep an incremental implementation plan with the project notes.
- For defects, read `.agents/skills/systematic-debugging/SKILL.md` before proposing a fix.
- For UI, dashboards, design systems, accessibility, and responsive layout, read `.agents/skills/ui-ux-pro-max/SKILL.md` and use its local search scripts/data when useful.
- Before claiming completion, read `.agents/skills/verification-before-completion/SKILL.md` and run the relevant available build/verification commands.

Superpowers skills are installed under `.agents/skills/` and UI UX Pro Max is installed at `.agents/skills/ui-ux-pro-max/`. Preserve their upstream license files.

## Project layout

- `ServerMock/` is the ASP.NET Core API and local central service.
- `Agent/` is the Windows client agent.
- `AdminPanelV2/` is the active web dashboard launched by `Run_AdminPanel.bat`.
- `AdminPanel/` is a legacy dashboard; do not add new features there unless explicitly requested.

## Safety and versioning

- Never commit databases, real print-job metadata, credentials, API keys, or generated binaries.
- Keep the `master` branch working. It is connected to Lovable; use ordinary commits and never rewrite published history.
- Prefer small, reviewable commits at working milestones.
