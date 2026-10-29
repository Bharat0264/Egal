# Egal implementation report — 29 October 2026

## Subsequent visual refinement

After the initial hardening pass below, completed additional repository and Blender work for the master brief:

- Replaced the self-intersecting, wide road-offset ground mesh with a continuous world-space heightfield. Fleet/destination grading is smoothly feathered; the same surface grounds vegetation and shoreline rocks. Rebuilt the far terrain continuation so the former angular floating sheets no longer cross the skyline.
- Graded the services fork too, keeping both spur roads above the ground and rocks out of their footprint. Roadside post/lamp/sign bases follow the ground. Corrected capped camera damping after compilation stalls; normal shot coordinates, FOV and scene composition remain.
- Added a shared fine grass surface and varied coastal rock geometry; the full rotated/scaled rock base is used for grounding. Road geometry, curve, anchors, section windows, camera and business data remain unchanged.
- Reconnected and inspected Blender, backed up the live session/source/GLBs, converted non-exportable tire bump nodes into an in-house 512 px normal map, and added seam-aware tire UVs. Saved `car-studio.blend`, rendered and inspected the result, re-exported the production GLB and optimized it with rig-safe settings. No car geometry or design was changed. Optimized file is **344,332 bytes**, with **59,102 triangles** and all required names retained.
- Added `terrainSurface.js`, `rockGeometry.js`, `scripts/refine-tires.py`, `verify-terrain.mjs` and `verify-world-refinement.mjs`; updated the existing terrain, backdrop, props and shared textures. Adapted Node geometry tests to skip browser-only image decoding; an actual WebGL browser checks the embedded WebP normal map separately.

New evidence and recoverable Blender/GLB backups are in `assets/refinement-checks/`. This section supersedes the older statement below that no Blender edits/export occurred in the hardening-only pass. Missing fleet variants and launch configuration remain the documented external dependencies.

## Delivered

Completed the production-hardening implementation in the existing repository. Retained the approved car, five-scene world, road, section content, selection flow, native scrolling, camera shots and booking journey. No application dependencies, external models, HDRIs, textures or audio downloads were added.

| Area | Files / behavior |
| --- | --- |
| Startup and runtime | `src/App.jsx`, `src/ui/Loader.jsx`, `Overlay.jsx`, `src/scene/World.jsx`, `WorldFallback.jsx`, `world/RenderBudget.jsx`, `renderQuality.js`, `CoastalProps.jsx`: lazy world and GSAP, immediate START, preparation state, real fallback routes, sustained performance tier, deterministic reduced counts, hidden/offscreen pause. |
| Fast pages and SEO | `src/pages/`, `src/entry-server.jsx`, `src/lib/pageMeta.js`, `src/main.jsx`, `scripts/prerender.mjs`, `index.html`: shared-data Simple view, FAQ and policies; static route HTML, schema, social metadata, robots/sitemap. Build-time prerendering uses existing React APIs rather than a new dependency. |
| Booking | `api/booking.js`, `src/lib/booking-rules.js`, `src/lib/booking.js`, `src/ui/BookingForm.jsx`: shared strict rules, native POST support, optional email, inline errors, trusted server estimates, Resend lead/acknowledgement, honest failure-to-WhatsApp draft. |
| Privacy and interaction | `src/lib/analytics.js`, `src/state/SelectionContext.jsx`, `SceneCoordinator.jsx`, `SimplePage.jsx`, `ContactCard.jsx`, `SiteFooter.jsx`: requested allowlisted events, no form PII, default-off tracking, legal links, disabled missing social links. |
| Audio | `src/ui/SoundToggle.jsx`, Vite existence flags: optional ambient/engine loops, START plus user choice, session preference, velocity modulation, quiet missing-file behavior, hidden-tab pause and cleanup. |
| Assets and deployment | `vite.config.js`, `vercel.json`, `.env.example`, `.gitignore`, `package.json`: content-addressed model URLs, cache headers, private local API configuration, public config, prerender build pipeline. User logo PNG retained; WebP derivative, icons, manifest and social placeholder generated locally. |
| Accessibility/layout | `src/index.css`, semantic page/UI components: skip links, focus rings, one h1, labels/live regions, contrast improvements, 44 px controls, 16 px fields, viewport/keyboard handling and separated mobile footer/sheet controls. |

## Verification actually run

- `npm run build`: client, React server bundle, five prerendered routes and content-addressed GLBs pass without warnings.
- `verify-booking-server.mjs`: shared/server required fields, invalid/past/equal/reversed dates, phone/email/car/service/colour, honeypot, size/type/origin/rate rejection, sanitisation, authoritative prices, idempotency, lead failure and acknowledgement failure. External email is mocked; no real message was sent.
- `verify-hardening.mjs`: real browser screenshots of opening and all scenes at 0, 0.28, 0.50, 0.70, 0.95 and 1.0 at **390, 768 and 1440 px**; Simple view full pages and booking success at each width. No normal-flow warnings/errors. Exclusive titles, no horizontal overflow, late model requests, category prefill, form errors, success, endpoint failure draft, legal routes, no-JavaScript pages and context-loss fallback pass.
- `verify-hardening-edges.mjs`: START works with GLB deliberately held, no initial rendering/model chunk, later-day hydration, emulated phone keyboard viewport, unsupported WebGL and failed world chunk, DPR 1 for four-core/4 GB device signals, paused hidden/offscreen frame loop, unique metadata and no server credentials in client chunks.
- `verify-analytics.mjs`: Umami and Plausible adapters using intercepted SDK fixtures; forbidden form/query/referrer data dropped, unknown events dropped, DNT prevents script load, session sound choice persists and no AudioContext is created without files. These are controlled tests, not production tracking or fake booking functionality.
- `verify-car.mjs` and `verify-render-optimizations.mjs`: both GLBs retain 59,102 triangles, named rig, isolated body paint, grounded 4.3-unit normalization and hub-safe spin/steering. Hero batched to 20 rigid draws. The approved model design was not edited.
- `profile-hardening.mjs`: actual Intel Iris Xe scene pacing/draw calls, desktop and CPU-4× phone emulation; fleet keyboard selection/rotation/colour, services dismissal, reverse journey, Book Now and return-to-start pass. Geometry/texture counts remain equal across forward/reverse cycles. The slow run actually triggers the adaptive performance tier; phone pacing remains weaker in contact and fleet transitions.
- Local Lighthouse mobile checks: opening **99 performance / 100 accessibility / 100 best practices / 100 SEO**; `/simple` **95 / 100 / 100 / 100**. Conditions and payload figures are in the performance report.

Screenshots and machine-readable results: `assets/hardening-checks/`. Existing earlier-phase tests are historical evidence and may assert superseded behavior (for example asset-gated START or the old inline WebGL fallback); the current hardening tests cover the new behavior. No lint/type-check script exists in package.json, so no such pass is claimed.

## Blender and visual result

Confirmed a real live Blender connection and inspected the approved studio source, object/material/rig inventory, ground contact and topology. Captured material previews and an actual Cycles render. The prior live session was saved before opening the source. No geometry redesign, export or optimization rerun was needed for this hardening; existing raw/optimized car files are retained.

This pass improves presentation continuity and readability, not the car's art direction. The existing paint/reflections, camera shots, contact shadows and procedural coastal world remain. The world is still stylised rather than photorealistic, and five distinct fleet models have not been supplied. The broad master brief's photorealistic asset goal is not falsely marked achieved.

## Manual launch work

1. Set `VITE_SITE_URL` to the real domain and rebuild.
2. Set server-only `RESEND_API_KEY`, `BOOKING_TO_EMAIL`, `BOOKING_FROM_EMAIL` with a verified Resend sender. Test a real lead and optional reply after deployment. Static Vite preview does not run the function.
3. Replace brand phone, WhatsApp, address and social URLs; verify prices, named vehicle and specifications. Review FAQ/legal placeholders and replace the social image.
4. Configure global abuse protection as needed: the built-in rate guard is per instance. Verify deployed cache/security headers.
5. Optional: configure a cookieless Umami/Plausible tracker with public provider/ID/script URL; add owned/licensed ambient/engine loops. Both features remain off without configuration/files.
6. Supply the five fleet GLBs via the existing manifest, then rerun actual-variant payload/appearance checks. No substitutes were generated.
7. Check physical phones, on-screen keyboards, screen-reader behavior and deployed-network performance. Browser emulation and Lighthouse are not physical-device guarantees.

The [README](../README.md) includes setup details and `.env.example` lists every setting. Resend contract follows [its API reference](https://resend.com/docs/api-reference/emails/send-email); cache policy follows [Vercel's header guidance](https://vercel.com/docs/caching/cache-control-headers). Tracker integration follows [Umami configuration](https://docs.umami.is/docs/tracker-configuration) and [Plausible script options](https://plausible.io/docs/script-extensions).
