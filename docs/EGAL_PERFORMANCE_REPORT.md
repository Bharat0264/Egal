# Egal performance report — 29 October 2026

## Subsequent realism pass

The current world adds procedural colour, atmosphere, terrain/vegetation, coast/water and roadside life. Every stage was separately measured, then rechecked as a complete production build. See [the realism report](../assets/realism-pass/REPORT.md) for the latest five-checkpoint before/after tables, resource payload, screenshots and test results. The rendering-pass figures below are retained as the earlier visual baseline, not relabelled as current realism figures.


## Current scene performance pass

The new request changes the loading contract: all currently available scenes, fonts and shader/light variants are warmed before START. See [the current measurements and implementation report](../assets/performance-pass/REPORT.md) and its raw JSON for production-preview numbers and remaining limits. The final stable 60 Hz run meets the median FPS targets. Physical-device performance is **not certified**: the host refresh cadence varied during earlier runs, and CPU-throttled mobile samples retain main-thread stalls. Earlier Lighthouse and 60 Hz frame results below are historical and must not be presented as this pass's results.


## Latest visual follow-up

The subsequent terrain/Blender follow-up retains the opening's lazy boundary. Optimized car size is now **344,332 bytes** (previously 336,028), adding an exportable 512 px tire normal map while keeping 59,102 triangles. The final deferred World chunk is about **92.6 KB raw / 29.5 KB gzip**, roughly 2.5 KB raw above the hardening-only version. No initial model download was introduced. Original hardening payload tables below are retained as a baseline, not mislabeled as these new asset sizes.

A fresh production mobile Lighthouse audit in `assets/refinement-checks/lighthouse-home.report.*` scores **98 performance, 100 accessibility, 100 best practices and 100 SEO**, with FCP 1.7 s, LCP 2.1 s and TBT 0 ms. It uses the same local compressed server and simulated mobile settings described below. Simple view's most recent audit remains the earlier 95/100/100/100 run; its implementation was not changed in this follow-up.

The terrain/tire runtime recheck uses the same Iris Xe adapter, development server, 1440×844 DPR 1 desktop and 390×844 device-DPR-2 / CPU-4× phone emulation. `assets/refinement-checks/runtime-before.json` preserves the hardening-only sample; `runtime-after.json` records the core terrain/tire changes before the final small spur grading/camera recovery correction. The final correction has targeted geometry/camera/browser verification, not a new claimed frame benchmark.

| Scene | Desktop median / p95 ms | Draws | Phone median / p95 ms | Draws |
| --- | ---: | ---: | ---: | ---: |
| Hero | 16.7 / 16.8 | 104 | 16.7 / 116.7 | 57 |
| Fleet | 16.7 / 17.0 | 106 | 33.2 / 85.1 | 106 |
| Services | 16.7 / 16.8 | 145 | 33.3 / 116.5 | 100 |
| Booking | 16.7 / 16.8 | 151 | 33.4 / 66.6 | 105 |
| Contact 0.95 | 16.7 / 16.8 | 184 | 33.4 / 200.0 | 128 |
| Contact 1.0 | 16.7 / 16.8 | 184 | 33.3 / 83.2 | 128 |

Desktop remains about 60 FPS settled; phone medians are mostly about 30 FPS, with worse tail spikes than the earlier sample. Do not claim this art refinement improved every runtime metric. Compilation and first-visit work still need physical-device profiling. Adaptive DPR reached 1 in the slow run. GPU resource counts were unchanged across the tested forward/reverse cycles: desktop 218 geometries / 42 textures and phone 219 / 43. These bounded samples check resource counts, not total browser heap or a guaranteed field frame rate.

## Hardening baseline retained below

## Current production build

Byte counts are decimal, not MiB. Exact files and raw Lighthouse metrics are in `assets/hardening-checks/bundle-sizes.json`.

| Payload | Decoded bytes | Gzip/encoded bytes |
| --- | ---: | ---: |
| Opening resources plus prerendered HTML | 417,770 | 176,160 |
| Resources observed after START plus HTML, before later sign-font loading | 2,122,075 | 908,642 |
| All generated JS chunks, including deferred chunks | 1,667,697 | 489,339 |
| Initial entry JS | 79,363 | 24,765 |
| React vendor JS | 219,331 | 67,691 |
| Tiny chunk runtime | 726 | 429 |
| Deferred world JS | 90,144 | 28,277 |
| Deferred Three JS | 763,799 | 195,314 |
| Deferred WebGL/drei JS | 444,768 | 145,808 |
| Deferred GSAP JS | 69,566 | 27,055 |
| CSS | 34,084 | 8,517 |
| Main / Simple HTML | 13,106 / 12,282 | — |
| Responsive logo derivative | 69,610 | 69,610 |
| Hero optimized GLB | 336,028 | 336,028 |

The later shared sign font adds 757,076 bytes when needed; even counting that fully uncompressed, the observed journey is about 2.88 MB, below 8 MB. No fleet variant file exists, so additional variant transfer is currently zero; a genuine total fleet-model budget is **pending supplied files**, not a fabricated zero-size fleet. The original 1,387,976-byte car and 1,764,923-byte PNG are retained but not downloaded by the normal opening.

The earlier cinematic capture recorded **3,780,302 resource bytes before START** (`assets/cinematic-checks/production.json`). Current initial resources excluding HTML are **404,664 bytes**, about 89% less. These are observed resource sizes, not a matched network-speed/phone-hardware experiment. The gain comes from actual lazy chunk boundaries, no initial GLB, no initial GSAP, and using a smaller derivative of the same logo.

## Lighthouse mobile

Production `dist` served on a local compressed HTTP test server. Lighthouse 12.8.2, headless Chrome 156 on Windows; default simulated mobile slow 4G (150 ms RTT, 1638.4 Kbps throughput) and 4× CPU slowdown. Each route was run independently, without simultaneous WebGL browser profiling. This is a lab run, not field data or a deployed CDN measurement. Scores varied during iterative work (opening 98–99, Simple 85–95); the table is the latest completed run, not an average.

| Route | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 99 | 100 | 100 | 100 | 1.54 s | 1.99 s | 0 ms | 0 |
| `/simple` | 95 | 100 | 100 | 100 | 1.73 s | 2.33 s | 166 ms | 0 |

Reports: `assets/hardening-checks/lighthouse-home.report.html` and `lighthouse-simple.report.html`, with corresponding JSON. FCP is the useful paint proxy here; Lighthouse does not measure when the entire 3D world has compiled. START and the real booking/Simple links are interactive before model completion, tested with a deliberately pending GLB. The opening score must not be represented as a score for continuous 3D rendering.

An intermediate audit exposed unnecessary AudioContext creation when Howler was muted without any tracks. Guarding empty audio operations reduced measured opening main-thread blocking (an intermediate 1,540 ms TBT to 0–50 ms on later runs). That observation motivated an actual zero-AudioContext regression test; timing improvement alone is not proof of identical browser scheduling.

## Runtime policy and measured limits

The high DPR cap is 1.75, balanced/mobile cap 1.35, and low-hardware tier 1. A sustained decline under approximately 45 FPS after the initial compilation grace period selects the low tier, disables animated sea detail and halves eligible repeated props. It stays low to avoid oscillating resources. There is no postprocessing pipeline. Four-core / 4 GB device signals were emulated and the live renderer reported DPR 1. Hidden and offscreen conditions were explicitly triggered; the Fiber loop stopped and resumed with preserved clock time.

Older matched frame/draw-call improvements remain in `assets/performance/REPORT.md` (Intel Iris Xe / ANGLE D3D11, development server, desktop and CPU-throttled phone emulation). They demonstrate prior batching and pass reduction, not new Step 8 frame-rate gains. The approved source remains 59,102 triangles; batching retains geometry and uses 20 hero rigid draws. No claim of stable 60 FPS on physical phones is made.

### Current live runtime sample

`scripts/profile-hardening.mjs` was run against the development server on the actual Intel Iris Xe / ANGLE D3D11 adapter, 16 logical cores / 16 GB browser-reported memory. Desktop viewport 1440×844 / DPR 1 / CPU 1×; phone viewport 390×844 / device DPR 2 / CPU 4× with adaptive renderer DPR. Each scene settled for 3.5 seconds, followed by 49 measured rAF intervals. These short settled samples omit some first-visit stalls and are not an INP measurement or a matched before/after experiment.

| Scene | Desktop median / p95 ms | Desktop draws | Phone median / p95 ms | Phone draws |
| --- | ---: | ---: | ---: | ---: |
| Hero / 0 | 16.7 / 16.8 | 108 | 16.7 / 33.3 | 58 |
| Fleet / 0.28 | 16.7 / 16.8 | 108 | 16.7 / 83.4 | 107 |
| Services / 0.50 | 16.7 / 16.8 | 149 | 33.4 / 50.1 | 101 |
| Booking / 0.70 | 16.7 / 16.8 | 155 | 33.4 / 50.0 | 106 |
| Contact / 0.95 | 16.7 / 16.8 | 188 | 50.0 / 66.7 | 130 |
| Contact / 1.0 | 16.7 / 16.8 | 188 | 33.4 / 50.1 | 130 |

Desktop settled at roughly 60 FPS. Throttled phone emulation ranged from roughly 20–60 FPS with an 83.4 ms fleet p95 spike; it is **not** consistently 60 FPS. During this real slow run PerformanceMonitor changed the tier from balanced (DPR 1.35) to performance (~1.01), demonstrating the actual decline path rather than only a device-capability fixture. The small remaining difference from exactly 1 is the gradual DPR update tolerance.

Forward and reverse journeys retained equal GPU resource counts: desktop 220 geometries / 39 textures before and after; phone 219 / 38. This checks counts over the tested cycles, not all browser heap retention. Fleet selection, colour buttons, keyboard rotation, service disclosure dismissal, Book Now and return-to-start passed with no console warnings/errors. Raw results: `assets/hardening-checks/runtime.json`.

Remaining costs: after START the browser must parse deferred rendering chunks, decode the model, allocate procedural textures and compile shaders. First-time lit scene/sign preparation can still spike; this work is deferred, not eliminated. Simple view still includes React hydration and shared form/route code; Lighthouse reports some unused JS and an oversized compact-logo opportunity. The procedural world is deliberately stylised and desktop GPU emulation is not a substitute for actual mobile GPUs. Revalidate network, response compression, headers and delivery on the deployed domain.
