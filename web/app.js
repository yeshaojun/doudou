(() => {
  'use strict';
  const $=id=>document.getElementById(id), scene=$('scene'),cat=$('cat'),head=$('head'),tail=$('tail');
  const pupils=document.querySelector('.pupil'),mood=$('mood-text'),speech=$('speech'),hit=$('head-hit');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let voiceCommand=false;
  function sound(name){if(!voiceCommand)document.dispatchEvent(new CustomEvent('nuomi:sfx',{detail:{sound:name}}));}
  let weather='sunny',emotion='happy',quiltFolded=false,commandActivity=null;
  let mode='idle',conversation='idle',mouthLevel=0,happyUntil=0,nextBlink=performance.now()+2100,blinkUntil=0;
  let earUntil=0,nextEar=performance.now()+4100,autoAt=performance.now()+3800,activityEnd=0,activityStart=0,autoIndex=0;
  let target={x:400,y:230},gaze={x:0,y:0},lastPointer=0,catX=0,catY=0,lastPet=0,pets=0,pressed=false;
  let activeToyPointer=null,toyPointerAt=0,toyDistance=0;
  const life=window.DoudouLife?.create({get:$,say,sound,hearts,reduced});
  let feather={x:570,y:220},ball={x:565,y:438,vx:0,vy:0,angle:0},dragging=false,dragLast=null,lastBat=0;
  const labels={eat:['啊呜啊呜，步步，饭饭好香呀。','豆豆在小口吃饭 · 吃完会舔舔嘴巴'],fold:['先把这边折过来，再拍拍平。步步也来试试？','豆豆在认真叠被子'],rainwatch:['滴答滴答！步步，我们在小伞下面听听雨吧。','豆豆躲在伞下，听小雨唱歌'],windbrace:['呼——小风来啦！豆豆把小爪子站稳。','小风吹动耳朵，豆豆眯起了眼睛'],idle:['步步，豆豆在这里呀。','一只心情很好的豆豆'],yarn:['步步的小毛线球，豆豆来啦！','豆豆正在追毛线球 · 可以拖动或轻推'],play:['步步，带着小羽毛跑一跑！','豆豆盯住了步步的小羽毛'],groom:['先把小脸洗干净，再陪步步玩。','豆豆在认真洗脸'],stretch:['前爪伸一伸，小尾巴也伸一伸。','豆豆正在伸一个大大的懒腰'],yawn:['哈啊……刚刚打了个小哈欠。','豆豆打了个哈欠，又精神啦'],highfive:['啪！和步步击掌成功。','豆豆举起了软软的小爪子'],tickle:['痒痒的，步步的小手好温柔。','小肚皮痒痒 · 豆豆扭呀扭'],sleep:['呼……步步，梦里见。','嘘，豆豆正在做一个软软的梦']};
  const feelings={happy:['开心','♡'],curious:['好奇','✧'],content:['满足','☺'],sleepy:['困困','☾'],calm:['安心','❀']};
  function feel(next){
    emotion=feelings[next]?next:'calm';scene.dataset.emotion=emotion;
    $('emotion-badge').textContent=feelings[emotion][1]+' 心情 · '+feelings[emotion][0];$('emotion-icon').textContent=feelings[emotion][1];
  }
  function weatherChange(next){
    weather=['sunny','rain','wind'].includes(next)?next:weather==='sunny'?'rain':weather==='rain'?'wind':'sunny';scene.dataset.weather=weather;
    const icons={sunny:'☀️',rain:'🌧️',wind:'🍃'},names={sunny:'晴天',rain:'下雨',wind:'刮风'};
    $('weather-icon').textContent=icons[weather];$('weather-label').textContent=names[weather];$('weather-button').setAttribute('aria-label','切换天气，现在是'+names[weather]);
    if(mode==='sleep'){say(weather==='rain'?'小雨滴答滴答，豆豆盖好被子继续睡。':'小被子暖暖的，豆豆安心睡着。',null,true);return;}
    if(['eat','fold'].includes(mode))return;
    feel(weather==='sunny'?'happy':'curious');
    setMode(weather==='rain'?'rainwatch':weather==='wind'?'windbrace':'stretch',weather==='sunny'?2800:5000,true);
  }
  function say(text,status,manual=false){
    if(!['idle','waiting'].includes(conversation))return;
    speech.textContent=text;if(status)mood.textContent=status;
    document.dispatchEvent(new CustomEvent('nuomi:caption',{detail:{text,manual}}));
  }
  function setMode(next,duration=0,manual=false){
    if(next!==commandActivity)commandActivity=null;
    mode=next;activityStart=performance.now();activityEnd=duration?activityStart+duration:0;
    scene.dataset.activity=next;cat.dataset.activity=next;
    $('feed-button').setAttribute('aria-pressed',String(next==='eat'));$('fold-button').setAttribute('aria-pressed',String(next==='fold'));
    if(next==='eat')feel('content');else if(next==='sleep'||next==='yawn')feel('sleepy');else if(['yarn','play','rainwatch','windbrace'].includes(next))feel('curious');else if(next==='fold'||next==='groom')feel('calm');else if(['stretch','highfive','tickle'].includes(next))feel('happy');
    scene.classList.toggle('is-playing',next==='play');
    scene.classList.toggle('is-sleeping',next==='sleep');cat.classList.toggle('is-sleeping',next==='sleep');
    $('play-button').setAttribute('aria-pressed',String(next==='play'));
    $('feather-button').setAttribute('aria-pressed',String(next==='play'));
    $('yarn-button').setAttribute('aria-pressed',String(next==='yarn'));
    $('nap-button').setAttribute('aria-pressed',String(next==='sleep'));
    $('nap-label').innerHTML=next==='sleep'?'叫醒它<small>一起伸个小懒腰</small>':'打个盹<small>陪我做一个好梦</small>';
    if(manual){const effect={eat:'eat',sleep:'sleep',fold:'curious',stretch:'wake',highfive:'play',tickle:'play',groom:'content',yarn:'play',play:'play',rainwatch:'curious',windbrace:'curious'}[next];if(effect)sound(effect);}
    if(labels[next])say(...labels[next],manual);
    $('hint-text').textContent=next==='sleep'?'轻轻摸摸脑袋，就能叫醒豆豆。':next==='yarn'?'拖动毛线球，或轻轻推一下，豆豆会追过去。':next==='play'?'移动鼠标或滑动手指，带着小羽毛跑一跑。':'试试毛线球、小肚皮和小爪子，每处都有小回应。';
    if(next==='idle')autoAt=performance.now()+6500+Math.random()*4500;
  }
  function point(event){const m=scene.getScreenCTM();return m?new DOMPoint(event.clientX,event.clientY).matrixTransform(m.inverse()):{x:400,y:230};}
  function hearts(x,y){
    if(reduced.matches)return;
    for(let i=0;i<4;i++){
      const el=document.createElementNS('http://www.w3.org/2000/svg','path');el.setAttribute('d','M0 4C-18-5-11-17 0-9 11-17 18-5 0 4Z');el.setAttribute('fill',['#dba395','#d6b979','#b2bf9c','#e5c3b6'][i]);$('particles').appendChild(el);
      const start=performance.now(),px=x+(Math.random()-.5)*90;
      function float(now){const t=(now-start)/1400;if(t>=1){el.remove();return;}el.setAttribute('transform',`translate(${px+Math.sin(t*4+i)*14} ${y-t*90}) scale(${.5+Math.sin(t*Math.PI)*.2})`);el.setAttribute('opacity',String(Math.sin(t*Math.PI)*.9));requestAnimationFrame(float);}requestAnimationFrame(float);
    }
  }
  function pet(p={x:400+catX,y:170}){
    const now=performance.now();if(now-lastPet<240)return;const sleeping=mode==='sleep';lastPet=now;
    setMode('idle');feel('happy');happyUntil=now+1800;sound(sleeping?'wake':'pet');
    const texts=['步步，再摸一下下嘛。','步步的小手，暖乎乎的。','呼噜呼噜，豆豆喜欢这样。'];
    say(sleeping?'唔，是步步呀……蹭蹭。':texts[pets++%texts.length],'呼噜呼噜 · 豆豆被温柔包围啦',true);
    hearts(p.x,p.y);life?.record('pet');autoAt=now+8000;
  }
  function yarn(manual=true){if(mode==='sleep')setMode('idle');setMode('yarn',manual?0:13000,manual);if(Math.abs(ball.vx)<.5)ball.vx=ball.x>400?-2.5:2.5;ball.vy=-2;}
  function featherPlay(){if(mode==='play'){setMode('idle',0,true);return;}setMode('play',0,true);target={x:565,y:210};lastPointer=0;}
  function nap(){if(mode==='sleep'){setMode('stretch',2500,true);return;}happyUntil=0;ball.vx=0;setMode('sleep',0,true);}
  function smallAction(kind){happyUntil=performance.now()+1800;setMode(kind,kind==='groom'?3500:kind==='stretch'?2800:1900,true);if(kind==='highfive')hearts(470+catX,315);}
  function bindAction(element,callback){element.addEventListener('pointerdown',e=>{if(mode==='play')return;e.preventDefault();e.stopPropagation();callback(point(e));});element.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();callback();}});}
  bindAction($('belly-hit'),()=>smallAction('tickle'));bindAction($('paw-hit'),()=>smallAction('highfive'));
  hit.addEventListener('pointerdown',e=>{if(mode==='play')return;pressed=true;hit.setPointerCapture(e.pointerId);pet(point(e));e.preventDefault();});
  hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pet();}});
  hit.addEventListener('lostpointercapture',()=>{pressed=false;});
  document.addEventListener('pointerup',()=>{pressed=false;});document.addEventListener('pointercancel',()=>{pressed=false;});
  document.addEventListener('pointermove',e=>{
    const p=point(e);target=p;lastPointer=performance.now();
    if(pressed&&mode!=='play'){const dx=p.x-400-catX,dy=p.y-218;if(dx*dx/(135*135)+dy*dy/(92*92)<1.2)pet(p);}
  },{passive:true});
  scene.addEventListener('pointerdown',e=>{target=point(e);lastPointer=performance.now();if(mode==='play'){activeToyPointer=e.pointerId;toyPointerAt=performance.now();scene.setPointerCapture(e.pointerId);e.preventDefault();}});
  scene.addEventListener('pointermove',e=>{if(mode==='play'&&activeToyPointer===e.pointerId){const p=point(e);toyDistance+=Math.hypot(p.x-target.x,p.y-target.y);target=p;lastPointer=performance.now();toyPointerAt=lastPointer;}});
  const endToy=e=>{if(activeToyPointer===e.pointerId)activeToyPointer=null;};scene.addEventListener('pointerup',endToy);scene.addEventListener('pointercancel',endToy);scene.addEventListener('lostpointercapture',endToy);
  const yarnNode=$('yarn');
  yarnNode.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();yarn();dragging=true;const p=point(e);dragLast={x:p.x,y:p.y,time:performance.now()};yarnNode.setPointerCapture(e.pointerId);toyPointerAt=performance.now();});
  yarnNode.addEventListener('pointermove',e=>{if(!dragging)return;const p=point(e),now=performance.now(),dt=Math.max(8,now-dragLast.time);ball.vx=Math.max(-6,Math.min(6,(p.x-dragLast.x)*16/dt));ball.vy=Math.max(-5,Math.min(4,(p.y-dragLast.y)*16/dt));toyDistance+=Math.hypot(p.x-dragLast.x,p.y-dragLast.y);toyPointerAt=now;ball.x=Math.max(155,Math.min(665,p.x));ball.y=Math.max(220,Math.min(438,p.y));target={x:ball.x,y:ball.y};lastPointer=now;dragLast={x:p.x,y:p.y,time:now};});
  function releaseBall(){if(!dragging)return;dragging=false;dragLast=null;if(Math.abs(ball.vx)<1.5)ball.vx=ball.x>400?-3:3;ball.vy=Math.min(ball.vy,-2.5);}
  yarnNode.addEventListener('pointerup',releaseBall);yarnNode.addEventListener('pointercancel',()=>{dragging=false;dragLast=null;});yarnNode.addEventListener('lostpointercapture',releaseBall);
  yarnNode.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();yarn();ball.vx=ball.x>400?-4:4;}});
  $('pet-button').addEventListener('click',()=>pet());$('play-button').addEventListener('click',featherPlay);$('feather-button').addEventListener('click',featherPlay);
  $('yarn-button').addEventListener('click',()=>{if(mode==='yarn')setMode('idle',0,true);else yarn();});$('stretch-button').addEventListener('click',()=>smallAction('stretch'));$('nap-button').addEventListener('click',nap);
  $('feed-button').addEventListener('click',()=>{setMode('eat',6000,true);});
  $('fold-button').addEventListener('click',()=>{quiltFolded=false;setMode('fold',5200,true);});
  $('weather-button').addEventListener('click',weatherChange);
  $('emotion-button').addEventListener('click',()=>{if(mode==='sleep'){say('豆豆困困的，抱着小被子做梦呢。',null,true);return;}const text={happy:'步步摸摸我，我就开心得想摇尾巴。',curious:'豆豆有点好奇，想和步步一起看看这个世界。',content:'肚子暖暖的，心里也暖暖的。谢谢步步陪我吃饭。',calm:'慢慢呼气，豆豆和步步一起安静一小会儿。',sleepy:'眼皮有一点点重，可以陪豆豆打个盹吗？'};say(text[emotion],null,true);happyUntil=performance.now()+2200;hearts(400+catX,210);});
  document.addEventListener('nuomi:emotion',e=>{if(mode==='idle')feel(e.detail.emotion);});
  document.addEventListener('nuomi:command',e=>{
    const command=e.detail?.command;if(!command||typeof command!=='object')return;
    voiceCommand=true;
    if(['rain','wind','sunny'].includes(command.weather))weatherChange(command.weather);
    switch(command.action){
      case 'eat':setMode('eat',6000,true);break;
      case 'sleep':if(mode!=='sleep')nap();break;
      case 'wake':setMode('stretch',2800,true);break;
      case 'fold':quiltFolded=false;setMode('fold',5200,true);break;
      case 'yarn':yarn();break;
      case 'play':if(mode!=='play')featherPlay();break;
      case 'pet':pet();break;
      case 'stretch':case 'highfive':case 'groom':smallAction(command.action);break;
      case 'idle':setMode('idle',0,true);feel('calm');break;
    }
    voiceCommand=false;
    if(command.action||command.weather)commandActivity=mode==='idle'?null:mode;
  });
  feel('happy');scene.dataset.weather='sunny';
  $('theme-button').addEventListener('click',()=>{const night=document.body.classList.toggle('night');$('theme-button').setAttribute('aria-pressed',String(night));$('theme-button').setAttribute('aria-label',night?'切换到白天':'切换到夜晚');say(night?'步步，月亮出来啦。':'暖暖的太阳，照到豆豆的小肚皮啦。',null,true);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&['play','yarn'].includes(mode))setMode('idle');});
  document.addEventListener('nuomi:mouth',e=>{mouthLevel=Number(e.detail)||0;});
  document.addEventListener('nuomi:state',e=>{
    const state=e.detail.state;conversation=state;scene.dataset.conversation=state;
    if(!['idle','waiting'].includes(state)){
      if(!commandActivity&&!['eat','sleep','fold','rainwatch','windbrace','stretch','groom','highfive','tickle'].includes(mode)){setMode('idle');happyUntil=0;}
      dragging=false;
    }
    ['listening','thinking','speaking','waiting'].forEach(name=>cat.classList.toggle('is-'+name,state===name));
    const states={listening:'豆豆竖起小耳朵，认真听步步说',thinking:'豆豆的小脑袋正在转呀转',speaking:'豆豆正在和步步说话',waiting:'小耳朵待命 · 在等步步叫“豆豆”'};
    if(mode!=='idle'&&labels[mode])mood.textContent=labels[mode][1];else if(states[state])mood.textContent=states[state];else if(labels[mode])mood.textContent=labels[mode][1];
    autoAt=performance.now()+7500;
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pressed=false;dragging=false;activeToyPointer=null;autoAt=performance.now()+7000;}});
  let previous=0;
  function animate(now){
    const dt=Math.min((now-previous)/16.67,3);previous=now;const t=now/1000,passive=['idle','waiting'].includes(conversation)||commandActivity===mode,sleeping=mode==='sleep';
    if(activityEnd&&now>activityEnd){const ended=mode;activityEnd=0;if(ended==='fold')quiltFolded=true;setMode('idle');if(ended==='eat'){life?.record('meal');sound('content');feel('content');happyUntil=now+2300;say('吃饱啦！豆豆舔舔嘴巴，拍拍小肚皮。','豆豆吃得饱饱的，心情很满足',true);}if(ended==='fold'){life?.record('tidy');sound('content');feel('content');say('方方的小被子叠好啦，和步步击个掌！','小被子叠好了 · 豆豆有点小得意',true);}}
    if(mode==='idle'&&passive&&!pressed&&now>autoAt&&!reduced.matches&&!document.hidden){
      const sequence=['yarn','groom','stretch','yawn','yarn'];const next=sequence[autoIndex++%sequence.length];if(next==='yarn')yarn(false);else setMode(next,next==='groom'?3500:2600);
    }
    if(!Number.isFinite(ball.vx))ball.vx=0;if(!Number.isFinite(ball.vy))ball.vy=0;if(!Number.isFinite(ball.angle))ball.angle=0;if(!Number.isFinite(catX))catX=0;
    if(!dragging&&!reduced.matches){
      ball.vy+=.22*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
      if(ball.y>438){ball.y=438;ball.vy=Math.abs(ball.vy)>.7?-Math.abs(ball.vy)*.48:0;ball.vx*=.992;}
      if(ball.x<180){ball.x=180;ball.vx=Math.abs(ball.vx)||2.2;}if(ball.x>640){ball.x=640;ball.vx=-Math.abs(ball.vx)||-2.2;}
      if(mode!=='yarn')ball.vx*=Math.pow(.94,dt);
      ball.angle+=ball.vx*dt*2;
      if(mode==='yarn'&&passive){if(Math.abs(ball.vx)<1)ball.vx=ball.x>400?-2.5:2.5;
        if(now-lastBat>1500&&Math.abs(ball.x-(400+catX))<135){lastBat=now;ball.vx=(ball.x>400+catX?1:-1)*(3+Math.random());ball.vy=-3.7;}
      }
    }
    $('yarn').setAttribute('transform',`translate(${ball.x} ${ball.y}) rotate(${ball.angle})`);
    $('yarn-shadow').setAttribute('cx',String(ball.x));$('yarn-shadow').setAttribute('opacity',String(.12+(ball.y-260)/178*.12));
    $('yarn-thread').setAttribute('d',`M${ball.x} ${ball.y+16}q34 29 58 10t35 10`);
    const chasing=passive&&(mode==='yarn'||mode==='play');
    const chaseX=mode==='yarn'?ball.x:feather.x;
    const desiredX=chasing?Math.max(-160,Math.min(life?.hasFriend()?20:160,chaseX-400-(life?.hasFriend()?65:Math.sign(chaseX-400-catX||1)*58))):life?.hasFriend()?-65:0;
    catX+=(desiredX-catX)*(1-Math.pow(.96,dt));
    const running=chasing&&Math.abs(desiredX-catX)>5&&!reduced.matches;
    const hop=running?-Math.abs(Math.sin(t*7))*13:mode==='tickle'&&!reduced.matches?-Math.abs(Math.sin(t*9))*4:0;
    catY+=(hop-catY)*.22;const elapsed=(now-activityStart)/1000;
    let rotation=running?Math.sin(t*6)*3:mode==='tickle'?Math.sin(t*11)*3:mode==='windbrace'?-5+Math.sin(t*5)*2:0;
    cat.setAttribute('transform',`translate(${catX} ${catY}) rotate(${rotation} 400 440)`);$('cat-shadow').setAttribute('cx',String(405+catX));
    let x=target.x,y=target.y;if(now-lastPointer>3400){x=400+Math.sin(t*.46)*68;y=242+Math.sin(t*.32)*25;if(mode==='play'){x=400+Math.sin(t*.9)*160;y=215+Math.cos(t*1.4)*65;}}
    if(mode==='yarn'){x=ball.x;y=ball.y;}
    const aimX=sleeping?0:Math.max(-1,Math.min(1,(x-400-catX)/230)),aimY=sleeping?.2:Math.max(-1,Math.min(1,(y-245)/190));
    const follow=1-Math.pow(.86,dt);gaze.x+=(aimX-gaze.x)*follow;gaze.y+=(aimY-gaze.y)*follow;
    pupils.setAttribute('transform',`translate(${gaze.x*6.5} ${gaze.y*5})`);
    const breath=reduced.matches?0:Math.sin(t*(sleeping?1.35:1.8)),happy=now<happyUntil;
    const stretch=mode==='stretch'?Math.sin(Math.min(1,elapsed/2.8)*Math.PI):0;
    const grooming=mode==='groom',yawning=mode==='yawn';
    head.style.transform=`translate(${gaze.x*3}px,${breath*1.5+stretch*12+(mode==='eat'?Math.min(1,elapsed)*91+Math.sin(t*11)*3:mode==='fold'?18:0)}px) rotate(${gaze.x*3+(happy?Math.sin(t*4)*3:0)+(sleeping?5:0)+(grooming?9+Math.sin(t*5)*3:0)+(mode==='eat'?Math.sin(t*9)*3:0)}deg)`;
    $('body-breathe').style.transform=`scale(${1+breath*.005+stretch*.06},${1+breath*.009-stretch*.045})`;
    tail.style.transform=`rotate(${reduced.matches?0:Math.sin(t*(happy?4.5:sleeping?.65:running?3.8:1.6))*(sleeping?2:running?15:happy?12:8)}deg)`;
    if(now>nextBlink&&!sleeping&&!happy){blinkUntil=now+150;nextBlink=now+2500+Math.random()*4200;if(Math.random()<.22)nextBlink=now+340;}
    cat.classList.toggle('is-blinking',now<blinkUntil&&!happy&&!sleeping);cat.classList.toggle('is-happy',happy||grooming||yawning||mode==='eat'||mode==='windbrace');
    if(now>nextEar&&!reduced.matches){earUntil=now+480;nextEar=now+4500+Math.random()*6500;}
    $('ear-left').style.transform=`rotate(${now<earUntil?Math.sin((earUntil-now)/480*Math.PI*2)*7:0}deg)`;$('ear-right').style.transform=`rotate(${now<earUntil?Math.sin((earUntil-now)/480*Math.PI*2+.7)*-4:0}deg)`;
    let right=0,left=0,rightY=0,leftY=0,rightX=0,leftX=0;
    if(mode==='play'){right=-23-gaze.x*9;rightY=-13;}
    if(running){right=Math.sin(t*9)*15;left=-Math.sin(t*9)*15;rightY=-Math.max(0,Math.sin(t*9))*14;leftY=-Math.max(0,-Math.sin(t*9))*14;}
    if(grooming){right=30+Math.sin(t*8)*10;rightX=-24;rightY=-65;}
    if(mode==='highfive'){right=-12+Math.sin(t*8)*9;rightX=15;rightY=-82;}
    if(mode==='tickle'){left=Math.sin(t*10)*12;right=-left;}
    if(mode==='eat'){rightX=10;leftX=-10;rightY=8;leftY=8;}
    if(mode==='fold'){rightY=-10-Math.max(0,Math.sin(t*5))*16;leftY=-10-Math.max(0,-Math.sin(t*5))*16;rightX=-24;leftX=24;}
    $('food-bowl').style.opacity=mode==='eat'?'1':'0';$('kibble').style.opacity=String(mode==='eat'?Math.max(.15,1-elapsed/7):1);
    $('sleep-quilt').style.opacity=sleeping?'1':'0';$('sleep-quilt').setAttribute('transform',`translate(0 ${breath*1.2})`);
    $('fold-quilt').style.opacity=mode==='fold'||quiltFolded&&!sleeping&&mode!=='eat'?'1':'0';
    const fold=mode==='fold'?Math.min(1,elapsed/3):quiltFolded?1:0;
    $('quilt-base').setAttribute('transform',`translate(${247*fold} 0) scale(${1-fold*.5} 1)`);
    $('quilt-flap').setAttribute('transform',`translate(${804*fold} 0) scale(${1-fold*2} 1)`);
    $('rain-umbrella').style.opacity=weather==='rain'?'1':'0';
    right+=-stretch*15;left+=stretch*15;rightX+=stretch*12;leftX-=stretch*12;
    $('paw-right').style.transform=`translate(${rightX}px,${rightY}px) rotate(${right}deg)`;$('paw-left').style.transform=`translate(${leftX}px,${leftY}px) rotate(${left}deg)`;
    const openMouth=conversation==='speaking'||yawning||mode==='eat';$('talk-mouth').setAttribute('opacity',openMouth?'.9':'0');$('talk-mouth').setAttribute('ry',String(yawning?2+Math.sin(Math.min(1,elapsed/2.6)*Math.PI)*11:mode==='eat'?2+Math.abs(Math.sin(t*10))*3:1+Math.min(1,mouthLevel)*8));
    if(mode==='play'){const fx=Math.max(180,Math.min(625,x)),fy=Math.max(125,Math.min(375,y));feather.x+=(fx-feather.x)*follow;feather.y+=(fy-feather.y)*follow;$('feather').setAttribute('transform',`translate(${feather.x} ${feather.y}) rotate(${Math.sin(t*3)*12})`);$('toy-string').setAttribute('d',`M${feather.x} ${feather.y-24}Q${feather.x+32} ${feather.y-100} ${feather.x+105} ${feather.y-140}`);}
    life?.tick(now,{mode,conversation,dragging:dragging||activeToyPointer!==null,ball,feather,catX,toyMoving:toyDistance>15&&now-toyPointerAt<1000});
    if(toyDistance>15&&now-toyPointerAt>1000)toyDistance=0;
    requestAnimationFrame(animate);
  }
  document.addEventListener('keydown',e=>{if(e.key==='Tab'){scene.classList.add('keyboard-focus');document.body.classList.add('keyboard-navigation');}});
  document.addEventListener('pointerdown',()=>{scene.classList.remove('keyboard-focus');document.body.classList.remove('keyboard-navigation');},{capture:true});
  requestAnimationFrame(animate);
})();
