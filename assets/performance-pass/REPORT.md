# Scene performance pass — 29 October 2026

The car asset, geometry, route, scene compositions and editable business data are preserved. This pass changes rendering, loading, culling and the explicitly requested UI details.

## Measurement method and limits

Production preview builds, Edge/ANGLE on Intel Iris Xe, 16 logical cores and 16 GB RAM. Desktop: 1440×844, device DPR 1.5. Phone **emulation**: 390×844, device DPR 2 and 4× CPU slowdown, using the laptop GPU. This is not a physical phone benchmark. Adaptive renderer DPR is recorded per sample in the JSON.

The before fixture is commit 9038060 plus the same query-only headless debug observer; no application optimisations were copied into it. Each position settles for 4.5 seconds, followed by 100 RAF observations with input activity maintained. FPS/frame time come from actual main-renderer submissions, not a counter that mistakes an idle RAF for a rendered frame. Draw/triangle counts come after rendering. Screenshots include the diagnostic panel, which is absent on normal URLs.

**Refresh cadence varied during the session**, including approximately 30 FPS on a blank page and a later return to 60 FPS. Blank-page controls before each device run: before 1440px 30.0, 390px 59.9 FPS; after 1440px 59.9, 390px 59.9 FPS. The tables are observations, not a controlled claim of an FPS speedup. Earlier capped and intermediate samples remain alongside the final results. Physical-device validation and a stable display cadence are still required to certify the laptop/phone goals.

## Before → after

Each texture/geometry value is the renderer's resident resource count, including shared caches; it is not a visible-object count. Warmup intentionally increases initial texture residency.

### 1440px / CPU 1×

| Scroll | FPS | Median ms | Draws | Triangles | Textures | Geometries |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 0.00 | 30.0 → 59.9 | 33.3 → 16.7 | 59 → 54 | 157744 → 137122 | 18 → 31 | 69 → 102 |
| 0.25 | 30.0 → 59.9 | 33.3 → 16.7 | 104 → 102 | 381172 → 374712 | 18 → 31 | 95 → 102 |
| 0.50 | 30.0 → 59.9 | 33.3 → 16.7 | 98 → 87 | 165306 → 142818 | 23 → 31 | 136 → 140 |
| 0.70 | 29.9 → 59.9 | 33.4 → 16.7 | 104 → 100 | 162780 → 151330 | 34 → 31 | 179 → 169 |
| 0.95 | 30.0 → 59.9 | 33.3 → 16.7 | 127 → 125 | 283902 → 266546 | 38 → 31 | 214 → 159 |
| 1.00 | 59.9 → 59.9 | 16.7 → 16.7 | 127 → 125 | 283902 → 266546 | 38 → 31 | 214 → 159 |

### 390px / CPU 4×

| Scroll | FPS | Median ms | Draws | Triangles | Textures | Geometries |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 0.00 | 33.1 → 59.9 | 30.2 → 16.7 | 57 → 52 | 157740 → 113582 | 16 → 31 | 68 → 102 |
| 0.25 | 41.5 → 41.8 | 24.1 → 23.9 | 140 → 102 | 464138 → 351570 | 17 → 31 | 94 → 102 |
| 0.50 | 46.5 → 46.9 | 21.5 → 21.3 | 97 → 83 | 163826 → 120586 | 22 → 31 | 135 → 140 |
| 0.70 | 45.5 → 41.0 | 22.0 → 24.4 | 103 → 93 | 162778 → 118518 | 33 → 31 | 178 → 169 |
| 0.95 | 30.6 → 33.3 | 32.7 → 30.0 | 126 → 117 | 282798 → 237276 | 37 → 31 | 214 → 159 |
| 1.00 | 28.5 → 37.7 | 35.1 → 26.5 | 126 → 117 | 282798 → 237276 | 37 → 31 | 214 → 159 |

P95 frame times, individual long tasks, DPR, programs and largest geometry submissions: [before JSON](before-matched.json), [after JSON](final.json). Peak final budget: **125 draws / 374712 triangles**, below 150 / 400,000.

## Top five observed costs and changes

These are ranked engineering findings from shader counts, submissions and browser long-task observations, not exclusive GPU-time measurements.

1. **Late shader variants.** The before run added as many as 46 programs on contact entry. All scene/light configurations, glyphs and textures now warm behind the loader. A bounded shared material catalogue retains their programs across scene unmounts. Low/high tiers keep the same light-count shader signature. 208 shader-compilation calls had completed by START; the full forward/reverse/interaction test recorded **0 additional compileShader calls** afterwards.
2. **Transmission and shadow passes.** Thin glass/lenses used transmission and contact shadows needed extra offscreen work. Glass now uses ordinary alpha materials; a shared radial blob supplies the contact shadow. No shadow-map pass, reflection pass, transmission or postprocessing pipeline remains. CSS supplies the vignette; card backdrop blur is removed.
3. **Full-route world submissions.** Palms, rocks, rails, lamps and skyline instances previously submitted broad route-wide batches. GPU instance buffers now contain only the curve window (±180 m) intersecting the camera frustum. Cached bounds and tolerant camera comparisons avoid repeatedly filtering an unchanged view. Permanent terrain remains 42,688 triangles; it was not remodelled.
4. **Scene mesh count and lifecycle work.** Compatible static meshes merge per scene. Only the active scene and neighbours mount after warmup. Exclusive geometries/materials are disposed on departure; shared maps, parked-car buffers, glyphs and warmed programs have explicit cache ownership. Spur CPU geometry is cached; its GPU buffers are disposed when the scene leaves. Five fallback fleet cars still total about 295k triangles and remain the largest visible geometry cost; changing their design was outside this pass.
5. **DOM and scroll work.** Five moving drei Html price labels are replaced by sprites sharing one canvas atlas. Fleet scroll selection is held in refs, with direct card text updates only at category changes. Overlay CSS variables change only when their quantised value changes. The camera caches scroll dimensions with ResizeObserver. React work occurs for input, loading and discrete scene mount/unmount boundaries, rather than continuous progress updates.

## Frame pacing and small fixes

- Start DPR 1.25 on every device. Three sustained seconds above 58 FPS can raise the target to 1.75; below 45 FPS lowers it. An additional 55 FPS safety window reduces resolution gradually, with a 10-second recovery cooldown, so a scene running at 50 FPS does not remain at an overambitious DPR.
- After two seconds without input, actual scene drawing is capped at 30 FPS. Update hooks still follow the existing R3F clock; hidden/offscreen canvases stop completely. Idle observed 28.6 FPS in the verification run. There is one R3F RAF/render loop, not competing demand and animation loops.
- Landmark markers require bare ?debug; performance diagnostics require ?debug=perf and do not load on normal URLs. r3f-perf is a devDependency; its compatible drei override avoids installing an obsolete second drei version.
- Footer links are in the native More menu, visible only on hero/contact. Title handoffs are exclusive and snap negligible damping residuals at boundaries. Open service cards close on departure. Chase distance/height/FOV remain 7.5 / 1.9 / 45 outside showcase compositions. Pricing-board rows share font size and weight.

## Payload and verification

Full observed resource payload after warmup/journey: 2,134,163 decoded bytes / 924,149 transferred bytes, including debug instrumentation, below 8 MB. The runtime Meshopt/WebP car remains **344,332 bytes**, 59,102 triangles. The untouched raw authoring GLB is retained. No other fleet GLBs exist; category-scaled hero fallbacks remain and no models were downloaded or generated. Embedded tire normal: 512 px; procedural maps and glyph atlas are at most 1024 px.

- npm run build: client/SSR/prerender succeed without warnings. npm run dev responds HTTP 200.
- [Browser verification](verification.json): START disabled until warmup, initial DPR 1.25, scene-neighbour mounts, render budgets, no transmission, atlas labels, arrows/colours/keyboard rotation, selected-car booking, inline errors, mocked success, service cards, no resource growth over repeated journeys, hidden pause, query-only debug and zero late shaders. No real booking/email was sent.
- Repeated full journeys: [{"geometries":102,"textures":31,"programs":100},{"geometries":102,"textures":31,"programs":100}]. Normal URLs do not fetch the PerfDebug chunk. Browser console warning/error arrays are empty in both final device runs.
- Car geometry/batching and shared booking-server regression scripts pass; production dependency audit reports zero vulnerabilities.

## Remaining weaknesses

Shader-compilation hitches are eliminated in the tested assets, but **all hitches are not eliminated**. Desktop and especially 4×-CPU phone emulation still show long tasks during scene mounting and other main-thread work. The raw JSON preserves their durations. Display cadence and adaptive detail differed between runs, so do not treat their FPS deltas as a guaranteed speedup or certify a real mid-range phone from this emulation. Scene-owned object construction/commit work and full-resolution fallback display cars remain candidates for a further CPU profile. The longer prewarmed loader is intentional (about 11.5 seconds in this diagnostic run). Adding future fleet variants requires rechecking their shader warmup, payload and budgets.

## Screenshots

Desktop and phone: [1440px / 0](final-1440-0.png) · [390px / 0](final-390-0.png); [1440px / 0.25](final-1440-0.25.png) · [390px / 0.25](final-390-0.25.png); [1440px / 0.5](final-1440-0.5.png) · [390px / 0.5](final-390-0.5.png); [1440px / 0.7](final-1440-0.7.png) · [390px / 0.7](final-390-0.7.png); [1440px / 0.95](final-1440-0.95.png) · [390px / 0.95](final-390-0.95.png); [1440px / 1](final-1440-1.png) · [390px / 1](final-390-1.png).

## Reproduce

Build and run preview on port 4173. Set EGAL_BROWSER_MODULES to a node_modules directory containing Playwright, then run node scripts/measure-performance-pass.mjs final and node scripts/verify-performance-pass.mjs. EGAL_PERF_URL can point the measurement script at an archived baseline preview. Run node scripts/report-performance-pass.mjs to refresh these tables after collecting both JSON files.
