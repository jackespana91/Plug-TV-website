# Plug TV Website

Official Plug TV website — **Where the Next Wave Breaks**.

Streams, culture and original arcade games, including **Budheads**: catch the
falling harvest, stack combo multipliers, grab power-ups (magnet, slow-mo,
golden-bud frenzy) and dodge the rot. High scores are saved locally, and it
plays great with mouse, keyboard or touch.

## Stack

- [Vite](https://vitejs.dev) + React 18 + TypeScript
- Tailwind CSS
- React Router
- The Budheads game engine is hand-rolled canvas 2D with synthesized WebAudio
  sound — no image or audio assets, everything is drawn and generated in code
  (`src/game/budheads/`).

## Develop

```bash
npm install
npm run dev       # local dev server
npm run build     # production build to dist/
npm run preview   # serve the production build
```

## Games

| Game | Route | Status |
| --- | --- | --- |
| Budheads | `/games/budheads` | ✅ Live |
| Wave Runner | — | 🔜 Coming soon |
| Plug Stacker | — | 🔜 Coming soon |
