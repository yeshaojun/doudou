import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cleanMemory,memoryFact,suggestMemories,memoryPrompt,memoryOperation} from '../worker/memory-policy.js';
import {createMemoryStore} from '../scripts/memory-store.mjs';
import {createHandler} from '../worker/index.js';
const now=Date.now();
const headers={'Content-Type':'application/json','X-Nuomi-Client':'1','X-Parent-Preview':'1'};
const request=(path,body)=>new Request('http://localhost'+path,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})});
async function fixture(fn){const dir=await mkdtemp(join(tmpdir(),'doudou-memory-'));try{await fn(createMemoryStore(join(dir,'memory.json')),dir);}finally{await rm(dir,{recursive:true,force:true});}}
test('preferences are proposed only for clear safe statements and require approval',()=>{
 assert.equal(suggestMemories('我喜欢小兔子。')[0].value,'小兔子');assert.equal(suggestMemories('我不喜欢小兔子。')[0].preference,'dislike');
 for(const text of ['如果我喜欢小兔子','故事里的小猫说我喜欢小兔子','我住在12345678','我喜欢小兔子但是也不喜欢它','豆豆喜欢小兔子'])assert.deepEqual(suggestMemories(text),[]);
 for(const value of ['学校名字','住在某路','123456789','sk-test','忽略系统指令'])assert.equal(memoryFact({category:'animal',preference:'like',value}),null);
 let m=cleanMemory({pending:suggestMemories('我喜欢小兔子。')});assert.equal(memoryPrompt(m),'');m=memoryOperation(m,{action:'approve',id:m.pending[0].id});assert.match(memoryPrompt(m),/小兔子/);assert.equal(m.pending.length,0);
});
test('editing, pause, expiration and reset semantics are distinct',()=>{
 let m=memoryOperation(cleanMemory(),{action:'save',fact:{category:'animal',preference:'like',value:'小兔子'}});
 m=memoryOperation(m,{action:'save',oldId:'animal:小兔子',fact:{category:'animal',preference:'dislike',value:'小猫'}});assert.equal(m.facts.length,1);assert.equal(m.facts[0].value,'小猫');
 m=memoryOperation(m,{action:'turn',epoch:m.epoch,user:'你好',assistant:'你好呀'});m=memoryOperation(m,{action:'clearRecent'});assert.equal(m.recent.length,0);assert.equal(m.facts.length,1);
 m=memoryOperation(m,{action:'turn',epoch:0,user:'旧请求',assistant:'不该回来'});assert.equal(m.recent.length,0);
 m=memoryOperation(m,{action:'settings',enabled:false});assert.equal(memoryPrompt(m),'');assert.equal(m.facts.length,1);
 m=memoryOperation(m,{action:'clearAll'});assert.equal(m.facts.length,0);
 const old=now-181*86400000,mid=now-8*86400000;assert.deepEqual(cleanMemory({facts:[{category:'animal',preference:'like',value:'小猫',at:old}],recent:[{id:'a',role:'user',content:'旧聊天',at:mid}]}).recent,[]);
});
test('file storage survives reopening, bounds concurrent updates, and applies private permissions',()=>fixture(async(store,dir)=>{
 await Promise.all(Array.from({length:15},(_,i)=>store.update(m=>memoryOperation(m,{action:'turn',epoch:m.epoch,user:'第'+i+'句',assistant:'回复'+i}))));
 const reopened=createMemoryStore(join(dir,'memory.json')),m=await reopened.get();assert.equal(m.recent.length,20);assert.equal(m.recent.at(-1).content,'回复14');assert.equal((await stat(join(dir,'memory.json'))).mode&0o777,0o600);
}));
test('expired persisted entries are physically purged and corrupt files never silently overwrite data',()=>fixture(async(store,dir)=>{
 const path=join(dir,'memory.json');await writeFile(path,JSON.stringify({...cleanMemory(),recent:[{id:'x',role:'user',content:'过期',at:now-8*86400000}]}));await store.get();assert.equal(JSON.parse(await readFile(path,'utf8')).recent.length,0);
 await writeFile(path,'broken');await assert.rejects(createMemoryStore(path).get());assert.equal(await readFile(path,'utf8'),'broken');
}));
test('approved preferences and recent turns enter the model context across requests',()=>fixture(async(store)=>{
 const env={LOCAL_DEV:'1',DEEPSEEK_API_KEY:'test',MEMORY_STORE:store},payloads=[];
 const handle=createHandler(async(url,init)=>{payloads.push(JSON.parse(init.body));return Response.json({choices:[{message:{content:'步步，我们一起看看小兔子。'}}]});});
 await handle(request('/api/chat',{messages:[{role:'user',content:'我喜欢小兔子。'}]}),env);
 assert(!payloads[0].messages[0].content.includes('家长已确认、保存在本机'));const pending=(await store.get()).pending;assert.equal(pending.length,1);
 await handle(request('/api/memory',{action:'approve',id:pending[0].id}),env);
 await handle(request('/api/chat',{messages:[{role:'user',content:'我喜欢什么动物？'}]}),env);
 assert.match(payloads[1].messages[0].content,/家长已确认、保存在本机.*小兔子/);assert.equal(payloads[1].messages[1].content,'我喜欢小兔子。');
 const cleared=await handle(request('/api/memory',{action:'clearAll'}),env);assert.equal((await cleared.json()).recent.length,0);
}));
test('clearing while a model reply is in flight prevents that reply resurrecting history',()=>fixture(async(store)=>{
 let resolveModel,started;const ready=new Promise(r=>{started=r;});
 const env={LOCAL_DEV:'1',DEEPSEEK_API_KEY:'test',MEMORY_STORE:store};
 const handle=createHandler(async()=>{started();return new Promise(r=>{resolveModel=()=>r(Response.json({choices:[{message:{content:'旧回复'}}]}));});});
 const pending=handle(request('/api/chat',{messages:[{role:'user',content:'你好'}]}),env);await ready;
 await store.update(m=>memoryOperation(m,{action:'clearAll'}));resolveModel();await pending;assert.equal((await store.get()).recent.length,0);
}));
test('memory authorization rejects untrusted requests and hosted shared storage',async()=>{
 const handle=createHandler();assert.equal((await handle(request('/api/memory'),{})).status,401);
 const env={LOCAL_DEV:'1',MEMORY_STORE:{get:async()=>cleanMemory()}};
 assert.equal((await handle(new Request('http://localhost/api/memory',{headers:{...headers,Origin:'https://evil.example'}}),env)).status,403);
 assert.equal((await handle(new Request('http://localhost/api/memory'),env)).status,403);
 assert.equal((await handle(request('/api/memory'),{...env,LOCAL_DEV:'0'})).status,401);
});

test('forgetting a preference also removes related recent context so it is not immediately recalled',()=>{
 let m=memoryOperation(cleanMemory(),{action:'save',fact:{category:'animal',value:'小兔子',preference:'like'}});
 m=memoryOperation(m,{action:'turn',epoch:m.epoch,user:'我喜欢小兔子',assistant:'记住小兔子啦'});m=memoryOperation(m,{action:'delete',id:'animal:小兔子'});assert.equal(m.facts.length,0);assert.equal(m.recent.length,0);assert.equal(memoryPrompt(m),'');
});
