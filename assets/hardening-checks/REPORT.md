# Production hardening evidence

See the current [implementation report](../../docs/EGAL_IMPLEMENTATION_REPORT.md), [technical audit](../../docs/EGAL_TECHNICAL_AUDIT.md) and [performance report](../../docs/EGAL_PERFORMANCE_REPORT.md).

- `browser.json`: 390/768/1440 journey, Simple view, booking and no-JavaScript checks.
- `edges.json`: pending-model START, payload resources, date rollover, emulated keyboard, low hardware, hidden/offscreen loop and failure paths.
- `analytics.json`: intercepted tracker adapters, PII scrubbing, DNT and silent missing audio.
- `bundle-sizes.json`: exact current chunks and Lighthouse summary.
- `runtime.json`: live frame pacing/draw calls, adaptive decline, interaction and reverse-journey GPU resource checks.
- `lighthouse-*.report.html/json`: production mobile lab audits.
- `opening-*.png`, `scene-<width>-<scroll>.png`, `simple-*.png`: actual browser captures.
- `blender-audit.json`, `blender-preview.png`: actual live Blender inventory and Cycles render. The prior default session was saved separately before opening the approved source.

Mocked email/analytics are explicitly test fixtures. They are never the production handler's success behavior. No real email was sent, no tracker was configured in the production build, and no replacement car was generated.
