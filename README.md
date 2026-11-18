# AP-Star — "The Factory" (pitch prototype)

Scroll-driven 3D journey: cut → sew → drop room → fitting room → countdown + waitlist.

```bash
npm install
npm run dev          # http://localhost:5173
npm run build
npm run qa:install   # once: Playwright Chromium into node_modules (not global)
npm run qa           # screenshots every section at 5 viewports -> qa/out/
python3 qa/contact.py 6   # optional contact sheets per viewport
```

## URL flags
- `?debug` — fps (and min fps), DPR, draw calls, triangles, section, progress, tier
- `?tier=low|high` — force the device tier
- `?reduced` — force the reduced-motion path (stills + crossfades)
- `?preload` — show the preloader even on a return visit
- `?swap=fade` — force the fitting-room crossfade fallback
- `?qa` — QA mode (no preloader, no smoothing; used by the harness)

## Where things live
- `config/site.json` — every garment, drop detail, copy line, section length (vh), camera keyframe. New drop = new garments + config.
- `src/motion/tokens.ts` — `ap.cut`, `ap.settle`, `ap.stitch`, (`ap.drape` = baked clips only). No bounce/elastic/back.
- `src/motion/scroll.ts` — the single loop: GSAP ticker drives Lenis, ScrollTrigger and the R3F canvas (`frameloop="never"` + `advance`). Smoothed scroll = `scrub: 0.6` on top of Lenis. Section windows are measured from the DOM.
- `src/state/store.ts` — `rt` (mutable per-frame values, never React state) and `useUI` (zustand, low-frequency UI state).
- `src/three/*` — one fixed `<Canvas>`: camera rig (spherical: radius/polar/azimuth/fov), factory (table, pieces, laser, seams), rooms (drop room, fitting room, finale star).
- `src/sections/*` — all text is DOM. Pinned stages are fixed layers; focusing inside one scrolls the tour there.

Placeholders (`[DATE]`, `[PRICE]`, `[GSM]`, `[YEARS]` …) stay visible until the owner supplies real values in config.
