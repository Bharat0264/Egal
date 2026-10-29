// Single source for fleet filenames and temporary hero-fallback sizes.
// Add each GLB here as it becomes ready, then restart Vite or rebuild.
export const fleetModels = {
  hatchback: { file: 'car-hatchback.glb', fallbackScale: 0.9 },
  sedan: { file: 'car-sedan.glb', fallbackScale: 1.0 },
  suv: { file: 'car-suv.glb', fallbackScale: 1.05 },
  'premium-suv': { file: 'car-premium-suv.glb', fallbackScale: 1.1 },
  'luxury-suv': { file: 'car-luxury-suv.glb', fallbackScale: 1.15 },
}
