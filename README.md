# Egal — Step 2 foundation

A local, scroll-driven car rental website foundation built with Vite, React (JavaScript/JSX), Three.js, React Three Fiber, drei, GSAP, Howler and Tailwind CSS v4. Placeholder geometry only: the road and chase camera are temporary, and no final models, textures, audio or booking backend are included.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
npm run build
npm run preview
```

Open the URL printed by Vite. Click START, then scroll or swipe through the six-page journey. Book Now scrolls to the booking section; the Egal wordmark returns to the beginning. Sound starts muted and controls Howler globally; there are no audio files yet. With no external assets, useProgress legitimately completes immediately at 100%.

## Structure

```text
public/
  models/.gitkeep
  audio/.gitkeep
src/
  data/brand.js, cars.js, sections.js
  scene/World.jsx, CameraRig.jsx, Road.jsx, Car.jsx
  ui/Loader.jsx, Overlay.jsx, SoundToggle.jsx
     FleetPanel.jsx, BookingForm.jsx, ContactCard.jsx
  App.jsx
  main.jsx
  index.css
index.html
vite.config.js
```

Brand colours are CSS variables. Data is centralised in src/data. Phone and address are explicitly placeholders and must be replaced before launch. Visual references remain in ../references, outside the app bundle.

ScrollControls supplies the damped offset shared by the car, camera and overlay. CameraRig synchronises the native scroll fraction before damping each frame, avoiding stale scroll event connections in the current dependency combination. Camera movement uses frame-rate-independent interpolation. GSAP handles the overlay entrance and title updates without React renders on every frame.

## Verification and known limitations

- Production build passes.
- Vite development server serves the application successfully.
- Browser checks: loader at 100%, START, rendered road/car, scrolling and changing titles, Book Now navigation, contact endpoint and sound button state.
- Responsive layout inspected at 375px and 1440px.
- No application runtime errors observed. Current React Three Fiber creates a Three.Clock, which latest Three.js deprecates in favour of Timer. This produces an upstream console warning; it is not suppressed. The zero-console-warnings acceptance criterion is therefore not fully met with latest stable dependencies.
- Production build reports large Three.js/vendor chunks. Bundle optimisation is a next-step task; chunk warnings are retained.
- Fleet, booking and contact are labelled placeholders. Booking does not submit data. No localStorage or application server code.
- SEO and noscript content included. No fabricated production URL or social image.

## Next steps

- [ ] Prepare optimised 3D car, coast and city assets and textures.
- [ ] Design final road and camera path with sunrise-to-sunset lighting.
- [ ] Add fleet selection, colours and vehicle interaction.
- [ ] Implement booking validation and approved booking integration.
- [ ] Add licensed audio and gesture-initiated playback.
- [ ] Optimise bundles, geometry, textures, draw calls and mobile frame rate.
- [ ] Add reduced-motion alternatives, WebGL fallback and broader accessibility QA.
- [ ] Replace business placeholders and complete production SEO.
- [ ] Recheck dependency Clock deprecation after upstream updates.
