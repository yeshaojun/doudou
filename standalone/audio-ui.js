(() => {
 'use strict';
 const api=window.DoudouSounds,button=document.getElementById('sound-button'),start=document.getElementById('audio-start');
 const speaker=on=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m11 5-5 4H3v6h3l5 4Z"/>'+(on?'<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>':'<path d="m16 9 6 6m0-6-6 6"/>')+'</svg>';
 let unlocked=false,lastAt=-Infinity,voices=new Set();
 function render(){const on=api.isEnabled();button.innerHTML=speaker(on);button.classList.toggle('muted',!on);button.title=on?'声音已开启，点一下静音':'声音已关闭，点一下开启';start.hidden=unlocked&&on;start.innerHTML=speaker(on)+(on?'点一下，听听豆豆':'声音已关闭 · 点这里开启');}
 function unlock(){api.unlock();try{const ctx=api.getContext();if(ctx)Promise.resolve(ctx.resume()).then(()=>{unlocked=ctx.state==='running';render();}).catch(()=>render());}catch{}render();}
 start.addEventListener('pointerdown',()=>{api.setEnabled(true);unlock();});start.addEventListener('click',()=>{api.setEnabled(true);unlock();});button.addEventListener('click',()=>{unlock();if(!api.isEnabled())stop();});
 document.addEventListener('pointerdown',unlock,{once:true,capture:true});document.addEventListener('keydown',unlock,{once:true,capture:true});
 function stop(){for(const voice of voices){try{voice.stop();voice.disconnect();}catch{}}voices.clear();}
 function foley(kind){if(document.hidden||!api.isEnabled()||!['water','swish','click','chime'].includes(kind))return;const now=performance.now();if(now-lastAt<180)return;lastAt=now;const ctx=api.getContext();if(!ctx||ctx.state!=='running')return;const t=ctx.currentTime,gain=ctx.createGain();gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(kind==='chime'?.075:.035,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+(kind==='chime'?.65:.18));gain.connect(ctx.destination);
  let source;if(kind==='swish'){const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.2),ctx.sampleRate),data=buffer.getChannelData(0);let value=0;for(let i=0;i<data.length;i++){value=value*.88+(Math.random()*2-1)*.12;data[i]=value;}source=ctx.createBufferSource();source.buffer=buffer;}else{source=ctx.createOscillator();source.type=kind==='click'?'sine':'triangle';source.frequency.setValueAtTime(kind==='water'?720+Math.random()*220:kind==='click'?480:660,t);source.frequency.exponentialRampToValueAtTime(kind==='water'?290:kind==='click'?240:990,t+(kind==='chime'?.3:.13));}source.connect(gain);voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();};source.start(t);source.stop(t+(kind==='chime'?.7:.21));button.dataset.lastFoley=kind;
 }
 document.addEventListener('doudou:foley',e=>foley(e.detail?.kind));document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});document.addEventListener('nuomi:state',e=>{if(!['idle','caring','waiting'].includes(e.detail?.state))stop();});window.addEventListener('pagehide',stop);
 // Keep touch play at a stable scale while leaving vertical scrolling available.
 for(const name of ['gesturestart','gesturechange','gestureend'])document.addEventListener(name,e=>e.preventDefault(),{passive:false});
 document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault();},{passive:false});document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});document.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey)e.preventDefault();},{passive:false});
 render();
})();
