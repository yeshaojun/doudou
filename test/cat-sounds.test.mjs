import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
async function harness(){
 let now=1000,contexts=0;const events=new Map(),buttons=new Map(),started=[];let stopped=0;
 const button={textContent:'',setAttribute(){},addEventListener:(name,fn)=>buttons.set(name,fn)};
 const document={hidden:false,getElementById:()=>button,addEventListener:(name,fn)=>events.set(name,fn)};
 class Context{
  constructor(){contexts++;this.state='running';this.sampleRate=22050;this.destination={};}
  resume(){return Promise.resolve();}createBuffer(){return {silent:true};}decodeAudioData(){return Promise.resolve({sound:true});}
  createGain(){return {gain:{value:1},connect(){},disconnect(){}};}
  createBufferSource(){return {buffer:null,connect(){},disconnect(){},start(){if(this.buffer?.sound)started.push(this);},stop(){if(this.buffer?.sound)stopped++;}};}
 }
 const window={AudioContext:Context,addEventListener(){}};
 vm.runInNewContext(await readFile(new URL('../web/cat-sounds.js',import.meta.url),'utf8'),{document,window,performance:{now:()=>now},localStorage:{getItem:()=>null,setItem(){}},fetch:async()=>new Response(new Uint8Array(64)),console});
 const flush=async()=>{for(let n=0;n<5;n++)await new Promise(r=>setImmediate(r));};
 await flush();return {window,document,started,contexts:()=>contexts,stopped:()=>stopped,flush,advance:ms=>{now+=ms;},state:name=>events.get('nuomi:state')({detail:{state:name}}),toggle:()=>buttons.get('click')()};
}
test('effects unlock on interaction, share an audio context, and throttle repeated petting',async()=>{
 const h=await harness();assert.equal(h.contexts(),0);
 await h.window.DoudouSounds.play('pet');assert.equal(h.started.length,1);assert.equal(h.contexts(),1);
 await h.window.DoudouSounds.play('pet');assert.equal(h.started.length,1);
 h.advance(1800);await h.window.DoudouSounds.play('pet');assert.equal(h.started.length,2);assert.equal(h.stopped(),1);
 assert.equal(h.window.DoudouSounds.getContext(),h.window.DoudouSounds.getContext());
});
test('microphone states, muting and backgrounding suppress effects and stop active sounds',async()=>{
 const h=await harness();await h.window.DoudouSounds.play('pet');
 for(const state of ['listening','thinking','speaking','waiting']){h.state(state);h.advance(2000);await h.window.DoudouSounds.play('play');assert.equal(h.started.length,1);}
 h.state('idle');h.advance(2000);await h.window.DoudouSounds.play('content');assert.equal(h.started.length,2);
 h.toggle();h.advance(2000);await h.window.DoudouSounds.play('pet');assert.equal(h.started.length,2);
 h.toggle();await h.flush();const count=h.started.length;h.document.hidden=true;h.advance(2000);await h.window.DoudouSounds.play('pet');assert.equal(h.started.length,count);
});
test('original audio assets have bounded peaks, silence at the edges and compressed companions',async()=>{
 for(const name of ['pet','play','eat','sleep','wake','content','curious']){
  const wav=await readFile(new URL('../web/sounds/'+name+'.wav',import.meta.url));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(24),22050);
  let peak=0,power=0;for(let i=44;i<wav.length;i+=2){const value=wav.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(value));power+=value*value;}
  assert(peak<.65&&peak>.005,name);assert(Math.sqrt(power/((wav.length-44)/2))>.0008,name);
  assert(Math.abs(wav.readInt16LE(44))<10);assert(Math.abs(wav.readInt16LE(wav.length-2))<10);
  const compressed=await readFile(new URL('../web/sounds/'+name+'.m4a',import.meta.url));assert.equal(compressed.toString('ascii',4,8),'ftyp');assert(compressed.length<wav.length);
 }
});
