import { fileURLToPath } from 'node:url'
import { existsSync, statSync,readFileSync } from 'node:fs'
import {createHash} from 'node:crypto'
import { defineConfig,loadEnv } from 'vite'
import {createBookingHandler} from './api/booking.js'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fleetModels } from './src/data/fleetModels.js'

// Fiber 9 still constructs Clock. Adapt only that call to Three's supported
// Timer API; keep its mutable clock interface used by the render loop.
const fiberTimerAdapter = `
class FiberTimer {
  constructor() {
    this.timer = new THREE.Timer();
    this.autoStart = true;
    this.running = false;
    this.elapsedTime = 0;
    this.startTime = 0;
    this.oldTime = 0;
  }
  start() {
    this.timer.reset();
    this.startTime = this.oldTime = performance.now();
    this.elapsedTime = 0;
    this.running = true;
  }
  stop() {
    this.getDelta();
    this.running = false;
    this.autoStart = false;
  }
  getDelta() {
    if (this.autoStart && !this.running) { this.start(); return 0; }
    if (!this.running) return 0;
    this.timer.update();
    const delta = this.timer.getDelta();
    this.elapsedTime += delta;
    this.oldTime = performance.now();
    return delta;
  }
  getElapsedTime() { this.getDelta(); return this.elapsedTime; }
}
`

function fiberTimerCompatibility() {
  return {
    name: 'fiber-timer-compatibility',
    transform(code, id) {
      if (!/[/\\]@react-three[/\\]fiber[/\\]dist[/\\]events-.*\.esm\.js$/.test(id)) return null
      if (!code.includes('new THREE.Clock()')) return null
      return { code: fiberTimerAdapter + code.replace('new THREE.Clock()', 'new FiberTimer()'), map: null }
    },
  }
}

function pmremPrecisionCompatibility() {
  return {
    name: 'pmrem-angle-precision',
    transform(code, id) {
      if (!/[/\\]three[/\\]src[/\\]extras[/\\]PMREMGenerator\.js$/.test(id)) return null
      const sample = 'float t2 = r * sin(phi);'
      if (!code.includes(sample)) return null
      // Axis-aligned GGX samples theoretically have zero sine/cosine. Snap
      // sub-float residuals to zero before ANGLE folds cube-UV expressions.
      // This fixes X4122 precision warnings without disabling shader diagnostics.
      return { code: code.replace(sample, `${sample}
        t1 = abs(t1) < 1e-7 ? 0.0 : t1;
        t2 = abs(t2) < 1e-7 ? 0.0 : t2;`), map: null }
    },
  }
}

function carAsset() {
  const original = fileURLToPath(new URL('./public/models/car.glb', import.meta.url))
  const optimized = fileURLToPath(new URL('./public/models/car.opt.glb', import.meta.url))
  if (!existsSync(original)) return null
  // A regenerated source must never silently use an older optimised variant.
  return existsSync(optimized) && statSync(optimized).mtimeMs >= statSync(original).mtimeMs
    ? 'car.opt.glb' : 'car.glb'
}

// Drei's contact blur quad is created outside the scene at world origin. A
// translated/moving shadow camera misses it (including a plane just above y=0).
// Align only that private blur quad to its camera; capture and materials stay intact.
function contactShadowCompatibility() {
  return {
    name: 'contact-shadow-local-blur',
    transform(code, id) {
      if (!/[/\\]@react-three[/\\]drei[/\\]core[/\\]ContactShadows\.js$/.test(id)) return null
      const marker = 'const blurShadows = blur => {'
      if (!code.includes(marker)) return null
      return { code: code.replace(marker, `${marker}
        shadowCamera.current.updateWorldMatrix(true, false);
        shadowCamera.current.getWorldPosition(blurPlane.position);
        blurPlane.position.addScaledVector(shadowCamera.current.getWorldDirection(new THREE.Vector3()), 0.01);
        shadowCamera.current.getWorldQuaternion(blurPlane.quaternion);
        blurPlane.rotateX(-Math.PI / 2);
        blurPlane.updateMatrixWorld(true);
      `), map: null }
    },
  }
}

function fleetAssets() {
  return Object.fromEntries(Object.entries(fleetModels).map(([type,{file}])=>[
    type,existsSync(fileURLToPath(new URL(`./public/models/fleet/${file}`,import.meta.url)))?file:null,
  ]))
}
function modelVersions(){const files=[carAsset(),...Object.values(fleetAssets()).map(file=>file&&`fleet/${file}`)].filter(Boolean);return Object.fromEntries(files.map(file=>{const bytes=readFileSync(fileURLToPath(new URL(`./public/models/${file}`,import.meta.url)));return[file,createHash('sha256').update(bytes).digest('hex').slice(0,16)]}))}
function audioAssets(){return Object.fromEntries(['ambient','engine'].map(type=>[type,['mp3','ogg','wav'].map(ext=>`${type}.${ext}`).find(file=>existsSync(fileURLToPath(new URL(`./public/audio/${file}`,import.meta.url))))||null]))}
function versionedModels(){const versions=modelVersions();return{name:'versioned-models',configureServer(server){server.middlewares.use((req,_res,next)=>{const path=(req.url||'').split('?')[0];for(const[file,hash]of Object.entries(versions))if(path===`/models/versioned/${hash}/${file}`){req.url=`/models/${file}`;break}next()})}}}
function bookingDev(env){return{name:'local-booking-api',configureServer(server){const handler=createBookingHandler({env});server.middlewares.use('/api/booking',(req,res)=>handler(req,res))}}}

export default defineConfig(({mode})=>{
 const values=loadEnv(mode,process.cwd(),'')
 const serverEnv={RESEND_API_KEY:values.RESEND_API_KEY,BOOKING_TO_EMAIL:values.BOOKING_TO_EMAIL,BOOKING_FROM_EMAIL:values.BOOKING_FROM_EMAIL}
 return {
  // Checked at dev-server startup/build time: absent optional assets never
  // cause deliberate 404 requests. Restart Vite after adding the real files.
  define: {
    __EGAL_ASSETS__: JSON.stringify({
      model: carAsset(),
      fleet: fleetAssets(),
      versions:modelVersions(),audio:audioAssets(),
      logo: existsSync(fileURLToPath(new URL('./public/images/egal-logo.png', import.meta.url))),
    }),
  },
  plugins: [fiberTimerCompatibility(), pmremPrecisionCompatibility(), contactShadowCompatibility(),versionedModels(),bookingDev(serverEnv), react(), tailwindcss()],
  resolve: {
    // Use the equivalent source entry so Three can be split at module boundaries.
    alias: [{ find: /^three$/, replacement: fileURLToPath(new URL('./node_modules/three/src/Three.js', import.meta.url)) }],
  },
  optimizeDeps: { rolldownOptions: { plugins: [fiberTimerCompatibility(), pmremPrecisionCompatibility(), contactShadowCompatibility()] } },
  build: {
    // Keep Three's mutually dependent math modules in one evaluated chunk.
    // Size-based partitioning can initialize Matrix4 before Vector3 in production.
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[/\\]three[/\\]/, priority: 20 },
            { name: 'webgl', test: /node_modules[/\\](@react-three|three-stdlib|@pmndrs|troika|maath|meshline)/, priority: 15 },
            { name: 'react-vendor', test: /node_modules[/\\](react|react-dom|scheduler)[/\\]/, priority: 30 },
          ],
        },
      },
    },
  },
 }
})
