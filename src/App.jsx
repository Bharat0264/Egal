import {lazy,Suspense,useCallback,useRef,useState,Component} from 'react'
import Loader from './ui/Loader'
import Overlay from './ui/Overlay'
import SoundToggle from './ui/SoundToggle'
import {SelectionProvider,useSelectionActions} from './state/SelectionContext'
import {brand} from './data/brand'
import {track} from './lib/analytics'
const World=lazy(()=>import('./scene/World'))
const canScroll=scroll=>scroll?.el?.isConnected&&scroll.el.clientHeight>0&&scroll.el.scrollHeight>scroll.el.clientHeight
class SceneBoundary extends Component{
 state={failed:false}
 static getDerivedStateFromError(){return{failed:true}}
 componentDidCatch(){location.replace('/simple?reason=scene')}
 render(){return this.state.failed?<div className="scene-failure" role="alert"><p>The 3D experience is unavailable.</p><a href="/simple">Continue in Simple view</a></div>:this.props.children}
}
function Experience(){
 const[started,setStarted]=useState(false),[loadWorld,setLoadWorld]=useState(false),[carReady,setCarReady]=useState(false),[progress,setProgress]=useState(0)
 const transition=useRef({started:false,skip:false}),pendingBooking=useRef(false),{scrollRef,bookService}=useSelectionActions()
 const captureScroll=useCallback(scroll=>{scrollRef.current=scroll;if(pendingBooking.current&&canScroll(scroll)){pendingBooking.current=false;bookService()}},[scrollRef,bookService])
 const handleReady=useCallback(()=>{if(!transition.current.started)setCarReady(true)},[]),handleProgress=useCallback(value=>{if(!transition.current.started)setProgress(value)},[])
 const start=useCallback((skip=false)=>{if(transition.current.started)return;track('start_click');transition.current={started:true,skip};setLoadWorld(true);setStarted(true);window.dispatchEvent(new Event('egal-start'))},[])
 return <><a className="skip-link" href={started?'#journey-content':'#main-content'}>Skip to content</a><h1 className="sr-only">{brand.name} | {brand.tagline}</h1>
  <SceneBoundary>{loadWorld&&<Suspense fallback={started?<p className="world-loading" role="status">Preparing your journey… <a href="/simple">Simple view</a></p>:null}><World started={started} transition={transition} onScrollReady={captureScroll} onCarReady={handleReady} onProgress={handleProgress}/></Suspense>}</SceneBoundary>
  <Overlay scrollRef={scrollRef} started={started} onBook={bookService}/>{!started&&<Loader ready={carReady} progress={progress} onIntent={()=>setLoadWorld(true)} onStart={()=>start()} onSkip={()=>start(true)}/>}<SoundToggle started={started} scrollRef={scrollRef}/>
  {!started&&<button className="primary book" onClick={()=>{start(true);if(canScroll(scrollRef.current))bookService();else pendingBooking.current=true}}>Book Now <span aria-hidden="true">↗</span></button>}
 </>
}
export default function App(){return <SelectionProvider><Experience/></SelectionProvider>}
