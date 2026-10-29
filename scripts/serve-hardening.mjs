import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import {gzipSync} from 'node:zlib'
import productionBooking,{createBookingHandler} from '../api/booking.js'
const booking=process.env.EGAL_TEST_EMAIL==='1'?createBookingHandler({env:{RESEND_API_KEY:'fixture-key',BOOKING_TO_EMAIL:'owner@example.invalid',BOOKING_FROM_EMAIL:'sender@example.invalid'},fetchImpl:async()=>({ok:true})}):productionBooking
const root=path.resolve('dist'),types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.ttf':'font/ttf','.xml':'application/xml','.txt':'text/plain','.webmanifest':'application/manifest+json'}
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost')
 if(url.pathname==='/api/booking')return booking(req,res)
 let target=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403);return res.end()}
 try{if((await fs.stat(target)).isDirectory())target=path.join(target,'index.html');const body=await fs.readFile(target),type=types[path.extname(target)]||'application/octet-stream';res.setHeader('Content-Type',type);res.setHeader('Cache-Control',/[/\\](assets|versioned)[/\\]/.test(target)?'public,max-age=31536000,immutable':'no-cache');if(/text|javascript|json|xml/.test(type)&&req.headers['accept-encoding']?.includes('gzip')){res.setHeader('Content-Encoding','gzip');res.end(gzipSync(body))}else res.end(body)}catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found')}
}).listen(4180,'127.0.0.1',()=>console.log('Production-hardening test server: http://localhost:4180'))
