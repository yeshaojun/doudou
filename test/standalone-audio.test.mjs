import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import '../standalone/build.mjs';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
async function harness({aacFails=false,muted=false}={}){
 const nodes=new Map(),listeners=new Map(),decoded=[],played=[],stopped=[];let contexts=0,now=1000;
 const get=id=>{if(!nodes.has(id))nodes.set(id,{attrs:{},dataset:{},hidden:false,innerHTML:'',textContent:'',classList:{toggle(){}},events:new Map(),setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,f){if(!this.events.has(k))this.events.set(k,[]);this.events.get(k).push(f);},click(){for(const f of this.events.get('click')||[])f();}});return nodes.get(id);};
 const document={hidden:false,getElementById:get,addEventListener(k,f){if(!listeners.has(k))listeners.set(k,[]);listeners.get(k).push(f);}};
 const ramp={value:1,setValueAtTime(){},exponentialRampToValueAtTime(){}};
 class Context{constructor(){contexts++;this.state='suspended';this.currentTime=0;this.sampleRate=22050;this.destination={};}resume(){this.state='running';return Promise.resolve();}createBuffer(c,n){return{silent:true,getChannelData:()=>new Float32Array(n)};}async decodeAudioData(buffer){const type=Buffer.from(buffer).toString('ascii',0,4)==='RIFF'?'wav':'aac';decoded.push(type);if(type==='aac'&&aacFails)throw Error('AAC unsupported');return{sound:true};}createGain(){return{gain:ramp,connect(){},disconnect(){}};}createBufferSource(){return{buffer:null,connect(){},disconnect(){},start(){if(this.buffer?.sound)played.push('cat');},stop(){stopped.push('cat');}};}createOscillator(){return{frequency:ramp,connect(){},disconnect(){},start(){played.push('foley');},stop(){stopped.push('foley');}};}}
 const window={AudioContext:Context,addEventListener(){}};
 const ctx={document,window,setTimeout,performance:{now:()=>now},localStorage:{getItem:()=>muted?'off':null,setItem(){}},atob:s=>Buffer.from(s,'base64').toString('binary'),CustomEvent:class{constructor(type,o){this.type=type;this.detail=o?.detail;}},console};
 vm.runInNewContext(source,ctx);
 const flush=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r));};
 return{get,window,document,decoded,played,stopped,flush,contexts:()=>contexts,event:(type,event={})=>{for(const f of listeners.get(type)||[])f(event);},advance:ms=>{now+=ms;}};
}
test('a real start-sound button unmutes stored preferences and unlocks a shared audio context',async()=>{
 const h=await harness({muted:true});assert.equal(h.contexts(),0);assert(!h.get('audio-start').hidden);h.get('audio-start').click();await h.flush();assert(h.window.DoudouSounds.isEnabled());assert(h.get('audio-start').hidden);assert.equal(h.contexts(),1);assert(h.played.includes('cat'));
});
test('the standalone actually decodes embedded WAV when AAC decoding is unsupported',async()=>{
 const h=await harness({aacFails:true});h.get('audio-start').click();await h.flush();assert(h.decoded.includes('aac'));assert(h.decoded.includes('wav'));assert(h.played.includes('cat'));
});
test('interactive foley follows mute state and hidden pages cannot start more sound',async()=>{
 const h=await harness();h.get('audio-start').click();await h.flush();h.event('doudou:foley',{detail:{kind:'water'}});assert(h.played.includes('foley'));h.get('sound-button').click();const count=h.played.length;h.advance(1000);h.event('doudou:foley',{detail:{kind:'click'}});assert.equal(h.played.length,count);h.document.hidden=true;h.event('visibilitychange');assert(h.stopped.length>0);
});
test('pinch, double click and modified wheel zoom are prevented while single-finger scroll is retained',async()=>{
 const h=await harness();let prevented=0;const preventDefault=()=>prevented++;h.event('gesturestart',{preventDefault});h.event('dblclick',{preventDefault});h.event('touchmove',{touches:[{},{}],preventDefault});h.event('wheel',{ctrlKey:true,preventDefault});assert.equal(prevented,4);h.event('touchmove',{touches:[{}],preventDefault});h.event('wheel',{ctrlKey:false,metaKey:false,preventDefault});assert.equal(prevented,4);assert(html.includes('maximum-scale=1,user-scalable=no'));
});

test('first-touch audio unlocking keeps layout stable until the pointer click completes',async()=>{const h=await harness();h.event('pointerdown');await h.flush();assert(!h.get('audio-start').hidden);h.event('pointerup');await new Promise(r=>setTimeout(r,5));assert(h.get('audio-start').hidden);});
