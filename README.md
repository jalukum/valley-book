# Valley Book

An **unofficial, fan-made** companion app for *Stardew Valley*: a day-by-day guide, bundle and museum checklists,
villager schedules and gifts, perfection tracking and more. It works offline once loaded, and your progress is kept
in your browser.

**Live:** https://jalukum.github.io/valley-book/

Not affiliated with or endorsed by ConcernedApe. *Stardew Valley* and all game art are © ConcernedApe.
Game art and data come from the [Stardew Valley Wiki](https://stardewvalleywiki.com/) and the game's own data files;
every sprite is credited in `sprites/derived/SOURCES.json` and `data/sprites.json`, and sources are listed on the app's
About page. Personal, non-commercial fan use only.

## Layout
- `app/`: the Vite + React app (`npm ci && npm run build` → `app/dist`).
- `data/`, `sprites/`, `cache/src/game/`: the data and art the build reads (see `PIPELINE.md` for how they were made).
- `scripts/`: the Python data pipeline.

## Develop
```sh
cd app
npm ci
npm run prepare-data   # writes src/generated and public/sprites
npm test
npm run build
```
Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
