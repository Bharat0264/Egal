import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {render,noScript,routes,metadata,site} from '../.prerender/entry-server.js'
const template=await fs.readFile('dist/index.html','utf8'),escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
for(const route of routes){
 const meta=metadata(route),image=`${site}/social-placeholder.png`
 const head=`<title>${escape(meta.title)}</title><meta name="description" content="${escape(meta.description)}"><link rel="canonical" href="${escape(meta.canonical)}"><meta property="og:title" content="${escape(meta.title)}"><meta property="og:description" content="${escape(meta.description)}"><meta property="og:type" content="website"><meta property="og:url" content="${escape(meta.canonical)}"><meta property="og:image" content="${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Egal — Drive your journey. Social image placeholder."><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(meta.title)}"><meta name="twitter:description" content="${escape(meta.description)}"><meta name="twitter:image" content="${image}"><meta name="theme-color" content="#FFF7EC">`+meta.jsonld.map(json=>`<script type="application/ld+json">${JSON.stringify(json).replaceAll('<','\\u003c')}</script>`).join('')
 let html=template.replace(/<title>[\s\S]*?<\/title>/,'').replace(/<meta\s+(?:name="(?:description|theme-color)"|property="og:[^"]+")[^>]*>/g,'').replace('</head>',head+'</head>').replace(/<noscript>[\s\S]*?<\/noscript>/,'').replace('<div id="root"></div>',`<div id="root" data-prerendered="true">${render(route)}</div>`)
 if(route==='/')html=html.replace('</body>',`<noscript><style>#root{display:none}html,body{height:auto;overflow:auto}</style>${noScript()}</noscript></body>`)
 const target=route==='/'?'dist/index.html':`dist${route}/index.html`;await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,html)
}
await fs.writeFile('dist/robots.txt',`User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`)
await fs.writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(route=>`<url><loc>${site}${route==='/'?'/':route}</loc></url>`).join('')}</urlset>`)
async function versionModels(folder=''){
 for(const entry of await fs.readdir(`public/models/${folder}`,{withFileTypes:true})){const file=folder+entry.name;if(entry.isDirectory()){await versionModels(file+'/');continue}if(!file.endsWith('.glb'))continue;const bytes=await fs.readFile('public/models/'+file),hash=createHash('sha256').update(bytes).digest('hex').slice(0,16),target=`dist/models/versioned/${hash}/${file}`;await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes)}
}
await versionModels()
console.log(`Prerendered ${routes.join(', ')}; generated crawler files and immutable model paths. Canonical origin: ${site}`)
