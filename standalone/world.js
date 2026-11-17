(() => {
 'use strict';
 const $=id=>document.getElementById(id),scene=$('scene'),room=document.querySelector('.room');
 const svg=content=>`<svg viewBox="0 0 64 56" fill="none" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;
 const art={
 food:svg('<ellipse cx="32" cy="45" rx="25" ry="5" fill="#b89d7522"/><path d="M9 30h46l-6 15q-18 9-34 0Z" fill="#b1c4aa" stroke="#859d7d" stroke-width="2"/><ellipse cx="32" cy="30" rx="23" ry="7" fill="#e6e8cb" stroke="#859d7d" stroke-width="2"/><path d="M17 18q13-16 27 0-14 15-27 0l-10-8v16Z" fill="#e6b77e" stroke="#b98e5e" stroke-width="2"/><circle cx="38" cy="16" r="1.7" fill="#806d50"/><path d="M26 13v10" stroke="#c39766" stroke-width="2"/>'),
 yarn:svg('<circle cx="31" cy="27" r="21" fill="#d6b5bc" stroke="#b796a0" stroke-width="2"/><path d="M12 18q16 15 37 17M11 27q15 14 31 17M20 9q15 13 30 15M19 44q16-18 19-36M32 48q17-19 18-26M12 37q15-12 14-30m17 37q13 14 18 5" stroke="#f6e2e3" stroke-width="2"/>'),
 feather:svg('<path d="m15 51 28-43" stroke="#a38b65" stroke-width="3"/><path d="M25 36C-1 26 19 7 42 7c8 14-3 30-17 29Z" fill="#a7bb96" stroke="#849d7e" stroke-width="1.5"/><path d="M30 32C57 43 63 17 42 7c-9 5-15 14-12 25Z" fill="#e2b8a7" stroke="#bd998d" stroke-width="1.5"/><path d="M20 31 37 13m-13 8 1 5 6 1" stroke="#edf0d1" stroke-width="1.5"/><circle cx="17" cy="48" r="5" fill="#e9c883"/>'),
 blanket:svg('<path d="M10 15q23-9 45 0l-3 34q-23-8-45 0Z" fill="#bdc9a7" stroke="#8fa27e" stroke-width="2"/><path d="M10 15q23-9 45 0l-1 7q-22-8-45 0Z" fill="#eee9cc"/><path d="m19 28 6 6m-6 0 6-6m12 10 6 6m-6 0 6-6" stroke="#f7efd9" stroke-width="2"/>'),
 brush:svg('<path d="m17 17 36 25q5 5 1 9-4 3-8-1L12 23Z" fill="#aec6b4" stroke="#819f8e" stroke-width="2"/><rect x="10" y="8" width="23" height="13" rx="6" transform="rotate(30 21 15)" fill="#f7f0d8" stroke="#b9b99d"/><path d="m16 7 2-4m3 6 2-4m3 7 2-4" stroke="#a0c5bf" stroke-width="3"/>'),
 towel:svg('<path d="m13 9 38 4-3 35-39-5Z" fill="#ebc3ac" stroke="#bf9880" stroke-width="2"/><path d="m13 17 37 4M11 36l37 4" stroke="#fff2d9" stroke-width="3"/><path d="m15 44-1 5m8-4-1 5m8-4-1 5m8-4-1 5m8-4-1 5" stroke="#bf9880" stroke-width="2"/><path d="M45 4v7m-4-3h8" stroke="#e7c370" stroke-width="2"/>'),
 box:svg('<path d="m10 21 22-8 22 8-3 26-20 6-20-7Z" fill="#d5ad7c" stroke="#af865b" stroke-width="2"/><path d="m10 21-5-8 26-2 27 1-4 9-23 7Z" fill="#ecd0a7" stroke="#af865b" stroke-width="2"/><path d="M31 28v24m-10-5V34m-4 4 4-4 4 4" stroke="#b88f60" stroke-width="2"/>'),
 tidy:svg('<rect x="8" y="25" width="48" height="24" rx="6" fill="#aebd98" stroke="#8c9e79" stroke-width="2"/><rect x="11" y="15" width="43" height="23" rx="6" fill="#d8ddbb" stroke="#9bac89" stroke-width="2"/><path d="m25 22 8 8m-8 0 8-8M12 43h40" stroke="#fff3d7" stroke-width="2"/><path d="M18 8q9-9 22-1m-2-5 5 6-8 1" stroke="#ad9674" stroke-width="2"/>')};
 for(const button of document.querySelectorAll('.toy-dock button'))button.querySelector('.item-art').innerHTML=art[button.dataset.item||button.dataset.native||(button.id==='brush-open'?'brush':'tidy')];
 const friendFace=svg('<path d="m10 23-1-15 14 8h18L55 8l-2 16q9 26-21 27Q2 50 10 23Z" fill="#c8c8ba" stroke="#99a18d" stroke-width="2"/><path d="M12 33q20-18 40 0-3 15-20 15T12 33" fill="#fff4db"/><ellipse cx="22" cy="29" rx="5" ry="6" fill="#6e8a73"/><ellipse cx="42" cy="29" rx="5" ry="6" fill="#6e8a73"/><circle cx="21" cy="27" r="1.8" fill="#fff"/><circle cx="41" cy="27" r="1.8" fill="#fff"/><path d="m29 37 3 3 3-3Z" fill="#c7988d"/>');
 const gardenIcon=svg('<path d="M18 49q-2-12 10-17t13-14" stroke="#dec5a0" stroke-width="10"/><path d="M42 36V19" stroke="#a78c62" stroke-width="4"/><path d="M24 18q-3-16 13-14 11-7 18 5 13 13-2 20-11 8-20-1-11 0-9-10Z" fill="#a8bc8e" stroke="#8ea577" stroke-width="1.5"/><path d="M11 43v-9m-5 4 5-4 5 4" stroke="#9aac7e" stroke-width="2"/><circle cx="10" cy="31" r="3" fill="#e2b7a0"/>');
 $('friend-button').insertAdjacentHTML('afterbegin',friendFace);$('trip-button').insertAdjacentHTML('afterbegin',gardenIcon);
 const captions={food:'把小鱼放到豆豆身边，啊呜啊呜。',blanket:'把小被子拖给豆豆，轻轻盖好。',towel:'用毛巾来回擦擦小爪子。',box:'把纸箱拖进来，豆豆想玩躲猫猫。',yarn:'拖着毛线球走，豆豆和团团会追过来。',feather:'慢慢移动小羽毛，看看小猫的眼睛。'};
 let selected=null,drag=null,boxUntil=0,wipe=0,muddy=false,lastX=0,lastY=0,boxHits=0,foldStep=0,foldDrag=null,feedbackUntil=0,dirtLevel=0,wasAway=false;
 const hint=text=>$('visual-hint').textContent=text;
 const sfx=name=>document.dispatchEvent(new CustomEvent('nuomi:sfx',{detail:{sound:name}}));
 function command(action){document.dispatchEvent(new CustomEvent('nuomi:command',{detail:{command:{action}}}));}
 function cheer(icons='♡  ✧  ♡'){const el=$('celebration');el.textContent=icons;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');feedbackUntil=performance.now()+1700;}
 function clearBox(){room.classList.remove('box-playing');boxUntil=0;}
 function coords(e){const m=scene.getScreenCTM();return new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse());}
 function target(p,item){return p.x>205&&p.x<620&&p.y>140&&p.y<495||['food','blanket'].includes(item)&&p.x>60&&p.x<230&&p.y>340&&p.y<500;}
 function use(item){
  document.dispatchEvent(new CustomEvent('doudou:used',{detail:{item}}));
  clearBox();muddy=false;wipe=0;selected=null;document.querySelectorAll('.toy-dock button').forEach(b=>b.classList.remove('selected'));
  if(item==='food'){if(scene.dataset.activity==='eat')return;let care;try{care=JSON.parse(localStorage.getItem('doudou-care-v1'));}catch{}if(care?.fullness>96){command('pet');hint('肚子饱饱啦，豆豆想和步步玩一会儿。');cheer('♡  ◉');sfx('content');return;}command('eat');sfx('eat');hint('啊呜啊呜，豆豆在小口吃饭。');}
  if(item==='blanket'){if(scene.dataset.location==='garden')$('trip-button').click();command('sleep');sfx('sleep');hint('呼……轻轻摸摸，陪豆豆做个软软的梦。');}
  if(item==='box'){command('idle');room.classList.add('box-playing');boxUntil=performance.now()+20000;boxHits=0;sfx('curious');hint('咦，豆豆躲进纸箱啦！轻轻敲一敲。');cheer('✧');}
  if(item==='towel'){command('idle');muddy=true;wipe=0;$('mud').setAttribute('opacity',String(dirtLevel));hint(dirtLevel?'从花园回来啦，擦擦小爪上的泥点。':'小爪本来就干净，也可以用毛巾轻轻擦擦。');selected='towel';$('need-bubble').innerHTML=art.towel;$('need-bubble').classList.add('show');}
 }
 function toyEvent(p,end=false){document.dispatchEvent(new CustomEvent('doudou:toy',{detail:{x:p.x,y:p.y,end}}));}
 function ghost(e,item){$('drag-ghost').hidden=false;$('drag-ghost').innerHTML=art[item];$('drag-ghost').style.left=e.clientX+'px';$('drag-ghost').style.top=e.clientY+'px';}
 for(const button of document.querySelectorAll('.toy-dock button[data-item],.toy-dock button[data-native]')){
  const item=button.dataset.item||button.dataset.native;button.addEventListener('click',()=>{if(!button.dataset.native)document.dispatchEvent(new CustomEvent('doudou:used',{detail:{item}}));},true);
  button.addEventListener('pointerdown',e=>{
   if(e.button!==0)return;e.preventDefault();clearBox();muddy=false;wipe=0;selected=item;document.querySelectorAll('.toy-dock button').forEach(b=>b.classList.toggle('selected',b===button));hint(captions[item]);
   drag={id:e.pointerId,item,startX:e.clientX,startY:e.clientY,moved:false};button.setPointerCapture(e.pointerId);ghost(e,item);room.classList.add('drag-active');
   if(item==='yarn'){if(scene.dataset.activity!=='yarn')button.click();toyEvent(coords(e));}if(item==='feather'&&scene.dataset.activity!=='play')button.click();
  });
  button.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;drag.moved ||= Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>8;ghost(e,item);if(item==='yarn')toyEvent(coords(e));});
  button.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved,p=coords(e);finishDrag();if(item==='yarn'){toyEvent(p,true);return;}if(item==='feather')return;if(moved&&target(p,item))use(item);else if(moved){selected=null;hint('放回篮子啦，再拿一个试试。');}else hint(captions[item]);});
  button.addEventListener('pointercancel',()=>{finishDrag();selected=null;});
  button.addEventListener('lostpointercapture',()=>{if(drag){finishDrag();selected=null;}});
  button.addEventListener('click',e=>{if(e.detail>0){e.stopImmediatePropagation();e.preventDefault();}else if(!button.dataset.native){selected=item;hint(captions[item]);}},true);
 }
 function finishDrag(){if(drag?.item==='yarn')toyEvent({x:400,y:438},true);drag=null;$('drag-ghost').hidden=true;room.classList.remove('drag-active');}
 scene.addEventListener('pointerdown',e=>{
  if(selected&&['food','blanket','box'].includes(selected)){const p=coords(e);if(target(p,selected)){e.stopImmediatePropagation();e.preventDefault();use(selected);}}
  else if(room.classList.contains('box-playing')){const p=coords(e);if(p.x>245&&p.x<565&&p.y>140&&p.y<475){e.stopImmediatePropagation();e.preventDefault();boxHits++;sfx(boxHits%2?'curious':'play');scene.querySelector('#box-art').animate([{transform:'translateY(0)'},{transform:'translateY(-6px) rotate(-1deg)'},{transform:'translateY(0)'}],{duration:330});if(boxHits>=3){clearBox();command('highfive');cheer('🐾  ♡');hint('找到豆豆啦！小爪子和你击个掌。');}else{command('pet');hint('箱子里面，传来小小的呼噜声。');}}}
  if(muddy&&selected==='towel'){lastX=e.clientX;lastY=e.clientY;ghost(e,'towel');scene.setPointerCapture(e.pointerId);e.preventDefault();e.stopImmediatePropagation();}
 },true);
 scene.addEventListener('pointermove',e=>{if(!muddy||selected!=='towel'||!scene.hasPointerCapture(e.pointerId))return;ghost(e,'towel');const p=coords(e);if(p.y>315&&p.y<475&&p.x>220&&p.x<610){wipe+=Math.min(30,Math.hypot(e.clientX-lastX,e.clientY-lastY));$('mud').setAttribute('opacity',String(Math.max(0,dirtLevel*(1-wipe/170))));}lastX=e.clientX;lastY=e.clientY;if(wipe>=170){dirtLevel=0;$('mud').setAttribute('opacity','0');muddy=false;selected=null;$('drag-ghost').hidden=true;command('groom');sfx('content');cheer('✧  🐾  ✧');hint('小爪子干干净净，豆豆自己洗洗脸。');}},true);
 scene.addEventListener('pointerup',()=>{$('drag-ghost').hidden=true;});scene.addEventListener('pointercancel',()=>{$('drag-ghost').hidden=true;});
 $('rest-button').addEventListener('click',()=>use('blanket'));
 $('window-touch').addEventListener('click',()=>{$('weather-button').click();document.dispatchEvent(new CustomEvent('doudou:used',{detail:{item:'weather'}}));sfx('curious');hint({rain:'滴答滴答，和小猫一起听听雨。',wind:'呼——树叶动了，小耳朵也动了。',sunny:'暖暖的阳光，照到豆豆的小肚皮。'}[scene.dataset.weather]);});
 document.addEventListener('nuomi:caption',e=>{if(!selected&&!muddy&&!room.classList.contains('box-playing'))hint(e.detail.text);});
 $('friend-button').addEventListener('click',()=>{clearBox();sfx('curious');});$('trip-button').addEventListener('click',clearBox);document.addEventListener('doudou:clear-tools',()=>{finishDrag();selected=null;muddy=false;clearBox();});
 function modal(panel,shade,open,returnTo){panel.hidden=!open;shade.hidden=!open;if(open){panel.dataset.returnTo=returnTo;panel.querySelector('button').focus();}else $(panel.dataset.returnTo)?.focus();}
 $('settings-button').addEventListener('click',()=>modal($('settings'),$('settings-shade'),true,'settings-button'));
 for(const id of ['settings-close','settings-shade'])$(id).addEventListener('click',()=>modal($('settings'),$('settings-shade'),false));
 $('export-save').addEventListener('click',()=>{try{const care=JSON.parse(localStorage.getItem('doudou-care-v1')||'null');if(!care)throw Error();const blob=new Blob([JSON.stringify({version:1,pet:'doudou',care,stories:window.DoudouEvents?.getSave()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='豆豆的小家存档.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);$('save-status').textContent='小家的进度已经打包，请保留下载的 JSON 文件。';}catch{$('save-status').textContent='浏览器暂时无法保存存档，请检查是否允许本地存储。';}});
 $('import-save').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>16384)throw Error();const data=JSON.parse(await file.text()),care=data.care,allowed=['pet','play','meal','nap','tidy','friend'];if(data.version!==1||data.pet!=='doudou'||!care||!['fullness','energy','joy'].every(k=>Number.isFinite(care[k])&&care[k]>=35&&care[k]<=100)||!Array.isArray(care.discoveries)||care.discoveries.length>6||!care.discoveries.every(k=>allowed.includes(k)))throw Error();if(data.stories!==undefined&&!window.DoudouEvents?.validSave(data.stories))throw Error();if(!confirm('用这个存档替换当前设备的小家进度吗？'))return;if(data.stories!==undefined)window.DoudouEvents.restoreSave(data.stories);localStorage.setItem('doudou-care-v1',JSON.stringify({fullness:care.fullness,energy:care.energy,joy:care.joy,discoveries:[...new Set(care.discoveries)]}));location.reload();}catch{$('save-status').textContent='这份存档不能读取，请选择由小家导出的 JSON 文件。';}finally{e.target.value='';}});
 function closeFold(){modal($('fold-game'),$('fold-shade'),false);foldDrag=null;}
 $('tidy-button').addEventListener('click',()=>{clearBox();foldStep=0;$('fold-game').classList.remove('second');$('fold-handle').style.transform='';$('fold-hint').textContent='把亮亮的被角，拖向另一边。';modal($('fold-game'),$('fold-shade'),true,'tidy-button');});
 $('fold-close').addEventListener('click',closeFold);$('fold-shade').addEventListener('click',closeFold);
 $('fold-handle').addEventListener('pointerdown',e=>{e.preventDefault();foldDrag={x:e.clientX,y:e.clientY};e.target.setPointerCapture(e.pointerId);});
 $('fold-handle').addEventListener('pointermove',e=>{if(!foldDrag)return;const dx=e.clientX-foldDrag.x,dy=e.clientY-foldDrag.y;e.target.style.transform=`translate(${Math.max(0,Math.min(250,dx))}px,${Math.max(-160,Math.min(0,dy))}px)`;});
 function foldDone(){sfx('content');if(!foldStep){foldStep=1;$('fold-game').classList.add('second');$('fold-handle').style.transform='';$('fold-hint').textContent='再把这一边，轻轻折过去。';}else{closeFold();command('fold');sfx('content');cheer('✧  ♡  ✧');hint('小被子叠好啦，豆豆来帮忙拍拍平。');}}
 $('fold-handle').addEventListener('pointerup',e=>{if(!foldDrag)return;const r=$('fold-surface').getBoundingClientRect();const moved=e.clientX-foldDrag.x>r.width*.45&& (foldStep===1||e.clientY-foldDrag.y< -r.height*.2);foldDrag=null;e.target.style.transform='';if(moved)foldDone();});
 $('fold-handle').addEventListener('pointercancel',()=>{foldDrag=null;$('fold-handle').style.transform='';});
 $('fold-handle').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();foldDone();}});
 document.addEventListener('keydown',e=>{const panel=[$('settings'),$('fold-game')].find(x=>!x.hidden);if(!panel)return;if(e.key==='Escape'){if(panel===$('settings'))modal(panel,$('settings-shade'),false);else closeFold();}if(e.key==='Tab'){const nodes=[...panel.querySelectorAll('button,input')].filter(x=>x.offsetParent!==null),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 window.addEventListener('blur',()=>{finishDrag();foldDrag=null;});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){finishDrag();foldDrag=null;clearBox();}});
 setInterval(()=>{
  const now=performance.now();if(document.hidden)return;const catX=Number($('cat').getAttribute('transform')?.match(/translate\(([-.0-9]+)/)?.[1]||0);$('box-art').setAttribute('transform',`translate(${catX*.82} 0)`);if(boxUntil&&now>boxUntil){clearBox();command('stretch');}if(now>feedbackUntil)$('celebration').classList.remove('show');
  if(!$('friend-button').querySelector('svg'))$('friend-button').insertAdjacentHTML('afterbegin',friendFace);if(!$('trip-button').querySelector('svg'))$('trip-button').insertAdjacentHTML('afterbegin',gardenIcon);
  const friend=scene.dataset.friend,away=scene.dataset.location==='garden';if(wasAway&&!away){dirtLevel=.85;$('mud').setAttribute('opacity',String(dirtLevel));hint('小花园真好玩，回家可以擦擦小爪子。');}wasAway=away;room.classList.toggle('in-garden',away);$('scene-label').textContent=away?'团团的小花园':friend==='together'?'豆豆和团团的小家':'豆豆的小家';$('friend-button').classList.toggle('knock',friend==='knocking');$('friend-button').classList.toggle('is-invited',['together','entering'].includes(friend));
  let care;try{care=JSON.parse(localStorage.getItem('doudou-care-v1'));}catch{}const count=care?.discoveries?.length||0;$('affinity').textContent=count>=5?'♡ 默契的小伙伴':count>=2?'♡ 越来越亲近':'♡ 初次的温柔';
  if(selected||muddy||room.classList.contains('box-playing'))return;const idle=!scene.dataset.activity||scene.dataset.activity==='idle';let icon=care?.energy<50?'☾':care?.fullness<60?art.food:count<1?'♡':art.yarn;$('need-bubble').innerHTML=icon;$('need-bubble').classList.toggle('show',(idle||care?.energy<50)&&Math.floor(now/1000)%18<6);
 },500);
 // Touching a stamp replays a little pictorial memory without depending on text.
 for(const [kind,item]of Object.entries({pet:'♡',play:'yarn',meal:'food',nap:'blanket',tidy:'tidy',friend:'♡'})){
  const stamp=$('stamp-'+kind);stamp.innerHTML=(art[item]||`<span style="font-size:38px">${item}</span>`)+stamp.querySelector('small').outerHTML;stamp.addEventListener('click',()=>{if(!stamp.classList.contains('is-discovered'))return;stamp.animate([{transform:'rotate(-8deg) scale(.9)'},{transform:'rotate(6deg) scale(1.08)'},{transform:'none'}],{duration:550});sfx('content');});
 }
})();
