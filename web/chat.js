import {parseWakePhrase,isStopPhrase,nextListeningMode,splitSpeechText,parsePetCommand,petCommandReply} from './voice-policy.js?v=doudou-11';
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const dialog=$('parent-dialog'), talk=$('talk-button'), label=$('talk-label'), stop=$('stop-button');
  const reply=$('reply-text'), status=$('chat-status'), input=$('chat-input'), send=$('send-button');
  let memoryReady=Promise.resolve();
  let config=null,parentEnabled=false,history=[],lastReply='',busy=false,version=0,current=null,pendingSpeech='';
  try{parentEnabled=sessionStorage.getItem('nuomi-parent-preview')==='1';}catch{}
  let voiceMode='off',audio=null,audioURL=null,outputContext=null,analyser=null,utterance=null,cachedSpeech=null;
  let recorder=null,micStream=null,inputContext=null,recordTimer=null,recordStarted=0,recording=false,startingMic=false,discardRecording=false;
  let streamUnavailable=false;
  let continuousPreference=null,playbackSettler=null,bargeMonitor=false;
  let continuous=false,wakeEnabled=false,awake=true,autoListenTimer=null,sessionTimer=null,setupIntent=null;
  let heardSpeech=false,emptyRounds=0,wakeMisses=0,listenKind='dialogue',inputMeter=null,inputSource=null,recorderEpoch=0,lastReplyAt=0,localCaption=false;
  const headers={'Content-Type':'application/json','X-Nuomi-Client':'1','X-Parent-Preview':'1'};
  function state(name){document.dispatchEvent(new CustomEvent('nuomi:state',{detail:{state:name}}));}
  function mouth(level){document.dispatchEvent(new CustomEvent('nuomi:mouth',{detail:level}));}
  function message(text,isError=false){status.textContent=text;status.classList.toggle('is-error',isError);}
  function showParent(){if(config?.longTermMemory)window.DoudouMemory?.refresh();dialog.hidden=false;dialog.scrollIntoView({block:'nearest',behavior:'smooth'});}
  function closeParent(){dialog.hidden=true;}
  function activatePreview(){parentEnabled=true;voiceMode=$('voice-mode').value;try{sessionStorage.setItem('nuomi-parent-preview','1');}catch{}closeParent();refreshButtons();}
  function refreshButtons(){
    send.disabled=busy;input.disabled=busy;
    $('replay-button').disabled=localCaption||!lastReply||busy||!!current||!!audio||!!utterance||voiceMode==='off';
    talk.classList.toggle('recording',recording);talk.setAttribute('aria-pressed',String(recording));
    if(recording){label.textContent=listenKind==='wake'?'在等步步叫“豆豆”':'我在听，说完点这里';talk.disabled=false;}
    else if(startingMic){label.textContent='等待麦克风授权…';talk.disabled=true;}
    else if(busy||current||audio||utterance){label.textContent='继续说，豆豆听着呢';talk.disabled=false;}
    else{label.textContent=parentEnabled?'点一下，和我说话':'开始语音聊天';talk.disabled=false;}
    $('enable-mic').disabled=!config?.asr.enabled||startingMic;
    stop.hidden=!(busy||current||audio||utterance||recording||startingMic);
    $('continuous-button').setAttribute('aria-pressed',String(continuous));
    $('wake-button').setAttribute('aria-pressed',String(wakeEnabled));
    $('sample-voice').textContent=(audio||utterance||current&&!busy)?'停止试听':'试听声音';
  }
  function renderServices(){
    const box=$('service-status');box.replaceChildren();
    for(const [title,service]of [['聊天',config?.chat],['语音识别',config?.asr],['语音合成',config?.tts]]){
      const good=title==='聊天'?service?.configured:service?.enabled;
      const line=document.createElement('div');line.className='service-line'+(good?'':' unavailable');
      const dot=document.createElement('span');dot.className='service-dot';
      const text=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small');
      strong.textContent=title+' · '+(good?'已配置':service?.configured?'测试暂不可用':'等待配置');
      small.textContent=service?(service.provider+' / '+service.model+(!good&&service.configured?' · 上次测试返回 503':'')):'尚未连接后端';
      text.append(strong,small);line.append(dot,text);box.append(line);
    }
  }
  async function getConfig(){
    try{
      const res=await fetch('/api/config',{headers:{'X-Nuomi-Client':'1'},cache:'no-store'});
      if(!res.ok)throw new Error('请在服务页面内登录后体验。');
      config=await res.json();
      if(config.longTermMemory&&window.DoudouMemory){memoryReady=window.DoudouMemory.load();const saved=await memoryReady;if(saved?.enabled&&saved.recent.length){history=saved.recent.map(({role,content})=>({role,content}));const previous=[...history].reverse().find(m=>m.role==='assistant');if(previous){lastReply=previous.content;lastReplyAt=performance.now();if(!localCaption)reply.textContent=lastReply;}message('豆豆记得最近聊过的话，可以接着说。');}}
      renderServices();
      if(config.tts.enabled)voiceMode='service';
      $('service-voice-option').textContent=config.tts.provider+' · '+config.tts.voice;
      $('voice-mode').value=voiceMode;
      if(!config.chat.configured)message('聊天服务尚未配置，请家长检查。',true);
      refreshButtons();
    }catch{renderServices();message('请通过小猫服务页面打开；离线文件暂不能调用模型。',true);}
  }
  async function api(path,body,signal){
    const res=await fetch(path,{method:'POST',headers,body:JSON.stringify(body),signal});
    if(!res.ok){let data;try{data=await res.json();}catch{}throw new Error(data?.error?.message||'连接没有成功，请稍后再试。');}
    return res;
  }
  function cleanupPlayback(){
    if(playbackSettler){const settle=playbackSettler;playbackSettler=null;settle();}
    if(audio){audio.onended=null;audio.onerror=null;try{if(typeof audio.stop==='function'){audio.stop();audio.disconnect();}else audio.pause();}catch{}audio=null;}
    if(audioURL){URL.revokeObjectURL(audioURL);audioURL=null;}
    if(utterance&&'speechSynthesis'in window)window.speechSynthesis.cancel();
    utterance=null;mouth(0);$('voice-unlock-button').hidden=true;$('device-voice-button').hidden=true;
  }
  function unlockPlayback(){
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx)return;
    try{
      if(!outputContext||outputContext.state==='closed'){
        outputContext=window.DoudouSounds?.getContext()||new AudioCtx();analyser=outputContext.createAnalyser();analyser.fftSize=256;analyser.connect(outputContext.destination);
      }
      // Run this synchronously inside a real tap, before network or permission awaits.
      Promise.resolve(outputContext.resume()).catch(()=>{});
      const silent=outputContext.createBufferSource();silent.buffer=outputContext.createBuffer(1,1,outputContext.sampleRate);silent.connect(outputContext.destination);silent.start();
    }catch{}
  }
  function armSessionTimer(){
    clearTimeout(sessionTimer);
    sessionTimer=setTimeout(()=>{stopEverything({quiet:false});message('步步，我们休息一下。连续麦克风已暂停，想聊时再点一下。');},10*60*1000);
  }
  function suspendAutomatic(){
    continuous=false;wakeEnabled=false;awake=true;clearTimeout(autoListenTimer);clearTimeout(sessionTimer);autoListenTimer=null;sessionTimer=null;
  }
  function scheduleNext(delay=180){
    clearTimeout(autoListenTimer);
    const next=nextListeningMode({continuous,wakeEnabled,awake,hidden:document.hidden});
    if(!next)return;
    autoListenTimer=setTimeout(()=>{if(!busy&&!current&&!audio&&!utterance&&!recording&&!startingMic)startRecording(next,true);},delay);
  }
  function stopEverything({quiet=false}={}){
    clearTimeout(autoListenTimer);autoListenTimer=null;
    version++;current?.abort();current=null;cleanupPlayback();
    recorderEpoch++;discardRecording=true;const active=recorder;recorder=null;recording=false;
    clearTimeout(recordTimer);recordTimer=null;
    try{if(active?.state==='recording')active.stop();}catch{}
    startingMic=false;busy=false;
    if(!quiet){suspendAutomatic();cleanupMic(true);}
    state('idle');refreshButtons();
    if(!quiet)message('麦克风已停止，豆豆陪步步安静一会儿。');
  }
  function endPlayback(ticket){
    if(ticket!==version)return;
    current=null;cleanupPlayback();state('idle');refreshButtons();
    if(wakeEnabled&&!continuous)awake=false;
    if(continuous||wakeEnabled){message(wakeEnabled&&!awake?'在等步步叫“豆豆” · 前台唤醒中':'步步可以接着说，豆豆在听。');scheduleNext();}
    else message(config?.asr.enabled?'想说话时，再点一下小话筒。':'可以在「家长体验 · 文字输入」里继续聊。');
  }
  async function playStreaming(text,ticket){
    const controller=new AbortController();current=controller;let started=false,reader=null;
    message('豆豆听到啦，声音马上来…');refreshButtons();
    try{
      if(!outputContext||outputContext.state==='closed')unlockPlayback();
      if(!outputContext)throw new Error('stream_playback_unavailable');
      if(outputContext.state!=='running')await Promise.race([outputContext.resume(),new Promise(resolve=>setTimeout(resolve,1200))]);
      if(outputContext.state!=='running')throw new Error('stream_playback_unavailable');
      const res=await api('/api/speech/stream',{input:text},controller.signal);
      if(!res.headers.get('content-type')?.startsWith('audio/pcm')||!res.body)throw new Error('invalid_stream');
      reader=res.body.getReader();const sources=new Set();let nextTime=outputContext.currentTime+.10,odd=null,readingDone=false,resolveEnded;
      const ended=new Promise(resolve=>{resolveEnded=resolve;playbackSettler=resolve;});
      audio={stop(){for(const source of sources){source.onended=null;try{source.stop();source.disconnect();}catch{}}sources.clear();reader.cancel().catch(()=>{});resolveEnded();},disconnect(){}};
      const active=audio;
      while(true){
        const {done,value}=await reader.read();if(ticket!==version)return;if(done)break;
        const bytes=odd===null?value:Uint8Array.from([odd,...value]);odd=bytes.length%2?bytes[bytes.length-1]:null;
        const samples=Math.floor(bytes.length/2);if(!samples)continue;
        const buffer=outputContext.createBuffer(1,samples,22050),channel=buffer.getChannelData(0),view=new DataView(bytes.buffer,bytes.byteOffset,samples*2);
        for(let i=0;i<samples;i++)channel[i]=view.getInt16(i*2,true)/32768;
        const source=outputContext.createBufferSource();source.buffer=buffer;source.connect(analyser);sources.add(source);
        source.onended=()=>{sources.delete(source);source.disconnect();if(readingDone&&!sources.size)resolveEnded();};
        nextTime=Math.max(nextTime,outputContext.currentTime+.04);source.start(nextTime);nextTime+=samples/22050;
        if(!started){started=true;state('speaking');message('豆豆正在和步步说话');refreshButtons();const data=new Uint8Array(128);const animate=()=>{if(ticket!==version||audio!==active)return;analyser.getByteTimeDomainData(data);let power=0;for(const v of data)power+=(v-128)**2;mouth(Math.min(1,Math.sqrt(power/data.length)/22));requestAnimationFrame(animate);};requestAnimationFrame(animate);}
      }
      if(!started||odd!==null)throw new Error('incomplete_stream');
      readingDone=true;if(!sources.size)resolveEnded();await ended;if(ticket===version)endPlayback(ticket);
      return true;
    }catch(e){
      if(ticket!==version||e.name==='AbortError')return true;
      controller.abort();await reader?.cancel().catch(()=>{});cleanupPlayback();current=null;
      if(started)throw e;
      streamUnavailable=true;return false; // Retry the compatible file path only before any sound played.
    }
  }
  async function playReply(text,ticket){
    if(!text||voiceMode==='off'||ticket!==version)return;
    pendingSpeech=text;$('replay-button').disabled=true;stop.hidden=false;
    if(voiceMode==='device'){
      if(!('speechSynthesis'in window)){message('这个浏览器不支持设备朗读，文字回复已经准备好。',true);refreshButtons();return;}
      const u=new SpeechSynthesisUtterance(text);utterance=u;u.lang='zh-CN';u.rate=.9;u.pitch=1.1;
      const voices=speechSynthesis.getVoices();u.voice=voices.find(v=>/zh-CN|zh_CN/.test(v.lang))||voices.find(v=>/^zh/.test(v.lang))||null;
      u.onstart=()=>{if(ticket!==version)return;state('speaking');message('正在使用设备朗读（临时体验）');};
      u.onboundary=()=>{if(ticket===version)mouth(.45+Math.random()*.4);};
      u.onend=()=>endPlayback(ticket);u.onerror=()=>{if(ticket===version){suspendAutomatic();cleanupMic(true);endPlayback(ticket);message('设备朗读没有启动，文字回复仍可查看。',true);}};
      speechSynthesis.speak(u);refreshButtons();return;
    }
    try{
      if(config?.tts.streaming&&!streamUnavailable&&await playStreaming(text,ticket))return;
      const controller=new AbortController();current=controller;message('豆豆听到啦，正在准备声音…');refreshButtons();
      const cacheKey=[voiceMode,config?.tts.provider,config?.tts.model,config?.tts.voice,'wav',text].join('|');
      const parts=splitSpeechText(text),blobs=[];
      const prepare=async(index)=>{
        if(cachedSpeech?.key===cacheKey&&cachedSpeech.blobs[index])return cachedSpeech.blobs[index];
        const res=await api('/api/speech',{input:parts[index],format:'wav'},controller.signal);return res.blob();
      };
      let prepared=prepare(0).then(blob=>({blob}),error=>({error}));
      for(let index=0;index<parts.length;index++){
        const result=await prepared;if(ticket!==version)return;if(result.error)throw result.error;
        const blob=result.blob;blobs.push(blob);cachedSpeech={key:cacheKey,blobs};
        if(index+1<parts.length)prepared=prepare(index+1).then(blob=>({blob}),error=>({error}));
        if(!outputContext||outputContext.state==='closed')unlockPlayback();
        if(outputContext){
          if(outputContext.state!=='running')await Promise.race([outputContext.resume(),new Promise(resolve=>setTimeout(resolve,1200))]);
          if(ticket!==version)return;
          if(outputContext.state!=='running')throw Object.assign(new Error('Safari 需要你点一下才能播放声音。'),{name:'PlaybackBlockedError'});
          const buffer=await outputContext.decodeAudioData(await blob.arrayBuffer());if(ticket!==version)return;
          audio=outputContext.createBufferSource();audio.buffer=buffer;audio.connect(analyser);
        }else{audioURL=URL.createObjectURL(blob);audio=new Audio(audioURL);audio.setAttribute('playsinline','');}
        const active=audio;
        const ended=new Promise((resolve,reject)=>{playbackSettler=resolve;active.onended=resolve;active.onerror=()=>reject(new Error('audio playback failed'));});
        if(typeof active.start==='function')active.start();else await active.play();
        if(ticket!==version)return;
        refreshButtons();state('speaking');message('豆豆在说话 · 想接着说，可以点话筒');
        const data=new Uint8Array(128);
        function animateMouth(){if(ticket!==version||audio!==active)return;if(analyser){analyser.getByteTimeDomainData(data);let n=0;for(const v of data)n+=(v-128)**2;mouth(Math.min(1,Math.sqrt(n/data.length)/22));}requestAnimationFrame(animateMouth);}
        requestAnimationFrame(animateMouth);
        await ended;if(ticket!==version)return;playbackSettler=null;cleanupPlayback();
      }
      if(ticket===version){cachedSpeech={key:cacheKey,blobs};endPlayback(ticket);}
    }catch(e){if(ticket!==version||e.name==='AbortError')return;current=null;cleanupPlayback();state('idle');
      if(e.name==='PlaybackBlockedError'||e.name==='NotAllowedError'){$('voice-unlock-button').hidden=false;message('声音已准备好，点「播放豆豆的回答」就能听。');}
      else{message('Safari 没有播放出这段声音，可直接点「使用设备朗读」继续体验。',true);$('device-voice-button').hidden=false;scheduleNext();}refreshButtons();}
  }
  async function sendMessage(text){
    text=text.trim();if(!text)return;
    if(!parentEnabled){showParent();return;}
    await memoryReady;
    const command=parsePetCommand(text);
    if(!command&&!config?.chat.configured){message('聊天后端没有接通，请家长检查服务。',true);return;}
    const scene=$('scene');const context={weather:scene.dataset.weather,activity:scene.dataset.activity,emotion:scene.dataset.emotion,friend:scene.dataset.friend,location:scene.dataset.location};
    stopEverything({quiet:true});const ticket=version;
    if(command){
      if(!command.query)document.dispatchEvent(new CustomEvent('nuomi:command',{detail:{command}}));
      const actual={weather:scene.dataset.weather,activity:scene.dataset.activity,emotion:scene.dataset.emotion,friend:scene.dataset.friend,location:scene.dataset.location};
      const answer=petCommandReply(command,actual);window.DoudouMemory?.recordTurn(text,answer);history=[...history.slice(-14),{role:'user',content:text},{role:'assistant',content:answer}];
      lastReplyAt=performance.now();localCaption=false;lastReply=answer;reply.textContent=answer;input.value='';refreshButtons();unlockPlayback();
      if(voiceMode!=='off')await playReply(answer,ticket);
      else{message('豆豆听懂啦 · 可以接着说');if(wakeEnabled&&!continuous)awake=false;scheduleNext();}
      return;
    }
    busy=true;current=new AbortController();refreshButtons();state('thinking');message('豆豆在认真想你的话…');
    unlockPlayback();
    try{
      const messages=history.at(-1)?.role==='user'&&history.at(-1).content===text?[...history]:[...history.slice(-16),{role:'user',content:text}];
      history=messages.slice(-16); // Keep the child's words even if a follow-up interrupts this reply.
      const res=await api('/api/chat',{messages,context},current.signal),data=await res.json();
      if(ticket!==version)return;
      history=[...messages,{role:'assistant',content:data.reply}].slice(-16);
      if(config.longTermMemory){if(data.memorySaved===false)window.DoudouMemory?.failure();else if(!dialog.hidden)window.DoudouMemory?.refresh();}
      if(scene.dataset.activity===context.activity&&scene.dataset.emotion===context.emotion)document.dispatchEvent(new CustomEvent('nuomi:emotion',{detail:{emotion:data.emotion}}));
      lastReplyAt=performance.now();localCaption=false;lastReply=data.reply;reply.textContent=data.reply;input.value='';busy=false;current=null;state('idle');refreshButtons();
      if(voiceMode!=='off')await playReply(data.reply,ticket);
      else{message('豆豆回复啦 · 可在家长设置中选择朗读方式');if(wakeEnabled&&!continuous)awake=false;scheduleNext();}
    }catch(e){if(ticket!==version||e.name==='AbortError')return;busy=false;current=null;suspendAutomatic();cleanupMic(true);state('idle');refreshButtons();message(e.message,true);}
  }
  function cleanupMic(force=false){
    clearTimeout(recordTimer);recordTimer=null;recording=false;recorder=null;
    if(force||!continuous&&!wakeEnabled){
      micStream?.getTracks().forEach(t=>t.stop());micStream=null;
      try{inputSource?.disconnect();}catch{}inputSource=null;inputMeter=null;
      if(inputContext&&inputContext!==outputContext)inputContext.close().catch(()=>{});inputContext=null;
    }
    refreshButtons();
  }
  function monitorInterruptions(){
    if(bargeMonitor)return;bargeMonitor=true;
    const bytes=new Uint8Array(512);let soundSince=0;
    function frame(){
      if(!micStream||!inputMeter){bargeMonitor=false;return;}
      const eligible=!window.DoudouSounds?.isPlaying()&&continuous&&awake&&!document.hidden&&!recording&&!startingMic&&(busy||current||audio||utterance);
      if(eligible&&inputContext?.state==='running'){
        inputMeter.getByteTimeDomainData(bytes);let power=0;for(const v of bytes)power+=(v-128)**2;
        const rms=Math.sqrt(power/bytes.length)/128;
        // Echo cancellation is requested; a higher speaker threshold avoids quiet echoes.
        if(rms>((audio||utterance)? .065:.028)){
          if(!soundSince)soundSince=performance.now();
          if(performance.now()-soundSince>=180){soundSince=0;startRecording('dialogue',true);}
        }else soundSince=0;
      }else soundSince=0;
      requestAnimationFrame(frame);
    }requestAnimationFrame(frame);
  }
  function enableDefaultContinuous(){if(continuousPreference!==false&&!continuous){continuous=true;awake=true;armSessionTimer();}}
  async function startRecording(kind='dialogue',automatic=false){
    if(!parentEnabled){showParent();return;}
    if(!config?.asr.enabled){suspendAutomatic();cleanupMic(true);$('text-tools').open=true;input.focus();message('语音识别线路暂不可用，请家长先用文字体验。',true);return;}
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){suspendAutomatic();message('这个浏览器暂不支持录音，请换用 Safari 或文字输入。',true);refreshButtons();return;}
    const live=micStream?.getTracks().some(t=>t.readyState==='live');
    if(automatic&&!live){stopEverything();message('麦克风已关闭，点话筒就能继续。');return;}
    stopEverything({quiet:true});unlockPlayback();const ticket=version,captureId=++recorderEpoch;
    listenKind=kind;startingMic=true;heardSpeech=false;refreshButtons();
    if(!live)message('请在 Safari 的提示中允许麦克风；若没有提示，请检查该网站的麦克风权限。');
    try{
      const stream=live?micStream:await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      if(ticket!==version||!startingMic){if(stream!==micStream)stream.getTracks().forEach(t=>t.stop());return;}
      micStream=stream;startingMic=false;discardRecording=false;
      const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(t=>!MediaRecorder.isTypeSupported||MediaRecorder.isTypeSupported(t));
      const active=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);recorder=active;
      const chunks=[],usedType=active.mimeType||'audio/webm';
      active.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      active.onerror=()=>{if(captureId!==recorderEpoch)return;stopEverything();message('录音中断了，请重新点一下话筒。',true);};
      active.onstop=async()=>{
        if(captureId!==recorderEpoch)return;
        const discard=discardRecording,duration=(performance.now()-recordStarted)/1000,hadSpeech=heardSpeech||(kind!=='wake'&&(!inputMeter||inputContext?.state!=='running'));
        cleanupMic();
        if(discard||ticket!==version){state('idle');return;}
        const blob=new Blob(chunks,{type:usedType});
        if(blob.size<100||duration<.4||!hadSpeech){
          emptyRounds++;
          if(kind==='dialogue'&&wakeEnabled&&!continuous){awake=false;message('豆豆先安静等着，叫“豆豆”就回来。');}
          else if(kind==='dialogue')message(continuous?'慢慢想，豆豆的小耳朵还在听。':'刚刚没听清，靠近一点再说一次吧。');
          state(wakeEnabled&&!awake?'waiting':'idle');scheduleNext(650);return;
        }
        emptyRounds=0;busy=true;refreshButtons();state(kind==='wake'?'waiting':'thinking');
        message(kind==='wake'?'小耳朵在听是不是步步叫豆豆…':'小耳朵正在听懂步步的话…');current=new AbortController();
        try{
          const form=new FormData();form.append('file',blob,'recording.'+(usedType.includes('mp4')?'mp4':'webm'));form.append('duration',String(Math.min(duration,20.9)));
          const res=await fetch('/api/transcribe',{method:'POST',headers:{'X-Nuomi-Client':'1','X-Parent-Preview':'1'},body:form,signal:current.signal});
          const data=await res.json();if(ticket!==version)return;
          if(!res.ok)throw new Error(data.error?.message||'刚刚没听清，再说一次吧。');
          busy=false;current=null;
          if((continuous||wakeEnabled)&&isStopPhrase(data.text)&&!parsePetCommand(data.text)){
            stopEverything();localCaption=false;lastReply='好呀，步步，豆豆先休息一会儿，想聊时再来找我。';reply.textContent=lastReply;lastReplyAt=performance.now();refreshButtons();
            if(voiceMode!=='off')await playReply(lastReply,version);return;
          }
          let text=data.text;
          if(kind==='wake'){
            const wake=parseWakePhrase(text);
            if(!wake){
              wakeMisses++;if(wakeMisses>=20){stopEverything();message('周围声音有点多，前台唤醒先暂停，点话筒可以继续。');return;}
              state('waiting');message('在等步步叫“豆豆” · 前台唤醒中');refreshButtons();scheduleNext(700);return;
            }
            wakeMisses=0;awake=true;state('listening');text=wake.command||'豆豆，我是步步，我来找你玩啦。';
          }
          input.value=text;await sendMessage(text);
        }catch(e){if(ticket!==version||e.name==='AbortError')return;busy=false;current=null;suspendAutomatic();cleanupMic(true);state('idle');refreshButtons();message(e.message,true);}
      };
      recordStarted=performance.now();recording=true;active.start(250);
      state(kind==='wake'?'waiting':'listening');refreshButtons();
      message(kind==='wake'?'在等步步叫“豆豆” · 前台唤醒中':continuous?'豆豆在听 · 说完停顿一下，会自动回答':'我在听 · 说完点一下，最长20秒');
      recordTimer=setTimeout(()=>{if(active.state==='recording')active.stop();},kind==='wake'?10000:18000);
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(AudioCtx){
        if(!inputContext||inputContext.state==='closed')inputContext=outputContext||new AudioCtx();
        if(inputContext.state!=='running')Promise.resolve(inputContext.resume()).catch(()=>{});
        if(!inputMeter){inputSource=inputContext.createMediaStreamSource(stream);inputMeter=inputContext.createAnalyser();inputMeter.fftSize=512;inputSource.connect(inputMeter);}
        monitorInterruptions();
        const meter=inputMeter,buffer=new Uint8Array(512);let lastSound=performance.now();
        function detect(){
          if(!recording||ticket!==version||captureId!==recorderEpoch)return;
          meter.getByteTimeDomainData(buffer);let power=0;for(const v of buffer)power+=(v-128)**2;const rms=Math.sqrt(power/buffer.length)/128;
          if(rms>.018){heardSpeech=true;lastSound=performance.now();}
          if(heardSpeech&&performance.now()-lastSound>950&&performance.now()-recordStarted>900){if(active.state==='recording')active.stop();return;}
          requestAnimationFrame(detect);
        }requestAnimationFrame(detect);
      }else if(kind==='wake'){stopEverything();message('当前浏览器无法检测唤醒声音，请先使用手动录音。',true);}
    }catch(e){if(ticket!==version)return;stopEverything();
      const errors={NotAllowedError:'麦克风被 Safari 拒绝了。请在地址栏的网页设置里，将「麦克风」改为「允许」，再点话筒。',NotFoundError:'没有找到可用的麦克风，请检查设备。',NotReadableError:'麦克风可能被其他应用占用，请结束其他通话或录音后重试。',NotSupportedError:'当前 Safari 不支持这种录音格式，请更新系统后重试。',SecurityError:'Safari 阻止了录音，请检查网站权限。'};
      message(errors[e.name]||'录音没有启动（'+e.name+'），可以先用文字和豆豆聊天。',true);}
  }
  document.addEventListener('nuomi:caption',e=>{
    if(busy||current||audio||utterance||recording||startingMic||!e.detail.manual&&performance.now()-lastReplyAt<20000&&lastReply)return;
    reply.textContent=e.detail.text;localCaption=true;refreshButtons();
  });
  $('parent-button').addEventListener('click',showParent);
  $('close-parent').addEventListener('click',closeParent);
  $('enable-preview').addEventListener('click',()=>{activatePreview();unlockPlayback();$('text-tools').open=true;message('可以先在下面输入想对豆豆说的话。');});
  $('enable-mic').addEventListener('click',()=>{activatePreview();$('text-tools').open=false;enableDefaultContinuous();if(setupIntent==='continuous'){continuous=true;armSessionTimer();}setupIntent=null;startRecording();});
  $('enable-wake').addEventListener('click',()=>{activatePreview();$('text-tools').open=false;wakeEnabled=true;awake=false;wakeMisses=0;setupIntent=null;armSessionTimer();startRecording('wake');});
  $('continuous-button').addEventListener('click',()=>{continuousPreference=!continuous;if(!parentEnabled){setupIntent='continuous';showParent();return;}if(continuous){continuous=false;if(wakeEnabled){awake=false;stopEverything({quiet:true});scheduleNext();}else stopEverything();refreshButtons();return;}continuous=true;awake=true;emptyRounds=0;armSessionTimer();startRecording();});
  $('wake-button').addEventListener('click',()=>{if(wakeEnabled){wakeEnabled=false;if(!continuous)stopEverything();else refreshButtons();return;}setupIntent='wake';showParent();});
  $('voice-mode').addEventListener('change',()=>{voiceMode=$('voice-mode').value;stopEverything({quiet:true});refreshButtons();});
  $('sample-voice').addEventListener('click',()=>{if(audio||utterance||current){stopEverything();return;}voiceMode=$('voice-mode').value;if(voiceMode==='off'){$('voice-help').textContent='请先选择一种朗读方式，再试听。';return;}stopEverything({quiet:true});unlockPlayback();playReply('你好呀，我是豆豆。今天想和你一起，听一个小小的故事。',version);});
  $('chat-form').addEventListener('submit',e=>{e.preventDefault();sendMessage(input.value);});
  function resetConversation(recent=[]){
    stopEverything();history=recent.map(({role,content})=>({role,content}));lastReply=[...history].reverse().find(m=>m.role==='assistant')?.content||'';lastReplyAt=0;localCaption=false;cachedSpeech=null;input.value='';reply.textContent=lastReply||'步步，我们开始一段新的小对话吧。';refreshButtons();
  }
  document.addEventListener('nuomi:memory-reset',e=>{resetConversation(e.detail.recent);message('记忆设置已更新。');});
  $('clear-button').addEventListener('click',async()=>{stopEverything();try{if(config?.longTermMemory)await window.DoudouMemory?.clearRecent();resetConversation();message('已开始新对话，家长确认的偏好仍然保留。');}catch(e){message(e.message,true);}});
  $('replay-button').addEventListener('click',()=>{if(!parentEnabled){showParent();return;}stopEverything({quiet:true});unlockPlayback();playReply(lastReply,version);});
  $('voice-unlock-button').addEventListener('click',()=>{stopEverything({quiet:true});unlockPlayback();playReply(pendingSpeech||lastReply,version);});
  $('device-voice-button').addEventListener('click',()=>{stopEverything({quiet:true});voiceMode='device';$('voice-mode').value='device';playReply(pendingSpeech||lastReply,version);});
  stop.addEventListener('click',()=>stopEverything());
  talk.addEventListener('click',()=>{if(recording){if(recorder?.state==='recording')recorder.stop();return;}if(startingMic)return;enableDefaultContinuous();awake=true;startRecording();});
  $('nap-button').addEventListener('click',()=>{suspendAutomatic();stopEverything({quiet:true});cleanupMic(true);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeParent();stopEverything();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){suspendAutomatic();stopEverything({quiet:true});cleanupMic(true);message('页面离开前台，麦克风已暂停。点一下话筒继续。');}});
  window.addEventListener('pagehide',()=>{suspendAutomatic();stopEverything({quiet:true});cleanupMic(true);});
  refreshButtons();getConfig();
})();
