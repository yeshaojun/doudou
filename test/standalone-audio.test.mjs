import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import '../standalone/build.mjs';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
async function harness({aacFails=false,muted=false,apple=false,session=false,mediaFails=false,blocked=false,interruptAfterDecode=false,saved=new Map()}={}){
 const nodes=new Map(),listeners=new Map(),decoded=[],played=[],stopped=[];let contexts=0,now=1000,inGesture=false;const mediaCalls=[];if(muted)saved.set('doudou-sounds','off');
 const get=id=>{if(!nodes.has(id))nodes.set(id,{attrs:{},dataset:{},hidden:false,innerHTML:'',textContent:'',classList:{toggle(){}},events:new Map(),setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,f){if(!this.events.has(k))this.events.set(k,[]);this.events.get(k).push(f);},click(){this.fire('click');},fire(name,event={}){inGesture=true;try{for(const f of this.events.get(name)||[])f({preventDefault(){},...event});}finally{inGesture=false;}}});return nodes.get(id);};
 const document={hidden:false,getElementById:get,dispatchEvent:e=>{for(const f of listeners.get(e.type)||[])f(e);},addEventListener(k,f){if(!listeners.has(k))listeners.set(k,[]);listeners.get(k).push(f);}};
 const ramp={value:1,setValueAtTime(){},exponentialRampToValueAtTime(){}};
 class Context{constructor(){contexts++;this.state='suspended';this.currentTime=0;this.sampleRate=22050;this.destination={};}resume(){this.state='running';return Promise.resolve();}createBuffer(c,n){return{silent:true,getChannelData:()=>new Float32Array(n)};}async decodeAudioData(buffer){const type=Buffer.from(buffer).toString('ascii',0,4)==='RIFF'?'wav':'aac';decoded.push(type);if(type==='aac'&&aacFails)throw Error('AAC unsupported');if(interruptAfterDecode)this.state='interrupted';return{sound:true};}createGain(){return{gain:ramp,connect(){},disconnect(){}};}createBufferSource(){return{buffer:null,connect(){},disconnect(){},start(){if(this.buffer?.sound)played.push('cat');},stop(){stopped.push('cat');}};}createOscillator(){return{frequency:ramp,connect(){},disconnect(){},start(){played.push('foley');},stop(){stopped.push('foley');}};}}
 class Media{setAttribute(){}pause(){stopped.push('media');}play(){mediaCalls.push({src:this.src,synchronous:inGesture});if(blocked)return Promise.reject(Object.assign(Error('gesture needed'),{name:'NotAllowedError'}));if(mediaFails&&this.src.startsWith('data:audio/mp4'))return Promise.reject(Object.assign(Error('format'),{name:'NotSupportedError'}));played.push('media');return Promise.resolve();}}
 const window={AudioContext:Context,Audio:Media,navigator:{userAgent:apple?'Mozilla iPad Safari':'Desktop',platform:apple?'MacIntel':'Other',maxTouchPoints:apple?5:0,...(session?{audioSession:{type:'auto'}}:{})},addEventListener(){}};
 const ctx={document,window,setTimeout,performance:{now:()=>now},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},atob:s=>Buffer.from(s,'base64').toString('binary'),CustomEvent:class{constructor(type,o){this.type=type;this.detail=o?.detail;}},console};
 vm.runInNewContext(source,ctx);
 const flush=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r));};
 return{get,window,document,decoded,played,stopped,flush,mediaCalls,saved,setBlocked:v=>{blocked=v;},contexts:()=>contexts,event:(type,event={})=>{for(const f of listeners.get(type)||[])f(event);},advance:ms=>{now+=ms;}};
}
test('a real start-sound button unmutes stored preferences and unlocks a shared audio context',async()=>{
 const h=await harness({muted:true});assert.equal(h.contexts(),0);assert(!h.get('audio-start').hidden);h.get('audio-start').click();await h.flush();assert(h.window.DoudouSounds.isEnabled());assert(!h.get('audio-start').hidden);assert.equal(h.contexts(),1);assert(h.played.includes('cat'));
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

test('sound preview stays available and does not shift layout during first-touch unlocking',async()=>{const h=await harness();h.event('pointerdown');await h.flush();assert(!h.get('audio-start').hidden);h.event('pointerup');await new Promise(r=>setTimeout(r,5));assert(!h.get('audio-start').hidden);});

test('iPad uses a playback audio session and recovers the interrupted Safari state',async()=>{
 const h=await harness({apple:true,session:true,interruptAfterDecode:true});h.get('audio-start').click();await h.flush();assert.equal(h.window.navigator.audioSession.type,'playback');assert(h.played.includes('cat'));const ctx=h.window.DoudouSounds.getContext();ctx.state='interrupted';h.event('pointerup');await h.flush();assert.equal(ctx.state,'running');h.event('nuomi:state',{detail:{state:'listening'}});assert.equal(h.window.navigator.audioSession.type,'auto');
});
test('older iPad falls back to embedded media playback inside the actual gesture',async()=>{
 const h=await harness({apple:true});assert.equal(h.window.DoudouSounds.getMode(),'media');h.get('audio-start').click();await h.flush();assert.equal(h.mediaCalls.length,1);assert(h.mediaCalls[0].synchronous);assert(h.mediaCalls[0].src.startsWith('data:audio/mp4;base64,'));assert(h.played.includes('media'));assert.equal(h.get('sound-button').attrs['data-audio-state'],'playing');
});
test('tablet compatibility mode persists and touchend plus synthetic click plays just once',async()=>{
 const h=await harness();h.get('audio-compat').click();await h.flush();assert.equal(h.saved.get('doudou-audio-mode'),'media');h.advance(1000);const before=h.mediaCalls.length;h.get('audio-start').fire('touchend');h.get('audio-start').click();await h.flush();assert.equal(h.mediaCalls.length,before+1);const restored=await harness({saved:h.saved});assert.equal(restored.window.DoudouSounds.getMode(),'media');assert.equal(restored.contexts(),0);
});
test('media playback retries the real embedded WAV when AAC is unsupported',async()=>{
 const h=await harness({apple:true,mediaFails:true});h.get('audio-start').click();await h.flush();assert.equal(h.mediaCalls.length,2);assert(h.mediaCalls[1].src.startsWith('data:audio/wav;base64,'));assert.equal(h.get('sound-button').attrs['data-audio-state'],'playing');
});
test('blocked playback shows retry instead of claiming sound started, and media stops on mute or background',async()=>{
 const h=await harness({apple:true,blocked:true});h.get('audio-start').click();await h.flush();assert.equal(h.mediaCalls.length,1);assert.equal(h.get('sound-button').attrs['data-audio-state'],'unavailable');assert.match(h.get('audio-start').innerHTML,/重试/);h.setBlocked(false);h.advance(1000);h.get('audio-start').click();await h.flush();assert.equal(h.get('sound-button').attrs['data-audio-state'],'playing');h.document.hidden=true;h.event('visibilitychange');assert(h.stopped.includes('media'));h.document.hidden=false;h.advance(1000);h.get('audio-start').click();await h.flush();h.get('sound-button').click();assert(!h.window.DoudouSounds.isEnabled());assert(!h.window.DoudouSounds.isPlaying());
});
