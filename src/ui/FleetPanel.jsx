import { cars, carColors, fleetCopy, formatPrice } from '../data/cars'
import { useSelection } from '../state/SelectionContext'
import {useLayoutEffect,useRef} from 'react'
export default function FleetPanel() {
  const { fleetIndex, colors, selectCar, recolor, bookCar,selectionRef,fleetViewRef,readSelection,interaction } = useSelection(),car=cars[selectionRef.current.index],root=useRef()
  useLayoutEffect(()=>{const update=()=>{const i=selectionRef.current.index,c=cars[i],el=root.current;if(!el)return;el.querySelector('h2').textContent=c.name||c.category;const subtitle=el.querySelector('.spec-heading p');subtitle.textContent=c.category;subtitle.hidden=!c.name;el.querySelector('.spec-count').textContent=`0${i+1} / 05`;const values=el.querySelectorAll('.car-specs dd');values[0].textContent=c.seats;values[1].textContent=c.fuel;values[2].firstChild.textContent=formatPrice(c.price)+' ';for(const button of el.querySelectorAll('.car-colors button'))button.setAttribute('aria-pressed',String(button.dataset.color===readSelection().colors[i]))};fleetViewRef.current=update;update();return()=>{fleetViewRef.current=null}},[colors,fleetIndex,selectionRef,fleetViewRef,readSelection])
  return <>
    <aside ref={root} className="scene-card fleet-spec" aria-label="Selected car specifications">
      <div className="spec-heading"><div><h2>{car.name || car.category}</h2><p hidden={!car.name}>{car.category}</p></div><span className="spec-count">0{selectionRef.current.index+1} / 05</span></div>
      <div className="car-colors" aria-label="Body colour">{carColors.map((color,i)=><button key={color} data-color={color} aria-label={`Car colour ${i+1}`} aria-pressed={colors[selectionRef.current.index]===color} style={{background:color}} onClick={()=>recolor(selectionRef.current.index,color)} />)}</div>
      <dl className="car-specs"><div><dt>{fleetCopy.seats}</dt><dd>{car.seats}</dd></div><div><dt>Fuel</dt><dd>{car.fuel}</dd></div><div><dt>Price</dt><dd>{formatPrice(car.price)} <small>{fleetCopy.perDay}</small></dd></div></dl>
      <button className="primary scene-book" onClick={bookCar}>{fleetCopy.book} <span aria-hidden="true">↗</span></button>
    </aside>
    <div className="fleet-navigation"><button aria-label={fleetCopy.previous} onClick={()=>selectCar(selectionRef.current.index-1)}>‹</button><span role="slider" tabIndex={0} aria-label="Rotate selected car" aria-valuemin={-180} aria-valuemax={180} aria-valuenow={0} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();interaction.current.yaw+=e.key==='ArrowLeft'?-.2:.2;interaction.current.lastInput=performance.now();e.currentTarget.setAttribute('aria-valuenow',Math.round(interaction.current.yaw*180/Math.PI))}}}>{fleetCopy.hint}</span><button aria-label={fleetCopy.next} onClick={()=>selectCar(selectionRef.current.index+1)}>›</button></div>
  </>
}
