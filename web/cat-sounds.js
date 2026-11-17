(() => {
  'use strict';
  const names=['pet','play','eat','sleep','wake','content','curious'];
  let context=null,active=null,enabled=true,conversation='idle',lastAt=-Infinity,lastName='',generation=0;
  const buffers=new Map(),pending=new Map(),button=document.getElementById('sound-button');
  try{enabled=localStorage.getItem('doudou-sounds')!=='off';}catch{}
  function render(){button?.setAttribute('aria-pressed',String(enabled));button?.setAttribute('aria-label',enabled?'关闭猫咪音效':'开启猫咪音效');if(button)button.textContent=enabled?'♪':'♩';}
  function getContext(){
    const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return null;
    if(!context||context.state==='closed')context=new AudioCtx();return context;
  }
  const downloads=new Map();
  function download(name,extension='m4a'){
    const key=name+'.'+extension;if(downloads.has(key))return downloads.get(key);
    const task=fetch('./sounds/'+key+'?v=doudou-9',{cache:'force-cache',priority:'low'}).then(res=>{if(!res.ok)throw new Error('sound_unavailable');return res.arrayBuffer();}).catch(e=>{downloads.delete(key);throw e;});downloads.set(key,task);return task;
  }
  for(const name of names)download(name).catch(()=>{});
  function load(name){
    if(buffers.has(name))return Promise.resolve(buffers.get(name));
    if(pending.has(name))return pending.get(name);
    const ctx=getContext();if(!ctx)return Promise.reject(new Error('audio_unavailable'));
    const promise=download(name).then(bytes=>ctx.decodeAudioData(bytes.slice(0))).catch(()=>download(name,'wav').then(bytes=>ctx.decodeAudioData(bytes.slice(0)))).then(buffer=>{buffers.set(name,buffer);return buffer;}).finally(()=>pending.delete(name));
    pending.set(name,promise);return promise;
  }
  function unlock(){
    try{const ctx=getContext();if(!ctx)return;Promise.resolve(ctx.resume()).catch(()=>{});const silent=ctx.createBufferSource();silent.buffer=ctx.createBuffer(1,1,ctx.sampleRate);silent.connect(ctx.destination);silent.start();
      // Cache these tiny, fixed effects; no recording or model request is involved.
      for(const name of names)load(name).catch(()=>{});
    }catch{}
  }
  function stop(){generation++;if(active){try{active.source.stop();active.source.disconnect();active.gain.disconnect();}catch{}active=null;button?.setAttribute('data-audio-state','ready');}}
  async function play(name){
    if(!names.includes(name)||!enabled||document.hidden||!['idle'].includes(conversation))return;
    const now=performance.now();if(now-lastAt<800||name===lastName&&now-lastAt<1600)return;
    lastAt=now;lastName=name;stop();const ticket=generation;unlock();
    try{
      const buffer=await load(name),ctx=getContext();
      if(ctx?.state==='suspended')await ctx.resume();
      if(ticket!==generation||!enabled||document.hidden||conversation!=='idle'||ctx?.state!=='running')return;
      const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=.65;source.connect(gain);gain.connect(ctx.destination);active={source,gain};button?.setAttribute('data-audio-state','playing');button?.setAttribute('data-last-sound',name);
      source.onended=()=>{source.disconnect();gain.disconnect();if(active?.source===source){active=null;button?.setAttribute('data-audio-state','ready');}};source.start();
    }catch{button?.setAttribute('data-audio-state','unavailable');}
  }
  function setEnabled(value){enabled=!!value;stop();try{localStorage.setItem('doudou-sounds',enabled?'on':'off');}catch{}render();if(enabled){unlock();lastAt=-Infinity;play('curious');}}
  window.DoudouSounds={getContext,unlock,play,stop,isPlaying:()=>!!active,isEnabled:()=>enabled,setEnabled};
  document.addEventListener('pointerdown',unlock,{once:true,capture:true});
  document.addEventListener('keydown',unlock,{once:true,capture:true});
  document.addEventListener('nuomi:sfx',e=>play(e.detail?.sound));
  document.addEventListener('nuomi:state',e=>{conversation=e.detail.state;if(conversation!=='idle')stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.addEventListener('pagehide',stop);
  button?.addEventListener('click',()=>setEnabled(!enabled));
  render();
})();
