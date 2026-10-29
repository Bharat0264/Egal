import {Component,useEffect} from 'react'
function Fallback(){useEffect(()=>{location.replace('/simple?reason=webgl')},[]);return <div className="scene-failure" role="alert"><p>3D is unavailable. Opening the Simple view.</p><a href="/simple">Continue in Simple view</a></div>}
export default class WorldBoundary extends Component{state={failed:false};static getDerivedStateFromError(){return{failed:true}}render(){return this.state.failed?<Fallback/>:this.props.children}}
