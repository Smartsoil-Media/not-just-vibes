# not-just-vibes

An AI coding tutor that helps you build real projects while genuinely learning.

- **Local LLM** (Qwen2.5-Coder via Ollama) for fast hints, "I'm stuck" levels 1–3, skill detection, side quests.
- **Claude Sonnet** for the initial project breakdown, "Commit to AI" full reviews, and the hardest "I'm stuck" tier.
- **Sandpack** for an in-browser preview/run.
- **Anti-paste**: AI code arrives as a reveal-one-line-at-a-time hint block.

## Layout

```
apps/
  web/     Vite + React + shadcn — three-pane IDE
  server/  Hono + Drizzle + SQLite — AI router, persistence
packages/
  shared/           Zod schemas + TS types
  skills-catalog/   Skill graph + per-skill detectors
  templates/        Sandpack-shaped starter projects
```

## Quickstart

```bash
pnpm install
cp .env.example .env  # fill in ANTHROPIC_API_KEY
ollama pull qwen2.5-coder:7b-instruct
pnpm db:push
pnpm dev               # web on :5173, server on :8787
```
