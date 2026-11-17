import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {parseWakePhrase,isStopPhrase,nextListeningMode,splitSpeechText,parsePetCommand,petCommandReply} from '../web/voice-policy.js';

// Run the real client against deterministic browser/media adapters; no microphone is opened.
async function harness(options={}){
  let now=1000,id=0,amplitude=0,permissionCalls=0,raf=[];
  const pendingChats=[];
  const timers=new Map(),elements=new Map(),listeners=new Map(),calls=[],transcripts=[];
  class Element{
    constructor(){this.listeners=new Map();this.attrs={};this.dataset={};this.style={};this.value='service';this.hidden=false;this.disabled=false;this.textContent='';this.classList={add(){},remove(){},toggle(){}};}
    addEventListener(name,fn){this.listeners.set(name,fn);}setAttribute(name,value){this.attrs[name]=value;}append(){}replaceChildren(){}focus(){}scrollIntoView(){}
    appendChild(){}remove(){}setPointerCapture(){}getScreenCTM(){return {inverse(){return {};}};}
    click(){return this.listeners.get('click')?.({preventDefault(){}});}
  }
  const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  const document={hidden:false,body:new Element(),getElementById:get,createElement:()=>new Element(),createElementNS:()=>new Element(),querySelector:()=>get('pupil'),addEventListener:(name,fn)=>{const previous=listeners.get(name);listeners.set(name,previous?e=>{previous(e);fn(e);}:fn);},dispatchEvent:e=>{listeners.get(e.type)?.(e);}};
  const setTimer=(fn,delay=0)=>{const key=++id;timers.set(key,{fn,at:now+delay});return key;};
  const track={readyState:'live',stop(){this.readyState='ended';}};
  const stream={getTracks:()=>[track]};
  class Recorder{
    static isTypeSupported(){return true;}
    constructor(){this.state='inactive';this.mimeType='audio/mp4';}
    start(){this.state='recording';}
    stop(){if(this.state!=='recording')throw new Error('already stopped');this.state='inactive';this.ondataavailable?.({data:new Blob([new Uint8Array(1200)],{type:'audio/mp4'})});Promise.resolve().then(()=>this.onstop?.());}
  }
  class Context{
    constructor(){this.state='running';this.currentTime=0;this.sampleRate=22050;this.destination={};}
    resume(){this.state='running';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}
    createAnalyser(){return {fftSize:512,connect(){},getByteTimeDomainData(bytes){bytes.fill(amplitude?148:128);}};}
    createMediaStreamSource(){return {connect(){},disconnect(){}};}
    createBuffer(channels,length){return {silent:length===1,getChannelData:()=>new Float32Array(length)};}
    decodeAudioData(){return Promise.resolve({silent:false});}
    createBufferSource(){return {buffer:null,connect(){},disconnect(){},stop(){},start(){if(!this.buffer?.silent)setTimer(()=>this.onended?.(),50);}};}
  }
  const window={DoudouMemory:options.memory?{load:async()=>options.memory,refresh(){},clearRecent:async()=>{},recordTurn(){}}:undefined,matchMedia:()=>({matches:false}),AudioContext:Context,MediaRecorder:Recorder,addEventListener(){}};
  const fakeFetch=async(path,requestOptions={})=>{
    calls.push({path,body:typeof requestOptions.body==='string'?JSON.parse(requestOptions.body):requestOptions.body});
    if(path==='/api/config')return Response.json({longTermMemory:!!options.memory,chat:{configured:true,provider:'DeepSeek',model:'deepseek-flash'},asr:{enabled:true,configured:true,provider:'Ali',model:'asr'},tts:{streaming:!!options.streaming,enabled:true,configured:true,provider:'Ali',model:'tts',voice:'voice'}});
    if(path==='/api/transcribe')return Response.json({text:transcripts.shift()||'我想听星星的故事。'});
    if(path==='/api/chat'){if(options.deferChat)return new Promise((resolve,reject)=>{pendingChats.push(()=>resolve(Response.json({reply:'步步，我们来听一个小故事。',emotion:'happy'})));requestOptions.signal?.addEventListener?.('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})));});return Response.json({reply:options.longReply||'步步，我们来听一个小故事。',emotion:'happy'});}
    if(path==='/api/speech/stream')return options.streamFails?Response.json({error:{message:'not available'}},{status:503}):new Response(new Uint8Array(4096),{headers:{'Content-Type':'audio/pcm'}});
    if(path==='/api/speech')return new Response(new Blob([new Uint8Array(1200)],{type:'audio/wav'}));
    throw new Error('unexpected '+path);
  };
  const context={document,window,navigator:{mediaDevices:{getUserMedia:async()=>{permissionCalls++;return stream;}}},MediaRecorder:Recorder,performance:{now:()=>now},sessionStorage:{getItem:()=> '1',setItem(){}},fetch:fakeFetch,AbortController,Blob,FormData,Uint8Array,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},setTimeout:setTimer,clearTimeout:key=>timers.delete(key),requestAnimationFrame:fn=>raf.push(fn),parseWakePhrase,isStopPhrase,nextListeningMode,splitSpeechText,parsePetCommand,petCommandReply,console,URL};
  const source=(await readFile(new URL('../web/chat.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/,'');
  if(options.withPet)vm.runInNewContext(await readFile(new URL('../web/app.js',import.meta.url),'utf8'),context,{filename:'app.js'});
  vm.runInNewContext(source,context,{filename:'chat.js'});
  async function flush(){for(let n=0;n<12;n++)await new Promise(resolve=>setImmediate(resolve));}
  async function advance(ms){now+=ms;const callbacks=raf;raf=[];for(const fn of callbacks)fn(now);for(const [key,timer]of [...timers])if(timer.at<=now){timers.delete(key);timer.fn();}await flush();}
  async function speak(text){transcripts.push(text);amplitude=1;await advance(700);amplitude=0;await advance(1500);}
  await flush();
  return {get,calls,track,document,listeners,advance,speak,flush,permissionCalls:()=>permissionCalls,setAmplitude:value=>{amplitude=value;},resolveChat:()=>pendingChats.shift()?.()};
}

test('continuous conversation restarts capture after playback without another permission prompt',async()=>{
  const h=await harness();await h.get('continuous-button').click();await h.flush();
  assert.equal(h.permissionCalls(),1);assert.equal(h.get('continuous-button').attrs['aria-pressed'],'true');
  await h.speak('豆豆，讲个小故事。');
  assert.equal(h.calls.filter(c=>c.path==='/api/chat').length,1);
  await h.advance(60);await h.advance(500);
  assert.equal(h.permissionCalls(),1);assert.equal(h.get('talk-button').attrs['aria-pressed'],'true');
  await h.get('stop-button').click();await h.flush();await h.advance(20000);
  assert.equal(h.track.readyState,'ended');assert.equal(h.get('continuous-button').attrs['aria-pressed'],'false');assert.equal(h.get('talk-button').attrs['aria-pressed'],'false');
});

test('wake standby ignores silence and unrelated speech, then sends the attached request to DeepSeek',async()=>{
  const h=await harness();await h.get('enable-wake').click();await h.flush();
  await h.advance(10010);await h.advance(700);
  assert.equal(h.calls.filter(c=>c.path==='/api/transcribe').length,0);
  await h.speak('今天天气很好。');
  assert.equal(h.calls.filter(c=>c.path==='/api/chat').length,0);
  await h.advance(750);await h.speak('你好豆豆，给步步讲一个星星故事。');
  const chat=h.calls.find(c=>c.path==='/api/chat');assert(chat);assert.equal(chat.body.messages.at(-1).content,'给步步讲一个星星故事。');
  await h.advance(60);await h.advance(500);
  assert.equal(h.get('talk-label').textContent,'在等步步叫“豆豆”');assert.equal(h.permissionCalls(),1);
  h.document.hidden=true;h.listeners.get('visibilitychange')();await h.flush();await h.advance(20000);
  assert.equal(h.track.readyState,'ended');assert.equal(h.get('wake-button').attrs['aria-pressed'],'false');assert.equal(h.get('talk-button').attrs['aria-pressed'],'false');
});

test('the microphone button interrupts a pending reply without a second permission request',async()=>{
  const h=await harness({deferChat:true});await h.get('talk-button').click();await h.flush();
  assert.equal(h.get('continuous-button').attrs['aria-pressed'],'true');
  await h.speak('我想听故事。');assert.equal(h.get('talk-button').disabled,false);
  assert.equal(h.get('talk-label').textContent,'继续说，豆豆听着呢');
  await h.get('talk-button').click();await h.flush();
  assert.equal(h.get('talk-button').attrs['aria-pressed'],'true');assert.equal(h.permissionCalls(),1);
  h.resolveChat();await h.flush();assert.equal(h.calls.filter(c=>c.path==='/api/speech').length,0);
  await h.speak('还想要小兔子。');const chats=h.calls.filter(c=>c.path==='/api/chat');assert.equal(chats.length,2);assert.equal(chats[1].body.messages[0].content,'我想听故事。');assert.equal(chats[1].body.messages.at(-1).content,'还想要小兔子。');
});
test('sustained new speech interrupts thinking in continuous mode',async()=>{
  const h=await harness({deferChat:true});await h.get('continuous-button').click();await h.flush();await h.speak('讲故事。');
  h.setAmplitude(1);await h.advance(20);await h.advance(200);
  assert.equal(h.get('talk-button').attrs['aria-pressed'],'true');assert.equal(h.permissionCalls(),1);
  h.resolveChat();await h.flush();assert.equal(h.calls.filter(c=>c.path==='/api/speech').length,0);
});
test('quiet continuous conversation stays available across several capture windows',async()=>{
  const h=await harness();await h.get('talk-button').click();await h.flush();
  for(let n=0;n<4;n++){await h.advance(18010);await h.advance(700);}
  assert.equal(h.get('talk-button').attrs['aria-pressed'],'true');assert.equal(h.track.readyState,'live');
  assert.equal(h.calls.filter(c=>c.path==='/api/transcribe').length,0);
});
test('voice segments prepare ahead and listening resumes only after the final segment',async()=>{
  const h=await harness({longReply:'步步，小兔子在窗边看见一颗闪亮的星星。它带上小灯笼，沿着弯弯的小路去找星星的朋友。'});
  await h.get('talk-button').click();await h.flush();await h.speak('讲故事。');
  const speech=h.calls.filter(c=>c.path==='/api/speech');assert.equal(speech.length,2);assert(speech[0].body.input.endsWith('。'));
  await h.advance(60);assert.equal(h.get('talk-button').attrs['aria-pressed'],'false');
  await h.advance(60);await h.advance(500);assert.equal(h.get('talk-button').attrs['aria-pressed'],'true');
});

test('ASR food command executes the real cat action and speaks the matching reply without a chat round trip',async()=>{
  const h=await harness({withPet:true});await h.get('talk-button').click();await h.flush();await h.speak('豆豆吃饭啦');
  assert.equal(h.calls.filter(c=>c.path==='/api/chat').length,0);assert.equal(h.get('scene').dataset.activity,'eat');assert.equal(h.get('scene').dataset.emotion,'content');
  assert.match(h.get('reply-text').textContent,/开始小口吃饭/);assert.equal(h.calls.filter(c=>c.path==='/api/speech').map(c=>c.body.input).join(''),h.get('reply-text').textContent);
  await h.advance(60);await h.advance(60);await h.advance(500);assert.equal(h.get('talk-button').attrs['aria-pressed'],'true');assert.equal(h.get('scene').dataset.activity,'eat');
});
test('voice sleep is distinct from stopping conversation and can be followed by voice wake',async()=>{
  const h=await harness({withPet:true});await h.get('talk-button').click();await h.flush();await h.speak('豆豆睡觉吧');
  assert.equal(h.get('scene').dataset.activity,'sleep');assert.equal(h.get('scene').dataset.emotion,'sleepy');assert.equal(h.track.readyState,'live');
  await h.advance(60);await h.advance(60);await h.advance(500);
  assert.equal(h.get('scene').dataset.activity,'sleep');assert.equal(h.get('talk-button').attrs['aria-pressed'],'true');
  await h.speak('豆豆起床啦');assert.equal(h.get('scene').dataset.activity,'stretch');assert.match(h.get('reply-text').textContent,/醒来啦/);
});
test('weather and folding share one state across spoken reply and follow-up chat context',async()=>{
  const h=await harness({withPet:true});await h.get('talk-button').click();await h.flush();await h.speak('下雨啦，我们一起叠被子');
  assert.equal(h.get('scene').dataset.weather,'rain');assert.equal(h.get('scene').dataset.activity,'fold');assert.equal(h.get('scene').dataset.emotion,'calm');
  assert.match(h.get('reply-text').textContent,/折一边/);assert.match(h.get('reply-text').textContent,/下着雨/);
  await h.advance(60);await h.advance(60);await h.advance(500);await h.speak('给步步讲一个小故事。');
  const chat=h.calls.find(c=>c.path==='/api/chat');assert.equal(chat.body.context.weather,'rain');assert.equal(chat.body.context.activity,'fold');assert.equal(chat.body.context.emotion,'calm');assert.equal(chat.body.messages[0].content,'下雨啦，我们一起叠被子');
});
test('wake-word dialogue can directly trigger a pet action, but a negated action stays in chat',async()=>{
  const h=await harness({withPet:true});await h.get('enable-wake').click();await h.flush();await h.speak('你好豆豆，吃饭啦');
  assert.equal(h.get('scene').dataset.activity,'eat');assert.equal(h.calls.filter(c=>c.path==='/api/chat').length,0);
  await h.advance(60);await h.advance(60);await h.advance(500);await h.speak('豆豆不要睡觉');
  assert.equal(h.get('scene').dataset.activity,'eat');assert.equal(h.calls.filter(c=>c.path==='/api/chat').length,1);
});

test('streaming speech uses queued PCM playback and resumes continuous listening',async()=>{
 const h=await harness({streaming:true});await h.get('talk-button').click();await h.flush();await h.speak('讲一个小故事。');
 assert.equal(h.calls.filter(c=>c.path==='/api/speech/stream').length,1);assert.equal(h.calls.filter(c=>c.path==='/api/speech').length,0);
 await h.advance(60);await h.advance(200);assert.equal(h.get('talk-button').attrs['aria-pressed'],'true');assert.equal(h.permissionCalls(),1);
});
test('unavailable streaming falls back to WAV before any playback',async()=>{
 const h=await harness({streaming:true,streamFails:true});await h.get('talk-button').click();await h.flush();await h.speak('讲一个小故事。');
 assert.equal(h.calls.filter(c=>c.path==='/api/speech/stream').length,1);assert.equal(h.calls.filter(c=>c.path==='/api/speech').length,1);assert.equal(h.calls.find(c=>c.path==='/api/speech').body.format,'wav');
});

test('stopping streamed playback releases capture and never restarts listening',async()=>{
 const h=await harness({streaming:true});await h.get('talk-button').click();await h.flush();await h.speak('讲一个小故事。');
 await h.get('stop-button').click();await h.advance(1000);assert.equal(h.track.readyState,'ended');assert.equal(h.get('talk-button').attrs['aria-pressed'],'false');assert.equal(h.get('continuous-button').attrs['aria-pressed'],'false');
});

test('a fresh page restores persisted recent context without starting the microphone or playback',async()=>{
 const h=await harness({memory:{enabled:true,recent:[{role:'user',content:'讲一个小兔子故事。'},{role:'assistant',content:'小兔子找到一盏星星灯。'}]}});
 assert.equal(h.get('reply-text').textContent,'小兔子找到一盏星星灯。');assert.equal(h.permissionCalls(),0);assert.equal(h.calls.filter(c=>c.path.includes('speech')).length,0);
 await h.get('talk-button').click();await h.flush();await h.speak('继续讲。');const chat=h.calls.find(c=>c.path==='/api/chat');assert.equal(chat.body.messages[0].content,'讲一个小兔子故事。');
});
