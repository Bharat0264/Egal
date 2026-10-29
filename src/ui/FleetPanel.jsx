import { cars, carColors, fleetCopy, formatPrice } from '../data/cars'
import { useSelection } from '../state/SelectionContext'
export default function FleetPanel() {
  const { fleetIndex, colors, selectCar, recolor, bookCar } = useSelection(), car = cars[fleetIndex]
  return <>
    <aside className="scene-card fleet-spec" aria-label="Selected car specifications">
      <div className="spec-heading"><div><h2>{car.name || car.category}</h2>{car.name && <p>{car.category}</p>}</div><span className="spec-count">0{fleetIndex+1} / 05</span></div>
      <div className="car-colors" aria-label="Body colour">{carColors.map((color,i)=><button key={color} aria-label={`Car colour ${i+1}`} aria-pressed={colors[fleetIndex]===color} style={{background:color}} onClick={()=>recolor(fleetIndex,color)} />)}</div>
      <dl className="car-specs"><div><dt>{fleetCopy.seats}</dt><dd>{car.seats}</dd></div><div><dt>Fuel</dt><dd>{car.fuel}</dd></div><div><dt>Price</dt><dd>{formatPrice(car.price)} <small>{fleetCopy.perDay}</small></dd></div></dl>
      <button className="primary scene-book" onClick={bookCar}>{fleetCopy.book} <span aria-hidden="true">↗</span></button>
    </aside>
    <div className="fleet-navigation"><button aria-label={fleetCopy.previous} onClick={()=>selectCar(fleetIndex-1)}>‹</button><span>{fleetCopy.hint}</span><button aria-label={fleetCopy.next} onClick={()=>selectCar(fleetIndex+1)}>›</button></div>
  </>
}
