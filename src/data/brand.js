import {cars} from './cars.js'
export const brand = {
  name: 'Egal', tagline: 'Drive your journey.',
  colors: { orange: '#E87D32', navy: '#131B4B', cream: '#FFF7EC' },
  logo: 'images/egal-logo.webp', ambientAudio: null,
  url: import.meta.env?.VITE_SITE_URL || 'https://egal.example',
  openingHours: ['Mo-Su 09:00-21:00'],
  priceRange: `INR ${Math.min(...cars.map(car=>car.price))}-${Math.max(...cars.map(car=>car.price))}/day`,
  phone: '+91XXXXXXXXXX', whatsapp: '91XXXXXXXXXX', address: '[TO BE FILLED: business address]',
  hours: 'Mon - Sun | 9:00 AM - 9:00 PM',
  socials: { instagram: '', youtube: '', facebook: '', linkedin: '', x: '' },
}
// Replace the clearly marked contact placeholders and add all five social URLs before launch.
// WhatsApp must contain the country code and digits only, without + or spaces.
