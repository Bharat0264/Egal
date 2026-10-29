# Isolated vehicle verification

Saved scene: `C:/CAR/egal/assets/car-studio.blend`

Backup before this iteration: `C:/CAR/egal/assets/car-studio-before-isolation-20261027-215939.blend`

## Render isolation

- Cycles Film Transparent is enabled; output is RGBA PNG.
- `Studio_Floor`, `RoadLine_0`, `RoadLine_1`, `Distant_Ridge`, `Sun_Disc`, `RoofRail_L`, and `RoofRail_R` are hidden from rendering.
- The two 70 m `RoadLine` meshes were the long rod-like objects outside the car.
- Lighting and useful cameras remain functional.
- All three final images were rendered and visually inspected. Their four corner alpha values are exactly zero, and the complete vehicle lies inside the frame.

| Image | Resolution | Vehicle alpha bounds, bottom-left origin |
|---|---|---|
| hero.png | 1600 x 1067 | 135, 157 to 1343, 770 |
| front.png | 1400 x 934 | 211, 145 to 1252, 692 |
| rear.png | 1400 x 934 | 138, 144 to 1142, 672 |

## Geometry

- The shell was rebuilt with quad end panels before cutting physical lamp and intake apertures.
- Headlamps have recessed housings, separate thick clear lenses, optical projectors and internal light guides.
- Rear lamps have housings, thick red lenses, internal guides and quarter-panel extensions.
- The diffuser is closed and continuous; its three strakes were unioned into the shell.
- Exhaust outlets have closed metal walls, bevels and recessed dark cavities.
- Glass panels have physical thickness, and the rim barrel boundaries are closed.
- Exterior overlay arch strips were removed; the openings belong to the actual body.
- Every visible mesh was checked: zero loose vertices and zero non-manifold edges.
- All visible mesh vertices remain within the vehicle envelope; no visible helper meshes or outlying rods remain.
- Final visible vehicle geometry: 59,860 triangles, including physical lens, reflector and cavity geometry.
- Body, front bumper and rear diffuser have zero measured mirrored-surface error.
- Paired headlamps, taillamps, exhausts and mirrors were verified against mirrored geometry.
- The four tyre bottoms remain at z = 0.
- The saved active camera is `HERO_CAMERA`; `FRONT_CAMERA` and `REAR_CAMERA` are also present, all using 60 mm lenses.

The checks above verify topology, isolation, framing and symmetry. They are not a certification of photorealism or exact reference fidelity.
