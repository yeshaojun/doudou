import http from 'node:http';
import {readFile} from 'node:fs/promises';
const file=new URL('../index.html',import.meta.url),port=Number(process.env.PORT||4173);
const server=http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(!['/','/index.html'].includes(path)){res.writeHead(404);res.end('Not found');return;}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 try{const html=await readFile(file);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?null:html);}catch{res.writeHead(503);res.end('Run npm run build first.');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Doudou preview: http://127.0.0.1:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
