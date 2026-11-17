(() => {
 'use strict';
 window.DoudouLife={create({get,say,sound,hearts,reduced}){
  let care={fullness:78,energy:85,joy:80,discoveries:[]};
  try{const saved=JSON.parse(localStorage.getItem('doudou-care-v1')||'null');if(saved){for(const key of ['fullness','energy','joy'])if(Number.isFinite(saved[key]))care[key]=Math.max(35,Math.min(100,saved[key]));care.discoveries=[...new Set((saved.discoveries||[]).filter(x=>['pet','play','meal','nap','tidy','friend'].includes(x)))];}}catch{}
  let visit='none',location='home',pendingTrip=false,nextVisit=performance.now()+45000+Math.random()*30000,leaveAt=0,transitionAt=0;
  let friendX=760,friendY=0,friendHappy=0,friendPetAt=-Infinity,friendGaze={x:0,y:0},lastTick=performance.now(),lastRender=0,lastSave=0,lastReward=-Infinity,lastFriendBat=0,playTime=0,napTime=0;
  const labels={pet:['♡','摸摸头'],play:['◉','追到小球'],meal:['🥣','吃好饭'],nap:['☾','睡个好觉'],tidy:['▱','叠小被子'],friend:['🐾','交到朋友']};
  function save(){try{localStorage.setItem('doudou-care-v1',JSON.stringify(care));}catch{}}
  function discover(kind){if(!care.discoveries.includes(kind)){care.discoveries.push(kind);get('discovery-count').textContent=String(care.discoveries.length);get('discovery-note').textContent='亮起一枚新的小爪印：'+labels[kind][1];render();save();}}
  function render(){
   for(const key of ['fullness','energy','joy']){get('care-'+key).style.setProperty('--fill',care[key]+'%');get('care-'+key).setAttribute('aria-valuenow',String(Math.round(care[key])));}
   get('care-caption').textContent=care.energy<50?'玩累了也可以盖好被子，慢慢歇一会儿。':care.fullness<55?'跑了一小会儿，可以一起吃点饭饭。':care.discoveries.length>=4?'豆豆和步步，已经越来越有默契啦。':'摸摸、玩玩、照顾它，慢慢发现豆豆的小习惯。';
   get('discovery-count').textContent=String(care.discoveries.length);
   for(const kind of Object.keys(labels)){get('stamp-'+kind).classList.toggle('is-discovered',care.discoveries.includes(kind));get('stamp-'+kind).setAttribute('aria-label',labels[kind][1]+(care.discoveries.includes(kind)?'，已发现':'，还没发现'));}
  }
  function record(kind,now=performance.now()){
   if(kind==='play'&&now-lastReward<=1500)return;
   if(kind==='pet'){care.joy=Math.min(100,care.joy+5);discover('pet');}
   if(kind==='meal'){care.fullness=100;care.energy=Math.min(100,care.energy+6);discover('meal');}
   if(kind==='tidy'){care.joy=Math.min(100,care.joy+6);discover('tidy');}
   if(kind==='friend'){care.joy=Math.min(100,care.joy+8);discover('friend');}
   if(kind==='play'&&now-lastReward>1500){lastReward=now;playTime+=1.5;care.joy=Math.min(100,care.joy+2);if(playTime>=7)discover('play');}
   render();save();
  }
  function sync(){
   const present=['entering','together','leaving'].includes(visit);
   get('scene').dataset.friend=visit;get('scene').dataset.location=location;
   get('friend').style.pointerEvents=present&&visit!=='leaving'?'auto':'none';get('friend-hit').setAttribute('tabindex',present?'0':'-1');get('friend').setAttribute('aria-hidden',String(!present));
   get('friend-status').textContent=visit==='knocking'?(pendingTrip?'团团寄来小花园的邀请':'咚咚！团团来串门啦'):present?(location==='garden'?'在团团的小花园里一起玩':'团团来做客 · 可以摸摸它'):'朋友团团，住在隔壁的小花园';
   get('friend-button').textContent=visit==='knocking'?(pendingTrip?'去做客':'开门迎接'):present?(location==='garden'?'一起回家':'送团团回家'):'请团团来玩';
   get('trip-button').textContent=location==='garden'?'回豆豆家':'去小花园';
   get('friend-bar').classList.toggle('is-knocking',visit==='knocking');get('friend-button').disabled=visit==='leaving';get('trip-button').disabled=visit==='leaving';
  }
  function invite(destination='home'){
   if(!['idle','waiting'].includes(get('scene').dataset.conversation||'idle')){get('friend-status').textContent='豆豆先听步步说完，再和团团一起玩。';return;}
   location=destination;visit='entering';transitionAt=performance.now();friendX=740;leaveAt=transitionAt+90000;pendingTrip=false;sync();
   say(destination==='garden'?'步步，我们到团团的小花园啦！把球轻轻推给它吧。':'团团来串门啦！步步，把毛线球推给我们吧。','两个小伙伴，准备一起玩',true);record('friend');
  }
  function goodbye(){visit='leaving';transitionAt=performance.now();location='home';nextVisit=transitionAt+180000+Math.random()*120000;sync();say('团团挥挥小爪子回家啦，下次再一起玩。','朋友回家了，豆豆还在这里陪步步',true);}
  get('friend-button').addEventListener('click',()=>{if(['entering','together'].includes(visit)){goodbye();return;}if(visit!=='leaving')invite(pendingTrip?'garden':'home');});
  get('trip-button').addEventListener('click',()=>{if(location==='garden')goodbye();else invite('garden');});
  function petFriend(){if(!['entering','together'].includes(visit)||performance.now()-friendPetAt<240)return;friendPetAt=performance.now();friendHappy=performance.now()+2200;hearts(friendX,270);sound('pet');record('friend');say('团团也喜欢步步温柔的小手，呼噜呼噜。','团团眯起眼睛，豆豆开心地摇尾巴',true);}
  get('friend-hit').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();petFriend();});
  get('friend-hit').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();petFriend();}});
  function discoveries(open){get('discovery-panel').hidden=!open;get('discovery-shade').hidden=!open;get('discovery-button').setAttribute('aria-expanded',String(open));(open?get('close-discoveries'):get('discovery-button')).focus?.();}
  get('discovery-button').addEventListener('click',()=>discoveries(get('discovery-panel').hidden));
  get('close-discoveries').addEventListener('click',()=>discoveries(false));get('discovery-shade').addEventListener('click',()=>discoveries(false));
  document.addEventListener('keydown',e=>{if(get('discovery-panel').hidden)return;if(e.key==='Escape')discoveries(false);if(e.key==='Tab'){const nodes=get('discovery-panel').querySelectorAll('button');const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  for(const [kind,[,label]]of Object.entries(labels))get('stamp-'+kind).addEventListener('click',()=>{get('discovery-note').textContent=care.discoveries.includes(kind)?'步步和豆豆已经一起发现：'+label+'。':'慢慢来，试试'+label+'，就会有新的小发现。';});
  sync();render();
  return {record,hasFriend:()=>['entering','together'].includes(visit),
   tick(now,{mode,conversation,dragging,ball,feather,catX,toyMoving}){
    const seconds=Math.min(.1,Math.max(0,(now-lastTick)/1000));lastTick=now;
    if(document.hidden)return;
    const passive=['idle','waiting'].includes(conversation),playing=passive&&['yarn','play'].includes(mode);
    if(mode==='sleep'){care.energy=Math.min(100,care.energy+seconds*.8);napTime+=seconds;if(napTime>=12)discover('nap');}else napTime=0;
    if(playing){care.energy=Math.max(35,care.energy-seconds*.15);care.fullness=Math.max(40,care.fullness-seconds*.025);if(toyMoving)record('play',now);}
    if(now-lastRender>1000){lastRender=now;render();}if(now-lastSave>15000){lastSave=now;save();}
    if(visit==='none'&&now>nextVisit&&passive&&mode!=='sleep'&&!dragging){visit='knocking';pendingTrip=Math.random()<.45;transitionAt=now;sync();}
    if(visit==='knocking'&&now-transitionAt>45000){visit='none';nextVisit=now+180000+Math.random()*120000;sync();}
    if(visit==='entering'&&now-transitionAt>2300){visit='together';sync();}
    if(visit==='together'&&now>leaveAt&&passive&&!dragging)goodbye();
    if(visit==='leaving'&&now-transitionAt>2400){visit='none';sync();}
    if(visit==='together'&&passive&&mode==='yarn'&&!dragging&&Math.abs(ball.x-friendX)<95&&now-lastFriendBat>1800){lastFriendBat=now;ball.vx=-3.4;ball.vy=-3.6;friendHappy=now+750;}
    const visible=['entering','together','leaving'].includes(visit);get('friend').style.opacity=visible?'1':'0';if(!visible)return;
    let target=visit==='leaving'?770:570;
    const aim=mode==='yarn'?ball:mode==='play'?feather:{x:390+catX,y:240};
    if(playing&&visit==='together'){
     target=Math.max(205,Math.min(660,aim.x+90));const main=400+catX;
     if(Math.abs(target-main)<225)target=Math.min(665,main+225);
    }
    if(visit!=='leaving'&&Math.abs(target-(400+catX))<225)target=Math.min(665,400+catX+225);
    friendX+=(target-friendX)*(reduced.matches?1:Math.min(.22,seconds*(visit==='leaving'?2.8:playing?3:2)));
    friendY=playing&&!reduced.matches?-Math.abs(Math.sin(now/1000*8))*9:0;
    get('friend').setAttribute('transform',`translate(${friendX} ${440+friendY}) scale(.85)`);
    get('friend-shadow').setAttribute('cx',String(friendX));get('friend-shadow').setAttribute('opacity',visible?'.17':'0');
    friendGaze.x+=(Math.max(-1,Math.min(1,(aim.x-friendX)/160))-friendGaze.x)*.14;
    friendGaze.y+=(Math.max(-1,Math.min(1,(aim.y-300)/150))-friendGaze.y)*.14;
    get('friend-pupils').setAttribute('transform',`translate(${friendGaze.x*5} ${friendGaze.y*4})`);
    const happy=now<friendHappy;get('friend').classList.toggle('friend-sleepy',mode==='sleep');get('friend').classList.toggle('friend-eating',mode==='eat');get('friend').classList.toggle('friend-happy',happy);get('friend').classList.toggle('friend-blink',Math.sin(now/1000*.7)> .992);
    get('friend-head').style.transform=`translateY(${mode==='eat'?100+Math.sin(now/1000*10)*2:0}px) rotate(${mode==='sleep'?7:happy?Math.sin(now/1000*5)*5:friendGaze.x*4}deg)`;
    get('friend-tail').style.transform=`rotate(${reduced.matches?0:Math.sin(now/1000*(playing?5:2))*12}deg)`;
    for(const [id,phase]of [['friend-paw-left',0],['friend-paw-right',Math.PI]])get(id).style.transform=`translateY(${!reduced.matches&&(playing||mode==='fold')?-Math.max(0,Math.sin(now/1000*(playing?9:5)+phase))*14:0}px)`;
   }};
 }};
})();
