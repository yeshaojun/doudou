import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import '../scripts/build.mjs';
const html=await readFile(new URL('../standalone/index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
test('single HTML contains its scripts, illustrations and seven audio effects without model credentials or network dependencies',()=>{
 assert.equal(scripts.length,4);for(const source of scripts)new vm.Script(source);
 assert(!/<(?:script|link|img|audio)[^>]+(?:src|href)=["'](?:\.\/|https?:)/.test(html));
 assert(!/\bfetch\s*\(|getUserMedia\s*\(|sk-[a-zA-Z0-9_-]{15,}/.test(scripts.join('\n')));
 assert.equal((scripts[0].match(/"(?:pet|play|eat|sleep|wake|content|curious)":\{/g)||[]).length,7);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size);
});
function harness(){
 let now=1000,frames=[];const elements=new Map(),events=new Map(),saved=new Map();
 class Element{constructor(){this.attrs={};this.style={setProperty(k,v){this[k]=v;}};this.dataset={};this.events=new Map();this.classList={add(){},remove(){},toggle(){}};}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,fn){if(!this.events.has(k))this.events.set(k,[]);this.events.get(k).push(fn);}appendChild(){}remove(){}focus(){}getScreenCTM(){return{inverse(){return{};}};}setPointerCapture(){} }
 const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
 const dispatchEvent=e=>{for(const fn of events.get(e.type)||[])fn(e);};
 const document={hidden:false,body:new Element(),getElementById:get,querySelector:()=>get('pupil'),createElementNS:()=>new Element(),dispatchEvent,addEventListener(k,fn){if(!events.has(k))events.set(k,[]);events.get(k).push(fn);}};
 const ctx={document,window:{matchMedia:()=>({matches:false})},performance:{now:()=>now},requestAnimationFrame:fn=>frames.push(fn),localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},DOMPoint:class{constructor(x,y){this.x=x;this.y=y;}matrixTransform(){return this;}},CustomEvent:class{constructor(type,o){this.type=type;this.detail=o.detail;}}};
 vm.createContext(ctx);vm.runInContext(scripts[1],ctx);vm.runInContext(scripts[2],ctx);
 const step=(n=1)=>{for(let i=0;i<n;i++){now+=16;const copy=frames;frames=[];for(const fn of copy)fn(now);}};
 return{get,step,event:(type,detail)=>dispatchEvent({type,detail}),saved,document};
}
test('standalone sleep travels to the left bed, lowers posture, and moves the blanket with the kitten',()=>{
 const h=harness();h.event('nuomi:command',{command:{action:'sleep'}});h.step(240);
 const transform=h.get('cat').attrs.transform;assert(Number(transform.match(/translate\(([-.0-9]+)/)[1])< -320);assert(transform.includes('scale(0.88 0.66)'));
 assert.equal(h.get('sleep-quilt').style.opacity,'1');assert(Number(h.get('sleep-quilt').attrs.transform.match(/translate\(([-.0-9]+)/)[1])< -260);
 h.event('nuomi:command',{command:{action:'pet'}});h.step(150);assert(!h.get('cat').attrs.transform.includes('scale(0.88 0.66)'));
});
test('dragging a ball from the basket steers both cats and releases cleanly',()=>{
 const h=harness();for(const fn of h.get('friend-button').events.get('click'))fn();h.step(180);
 h.event('doudou:toy',{x:200,y:380});h.step(140);const left=Number(h.get('cat').attrs.transform.match(/translate\(([-.0-9]+)/)[1]);
 h.event('doudou:toy',{x:640,y:350});h.step(140);const right=Number(h.get('cat').attrs.transform.match(/translate\(([-.0-9]+)/)[1]);assert(right>left+100);
 h.event('doudou:toy',{end:true});h.step(200);for(const id of ['cat','friend','yarn','sleep-quilt'])assert(!/NaN|Infinity/.test(h.get(id).attrs.transform));
});
test('care completions persist and background time does not drain the standalone pet',()=>{
 const h=harness();h.event('nuomi:command',{command:{action:'eat'}});h.step(400);h.event('nuomi:command',{command:{action:'fold'}});h.step(350);
 const care=JSON.parse(h.saved.get('doudou-care-v1'));assert(care.discoveries.includes('meal'));assert(care.discoveries.includes('tidy'));
 h.document.hidden=true;h.step(1000);assert.deepEqual(JSON.parse(h.saved.get('doudou-care-v1')),care);
});
test('served standalone permits only its exact inline script hashes while legacy chat remains available',async()=>{
 const {default:worker}=await import('../dist/server/index.js?standalone-test');
 const response=await worker.fetch(new Request('https://example.test/'),{},{}),body=await response.text(),csp=response.headers.get('content-security-policy');
 assert(body.includes('温暖小家'));for(const match of body.matchAll(/<script>([\s\S]*?)<\/script>/g))assert(csp.includes('sha256-'+createHash('sha256').update(match[1]).digest('base64')));
 assert(!/script-src[^;]*unsafe-inline/.test(csp));
 const legacy=await worker.fetch(new Request('https://example.test/chat.html'),{},{});assert((await legacy.text()).includes('talk-button'));
});
