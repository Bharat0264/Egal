import assert from 'node:assert/strict'
import {CatmullRomCurve3,Vector3} from 'three'
import {createTerrainSurface} from '../src/scene/world/terrainSurface.js'
import {coastalRockGeometry,rockBottom} from '../src/scene/world/rockGeometry.js'
// Tight bends exercise the failure mode of the old wide offset ribbon.
const curve=new CatmullRomCurve3([new Vector3(0,0,60),new Vector3(0,0,0),new Vector3(-7,0,-30),new Vector3(7,0,-62),new Vector3(-7,0,-95),new Vector3(0,0,-128),new Vector3(12,0,-166),new Vector3(12,0,-290)])
const surface=createTerrainSurface(curve)
let maximum=-Infinity,minimum=Infinity
for(let i=0;i<=1200;i++){
 const p=curve.getPointAt(i/1200),t=curve.getTangentAt(i/1200),right=new Vector3(-t.z,0,t.x).normalize()
 for(const side of[-2.6,0,2.6]){const q=p.clone().addScaledVector(right,side);assert.ok(Math.abs(surface.height(q.x,q.z)+.08)<1e-6,'Road footprint stays below asphalt')}
 const water=p.clone().addScaledVector(right,24);assert.ok(surface.height(water.x,water.z)<-2.25,'Shore descends below the sea')
}
for(let x=-180;x<=100;x+=2)for(let z=-345;z<=105;z+=2){const h=surface.height(x,z);assert.ok(Number.isFinite(h));maximum=Math.max(maximum,h);minimum=Math.min(minimum,h);assert.ok(Math.abs(h-surface.height(x+.01,z))<.03,'No abrupt graded height steps')}
const graded=createTerrainSurface(curve,[{x:-15,z:-80,rx:1,rz:0,fx:0,fz:1,minX:-9,maxX:9,minZ:-17,maxZ:17,feather:7}]);assert.equal(graded.height(-15,-80),-.08)
const rock=coastalRockGeometry(),scale=[1.4,1.2,1.7],rotation=[.15,2,.08],bottom=rockBottom(rock,scale,rotation),ground=-1.7,centre=ground-bottom-.18;assert.ok(Math.abs((centre+bottom)-ground+.18)<1e-8)
assert.equal(rock.attributes.position.count/3,80);rock.dispose()
console.log(`PASS continuous terrain, road clearance at 1,201 curve samples, submerged shore, feathered reserve, finite heights ${minimum.toFixed(2)}–${maximum.toFixed(2)}m and embedded rotated rock bases.`)
