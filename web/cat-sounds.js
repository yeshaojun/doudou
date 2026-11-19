(() => {
  'use strict';
  const names=['pet','play','eat','sleep','wake','content','curious'];
  let context=null,active=null,enabled=true,conversation='idle',lastAt=-Infinity,lastName='',generation=0;
  const buffers=new Map(),pending=new Map(),button=document.getElementById('sound-button');
  try{enabled=localStorage.getItem('doudou-sounds')!=='off';}catch{}
  const nav=window.navigator,appleTouch=/iPad|iPhone|iPod/.test(nav?.userAgent||'')||/Mac/.test(nav?.platform||'')&&nav?.maxTouchPoints>1;
  let mediaMode=!!(appleTouch&&!nav?.audioSession&&window.Audio),mediaElement=null;
  try{const saved=localStorage.getItem('doudou-audio-mode');if(saved==='media')mediaMode=!!window.Audio;else if(saved==='webaudio')mediaMode=false;}catch{}
  const mediaUrl=(name,extension)=>'./sounds/'+name+'.'+extension+'?v=doudou-9';
  function playbackSession(){if(!enabled||conversation!=='idle')return;try{if(nav?.audioSession)nav.audioSession.type='playback';}catch{}}
  function report(state){button?.setAttribute('data-audio-state',state);button?.setAttribute('data-audio-transport',mediaMode?'media':'webaudio');if(typeof CustomEvent==='function')document.dispatchEvent?.(new CustomEvent('doudou:audio-status',{detail:{state}}));}
  function render(){button?.setAttribute('aria-pressed',String(enabled));button?.setAttribute('aria-label',enabled?'关闭猫咪音效':'开启猫咪音效');if(button)button.textContent=enabled?'♪':'♩';}
  function getContext(){
    playbackSession();
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
    try{playbackSession();const ctx=getContext();if(!ctx)return;Promise.resolve(ctx.resume()).catch(()=>{});const silent=ctx.createBufferSource();silent.buffer=ctx.createBuffer(1,1,ctx.sampleRate);silent.connect(ctx.destination);silent.onended=()=>silent.disconnect();silent.start();
      // Cache these tiny, fixed effects; no recording or model request is involved.
      for(const name of names)load(name).catch(()=>{});
    }catch{}
  }
  function stop(){generation++;if(active){try{if(active.media){active.media.pause();active.media.currentTime=0;}else{active.source.stop();active.source.disconnect();active.gain.disconnect();}}catch{}active=null;report('ready');}}
  function playMedia(name,ticket){
    if(!window.Audio){report('unavailable');return;}
    // Reuse the same element. play() runs in the user's gesture, before any await.
    const el=mediaElement||(mediaElement=new window.Audio());let currentExtension='m4a';el.preload='auto';el.volume=.7;el.muted=false;el.setAttribute?.('playsinline','');
    const valid=()=>ticket===generation&&enabled&&!document.hidden&&conversation==='idle';
    function fail(extension,error){if(!valid()||extension!==currentExtension)return;if(extension==='m4a'&&error?.name!=='NotAllowedError'){start('wav');return;}active=null;report('unavailable');}
    function start(extension){if(!valid())return;currentExtension=extension;el.src=mediaUrl(name,extension);active={media:el};el.onerror=()=>fail(extension);el.onended=()=>{if(valid()&&active?.media===el){active=null;report('ready');}};try{const result=el.play();return Promise.resolve(result).then(()=>{if(!valid())return;button?.setAttribute('data-last-sound',name);report('playing');},e=>fail(extension,e));}catch(e){fail(extension,e);}}
    return start('m4a');
  }
  async function play(name){
    if(!names.includes(name)||!enabled||document.hidden||!['idle'].includes(conversation))return;
    const now=performance.now();if(now-lastAt<800||name===lastName&&now-lastAt<1600)return;
    lastAt=now;lastName=name;stop();const ticket=generation;unlock();if(mediaMode)return playMedia(name,ticket);
    try{
      const buffer=await load(name),ctx=getContext();
      if(ctx&&ctx.state!=='running')await ctx.resume();
      if(ticket!==generation||!enabled||document.hidden||conversation!=='idle'||ctx?.state!=='running')return;
      const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=.65;source.connect(gain);gain.connect(ctx.destination);active={source,gain};button?.setAttribute('data-last-sound',name);
      source.onended=()=>{source.disconnect();gain.disconnect();if(active?.source===source){active=null;report('ready');}};source.start();report('playing');
    }catch{report('unavailable');}
  }
  function setEnabled(value){enabled=!!value;stop();try{localStorage.setItem('doudou-sounds',enabled?'on':'off');}catch{}render();if(enabled){unlock();lastAt=-Infinity;play('curious');}}
  function setMode(value){stop();mediaMode=value==='media'&&!!window.Audio;try{localStorage.setItem('doudou-audio-mode',mediaMode?'media':'webaudio');}catch{}lastAt=-Infinity;}
  window.DoudouSounds={getContext,unlock,play,stop,isPlaying:()=>!!active,isEnabled:()=>enabled,setEnabled,setMode,getMode:()=>mediaMode?'media':'webaudio'};
  document.addEventListener('pointerdown',unlock,{once:true,capture:true});
  document.addEventListener('keydown',unlock,{once:true,capture:true});
  document.addEventListener('nuomi:sfx',e=>play(e.detail?.sound));
  document.addEventListener('nuomi:state',e=>{conversation=e.detail.state;if(conversation!=='idle'){stop();try{if(nav?.audioSession?.type==='playback')nav.audioSession.type='auto';}catch{}}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.addEventListener('pagehide',stop);
  button?.addEventListener('click',()=>setEnabled(!enabled));
  render();
})();
