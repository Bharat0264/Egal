# Egal realism pass — 29 October 2026

All six stages were built and measured separately before proceeding. The final run meets the requested **median** 55 FPS desktop / 30 FPS mobile-tier thresholds at all five checkpoints, while staying below 150 draws / 400,000 triangles. The approved hero GLB, route, landmarks, UI and scene interactions are unchanged. No dependencies or external assets were added.

## Method

Production preview on port 4173; Intel Iris Xe / Edge ANGLE, 16 logical cores, 16 GB RAM. Desktop viewport 1440×844 with device DPR 1.5. Phone viewport 390×844 with device DPR 2 and **4× CPU slowdown on the laptop GPU**. These are phone-emulation results, not a physical phone certification. The existing DPR controller starts at 1.25 and adapts between 1 and 1.75.

Before/final runs settle for 3.5 seconds at each position and sample 100 RAF observations while maintaining input activity. Timings count actual main-renderer submissions. Intermediate stage checks use 1.8-second settles and 40 observations. Raw JSON includes renderer DPR, frame p95, long tasks, GPU resource counts and errors; these short samples are not minimum instantaneous-FPS guarantees. Final screenshots hide only the diagnostic panel.

## FPS before → after

| Scroll | Desktop before | Desktop after | Mobile tier before | Mobile tier after |
| --- | ---: | ---: | ---: | ---: |
| 0.00 | 59.9 | 59.9 | 59.5 | 59.5 |
| 0.25 | 59.9 | 59.9 | 52.1 | 44.6 |
| 0.50 | 59.9 | 59.9 | 59.2 | 44.2 |
| 0.75 | 59.9 | 59.9 | 52.1 | 38.5 |
| 1.00 | 57.8 | 59.9 | 48.5 | 34.4 |

## Check after every item

Ranges are the lowest/highest checkpoint medians for each staged production build.

| Stage | Desktop FPS | Mobile-tier FPS | Peak draws | Peak triangles |
| --- | ---: | ---: | ---: | ---: |
| [01-colour](01-colour.json) | 59.5–60.2 | 43.3–59.5 | 128 | 374,712 |
| [02-sky](02-sky.json) | 59.9–60.2 | 42.4–59.9 | 129 | 374,172 |
| [03-terrain](03-terrain.json) | 59.9–60.2 | 33.1–58.1 | 127 | 374,228 |
| [04-vegetation](04-vegetation.json) | 59.9–60.2 | 43.1–59.9 | 130 | 370,375 |
| [05-water-rocks](05-water-rocks.json) | 59.9–60.2 | 30–58.8 | 130 | 359,373 |
| [06-road-life](06-road-life.json) | 59.9–60.6 | 30.6–59.5 | 139 | 360,317 |

All staged medians remained above the thresholds. Budget-conscious simplifications were included from the outset: one normal-map fetch on mobile instead of two, an 8×12 mobile sea grid / 40×60 desktop grid instead of the former desktop 80×100 grid, half-density mobile foliage, two traffic cars instead of four, and eight town buildings instead of sixteen. The vegetation/sea changes reduce geometry enough to accommodate the additional props.

## What changed

1. **Colour, lighting and fog:** exponential-squared fog at density 0.0038–0.0043, peach/blue-gold/purple scroll tint, foreground clearance and height weighting in shared built-in fog chunks. Sea and city custom shaders use matching exponential haze. Stronger turquoise/sunrise colours, lower ambient fill, balanced 0.82–0.93 exposure, larger soft solar halo, radial ray sprite and subtle CSS colour gradient. There is no full-screen GPU grading pass.
2. **Sky and depth:** directional sun-scatter gradient shader, 18 billboard cloud quads across three slowly drifting height layers, existing animated gulls, and three smooth-shaded mountain strips at separate depths. The far hills retain tinted fog rather than a hard horizon.
3. **Terrain:** one continuous 42,688-triangle land heightfield with ridge variation and the existing graded scene reserves. Four procedural grass/dry-grass/dirt/sand atlas quadrants blend by slope, height and coast position. Vertex colours carry simple curvature/slope ambient shading and wet-sand darkening. Wet sand also has lower roughness. Shared fine normal detail supplies close-up grain. Atlas orientation and explicit texture gradients prevent the streaking/mip artefact found during QA.
4. **Vegetation:** seven/nine/eleven-frond palm crowns, per-instance colour and scale, smooth bushes, roadside blade clumps and small flowers. Cheap shader wind uses stable uniforms, not React updates. Full palm meshes switch to instanced cutout billboard impostors beyond 60 m; tiny grass/flowers cull beyond 60/45 m. Palm placement preserves the existing headline clearance. The existing instance compaction now preserves instance colours too.
5. **Coast and water:** welded smooth rock normals, low-amplitude deterministic displacement, moss vertex tint and procedural stone grain with spherical UVs. Desktop rocks use 180 faces, mobile 80. Water uses two opposing scrolling normal textures on desktop, Fresnel, warm sun glint and a baked shoreline-distance field for turquoise-to-deep-blue colour. An animated narrow foam ribbon follows the shore. No planar reflections or transmission.
6. **Road and life:** procedural fine cracks, tyre streaks, worn paint and subdued roughness variation; instanced reflector posts, generic kilometre stones, timber utility poles/insulators, one merged set of sagging wire segments, cheap vertex-coloured oncoming traffic, a small distant town with dusk windows, and coherent shader bobbing for boat hulls/sails/masts. Utility spans stay out of scene reserves and toll-gate clearance. Screenshot review reduced overly repeated shiny patches and moved utility lines off the hero headline.

## Final budgets and validation

- Peak final submission: **139 draw calls / 360,497 triangles**.
- Observed resource traffic, including diagnostics and the full warmed journey: **2,152,100 decoded bytes / 929,949 transferred bytes**, below 8 MB. Procedural canvases are generated in the browser, not downloaded. They still consume GPU memory; their maximum measured dimension is 1024px.
- Renderer geometry count after two complete return journeys: 118 → 118; textures: 40 → 40. Shared shader/texture caches remain intentionally resident.
- Actual compileShader calls after START: **0**. Every intermediate/final benchmark also recorded zero new programs on scene entry.
- npm run build succeeds for client, SSR and prerender, without warnings. Production browser warning/error arrays are empty. npm run dev remains available.
- [Browser verification](verification.json): fog type/density, terrain weights, map-size limit, distinct normal maps, three palm variants/impostors, moving traffic, no shadow maps, loader warmup, scene mounts, budgets, fleet arrows/colours/drag, booking validation/mock success, service cards, disposal cycles and hidden/idle pacing. No real booking or email was sent.
- Car normalisation/batching regression passes; the hero remains the original 59,102 triangles / 344,332-byte optimized model.

## Remaining limits

The result is stylised real-time scenery, not a photographic reconstruction. Traffic and town buildings are intentionally simple. Full palm impostors have a small LOD silhouette change; tiny flowers/grass disappear in the distance. The low tier uses one scrolling water normal and fewer instances. The phone emulation retains main-thread spikes during scene transitions; median FPS targets do not mean all frames are hitch-free. Physical mid-range phone/GPU testing is still required. Raw p95/long-task data are retained in [before.json](before.json) and [after.json](after.json).

## Acceptance screenshots

| Scroll | 1440px | 390px |
| --- | --- | --- |
| 0.00 | [Desktop](after-1440-0.png) | [Phone](after-390-0.png) |
| 0.25 | [Desktop](after-1440-0.25.png) | [Phone](after-390-0.25.png) |
| 0.50 | [Desktop](after-1440-0.5.png) | [Phone](after-390-0.5.png) |
| 0.75 | [Desktop](after-1440-0.75.png) | [Phone](after-390-0.75.png) |
| 1.00 | [Desktop](after-1440-1.png) | [Phone](after-390-1.png) |

## Reproduce

Run npm run build and npm run preview -- --port 4173. Set EGAL_BROWSER_MODULES to the node_modules directory containing Playwright. Run node scripts/measure-realism.mjs after (or add --quick for a staged check), node scripts/verify-realism.mjs, then node scripts/report-realism.mjs. Diagnostics are available only at /?debug=perf; normal URLs do not download the debug chunk.
