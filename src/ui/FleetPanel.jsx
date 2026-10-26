import { cars } from '../data/cars'
export default function FleetPanel() { return <div className="placeholder">Fleet preview · {cars.length} car categories · from ₹{cars[0].price.toLocaleString('en-IN')}/day</div> }
