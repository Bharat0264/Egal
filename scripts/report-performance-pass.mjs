import fs from 'node:fs/promises'

const folder='assets/performance-pass'
const read=async name=>JSON.parse(await fs.readFile(`${folder}/${name}.json`,'utf8'))
const before=await read('before-matched'),after=await read('final'),verification=await read('verification')
const pair=(a,b,digits=0)=>`${a.toFixed(digits)} → ${b.toFixed(digits)}`
let report=`# Scene performance pass — 29 October 2026

The car asset, geometry, route, scene compositions and editable business data are preserved. This pass changes rendering, loading, culling and the explicitly requested UI details.

## Measurement method and limits

Production preview builds, Edge/ANGLE on Intel Iris Xe, 16 logical cores and 16 GB RAM. Desktop: 1440×844, device DPR 1.5. Phone **emulation**: 390×844, device DPR 2 and 4× CPU slowdown, using the laptop GPU. This is not a physical phone benchmark. Adaptive renderer DPR is recorded per sample in the JSON.

The before fixture is commit 9038060 plus the same query-only headless debug observer; no application optimisations were copied into it. Each position settles for 4.5 seconds, followed by 100 RAF observations with input activity maintained. FPS/frame time come from actual main-renderer submissions, not a counter that mistakes an idle RAF for a rendered frame. Draw/triangle counts come after rendering. Screenshots include the diagnostic panel, which is absent on normal URLs.

**Refresh cadence varied during the session**, including approximately 30 FPS on a blank page and a later return to 60 FPS. Blank-page controls before each device run: before ${before.map(r=>`${r.width}px ${r.environmentFps.toFixed(1)}`).join(', ')} FPS; after ${after.map(r=>`${r.width}px ${r.environmentFps.toFixed(1)}`).join(', ')} FPS. The tables are observations, not a controlled claim of an FPS speedup. Earlier capped and intermediate samples remain alongside the final results. Physical-device validation and a stable display cadence are still required to certify the laptop/phone goals.

## Before → after

Each texture/geometry value is the renderer's resident resource count, including shared caches; it is not a visible-object count. Warmup intentionally increases initial texture residency.

`
for(let i=0;i<after.length;i++){
 const a=after[i],b=before[i]
 report+=`### ${a.width}px / CPU ${a.cpuThrottle}×

| Scroll | FPS | Median ms | Draws | Triangles | Textures | Geometries |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
`
 for(let j=0;j<a.scenes.length;j++){
  const x=b.scenes[j],y=a.scenes[j]
  report+=`| ${y.offset.toFixed(2)} | ${pair(x.fps,y.fps,1)} | ${pair(x.medianMs,y.medianMs,1)} | ${pair(x.drawCalls,y.drawCalls)} | ${pair(x.triangles,y.triangles)} | ${pair(x.textures,y.textures)} | ${pair(x.geometries,y.geometries)} |\n`
 }
 report+='\n'
}
report+=`P95 frame times, individual long tasks, DPR, programs and largest geometry submissions: [before JSON](before-matched.json), [after JSON](final.json). Peak final budget: **${Math.max(...after.flatMap(r=>r.scenes.map(s=>s.drawCalls)))} draws / ${Math.max(...after.flatMap(r=>r.scenes.map(s=>s.triangles)))} triangles**, below 150 / 400,000.

## Top five observed costs and changes

These are ranked engineering findings from shader counts, submissions and browser long-task observations, not exclusive GPU-time measurements.

1. **Late shader variants.** The before run added as many as ${Math.max(...before.flatMap(r=>r.scenes.map(s=>s.newPrograms)))} programs on contact entry. All scene/light configurations, glyphs and textures now warm behind the loader. A bounded shared material catalogue retains their programs across scene unmounts. Low/high tiers keep the same light-count shader signature. ${verification.shadersAtStart} shader-compilation calls had completed by START; the full forward/reverse/interaction test recorded **${verification.lateShaderCompiles} additional compileShader calls** afterwards.
2. **Transmission and shadow passes.** Thin glass/lenses used transmission and contact shadows needed extra offscreen work. Glass now uses ordinary alpha materials; a shared radial blob supplies the contact shadow. No shadow-map pass, reflection pass, transmission or postprocessing pipeline remains. CSS supplies the vignette; card backdrop blur is removed.
3. **Full-route world submissions.** Palms, rocks, rails, lamps and skyline instances previously submitted broad route-wide batches. GPU instance buffers now contain only the curve window (±180 m) intersecting the camera frustum. Cached bounds and tolerant camera comparisons avoid repeatedly filtering an unchanged view. Permanent terrain remains 42,688 triangles; it was not remodelled.
4. **Scene mesh count and lifecycle work.** Compatible static meshes merge per scene. Only the active scene and neighbours mount after warmup. Exclusive geometries/materials are disposed on departure; shared maps, parked-car buffers, glyphs and warmed programs have explicit cache ownership. Spur CPU geometry is cached; its GPU buffers are disposed when the scene leaves. Five fallback fleet cars still total about 295k triangles and remain the largest visible geometry cost; changing their design was outside this pass.
5. **DOM and scroll work.** Five moving drei Html price labels are replaced by sprites sharing one canvas atlas. Fleet scroll selection is held in refs, with direct card text updates only at category changes. Overlay CSS variables change only when their quantised value changes. The camera caches scroll dimensions with ResizeObserver. React work occurs for input, loading and discrete scene mount/unmount boundaries, rather than continuous progress updates.

## Frame pacing and small fixes

- Start DPR 1.25 on every device. Three sustained seconds above 58 FPS can raise the target to 1.75; below 45 FPS lowers it. An additional 55 FPS safety window reduces resolution gradually, with a 10-second recovery cooldown, so a scene running at 50 FPS does not remain at an overambitious DPR.
- After two seconds without input, actual scene drawing is capped at 30 FPS. Update hooks still follow the existing R3F clock; hidden/offscreen canvases stop completely. Idle observed ${verification.idleFps.toFixed(1)} FPS in the verification run. There is one R3F RAF/render loop, not competing demand and animation loops.
- Landmark markers require bare ?debug; performance diagnostics require ?debug=perf and do not load on normal URLs. r3f-perf is a devDependency; its compatible drei override avoids installing an obsolete second drei version.
- Footer links are in the native More menu, visible only on hero/contact. Title handoffs are exclusive and snap negligible damping residuals at boundaries. Open service cards close on departure. Chase distance/height/FOV remain 7.5 / 1.9 / 45 outside showcase compositions. Pricing-board rows share font size and weight.

## Payload and verification

Full observed resource payload after warmup/journey: ${after[0].payload.decodedBytes.toLocaleString('en-US')} decoded bytes / ${after[0].payload.transferredBytes.toLocaleString('en-US')} transferred bytes, including debug instrumentation, below 8 MB. The runtime Meshopt/WebP car remains **344,332 bytes**, 59,102 triangles. The untouched raw authoring GLB is retained. No other fleet GLBs exist; category-scaled hero fallbacks remain and no models were downloaded or generated. Embedded tire normal: 512 px; procedural maps and glyph atlas are at most 1024 px.

- npm run build: client/SSR/prerender succeed without warnings. npm run dev responds HTTP 200.
- [Browser verification](verification.json): START disabled until warmup, initial DPR 1.25, scene-neighbour mounts, render budgets, no transmission, atlas labels, arrows/colours/keyboard rotation, selected-car booking, inline errors, mocked success, service cards, no resource growth over repeated journeys, hidden pause, query-only debug and zero late shaders. No real booking/email was sent.
- Repeated full journeys: ${JSON.stringify(verification.cycles)}. Normal URLs do not fetch the PerfDebug chunk. Browser console warning/error arrays are empty in both final device runs.
- Car geometry/batching and shared booking-server regression scripts pass; production dependency audit reports zero vulnerabilities.

## Remaining weaknesses

Shader-compilation hitches are eliminated in the tested assets, but **all hitches are not eliminated**. Desktop and especially 4×-CPU phone emulation still show long tasks during scene mounting and other main-thread work. The raw JSON preserves their durations. Display cadence and adaptive detail differed between runs, so do not treat their FPS deltas as a guaranteed speedup or certify a real mid-range phone from this emulation. Scene-owned object construction/commit work and full-resolution fallback display cars remain candidates for a further CPU profile. The longer prewarmed loader is intentional (about ${(verification.warmupMs/1000).toFixed(1)} seconds in this diagnostic run). Adding future fleet variants requires rechecking their shader warmup, payload and budgets.

## Screenshots

Desktop and phone: ${after[0].scenes.map(s=>`[1440px / ${s.offset}](final-1440-${s.offset}.png) · [390px / ${s.offset}](final-390-${s.offset}.png)`).join('; ')}.

## Reproduce

Build and run preview on port 4173. Set EGAL_BROWSER_MODULES to a node_modules directory containing Playwright, then run node scripts/measure-performance-pass.mjs final and node scripts/verify-performance-pass.mjs. EGAL_PERF_URL can point the measurement script at an archived baseline preview. Run node scripts/report-performance-pass.mjs to refresh these tables after collecting both JSON files.
`
await fs.writeFile(`${folder}/REPORT.md`,report)
console.log('Wrote '+folder+'/REPORT.md')
