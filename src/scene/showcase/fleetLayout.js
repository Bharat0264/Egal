import { cars } from '../../data/cars'
import { fleetModels } from '../../data/fleetModels'

export const PARKED_YAW = -Math.PI / 2 + Math.PI / 9
export const ROW_X = 4
export const TABLE_X = -3
export const TABLE_Z = 0
export const TABLE_RADIUS = 3.4
export const BAY_WIDTH = 16
export const BAY_LENGTH = 30
export const PARKING_GAP = 1.6
// Normalised model length/width, projected onto the row axis at its 20° angle.
export const rowWidths = cars.map(car => (4.3 * Math.abs(Math.cos(PARKED_YAW)) + 2.13 * Math.abs(Math.sin(PARKED_YAW))) * Math.max(car.scale,fleetModels[car.id].fallbackScale))
// Equal bay pitch leaves at least 1.6 m even between the largest variants.
export const BAY_PITCH = Math.max(...rowWidths) + PARKING_GAP
export const rowZ = cars.map((_, index) => (index - (cars.length - 1) / 2) * BAY_PITCH)
export const bayDividers = Array.from({length: cars.length + 1}, (_, i) => (i - cars.length / 2) * BAY_PITCH)
