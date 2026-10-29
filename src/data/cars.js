import { fleetModels } from './fleetModels.js'

export const cars = [
  { id: 'hatchback', category: 'Hatchback', price: 2199, seats: 5, fuel: 'Petrol', scale: 0.82, color: '#ffffff' },
  { id: 'sedan', category: 'Sedan', price: 2799, seats: 5, fuel: 'Petrol', scale: 0.90, color: '#1e4fb8' },
  { id: 'suv', category: 'SUV', price: 3499, seats: 5, fuel: 'Diesel', scale: 1, color: '#111111' },
  { id: 'premium-suv', category: 'Premium SUV', price: 4299, seats: 5, fuel: 'Diesel', scale: 1.06, color: '#c0161b' },
  { id: 'luxury-suv', category: 'Luxury SUV', name: 'Toyota Fortuner', price: 4999, seats: 7, fuel: 'Diesel', scale: 1.12, color: '#8a8d91' },
]
export const carColors = ['#ffffff','#111111','#1e4fb8','#c0161b','#8a8d91']
export const fleetCopy = { previous: 'Previous car', next: 'Next car', book: 'Book this car', perDay: 'per day', seats: 'Seats', hint: 'Drag the featured car to explore', selected: 'Your selected ride', change: 'Change car' }
export const formatPrice = price => `₹${price.toLocaleString('en-IN')}`

export function getHeroCarModel() {
  return __EGAL_ASSETS__.model ? modelUrl(__EGAL_ASSETS__.model) : null
}
function modelUrl(file){const version=__EGAL_ASSETS__.versions?.[file];return `${import.meta.env.BASE_URL}models/${version?`versioned/${version}/`:''}${file}`}
export function getCarModel(type) {
  const filename = fleetModels[type]?.file
  return filename ? modelUrl(`fleet/${filename}`) : getHeroCarModel()
}
export const hasFleetModel = type => Boolean(__EGAL_ASSETS__.fleet?.[type])
