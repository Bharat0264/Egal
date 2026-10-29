# Egal — scroll-driven car rental scene

## Current production hardening (Step 8)

The later master-brief follow-up also fixes folded terrain, smooths the graded landscape and grounds shoreline rocks. Blender tire relief is now an exportable in-house 512 px normal map; the car's geometry, rig and design are unchanged. Source and GLB backups plus the inspected render are in `assets/refinement-checks/`.

When re-optimizing this named car rig, preserve its transforms and material identities:

```sh
npx @gltf-transform/cli optimize public/models/car.glb public/models/car.opt.glb --compress meshopt --texture-compress webp --texture-size 1024 --flatten false --instance false --join false --palette false --simplify false
```

The CLI defaults flatten the rig and merge paint materials, so do not use the shorter generic command for this car. Repeating tire UVs are valid and intentionally stay unquantized. Restart Vite/rebuild after replacing model files so content-addressed URLs update. Current export: 344,332 bytes, 59,102 triangles, one embedded normal map. See the updated audit for the distinction between the original hardening work and this Blender/landscape follow-up.

This section supersedes the historical loading, sound and booking notes below. The existing five-scene journey, approved car and scroll coordinator remain. Build and verification details, screenshots and Lighthouse reports are in [the implementation report](docs/EGAL_IMPLEMENTATION_REPORT.md), [performance report](docs/EGAL_PERFORMANCE_REPORT.md) and [technical audit](docs/EGAL_TECHNICAL_AUDIT.md).

### Run and deploy

Use `npm run dev` for the site **and local `/api/booking` handler**. Copy `.env.example` to `.env.local` and restart Vite after changing configuration. `npm run build` produces the client chunks, a temporary React server-render bundle, and five static pages in `dist/`. `npm run preview` serves static output only; it does not execute Vercel functions, so an email submission there uses the honest WhatsApp failure fallback. Deploy the repository to Vercel with the included `vercel.json`, then run a real delivery test before launch.

We use a small `scripts/prerender.mjs` with React `renderToString` rather than adding an SSG dependency. `/`, `/simple`, `/privacy`, `/terms` and `/cancellation` get independent HTML, metadata and canonical URLs. `/simple` has no WebGL downloads and remains readable without JavaScript; the 3D route exposes equivalent business content in its no-script fallback. Native form POSTs are server-validated even without JavaScript; interactive inline validation and WhatsApp drafting require JavaScript. Hashed JS/CSS and content-addressed model URLs receive immutable caching; page routes revalidate. Original model files remain in place.

### Booking email setup

Set these **server-only** Vercel environment variables (never prefix them with `VITE_`):

- `RESEND_API_KEY`: an API key from your Resend account.
- `BOOKING_TO_EMAIL`: the inbox that receives leads.
- `BOOKING_FROM_EMAIL`: a sender on your verified Resend domain, for example `Egal <bookings@your-domain.example>`.

The client calls `/api/booking` by default. A successful lead delivery returns JSON `{ "ok": true }`; an optional customer email enables a separate acknowledgement. Acknowledgement failure does not discard an already-delivered lead. The server independently validates dates in India's calendar, car/service/colour, location, phone and email, rejects the honeypot, caps bodies at 8 KB, sanitises location text and recalculates rates from `cars.js`. Resend receives plain text and idempotency keys. No secret or customer field is sent to analytics.

The simple abuse guard permits five attempts per IP per 15 minutes **per warm function instance** with bounded memory. It is not a global distributed limit: configure Vercel Firewall/rate limiting for a public launch. Origin checking blocks cross-origin browser submissions but is not bot authentication.

If the endpoint fails or is unconfigured, the UI says the request has **not reached Egal** and provides a WhatsApp draft. It never claims an email success for a draft. Replace `brand.whatsapp` with your country-code-plus-number, digits only, before relying on this path. The browser can block a new window after an asynchronous failure; the confirmation always contains a clickable draft link. No message is sent automatically.

`VITE_BOOKING_ENDPOINT` is an optional public override for a compatible serverless endpoint. It must accept the same JSON fields and return `{ "ok": true }` only after accepting the lead. Keep email credentials inside that server (a Vercel function, Formspree proxy or Google Apps Script endpoint can provide the contract); do not paste credentials into browser code. The included same-origin Vercel endpoint needs no client override.

### Public configuration and editable content

- Set `VITE_SITE_URL` to the real HTTP(S) site origin, then rebuild so canonical URLs, social tags, JSON-LD, robots and sitemap use your domain. The default `https://egal.example` is explicitly a placeholder.
- Review `src/data/brand.js`: telephone, WhatsApp, business address, working hours and all five social URLs. Check `cars.js` prices, category specifications and the existing named vehicle against your actual fleet.
- Review all five answers in `src/data/faq.js` and the three policies in `src/data/legal.js`. They are clearly marked placeholders, not approved legal or operational terms. The 1200×630 `public/social-placeholder.png` also needs an approved launch image.
- Five distinct fleet GLBs are still absent. The existing, explicitly documented category-scaled hero fallback remains until you supply the declared files in `src/data/fleetModels.js`. No new models were generated or downloaded. Rebuild after adding them; loading is sequential in idle time after START and scroll > 0.10.

### Optional analytics and audio

Analytics is off unless configured. Set `VITE_ANALYTICS_PROVIDER` to `umami` or `plausible`, `VITE_ANALYTICS_ID` to the website ID/domain from that provider, and `VITE_ANALYTICS_SCRIPT_URL` to its HTTPS manual/custom-event tracker. Use the provider's cookieless script. The wrapper whitelists the requested events and enum properties, drops phone/email/location, removes query strings and private referrer paths, disables automatic form/outbound capture and respects Do Not Track. No tracker is requested in the default build. Confirm your chosen provider configuration and retention policy before launch.

Owned/licensed loops may be added as `public/audio/ambient.mp3` and `public/audio/engine.mp3` (`.ogg` or `.wav` also supported). Restart/rebuild after adding files. They play quietly only after START and the user's sound choice, persist that choice for the session, pause in hidden tabs and unload cleanly. Missing files cause no requests, warnings or AudioContext creation. Engine pitch follows scroll velocity. This replaces the older `brand.ambientAudio` path; no audio files are supplied.

### Verification and remaining launch checks

The hardening suite uses the already available Playwright runtime and optional `npx lighthouse@12.8.2` tooling; no application dependencies were added. See `scripts/verify-booking-server.mjs`, `verify-hardening.mjs`, `verify-hardening-edges.mjs`, `verify-analytics.mjs`, `profile-hardening.mjs` and the evidence in `assets/hardening-checks/`. The browser booking test server uses an explicit mock email fixture only; it is not deployed and must not be used for real bookings.

Before public launch, configure the real domain/contact/policies/email sender, verify inbox delivery and optional reply, test on physical iOS/Android devices with their keyboards, and inspect the deployed Vercel headers. No live email, production deployment, physical-phone FPS or audible supplied loops were claimed by the local tests.



## Run



```sh

npm install

npm run dev

npm run build

node scripts/verify-car.mjs

```



Click START when the scene is ready, then scroll or swipe. Existing sections and scroll navigation are preserved. Business details, booking submission and audio remain placeholders.



## In-house Blender SUV



Built from scratch using bpy through Blender MCP, without imported models, asset libraries, image textures or brand badges. No third-party model credits are required.



- Approved editable source: `assets/car-studio.blend`

- Web export: `public/models/car.glb`

- Export through Blender MCP: execute `scripts/export-approved-car.py` in the approved source scene. It exports temporary copies and restores the original scene and names.

- Full node/material/geometry report: `assets/web-export-report.json`

- Production geometry: **59,102 triangles**, unchanged by optimisation. The requested rear skid bar and three small under-bumper ticks have been removed; the remaining design is preserved.

- `car.glb`: **1,387,976 bytes**. `car.opt.glb`: **336,028 bytes**, below 3 MB.

- Export bounds: approximately **4.415 m long, 1.480 m high, 2.183 m wide**. The origin is centred at ground level.

- Blender: Z up, nose -Y. GLB: Y up, nose +Z. Wheel hubs rotate about X; front steering pivots rotate about Blender Z / glTF Y.

- All modifiers applied. All four tyres touch z=0. No loose vertices. Bilateral vertex symmetry error below 0.000001 m.

- Only `Body` uses `BodyPaint`.



The approved design includes the repaired shell, physical lamp housings/lenses, optical projectors and LED guides, recessed front intakes, thick glass, continuous diffuser and seated exhaust outlets. Only the explicitly requested floating rear bar and three small under-bumper ticks were removed during world polish. The app preserves its exported silver paint unless an explicit `color` prop is supplied. Blender procedural tyre micro-normal detail is not an image texture; the GLB contains the Tire material's standard PBR factors.



Approved isolated Blender renders: `assets/isolated/hero.png`, `front.png` and `rear.png`. The GLB contains only production-car meshes and the two steering pivots. Studio objects, cameras, lights, world/HDRI, hidden road markers and roof rails are excluded. No textures are embedded, so the 1024 px texture ceiling is satisfied without additional downloads.



Required exported objects:

`Body`, `Cabin_Glass`, `Wheel_FL`, `Wheel_FR`, `Wheel_RL`, `Wheel_RR`, `SteerPivot_FL`, `SteerPivot_FR`, `Headlight_L`, `Headlight_R`, `Taillight_L`, `Taillight_R`, `Grille`, `Bumper_Front`, `Bumper_Rear`, `Mirror_L`, `Mirror_R`, `Trim`.



Materials:

`BodyPaint`, `Glass`, `Tire`, `Rim`, `Headlight`, `Taillight`, `Trim`, `LampHousing`, `ExhaustMetal`, `LampLens_Clear`, `LampLens_Red`, `TailReflector`.



All 81 exported node names and all 12 material names are preserved; none were renamed. The complete lists are in the export report. Optimisation uses Meshopt/WebP with rig-preserving options. Default flatten/join/palette operations would destroy wheel pivots and paint-material names, and default simplification would alter the approved geometry:



```sh

npx @gltf-transform/cli optimize public/models/car.glb public/models/car.opt.glb --compress meshopt --texture-compress webp --texture-size 1024 --flatten false --join false --instance false --palette false --simplify false

```



Vite uses an optimised file only when it is at least as new as the original. Restart Vite after replacing or removing model files; rebuild production output after changes. A missing original selects the placeholder without a missing-file request. Suspense and an error boundary also protect model loading.



The older `npm run gen:car` / `scripts/generate-car.mjs` generates the previous sedan, **not this SUV**, and overwrites `car.glb`. Use the Blender source for the current vehicle.



## Scene integration



The model is centred and grounded, then normalized to **4.3 units**. Its position and heading follow the road curve. Wheel spin follows signed distance travelled and stops when scrolling stops; front wheels steer with curvature, retaining their exported hub transforms. Materials are cloned per model; the `color` prop changes only BodyPaint and removing it restores the approved silver. Brake lights brighten subtly above their exported intensity during deceleration. Soft drei ContactShadows are baked at 256 px with two initial frames, opacity 0.35, then follow the car without global real-time shadow maps.



Procedural Environment/Lightformer reflections, directional/hemisphere lights, ACES tone mapping and sRGB output remain. DPR is capped at 1.75. Outside the Step 5 fleet/services showcase ranges, the camera stays **7.5 units behind and 1.9 above**, with **45 degree FOV** on desktop and mobile. The showcase views blend in and out; the driving curve and native scroll mapping remain unchanged. No new libraries were added.



The existing ribbon road and native scroll controls remain in place. The loader uses model mount readiness plus `useProgress`, so START is withheld while the model request is pending. An error boundary or missing-asset configuration selects the placeholder safely.



## Verification



`node scripts/verify-car.mjs` parses both files with a Meshopt decoder and checks the required names, unchanged triangle count/material names, ground origin, +Z nose, 4.3-unit normalization, isolated paint, stable hubs during wheel spin and steering, and absence of studio objects/cameras/lights.



`npm run dev` and `npm run build` pass. Vite contains two narrow Three/Fiber compatibility fixes: Clock-to-Timer adaptation and zero-snapping of negligible PMREM trigonometric residuals that caused ANGLE X4122 shader warnings on Windows. Shader diagnostics remain enabled; no console filtering is used.



The production build keeps Three's mutually dependent math modules together. Forced size splitting previously evaluated Matrix4 before Vector3 and caused a startup constructor error; the built site is now exercised in the browser as well as compiled. Its two deliberate vendor chunks use a 1000 kB warning budget. A local favicon also prevents an unrelated production 404.



Browser verification covers scroll **0, 0.3, 0.6 and the strongest curve (0.49)** at 1440px, plus 375px framing. The browser report confirms identical camera distance/height/FOV, centre-line placement, wheel movement while scrolling and stationary wheels at rest. A delayed model response verifies the loader gate; an intentionally failed response verifies the placeholder fallback. Normal desktop/mobile checks capture zero browser warnings and errors.



Screenshots: `assets/web-checks/scroll-0.png`, `scroll-030.png`, `scroll-060.png`, `curve.png`, `mobile-375.png`. Measurements: `assets/web-checks/browser-report.json`.



`scripts/verify-browser.mjs` and `scripts/verify-production.mjs` use the workspace's existing Playwright installation via `EGAL_BROWSER_MODULES`; they do not add an app dependency. The production check verifies that the built site requests `car.opt.glb` and compiles without browser warnings on desktop/mobile.



## Step 4 — procedural coastal world



The counts and benchmark below record the initial Step 4 baseline. The subsequent polish changes are documented in the next section.



The route, car animation, chase camera, native scrolling and five UI sections are preserved. The foundation-preview label is removed. The floating rear skid bar was removed through Blender MCP and both GLBs were rebuilt; no production objects or materials were renamed. The original scene is backed up at `assets/car-studio.blend.step4-backup`.



- Asphalt uses deterministic canvas diffuse, roughness and fine normal textures. Ribbon UVs measure distance in metres: one tile per four metres, independently of curve sampling. Gravel shoulders, low kerbs and sea-side guard rails follow the same curve.

- A vertex-coloured terrain mesh forms gentle grass hills on the left and a descending rocky/sandy coast on the right. Clear, flat bays are reserved beside the fleet and destination anchors.

- The teal sea uses small procedural waves, analytic/noise normals, a sun glint and fog-matched horizon. Shore foam, four instanced sailboats, coastal rocks and ten flapping seagulls complete the water/sky props. No asset downloads occur.

- Desktop: **200 palms**, **131 shrubs**, **88 rocks** and **60 city buildings**. Repeated trunks, fronds, shrubs, rocks, kerbs, rails, lamps, signs, boats, birds, clouds and city parts are InstancedMesh batches. Lamps follow 40-metre spacing; sign faces and city windows use canvas textures.

- After 0.75 scroll, fog reveals the distant left-hand skyline, ferris wheel and bridge. Emissive windows and lamps brighten after 0.8.

- Scroll drives sunrise → warm day → orange/purple sunset: sky, sun direction/colour, sea tint, fog, key/fill lighting, procedural environment intensity and exposure move together. The visible sun has a soft halo; cloud sprites use a generated texture.

- `src/data/landmarks.js` defines journey t values: fleetBay 0.28, servicesFork 0.50, tollGate 0.70, destination 0.95. Resolve them with `getJourneyProgress`. Labelled development markers are gated by `import.meta.env.DEV` and absent from production.

- Small/coarse-pointer or low-memory/core devices use **98 palms, 67 shrubs, 44 rocks, 30 buildings and 5 birds**. Sea motion/fine normal detail is disabled there. DPR stays capped at 1.75. Transmission buffers use half resolution on desktop and quarter resolution on mobile; the car geometry/material definitions are unchanged. No postprocessing or new libraries are used.



`scripts/verify-world.mjs` checks centre-line alignment, fixed camera distance/height/FOV and city visibility at **0, 0.25, 0.5, 0.75 and 1**. It verifies approximately halved mobile instance counts, captures all five positions at **1440×900 and 375×812**, checks heading bounds/readability, records browser diagnostics and measures actual WebGL draw submissions. Run with the workspace's Playwright module directory in `EGAL_BROWSER_MODULES`, while dev (5173) and built preview (4173) are running.



Final local measurements (headless Edge, Intel Iris Xe; approximately 3.2-second samples at scroll 0.9):



| Profile | FPS | Draw calls/frame | Initial encoded bodies | Decoded bodies |

| --- | ---: | ---: | ---: | ---: |

| Desktop 1440×900 | 60.0 | 240 | 757,743 bytes | 1,798,809 bytes |

| Mobile 375×812, 4× CPU throttle | 23.8 | 240 | 757,743 bytes | 1,798,809 bytes |



Measurements include the initial document and loaded resources. Textures/scenery are generated locally. Both encoded and decoded load sizes are below 8 MB; the original unoptimised GLB is retained but never requested by this build. Throttling is a simulation, not a physical-phone benchmark. Draw calls include the existing car's transmissive-material passes; reducing instance counts reduces triangles but does not remove the car's draw calls. Desktop throughput varied around 52–60 FPS across runs. The main remaining weakness is throttled-device performance; boats, foam and bridge details remain deliberately simple and stylised.



Screenshots and full report: `assets/world-checks/desktop-0.png`, `desktop-0-25.png`, `desktop-0-5.png`, `desktop-0-75.png`, `desktop-1.png`, corresponding `mobile-*.png`, and `world-report.json`. Normal dev and production checks recorded **zero warnings and errors**. Build passes; model readiness, error fallback, wheel motion and fixed car framing remain covered by the Step 3 regression script.



## World polish



The road curve, camera, car design, sections and landmark data are unchanged. Palms are moved beyond a 42-unit corridor checked against the entire path, with shorter crowns. Nearby/visible shrubs, lamps and sign instances ease out of a padded upper-left copy rectangle; the remaining world stays instanced. Copy has a local soft cream gradient capped at 35% opacity and a subtle shadow, with no hard rectangular edge.



Fog now starts at 75 units instead of 25, retaining foreground colour while preserving horizon haze. Sunrise uses a gold/orange horizon (#FFB36B / #FF8F5A), peach mid-sky, blue top, a brighter sun/halo and an elongated warm sea glint. Exposure starts at 0.9.



Gravel is generated at 1024×1024 with mipmaps, trilinear minification and anisotropy 8. Metric ribbon UVs plus texture repeat tile it every half metre. The left kerb is 30% narrower and slightly darker; the sea-side kerb is preserved.



The three rear ticks were part of the diffuser assembly. Through Blender MCP, the original continuous diffuser surface and exhaust apertures were retained while removing the three protrusions. All 81 node names and 12 material names remain; the source before this change is backed up as `assets/car-studio.blend.polish-backup`. Both GLBs were re-exported/optimised and validated.



A focused Vite compatibility transform fixes drei ContactShadows' world-origin blur quad: it now aligns the blur quad to the translated shadow camera, allowing a shadow above y=0 to bake correctly and follow the car. No dependency files are edited. Pixel readback verifies that the shadow texture contains a silhouette (about 58.6% nonempty coverage), rather than merely checking that a component mounted.



`scripts/verify-polish.mjs` verifies all five requested offsets plus the strongest curve, constant model projection/camera, no headline-region foreground props, minimum palm clearance, texture settings, nonempty shadow pixels, moving/stopped wheels, loader readiness and model-error fallback. `scripts/verify-polish-production.mjs` captures the built site at 1440×900 (0, 0.25, 0.5, 0.75, 1), plus 390×844 and 375×844 at scroll 0. Normal dev/production runs have zero browser warnings/errors, and `npm run build` passes without warnings.



Final screenshots: `assets/polish-checks/production-0.png`, `production-025.png`, `production-050.png`, `production-075.png`, `production-100.png`, `production-mobile-390.png`, `production-mobile-375.png`. Development geometry checks and measurements: `assets/polish-checks/browser-report.json`.



## Step 5 — fleet and services



The existing five sections, road curve, hero car, world, loader and landmark t values remain. Only the parking footprint is locally graded/cleared for the new lay-by. The sun now uses a soft radial-gradient sprite; sea glint uses a wider, smoothly modulated highlight.



Fleet (0.15–0.40) is built at `landmarks.fleetBay.t`: paved parking bays, low sea-facing stone wall, a few palms and five parked cars. The selected car eases forward onto an orange-ringed turntable. Five equal scroll bands select the category; arrows, car meshes and floating drei Html price tags also select it. Manual selection persists until the next scroll-band boundary. Dragging rotates only the selected car around Y, with inertia and idle rotation; touch and keyboard arrow rotation are supported.



All five cars reuse the current optimised SUV, with category scales and separate paint colours. Geometry is cached/shared and batched by material; normalised Meshopt integer attributes are expanded before baking transforms. Parked lens transmission is disabled to avoid additional per-car passes. Each car owns cloned materials; only BodyPaint receives the smooth colour transition. The driving car's model/materials are unchanged.



Edit `src/data/cars.js` for names, prices, seats, fuel, category scales, colours and fleet copy. `getCarModel(type)` is the sole model-path resolver: add category paths there later, keeping the named-parts/material contract. Model loading retains a simple parked-vehicle fallback. The existing hero loader and error boundary are preserved.



The spec card sits on the desktop right and becomes a phone bottom sheet. Book this car snapshots the chosen entry and colour as `selectedCar` in `SelectionContext`, then scrolls to the existing booking range at 0.60. The booking placeholder displays that snapshot. The context provides a stable store with React subscriptions, so selection changes do not remount the canvas. Floating Html elements use a stable DOM portal below the UI, avoiding React root lifecycle errors and card overlap.



Services (0.40–0.60) uses `landmarks.servicesFork.t`: two decorative spur roads with glowing arrows, three rounded signboards and SVG icons, plus cheap city towers, a hotel entrance/chauffeur/open door, and mountains/beach. The installation is visible around its showcase range (0.38–0.615), so miniature buildings cannot block later chase/city views. Hover highlights a sign; clicking or tapping selects it and blends a 10-degree camera drift. The HTML card contains three data-driven bullets and a Book now action. Scrolling, tapping the empty world or closing the card dismisses it. Keyboard-accessible HTML service buttons offer the same selection.



Edit `src/data/services.js` for all service names, subtitles, bullets and card copy. Sign words use drei Text with bundled `public/fonts/DejaVuSans.ttf`, copied from the existing local runtime. Its redistributable font notice is in `public/fonts/LICENSE.txt`; no remote font or asset requests are needed. Mobile/low-power detail halves the new palms, city towers and mountain counts. Screen width determines compact camera/sign/card layout separately from device power.



Validation: `scripts/verify-scenes.mjs` captures 1440px offsets **0, 0.25, 0.28, 0.50, 0.75, 1**, plus fleet/services at **390px and 375px**. It exercises arrows, a visible car mesh, price labels, isolated paint recolouring, mouse drag, actual emulated touch drag without changing scroll, booking snapshots/jumps, service cards and booking. It checks constant chase distance/FOV outside the showcase, sky/skyline progression, and phone card/title/button separation. `scripts/verify-scenes-production.mjs` exercises the built site and produces the corresponding production screenshots. Both record zero normal browser warnings/errors and no external asset requests. `npm run dev` and `npm run build` pass. Report files are written after browser checks to avoid triggering Vite reloads during tests.



Final captures and reports are in `assets/scene-checks/`: `production-hero.png`, `production-fleet.png`, `production-fleet-anchor.png`, `production-services.png`, `production-city.png`, `production-sunset.png`, `production-service-info.png`, `production-mobile-390-fleet.png`, `production-mobile-390-services.png` (and 375px variants), `scene-report.json`, `production-report.json`.



Still placeholders: all five categories currently share the generated SUV silhouette; the retained Luxury SUV display name comes from the supplied car data. Service roads and miniature landmarks are decorative. Step 6 below implements booking submission; real availability and business contact details still require business configuration. Chosen car/colour state persists for this page session, not across reloads.



## Step 5 polish



The current layout uses a 16×28 m bay. Parked cars share a 20-degree angle; their projected model widths determine spacing with a 1.4 m clear gap. Luxury uses the same row calculation as every other category. The turntable is farther inside the paving and offset from the row in the showcase view; its outer glow clears the sea-facing wall by 1.01 m. The wider bay is locally graded, without changing the landmark or road curve.



Unselected price tags are smaller, 80% opaque, at a consistent 2.5 m height with alternating lateral offsets. The selected tag is hidden. The spec card shows the supplied name/category fallback, a category subtitle only for named cars, and separate Seats, Fuel and Price per day rows.



Services now has lower towers farther behind the signs, a stronger/darker subtitle over the same warm cream title gradient, and chips fixed at bottom centre above the scroll hint. Cards open only on click/tap: Outstation places its desktop card on the left below the headline; the other signs use the right. Phone cards stay below the signboards. Scrolling and outside clicks dismiss them.



Both spurs are continuous 200-segment ribbon meshes following the real main-road tangent. They share the exact asphalt diffuse/roughness/normal textures and metre-based UV tiling with the main road. Feathered junction surfaces, cream edge ribbons and instanced kerbs replace the slabs; small openings in the original kerbs/guard rail leave the junction mouths clear. Glowing arrows remain. Cached SVG textures provide a proper three-spoke steering wheel, peaked cap and mountain pair; sign words are slightly larger. The chauffeur now has a head, uniformed torso, two legs, arms, shoes and a peaked cap beside the open door, with a small low-poly budget.



`scripts/verify-scene-polish.mjs` checks parked bounds/gaps/angles, ring clearance, tags against each other and UI, subtitle rules, spec labels, shared asphalt/continuous geometry, default/hover card closure, opposite-side placement, outside dismissal, chase/skyline views and 390px layout. It also checks SHA-256 snapshots proving all five `src/data/` files are unchanged. `scripts/verify-scene-polish-production.mjs` checks the built site and takes final screenshots. Both pass with zero browser warnings/errors; `npm run build` passes without warnings. No dependencies or model files changed.



Latest captures: `assets/scene-polish-checks/production-fleet-1.png`, `production-fleet-3.png`, `production-fleet-5.png`, `production-services-no-card.png`, `production-services-outstation.png`, `production-scroll-0.75.png`, `production-scroll-1.png`, `production-mobile-fleet.png`, `production-mobile-services.png`, and `production-mobile-services-outstation.png`. Reports: `report.json` and `production-report.json` in the same folder. Earlier Step 5 captures are retained as baseline evidence.





## Small fleet/services polish



The five bays now use one straight, equal-pitch row, sized for at least 1.6 m clear spacing between the largest angled variants. The selected model moves onto the centred forecourt turntable (z = 0), whose halo remains fully within the 16 × 30 m paving. The showcase framing keeps the row clear of the desktop spec card; phone framing includes the whole row. The driving car and its shadow fade with the existing fleet camera blend and return as the showcase ends. Each unselected price tag follows its actual model roof plus 0.4 m. The spec label is now “Price”, with the “per day” caption appearing once.



Service spurs are 4.2 m wide, branch at a clearer angle and end at their signboards; the phone layout uses a shorter lateral span to keep all signs visible. Self-Drive towers are larger and positioned to the left of its sign. The subtitle uses a soft cream pill. Data files, route/scroll mapping, car assets and all other scenes are unchanged.



Validation: `scripts/verify-small-polish.mjs` captures fleet selections 1/3/5 and services at both 1440 × 900 and 390 × 844, checks tag/UI separation and screen bounds, correct selections, and one price caption. It records browser warnings/errors and external requests. Captures and `production-report.json` are in `assets/small-polish-checks/`. `npm run build` passes.





## Step 6: booking and destination



The toll gate is anchored at `landmarks.tollGate.t` (0.70), with two booths/screens, an overhead Egal sign, red X/green arrow signals and striped, animated barriers. Its pricing panel reads every category/rate directly from `src/data/cars.js`. The main car waits before the barrier during the booking showcase. A successful submission raises both arms, changes the signal and drives the car approximately 14 m through the gate, with a small camera push. Scrolling backwards resets the success state and barriers. The existing native scroll ranges and earlier scenes remain intact.



The destination at `landmarks.destination.t` (0.95) has a two-storey glass-front showroom, two material-cloned display cars, warm windows/signage, palms, path lights, a freestanding sign and marked parking. The main car pulls into the bay and remains stopped at scroll 0.95–1.0, with a glowing pin overhead. The existing sky/lamps/skyline still progress to sunset. Repeated geometry is instanced; low-power devices use fewer local palms/path lights. No libraries, downloaded assets or car design changes were added.



`src/data/booking.js` contains confirmation, consent, validation and contact copy. `src/data/brand.js` contains the address, phone, WhatsApp number, hours and five social URLs. Phone/address/WhatsApp/social URLs are explicitly unfinished. The previously supplied working hours are retained; confirm them before launch. Missing contact/social links stay visibly marked or disabled until valid details are supplied. Once configured, the address opens a Google Maps search, the phone opens `tel:`, and socials open their corresponding URLs.



### Connect the booking endpoint



1. Fill `brand.whatsapp` with the real business number including country code, **digits only** (for example the format `91` + a 10-digit number). The checked-in `91XXXXXXXXXX` is a clearly marked placeholder and cannot deliver a WhatsApp request. Fill the other contact fields and all five social URLs.

2. With no endpoint configured, both the green Book now fallback and the outlined WhatsApp button open `https://wa.me/<number>?text=<encoded details>`. The message contains dates, pick-up location, category/name, colour, service, phone and the estimate. The confirmation also tells the user to **send the draft**; opening it alone does not deliver anything. An Open WhatsApp draft link remains available if a browser blocks the initial new tab.

3. To submit directly, copy `.env.example` to `.env.local`, set `VITE_BOOKING_ENDPOINT=https://your-domain.example/api/bookings`, then restart Vite or rebuild. This is a **public URL**, included in the client bundle. Keep mail/CRM/API credentials on the endpoint server, never in `VITE_` variables.

4. The endpoint can be a Vercel serverless function or another JSON-capable service. A Formspree/Google Apps Script integration must accept this JSON contract and permit your site's origin via CORS (including JSON POST preflight). Return a 2xx status only after accepting the request; other responses/timeouts display a retry message and leave the barriers down. The explicit WhatsApp button remains available even when an endpoint is configured.



Example JSON body (no secrets):



```json

{

  "pickup": "2026-11-10",

  "dropoff": "2026-11-13",

  "location": "Airport",

  "carId": "premium-suv",

  "color": "#c0161b",

  "service": "self-drive",

  "phone": "9876543210",

  "estimate": { "days": 3, "rate": 4299, "total": 12897 }

}

```



The frontend validates required fields, local calendar dates, a strictly later drop-off, 10-digit Indian mobile numbers and its hidden website honeypot. The server must independently validate/reject spam and calculate trusted rates; the browser estimate is informational. Final price, deposit and taxes are confirmed by the team. No real availability/payment system is implemented.



### Step 6 validation



- `scripts/verify-step6.mjs`: production screenshots at 1440×900 and 390×844 for booking, inline errors, success/barriers up, destination at 0.95 and 1.0. Exercises selected-car/colour prefill, live estimate, required-field blocking, both WhatsApp paths, reset and card/control separation. Test WhatsApp windows are captured rather than sent.

- `scripts/verify-booking-helper.mjs`: tests the real Vite-served helper on a dedicated dev server, including past/invalid/equal/reversed dates, phone, unknown car and honeypot rejection; verifies JSON POST acceptance and network rejection against a mocked endpoint.

- `scripts/verify-step6-motion.mjs`: inspects the live Three scene for closed/open/reset barriers, drive-through/camera push, wheel rotation, destination parking/stopping and form reset.



Reports and latest screenshots are in `assets/step6-checks/`. `scripts/verify-step6-mobile.mjs` records the final wider phone destination framing, keeping the parked car/pin above the contact sheet. `npm run build` passes; normal desktop/phone/dev browser flows record zero console warnings/errors. A physical iOS/Android keyboard has not been tested; mobile inputs use 16px text, scrollable sheets, focus rings and VisualViewport keyboard-inset handling.



## Step 6 polish

The toll gate now uses two slim charcoal posts and a 0.5 m beam, an orange underside light strip, and a navy/orange-bordered Egal plate with emissive white lettering. Circular red-X/green-arrow signals crossfade with the existing gate progress. The booths have cyan canvas screens, roof overhangs and warm lamps; the existing animated arms are slimmer, striped and fitted with small red lights. Cached SVG silhouette textures replace the pricing-board block icons; rows and right-aligned prices still read the unchanged car data.

The booking form's presentation now has a compact two-column layout and a persistent action footer. At 1440x800 the empty form and validation state fit without inner scrolling; on shorter/phone viewports only the body scrolls while both buttons stay visible. Validation, state, submission, the honeypot and WhatsApp behavior are unchanged. All six data files and src/lib/booking.js are protected by SHA-256 checks in the polish verifier.

The showroom uses charcoal structure, procedural timber cladding, a larger roof overhang with a glowing edge, lit glazing, two visible display cars and a white/orange Egal sign. Short glowing bollards and an entrance light line replace the tall dark parking posts. The map pin follows the actual main car at a lower height, so its tip stays just above the roof rather than over the showroom. Contact copy has a cream pill; social icons use their brand colours, hover treatment and the existing clearly marked/disabled placeholder links.

Only the final sunset interval is intensified: orange horizon, magenta/purple sky, a low sun with a broad soft halo, a warm directional rim light, purple skyline haze and emissive windows. Earlier sky progression, the route, landmark data, car design, scroll coordination and booking behavior are retained. No dependencies or external assets were added.

scripts/verify-step6-polish.mjs checks 1440x800 and 390x844 empty/error/success booking states, the fixed buttons at 1440x600, contact at 0.95 and 1.0, normal console output, card/control/title separation, both WhatsApp paths and the protected-file hashes. Latest captures and report.json are in assets/step6-polish-checks/; previous Step 6 captures remain as baseline evidence. npm run build passes.


## Scene transition cleanup and contact finish

Prop windows are now fleet 0.14-0.41, services 0.39-0.58, booking 0.61-0.79 and contact 0.81-1.0, with 0.02-scroll fades. At zero opacity each entire Three group is `visible=false`; material alpha alone is not used to hide off-scene installations. Shader-output fades preserve emissive lights, material colour animations and 3D text glyph masks. Development landmark markers follow the same gates. Contact remains visible at the terminal scroll position.

Text uses mutually exclusive windows, including road-only handoffs at 0.58-0.61 and 0.79-0.81. Headlines, subtitles, chips and cards cannot overlap between scenes; hidden panels are inert and service cards close when leaving. Fleet's portal-based price tags/drag pad follow its text gate. Booking actions now land at 0.63 (the fully visible booking entry) rather than stopping in the new 0.60 handoff gap. Form validation/submission, the data files and native scroll coordination are unchanged.

The services installation and its spur roads are re-anchored upstream without changing landmark data. Its full sign/tower/hotel/mountain footprint ends approximately 74 m before the toll gate when projected to the road's arc. The contact finish adds glowing bollard caps/halos, warm light pools and showroom illumination, three lit street lamps farther along the road, a broad additional sun halo and a larger orange-outlined welcome board. The scroll hint hides above 0.97.

Validation scripts: `verify-transitions.mjs` records 1440x800 and 390x844 captures at 0.55, 0.58, 0.60, 0.62, 0.65, 0.70, 0.95 and 1.0, checks exclusive HTML, card dismissal and the booking jump. `verify-scene-visibility.mjs` inspects actual Three visibility flags, fade weights, physical service clearance and the three street lamps. Reports/captures are in `assets/transition-checks/`. Pure window tests cover 10,001 scroll positions. The production build and normal browser flows pass without console warnings/errors.


## Per-category fleet assets

`getCarModel(type)` now maps hatchback, sedan, suv, premium-suv and luxury-suv to these files in `public/models/fleet/`:

- `car-hatchback.glb`
- `car-sedan.glb`
- `car-suv.glb`
- `car-premium-suv.glb`
- `car-luxury-suv.glb`

Filename selection is controlled solely by `src/data/fleetModels.js`; set an entry to an optimized filename when that file is ready. Restart the dev server or rebuild after adding/replacing files. At the time of this implementation, **all five fleet files are absent**, including all optimized variants. The app currently displays the hero fallback in every category; these are not five distinct production models. Their individual sizes and total fleet payload cannot yet be measured.

Fleet prefetch is armed only after START and scroll > 0.10. A sequential idle queue then loads/decodes each available file using the already-installed GLTF loader and Meshopt decoder. No variant is mounted with useGLTF during the initial load. A separate loading manager keeps deferred fleet traffic out of the hero loader's progress. Missing assets are skipped without 404 requests; fetch/parse/normalisation failures retain the hero model instead of throwing into React. The showroom continues to reuse the hero.

Static display geometry is centred horizontally, grounded at y=0, aligned using paired headlights/tail lights when available, and uniformly scaled to a maximum 4.3 m length / 2.13 m width before the existing category scaling. Multi-material primitives are supported. Geometry is shared, materials are cloned per car and only exact `BodyPaint` materials receive colour tweens. Parking angle, selection, turntable, controls and rotation are retained. The chase component and both hero GLBs are unchanged (SHA-256 checked).

Validation:

- `scripts/verify-parked-assets.mjs`: grounding/centering/bounds, cached geometry, multi-material primitives and paint isolation without mutating source meshes.
- `scripts/verify-fleet-loader.mjs`: browser-only fixtures route existing hero bytes to the five requested URLs, with one deliberately invalid GLB. Verifies no pre-START / <=0.10 requests, idle loading, four successful paths plus hero fallback, separate paint materials and rotation. No fixture models are saved to public or presented as real variants.
- `scripts/verify-fleet-integration.mjs`: all five selections at 1440x800 and 390x844, tag/UI overlap checks, absent-file request suppression, initial budget and hero file hashes. Current screenshots are explicitly named `fallback-*` in `assets/fleet-integration-checks/`.

Current conservative uncompressed initial asset budget: **2,755,984 bytes (2.76 MB)** including the worker-loaded DejaVu font and cached hero GLB, below 8 MB. The hero fallback GLB is **336,028 bytes**. `assets/fleet-integration-checks/report.json` lists each missing file with `bytes: null` and `totalFleetPayload: null`. Add the real GLBs before final variant screenshots and payload reporting. No dependencies were added.


### Fleet placeholder phase (current)

The five variant GLBs have not been created yet. Do not search for substitutes, generate variants or download models as part of this integration. Model-size reporting and actual variant screenshots are pending those files.

`src/data/fleetModels.js` is now the single filename manifest. `getCarModel(type)` returns its exact `public/models/fleet/car-<name>.glb` path. When an optimized file is ready, change that manifest entry to its filename. Vite checks only these declared files at startup/build, avoiding missing-file requests. Restart Vite or rebuild after adding a model.

Until each file loads successfully, use the existing hero asset with these fleet-only scales: hatchback 0.9, sedan 1.0, SUV 1.05, premium SUV 1.1, luxury SUV 1.15. These replace category scaling only while fallback is active; the hero chase car remains unchanged. Bay spacing accounts for either fallback or real-variant scaling. START plus scroll >0.10 arms the sequential idle queue, with no fleet requests during initial loading. Per-model fetch/parse failures remain silent and retain the fallback; the existing optimized hero cache is reused.
# Measured performance pass

The 2026-10-29 audit, before/after frame timings, production payload, screenshots, changed files and remaining limits are documented in [assets/performance/REPORT.md](assets/performance/REPORT.md).

The approved GLB files are unchanged. Rigid hero parts are batched inside the existing rig, mobile avoids a second world pass for thin glass, scene fades use a single pass, and the sign font loads ahead of its scene instead of at startup. Device DPR caps adapt gradually under sustained load. Hidden tabs pause rendering; reduced-motion and non-WebGL booking fallbacks are supported. No new dependencies were added.

# Cinematic Egal pass

The current opening uses the supplied road-inspired logo, warm ivory presentation, skippable camera reveal and responsive car-local shots. The native scroll journey and existing business flows remain. See [the implementation report, screenshots and measured results](assets/cinematic-checks/REPORT.md).

Sound stays off by default. No ambient audio file has been supplied. To enable a future owned/licensed local track, put it in `public/` and set `brand.ambientAudio` in `src/data/brand.js` to its public-relative path; no missing audio URL is requested while this value is `null`. A vector version of the logo would reduce the current supplied PNG's 1.76 MB payload.

