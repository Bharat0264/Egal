# Egal performance audit — 2026-10-29

The existing experience was optimized in place. Road, landmarks, camera framing, sections, car design, prices, booking logic and interactions remain. No dependencies or downloaded assets were added. Both source GLBs retain their original SHA-256 hashes.

## Audit and measured causes

- Architecture: Vite 8, React 19, React Three Fiber 9, drei 10, GSAP, Howler and Tailwind 4. One WebGL canvas, native drei ScrollControls, R3F animation callbacks, and a separate GSAP overlay ticker. No competing smooth-scroll system or postprocessing pipeline was found.
- Hero: 79 meshes / 84 primitives, 59,102 triangles, 12 materials; source 1,387,976 bytes and existing Meshopt version 336,028 bytes. No embedded images. Models were already small enough that further destructive simplification was unjustified.
- Draw submission: individual car parts and the transmission pass rendered the world repeatedly. A CPU profile found Three's getParameters/getProgram, uniform setup and draw submission among the dominant sampled functions. See `cpu.json`.
- Fleet/scene fades: marking double-sided opaque materials transparent caused separate back/front draws, even at full scene opacity. This was avoidable rendering, not additional model detail.
- Mobile: reduced prop counts already existed, but rendering still started at DPR 1.75. Thin glass/lamp transmission also imposed a second world render on the phone profile.
- CPU/DOM: repeated scene material traversal, repeated per-instance eight-corner projections, path-sampling allocation, per-frame colour allocation, and unchanged overlay style/ARIA writes.
- Loading: invisible roadside signs mounted Troika Text immediately, pulling a 757,076-byte font into startup. Fleet models were already deferred and remain so.
- Lighting: the first visit to contact changes the lighting/shader combination. Cold shader compilation remains a source of long tasks; settled frame rates alone do not capture it.

## Implementation and files

| Files | Change |
| --- | --- |
| `src/scene/batchCar.js`, `carModel.js`, `Car.jsx` | Batch rigid parts by material within the body/wheel pivots; retain named transform groups and wheel animation. Decode quantized attributes before baking transforms. Preserve all triangles and clone materials. Mobile uses reflected/tinted alpha covers instead of transmission; desktop retains transmission. Skip unchanged hero fade traversal. |
| `src/scene/showcase/useSceneVisibility.js`, `warmScene.js` | Discover late materials at intervals, update cached fade uniforms, use single-pass scene fades, and prepare approaching lighting/material combinations in idle time with parallel shader compilation when supported. Hidden scene groups remain invisible. |
| `src/scene/showcase/DeferredText.jsx`, `ServicesScene.jsx`, `BookingScene.jsx`, `ContactScene.jsx` | Mount sign text 0.15 scroll before its scene. Keep the shared font/glyph cache on return. No initial sign-font request. |
| `src/scene/world/Instances.jsx` | Cache bounds corners; combine projection matrices; sample clearance at up to 30 Hz while the camera moves; continue smooth visibility easing after sampling stops. |
| `src/scene/world/CoastalProps.jsx`, `Atmosphere.jsx` | Reuse path samples and recurring colour/position scratch data. |
| `src/scene/world/renderQuality.js`, `RenderBudget.jsx`, `World.jsx` | Capability-based DPR caps: high 1.75, balanced 1.35, performance 1.1. Sustained slow windows lower DPR gradually; recovery requires longer fast windows. Desktop floor 1, mobile floor 0.85. Prop counts never change during adaptation. Pause hidden/offscreen rendering and preserve animation time on resume. |
| `src/scene/WorldFallback.jsx`, `App`'s existing overlay, `index.css` | Catch failed renderer creation and retain a scrollable HTML journey with booking/contact. |
| `src/scene/world/useReducedMotion.js`, `Sea.jsx`, `CoastalProps.jsx`, `FleetScene.jsx`, `SelectionContext.jsx`, `Overlay.jsx` | Respect reduced motion for ambient sea/birds, idle turntable rotation, overlay entrance and programmatic scrolling. Keep user-driven car motion. Avoid unchanged overlay DOM writes. |
| `src/scene/showcase/SceneCoordinator.jsx` | Reuse the prior-scroll record instead of allocating one each frame. |

Continuous visible rendering is intentional: sea, birds, turntable and eased camera motion require frames. It is paused when hidden rather than replaced with a demand loop that would freeze these features. Existing contact-shadow budgets, environment resolution, instancing, texture sharing, fleet fallback and compatibility fixes remain.

## Matched before/after measurements

Fresh headless Edge instances on **Intel Iris Xe / ANGLE D3D11**, local Vite development server, 800px viewport height. Desktop: 1440px, DPR 1, CPU 1x. Phone emulation: 390px, device DPR 2, CPU throttled 4x; original renderer DPR 1.75, optimized balanced cap 1.35. This is desktop GPU emulation, not a physical Android/iPhone test. Network was localhost without throttling. GPU/driver caches were not reset between runs.

Each scene settles for 3.5 seconds, then samples 44 rAF intervals. Values are rounded; short samples describe settled pacing, not guaranteed frame rates throughout first-time transitions. Full-journey long-task observation includes compilation stalls.

| Scene / scroll | Desktop median ms before → after | Desktop draw calls before → after | Phone median ms before → after | Phone p95 ms before → after |
| --- | --- | --- | --- | --- |
| Hero / 0 | 16.7 → 16.6 | 232 → 104 | 50.0 → 16.7 | 83.2 → 33.4 |
| Fleet / 0.28 | 16.7 → 16.7 | 166 → 105 | 50.1 → 16.8 | 83.3 → 50.0 |
| Services / 0.50 | 16.7 → 16.7 | 275 → 143 | 50.0 → 16.8 | 66.7 → 33.4 |
| Booking / 0.70 | 16.6 → 16.7 | 277 → 149 | 50.0 → 33.3 | 66.7 → 33.4 |
| Contact / 0.95 | 16.7 → 16.7 | 335 → 182 | 83.4 → 33.3 | 183.2 → 50.1 |

Desktop p95 settled frame times became approximately 16.8–16.9ms across these samples. Hero and contact draw calls fell by approximately 55% and 46%. Fleet rendered triangles fell from 703,150 to 407,280 through pass reduction; no source triangles were removed.

| Whole development run | Desktop before → after | Phone before → after |
| --- | --- | --- |
| START button readiness | 7.66s → 1.01s | 10.72s → 7.42s |
| Observed DOM LCP | 1.23s → 1.01s | 2.55s → 2.10s |
| CLS | 0.0030 → 0.0022 | 0.0078 → 0.0078 |
| Tasks over 50ms | 12 → 15 | 324 → 25 |
| Longest task | 14.39s → 5.52s | 11.46s → 7.17s |

Readiness is the existing model/download-based START signal, not completion of every GPU compilation. Browser LCP measures DOM content and does not measure WebGL scene completeness. Some work shifts into deferred preparation, so desktop long-task count did not fall, although its largest task became shorter. Timing varies with caches and driver compilation. No field INP claim is made: synthetic clicks/keyboard controls were verified, but representative real-user INP data is unavailable.

Raw evidence: `baseline.json`, `after.json`, `cpu.json`. Intermediate measurements are retained separately and are not the final results above.

## Production verification

`production.json` records a fresh built-preview run at the same desktop/phone sizes and CPU throttling. Initial decoded resource bodies total **2,005,584 bytes**, plus the small HTML document: approximately **2.01 MB**, below 8 MB. This is decoded size, not compressed internet transfer. The only initial model request is `car.opt.glb`, once. No initial fleet-model or 3D-font requests occur. The sign font loads later and is shared.

Production settled median frame times:

| Scroll | Desktop ms | Phone / CPU4x ms |
| --- | --- | --- |
| 0 | 16.7 | 16.7 |
| 0.28 | 16.7 | 33.3 |
| 0.50 | 16.7 | 16.8 |
| 0.70 | 16.7 | 16.8 |
| 0.95 | 16.7 | 33.4 |
| 1 | 16.7 | 33.3 |

Local production START readiness was 0.28s desktop / 3.40s phone; observed DOM LCP 0.22s / 0.80s. These optimistic localhost results are **not** a before/after network benchmark or a prediction for cold devices. No old production trace was recorded.

Screenshots: `production-1440-{0,0.28,0.5,0.7,0.95,1}.png` and equivalent `production-390-*.png`. Reviewed hero, fleet, booking and contact captures. Checks passed for exclusive overlays, no document-width overflow, next-car selection, colour controls, keyboard rotation, service-card opening/dismissal, and exactly one hero download. Booking's desktop/phone validation, estimate, WhatsApp fallback, selected colour, success, reset and contact checks also passed. No unexpected console warnings/errors occurred.

`runtime-checks.json` verifies stable geometry/texture counts across two complete journeys, zero idle overlay attribute mutations, hidden-tab pause/resume with animation time preserved, and usable booking with WebGL deliberately disabled. Shader cache entries can increase during first-use warmup; this short test does not prove the absence of every possible long-session leak. Sampled JS heaps remain GC-dependent, so no unsupported memory-reduction percentage is claimed.

Passed commands:

```text
npm run build
node scripts/verify-car.mjs
node scripts/verify-render-optimizations.mjs
node scripts/verify-parked-assets.mjs
node scripts/verify-fleet-fallbacks.mjs
node scripts/verify-performance-runtime.mjs
node scripts/verify-performance-production.mjs
node scripts/verify-step6.mjs
```

Browser scripts use the existing Playwright runtime via `EGAL_BROWSER_MODULES`; no package was installed. Dev server remains at http://localhost:5173/ and production preview at http://localhost:4173/.

## Remaining limits and deployment work

- Cold shader/driver compilation still causes multi-second tasks. Parallel idle preparation helps upcoming scenes where supported but cannot guarantee a stall-free first visit or instant jumps across the entire journey.
- The phone stress profile still reaches roughly 30 FPS in fleet/contact and has occasional slower frames. No physical iPhone/Android, battery, thermal-throttling, slow-network or field INP results are available.
- Fleet has five detailed copies of the hero, pending the user's variant files. They remain hero fallbacks; no variant was searched for, generated or downloaded. Further reductions should come from appropriately sized future variants, not silently degrading the approved silhouette.
- Keep deployment Brotli/gzip enabled for JS/CSS, cache hashed build assets immutably, and revalidate fixed-name GLBs/fonts unless filenames are versioned. Hosting configuration was not changed.
- Business contact/social/WhatsApp placeholders and the optional booking endpoint remain as previously configured. No secrets or external submissions were added.
