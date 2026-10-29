import {createServer} from 'vite'
const provider=process.argv[2]||'umami',port=Number(process.argv[3]||5175)
process.env.VITE_ANALYTICS_ID=provider==='umami'?'00000000-0000-4000-8000-000000000000':'analytics.example'
process.env.VITE_ANALYTICS_PROVIDER=provider
process.env.VITE_ANALYTICS_SCRIPT_URL='https://analytics.example/script.js'
const server=await createServer({cacheDir:`node_modules/.vite-analytics-${provider}`,server:{port,host:'127.0.0.1'}})
await server.listen();console.log(`Analytics fixture ${provider}: http://127.0.0.1:${port}`)
