# Egal cinematic implementation — 2026-10-29

Implemented in the existing Vite/React/R3F project. Fleet, services, booking, contact, data files, native scrolling, model rig, lazy fleet manifest and the previous performance improvements remain. No dependencies, external models, HDRIs or audio files were added.

## What changed

- **Brand:** copied the supplied, unmodified 2172×724 PNG to `public/images/egal-logo.png`. Used the actual road-inspired mark in the opening and header, with a text fallback. Brand orange is `#E87D32`, navy `#131B4B`. Existing copy, actions and metadata remain.
- **Opening:** warm ivory veil over the live coast, staggered logo/progress reveal, one restrained logo highlight, and a wide-to-three-quarter camera dolly. START is available when the existing model loader is ready; the user does not have to wait for decorative animations. Skip introduction bypasses choreography. Book Now also bypasses loading and queues its jump until the scroll element is connected and measured. Duplicate START calls are guarded.
- **Camera:** reusable car-local shot coordinates in `cinematicShots.js`: establishing reveal, rear three-quarter hero, a brief body/wheel emphasis around scroll 0.08–0.14, driving follow, and the existing destination showcase. Positions derive from the car's road pose. Existing fleet/services/toll/office compositions retain precedence. Damped camera motion, cached world-space poses and reusable vectors avoid an additional animation loop and recurring shot-vector allocation. The original scroll damping still supplies acceleration/deceleration; wheel spin remains proportional to actual travel.
- **World:** inexpensive mountain ridges (960 triangles high / 640 low), muted terrain, softer rock shading, controlled asphalt highlights and one baked environment reflection strip. Sunrise is cream/peach with a blue top; existing golden-day/sunset progression remains. No bloom or screen-space effects. The environment is deliberately still procedural/stylized rather than photorealistic.
- **Readability:** trunks and crowns share whole-palm headline bounds, so they ease out together when they obstruct the copy. Existing clearance sampling remains capped and cached. The main overlay is completely hidden before START, preventing ghosted titles behind the opening veil.
- **Controls:** CSS button highlights, hover/press/arrow feedback and focus rings. Dedicated portrait and short landscape opening layouts. The same booking actions are retained.
- **Sound:** OFF initially; explicit user action controls the preference. A missing-track notice is shown honestly. Optional supplied audio supports one Howl, modest volume, fades, hidden-tab pause/mute, error handling and unload cleanup. `brand.ambientAudio` remains `null` because no audio track exists. There is no fabricated engine/music asset or autoplay request.
- **Reduced motion / low power:** static logo reveal, no decorative highlight, static opening on mobile, reduced-motion fixed shot composition and no service orbit/ambient loops. Functional scrolling, car positioning, fleet rotation controls and booking remain available. The existing adaptive DPR, hidden-tab rendering pause, batching, single-pass scene fades and shared resources remain.

The supplied logo is a raster image with an integrated tagline/glow. It is animated as the actual image; its road was not falsely reconstructed as an editable vector stroke. The compact header uses a CSS viewport without stretching the image or altering the source.

## Files

| Area | Files |
| --- | --- |
| Brand / opening / controls | `src/data/brand.js`, `src/ui/BrandLogo.jsx`, `src/ui/Loader.jsx`, `src/ui/Overlay.jsx`, `src/ui/SoundToggle.jsx`, `src/index.css`, `src/App.jsx`, `public/images/egal-logo.png` |
| Choreography | `src/scene/CameraRig.jsx`, `src/scene/cinematicShots.js`, `src/scene/World.jsx` |
| Coastal rendering / clearance | `src/scene/world/CoastalBackdrop.jsx`, `Terrain.jsx`, `CoastalProps.jsx`, `Instances.jsx`, `Atmosphere.jsx`, `src/scene/Road.jsx` |
| Verification | `scripts/verify-cinematic.mjs`, `verify-cinematic-motion.mjs`, `profile-cinematic.mjs` |

## Verification actually run

- `npm run build` passes.
- `verify-cinematic.mjs`: 1440px desktop, 390px phone, reduced-motion desktop and simulated four-core low-power desktop. Checks actual logo, static fallbacks, duplicate START, skip, sound preference/missing audio, forward/backward scroll, all existing scenes, car selection/colour UI, service cards, booking errors, no document-width overflow and phone landscape. No unexpected console warnings/errors.
- `verify-cinematic-motion.mjs`: continuous shot coordinates, valid camera clearance, live wheel spin during movement, stationary wheels at rest, fixed reduced-motion camera and **Book Now while the GLB response is deliberately held**. The early booking test initially exposed the unmeasured-scroll-element race, which was fixed and retested successfully.
- `verify-step6.mjs`: desktop/phone required-field errors, live estimate, chosen car/colour, WhatsApp fallback (intercepted; no external message sent), success state, gate flow, reset and contact. Passes without console warnings/errors.
- `verify-performance-runtime.mjs`: repeated journeys retain stable GPU geometry/texture counts, idle overlay attributes stop mutating, tab visibility pauses/resumes rendering while preserving time, and the HTML booking fallback works when WebGL is deliberately disabled. Passes.
- `verify-car.mjs` and `verify-render-optimizations.mjs`: original/optimized GLB rig, source isolation, materials, normalized ground/length, hub-safe spin/steering, unchanged 59,102 source triangles and 20 rigid material batches. Both model-file SHA-256 hashes are unchanged.

Reports: `report.json`, `motion.json`, `production.json`; resource-lifecycle and booking reports are in the existing `assets/performance/` and `assets/step6-checks/` folders. Browser checks use the existing Playwright runtime; no package was installed.

## Performance measurements

Production preview on localhost, headless Edge using Intel Iris Xe / ANGLE D3D11, 800px height. Desktop 1440px/DPR1/CPU1x; phone emulation 390px/device DPR2/CPU4x. Existing adaptive renderer caps apply. Network was not throttled and driver caches were warm from previous tests. These are lab results, not physical-phone or internet guarantees.

| Scene | Desktop median ms | Phone median ms |
| --- | --- | --- |
| Hero | 16.7 | 16.7 |
| Fleet | 16.7 | 16.7 |
| Services | 16.7 | 16.7 |
| Booking | 16.7 | 33.3 |
| Contact / 0.95 | 16.7 | 33.3 |
| Contact / 1 | 16.7 | 16.7 |

Settled scenes sampled 44 rAF intervals. Desktop fleet had occasional ~50ms frames; phone scene p95 reached ~50ms. An additional **active eight-second scroll** sampled 478 desktop / 226 phone frame intervals: desktop median **16.7ms**, p95 **16.9ms**; phone median **33.3ms**, p95 **66.7ms**. Occasional slow frames and cold shader compilation remain.

Initial decoded resource bodies measured **3,780,302 bytes** (about **3.78 MB**, plus the small HTML document), compared with about 2.01 MB before this visual pass. The supplied PNG accounts for 1,764,923 bytes of that increase. The primary optimized GLB is still 336,028 bytes and fetched once. No initial fleet-model or sign-font request occurred. No missing audio requests occurred. This is decoded size, not compressed transfer; the tested build predates tiny static-fallback/normal-direction refinements that do not change the payload conclusion.

Observed initial DOM LCP was 0.21s desktop / 0.51s phone, CLS 0.0083 / 0; START readiness 0.25s / 2.61s. Local caches and the image/loader DOM make these optimistic. LCP does not measure WebGL completeness, readiness does not include every GPU shader, and no real-user INP result is claimed.

## Screenshots

- Opening: [desktop](desktop-opening.png), [phone](mobile-opening.png), [phone landscape](mobile-landscape-opening.png), [reduced motion](reduced-opening.png), [low power](low-power-opening.png).
- Current production journey: `production-1440-{0,0.28,0.5,0.7,0.95,1}.png` and the equivalent `production-390-*.png`.
- Choreography checks also include the brief detail shot, reverse scroll and all scene windows in the `desktop-*`, `mobile-*` and `reduced-*` captures.

## Remaining asset limits / optional next steps

1. The world is an improved procedural coast, not a photoreal scanned environment. Physical Android/iPhone, thermal, slow-network and real-user INP testing remain unperformed.
2. Cold shader preparation and occasional phone frames above 33ms remain; no claim of constant mobile 60 FPS is made.
3. A clean SVG/vector version of the supplied logo would reduce the 1.76 MB image payload and enable a true road-stroke animation without changing the mark.
4. Five fleet variants are still absent and intentionally use the approved hero fallback. No model was searched for or generated.
5. To use real ambience, add a track you have rights to use and set `brand.ambientAudio` to its local public-relative path. Actual audio playback/fades could not be verified without a supplied track; preference, missing-track behaviour and default silence were verified.
6. Contact/WhatsApp/social placeholders and endpoint configuration remain unchanged. No real external booking was sent during tests.

Local development remains at http://localhost:5173/; built preview at http://localhost:4173/.
