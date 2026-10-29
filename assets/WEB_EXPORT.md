# Approved car — web handoff

The source design in `car-studio.blend` was not remodelled during this export/integration step.

| Asset | Bytes | Triangles |
|---|---:|---:|
| `public/models/car.glb` | 1,416,800 | 59,860 |
| `public/models/car.opt.glb` — used by the site | 342,960 | 59,860 |

Both files contain the same 81 named nodes and 12 named materials. No names were changed. The complete lists, bounds and extensions are in `web-export-report.json`. No studio geometry, cameras, lights or HDRI are exported. The asset is Y-up, points toward +Z and is centred at the ground origin. No image textures are embedded; the texture ceiling is 1024 px.

The requested Meshopt/WebP optimisation was run. Name/rig-preserving flags disable flattening, instancing, joining, palette-material replacement and geometry simplification. This retains the approved triangle count, all four wheel hubs and the two front steering pivots.

## Integration

- Length normalised to 4.3 road units, centred and grounded.
- Wheel rotation uses signed path distance; steering uses curve curvature.
- Cached materials are cloned. Only BodyPaint responds to the colour prop, and removing the prop restores its source colour.
- Tail-light emission increases subtly during deceleration, above its exported base value.
- The existing soft contact-shadow plane remains under the car.
- Camera: fixed 7.5 horizontal distance, 1.9 height, 45 degree FOV; smoothed heading.
- START waits for real-model mount readiness and the download manager. Suspense and the placeholder error fallback remain functional.
- No new app dependencies or scenery.

## Verified

`scripts/verify-car.mjs` parses the original and Meshopt files, checks names/geometry/material ownership, orientation, grounding, scale, and stable wheel/steering hubs.

`scripts/verify-browser.mjs` checks delayed loading, error fallback, moving/stopped wheels, centre-line placement and constant framing. Desktop screenshots were captured at 0, 0.3, 0.6 and the maximum-curvature stop, 0.49. Measured camera radius was 7.5, height 1.9 and FOV 45 at every stop. Settled projected width varied by less than 0.02%. A 375 x 812 check confirms the actual car vertices remain in frame.

Screenshots are in `web-checks/`: `scroll-0.png`, `scroll-030.png`, `scroll-060.png`, `curve.png`, `mobile-375.png`. Detailed measurements and zero-warning/error results are in `web-checks/browser-report.json`.

`npm run dev` and `npm run build` pass. `scripts/verify-production.mjs` additionally checks the built site, including its real optimized-model request, START, scrolling and desktop/mobile shaders, with zero browser warnings/errors. The production screenshot is `web-checks/production.png`.

The production chunk-initialisation issue and Windows PMREM shader precision warning were fixed at their sources. Browser diagnostics remain enabled.
