import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {createHash,createHmac,timingSafeEqual,randomBytes} from 'node:crypto';
import {createMemoryStore} from './memory-store.mjs';
import worker from '../dist/server/index.js';
const values=await readFile(new URL('../.dev.vars',import.meta.url),'utf8');
const env={LOCAL_DEV:'1',MEMORY_STORE:createMemoryStore(new URL('../.runtime/memory.json',import.meta.url).pathname)};
for(const line of values.split(/\r?\n/)){
  if(!line||line.startsWith('#'))continue;
  const idx=line.indexOf('=');if(idx>0)env[line.slice(0,idx)]=line.slice(idx+1);
}
const memoryCleanup=setInterval(()=>env.MEMORY_STORE.get().catch(()=>{}),30*60*1000);memoryCleanup.unref();
env.MEMORY_STORE.get().catch(()=>{});
const port=Number(process.env.PORT||4173);
const authAttempts=new Map();
const secureCompare=(a,b)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
function sessionValid(cookie){
  if(!cookie||!env.APP_SESSION_SECRET)return false;
  const [payload,signature]=cookie.split('.');if(!payload||!signature)return false;
  const expected=createHmac('sha256',env.APP_SESSION_SECRET).update(payload).digest('base64url');
  if(!secureCompare(signature,expected))return false;
  try{const data=JSON.parse(Buffer.from(payload,'base64url'));return data.expires>Date.now()&&data.expires<Date.now()+13*3600000;}catch{return false;}
}
function makeCookie(secure){
  const payload=Buffer.from(JSON.stringify({expires:Date.now()+12*3600000,nonce:randomBytes(12).toString('hex')})).toString('base64url');
  const signature=createHmac('sha256',env.APP_SESSION_SECRET).update(payload).digest('base64url');
  return `nuomi_access=${payload}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200${secure?'; Secure':''}`;
}
async function accessPage(res,failed=false){
  let html=await readFile(new URL('./access.html',import.meta.url),'utf8');
  html=html.replace('{{MESSAGE}}',failed?'口令不正确，检查一下再试试。':'这是一个只属于受邀朋友的小小世界。');
  res.writeHead(failed?401:200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(html);
}
const server=http.createServer(async(req,res)=>{
  const abort=new AbortController();req.on('aborted',()=>abort.abort());res.on('close',()=>{if(!res.writableFinished)abort.abort();});
  try{
    const isLoopbackHost=/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host||'');
    const secure=!isLoopbackHost&&req.headers['x-forwarded-proto']==='https';
    const host=req.headers.host||`127.0.0.1:${port}`;
    if(!/^[a-zA-Z0-9.:[\]-]+$/.test(host)){res.writeHead(400);res.end();return;}
    const origin=`${secure?'https':'http'}://${host}`;
    if(env.ACCESS_PASSWORD){
      if(!env.APP_SESSION_SECRET)throw new Error('Session secret is required for access protection.');
      const cookies=Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split(/=(.*)/s)).filter(x=>x.length>=2).map(x=>[x[0],x[1]]));
      if(req.url==='/_access/login'&&req.method==='POST'){
        if(req.headers.origin&&req.headers.origin!==origin){res.writeHead(403);res.end();return;}
        const ip=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'local').toString().split(',')[0];
        const now=Date.now(),previous=authAttempts.get(ip)||{start:now,count:0};
        if(now-previous.start>60000){previous.start=now;previous.count=0;}previous.count++;authAttempts.set(ip,previous);
        if(authAttempts.size>500)for(const [k,v]of authAttempts)if(now-v.start>60000)authAttempts.delete(k);
        if(previous.count>8){res.writeHead(429,{'Content-Type':'text/plain; charset=utf-8','Retry-After':'60'});res.end('尝试有点频繁，请一分钟后再来。');return;}
        let body='';for await(const chunk of req){body+=chunk.toString();if(body.length>2048){res.writeHead(413);res.end();return;}}
        if(secureCompare(new URLSearchParams(body).get('password')||'',env.ACCESS_PASSWORD)){
          res.writeHead(303,{'Set-Cookie':makeCookie(secure),Location:'/', 'Cache-Control':'no-store'});res.end();return;
        }
        await accessPage(res,true);return;
      }
      if(!sessionValid(cookies.nuomi_access)){
        if(req.url?.startsWith('/api/')){res.writeHead(401,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:{code:'access_required',message:'请先输入访问口令。'}}));return;}
        await accessPage(res);return;
      }
    }
    const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
    const init={method:req.method,headers,signal:abort.signal};
    if(!['GET','HEAD'].includes(req.method)){init.body=Readable.toWeb(req);init.duplex='half';}
    const request=new Request(`${origin}${req.url}`,init);
    const response=await worker.fetch(request,env,{});
    res.writeHead(response.status,Object.fromEntries(response.headers));
    if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
  }catch(error){if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{code:'local_error',message:'本地服务暂时没准备好，请稍后再试。'}}));}
});
server.listen(port,'127.0.0.1',()=>console.log(`Nuomi local server: http://127.0.0.1:${port}`));
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>server.close(()=>process.exit(0)));
