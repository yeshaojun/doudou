import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
async function atomicWrite(file,body){const temporary=new URL(file.href+'.'+process.pid+'.tmp');await writeFile(temporary,body);await rename(temporary,file);}
const original=await read('web/index.html');
let scene=original.match(/<svg id="scene"[\s\S]*?<\/svg>/)[0];
// Scale the main kitten around its grounded paws, preserving independent animation.
const catStart=scene.indexOf('<g id="cat">');
let depth=0,catEnd=catStart;const tags=/<g(?:\s[^>]*)?>|<\/g>/g;tags.lastIndex=catStart;
for(let match;(match=tags.exec(scene));){depth+=match[0].startsWith('</')?-1:1;if(!depth){catEnd=tags.lastIndex;break;}}
scene=scene.slice(0,catStart)+'<g transform="translate(400 440) scale(.82) translate(-400 -440)">'+scene.slice(catStart,catEnd)+'</g>'+scene.slice(catEnd);
scene=scene.replace(/(<g id="collar">[\s\S]*?)(<\/g>)/, '$1<path class="growth-charm" d="m401 336 5 9 10 2-7 7 1 10-9-5-9 5 1-10-7-7 10-2Z" fill="#f1d18a" stroke="#c7a25d" stroke-width="1.5"/>$2');
scene=scene.replace('rx="125" ry="19"','rx="102" ry="15"');
const room=await read('standalone/room.svg');
scene=scene.replace('<g class="sky-details"',room+'<g class="sky-details"');
scene=scene.replace('<g id="particles"','<g id="mud" pointer-events="none" opacity="0"><path d="m324 419 5-3 7 2 3 6-8 2-6-3Zm139 1 7-3 7 3-3 7-8-1Z" fill="#b89d7d" opacity=".65"/><g fill="#c3ad8c"><circle cx="341" cy="417" r="2.2"/><circle cx="322" cy="426" r="1.7"/><circle cx="480" cy="417" r="2"/></g></g><g id="box-art" pointer-events="none" opacity="0"><path d="m295 350 105-14 110 14-15 105q-90 22-185 0Z" fill="#d2a775" stroke="#aa8058" stroke-width="2"/><path d="m295 350-25-33 130 19 125-22-15 36-110 15Z" fill="#e7c698" stroke="#aa8058" stroke-width="2"/><path d="M400 367v96" stroke="#bd925f" stroke-width="2"/><path d="m356 405 10-9 10 9m-12-1v22" fill="none" stroke="#aa8058" stroke-width="3"/></g><g id="particles"');
let app=await read('web/app.js');
// The standalone world has no speech requests. Keep the existing animated cat engine.

app=app.replace("const running=chasing&&Math.abs(desiredX-catX)>5&&!reduced.matches;","const running=chasing&&Math.abs(desiredX-catX)>5&&!reduced.matches; scene.dataset.running=String(running);");
app=app.replace('Math.sin(t*6)*3','Math.sign(desiredX-catX)*-2+Math.sin(t*9)*1.2').replace('Math.sin(t*7))*13','Math.sin(t*9))*4');
app=app.replace('Math.max(-160,Math.min(life?.hasFriend()?20:160','Math.max(-135,Math.min(life?.hasFriend()?20:135');
app=app.replace("if(mode==='play'){right=-23-gaze.x*9;rightY=-13;}","if(mode==='play'){right=-15-gaze.x*6;rightY=-8;}");
app=app.replace("if(next==='eat')feel('content');","if(next==='eat')feel('content');");
app=app.replace("  const yarnNode=$('yarn');", `  document.addEventListener('doudou:toy',e=>{const p=e.detail;if(p.end){dragging=false;return;}if(mode!=='yarn')yarn();dragging=true;ball.x=Math.max(155,Math.min(665,p.x));ball.y=Math.max(220,Math.min(438,p.y));ball.vx=0;ball.vy=0;target={x:ball.x,y:ball.y};toyDistance+=18;toyPointerAt=performance.now();});
  const yarnNode=$('yarn');`);
app=app.replace("const desiredX=chasing?", "const desiredX=sleeping?-325:chasing?");
app=app.replace("catY+=(hop-catY)*.22;", "catY+=((sleeping?-24:hop)-catY)*.12;");
app=app.replace("rotate(${rotation} 400 440)`", "rotate(${rotation} 400 440) translate(400 440) scale(${sleeping?.88:1} ${sleeping?.66:1}) translate(-400 -440)`");
app=app.replace("`translate(0 ${breath*1.2})`", "`translate(${catX*.82} ${breath*1.2-18}) translate(400 440) scale(.78 .54) translate(-400 -440)`");
app=app.replace("$('sleep-quilt').style.opacity=sleeping?'1':'0';", "$('sleep-quilt').style.opacity=sleeping&&elapsed>.6?'1':'0'; $('sleep-bubbles').setAttribute('transform',`translate(${catX*.82+110} 150) scale(.65)`);");


scene=scene.replace('<g id="friend-head">', '<g id="friend-quilt"><path d="M-87-75q86-35 172 0l12 67q-93 20-194 0Z" fill="#d7b6a4" stroke="#b99582" stroke-width="2"/><path d="M-82-72q84-27 164 0" stroke="#f6e5ce" stroke-width="12"/></g><g id="friend-head">');
let life=await read('web/pet-life.js');
life=life.replace("let target=visit==='leaving'?770:570;", "let target=visit==='leaving'?770:mode==='sleep'?430:570;");
life=life.replace("return {record,hasFriend:","return {record,energy:()=>care.energy,hasFriend:");
life=life.replace("scale(.85)`", "scale(${mode==='sleep'?.94:.85} ${mode==='sleep'?.58:.85})`");
app=app.replace("Math.min(1,elapsed)*91", "Math.min(1,elapsed)*124");
app=app.replace("$('food-bowl').style.opacity=mode==='eat'?'1':'0';", "$('food-bowl').style.opacity=mode==='eat'?'1':'0'; $('food-bowl').setAttribute('transform',`translate(${catX*.82} 0) translate(400 440) scale(.82) translate(-400 -440)`);");
app=app.replace("catX+=(desiredX-catX)*(1-Math.pow(.96,dt));", "catX+=(desiredX-catX)*(1-Math.pow((life?.energy?.()||85)<50?.974:.96,dt));");
app=app.replace("$('yarn').setAttribute('transform',", "$('mud').setAttribute('transform',`translate(${catX*.82} ${catY*.82}) translate(400 440) scale(.82) translate(-400 -440)`); $('yarn').setAttribute('transform',");
app=app.replace("function yarn(manual=true){", "function yarn(manual=true){if(manual)document.dispatchEvent(new CustomEvent('doudou:used',{detail:{item:'yarn'}}));");
app=app.replace("function featherPlay(){", "function featherPlay(){document.dispatchEvent(new CustomEvent('doudou:used',{detail:{item:'feather'}}));");
const sounds={};for(const name of ['pet','play','eat','sleep','wake','content','curious']){sounds[name]={};for(const extension of ['m4a','wav'])sounds[name][extension]=(await readFile(new URL('web/sounds/'+name+'.'+extension,root))).toString('base64');}
let soundJS=await read('web/cat-sounds.js');
soundJS=soundJS.replace("fetch('./sounds/'+key+'?v=doudou-9',{cache:'force-cache',priority:'low'}).then(res=>{if(!res.ok)throw new Error('sound_unavailable');return res.arrayBuffer();})","Promise.resolve(Uint8Array.from(atob(SOUND_DATA[name][extension]),c=>c.charCodeAt(0)).buffer)");
soundJS=soundJS.replace('conversation=e.detail.state;',"conversation=e.detail.state==='caring'?'idle':e.detail.state;");
const stamp=original.match(/<div id="discovery-shade"[\s\S]*?<\/aside>/)[0];
const ids=['care-fullness','care-energy','care-joy','care-caption','friend-status','emotion-badge','emotion-icon','weather-icon','weather-label','nap-label','mood-text','hint-text','speech'];
const hidden=ids.map(id=>`<span id="${id}"></span>`).join('')+['pet-button','play-button','stretch-button','nap-button','feed-button','fold-button','weather-button','emotion-button'].map(id=>`<button id="${id}"></button>`).join('');
let html=await read('standalone/shell.html');
const headAt=original.indexOf('<g id="head">');let headEnd=headAt,headDepth=0;const headTags=/<g(?:\s[^>]*)?>|<\/g>/g;headTags.lastIndex=headAt;
for(let match;(match=headTags.exec(original));){headDepth+=match[0].startsWith('</')?-1:1;if(!headDepth){headEnd=headTags.lastIndex;break;}}
const brushHead=original.slice(headAt,headEnd).replace(/id="([^"]+)"/g,(_,id)=>'id="brush-'+id+'"').replace(/<ellipse id="brush-head-hit"[^>]+\/>/,'');
let storyAt=original.indexOf('<g id="cat">'),storyEnd=storyAt,storyDepth=0;const storyTags=/<g(?:\s[^>]*)?>|<\/g>/g;storyTags.lastIndex=storyAt;for(let match;(match=storyTags.exec(original));){storyDepth+=match[0].startsWith('</')?-1:1;if(!storyDepth){storyEnd=storyTags.lastIndex;break;}}
const storyCat=original.slice(storyAt,storyEnd).replace(/id="([^"]+)"/g,(_,id)=>'id="story-'+id+'"').replace(/<ellipse[^>]+role="button"[^>]+\/>/g,'');
const friendAt=original.indexOf('<g id="friend-tail">'),friendStop=original.indexOf('<g id="cat">');
// Copy just the friend's visible anatomy, leaving the original scene's controller IDs unique.
let storyFriend=original.slice(friendAt,original.indexOf('<g id="friend-bowl"',friendAt));
if(!storyFriend.includes('friend-head'))throw Error('Friend anatomy missing');
// The source head closes before the small name label; no outer friend group is copied.
storyFriend=storyFriend.slice(0,storyFriend.indexOf('<g class="friend-name"')>-1?storyFriend.indexOf('<g class="friend-name"'):storyFriend.length);
storyFriend=storyFriend.replace(/id="([^"]+)"/g,(_,id)=>'id="story-'+id+'"').replace(/<ellipse[^>]+role="button"[^>]+\/>/g,'');
html=html.replace('<!--EVENTS-SCENE-->',(await read('standalone/events-scene.svg')).replace('<!--STORY-CAT-->',storyCat).replace('<!--STORY-FRIEND-->',storyFriend));
html=html.replace('<!--BRUSH-SCENE-->',(await read('standalone/brush-scene.svg')).replace('<!--CAT-HEAD-->',brushHead));
html=html.replace('<!--STYLE-->',`<style>${await read('web/style.css')}\n${await read('standalone/style.css')}</style>`).replace('<!--SCENE-->',scene).replace('<!--STAMPS-->',stamp).replace('<!--HIDDEN-->',hidden).replace('<!--SCRIPTS-->',`<script>const SOUND_DATA=${JSON.stringify(sounds)};${soundJS}\n${await read('standalone/audio-ui.js')}</script><script>${life}</script><script>${app}</script><script>${await read('standalone/world.js')}\n${await read('standalone/brush.js')}\n${await read('standalone/events.js')}</script>`);
if(root.pathname.endsWith('/x/work/nuomi-kitten/'))await mkdir(new URL('../../outputs/',root),{recursive:true});
html=html.replace(/[ \t]+$/gm,'');
await atomicWrite(new URL('standalone/index.html',root),html);
await atomicWrite(new URL('index.html',root),html);
const output=root.pathname.endsWith('/x/work/nuomi-kitten/')?new URL('../../outputs/豆豆和团团的温暖小家.html',root):new URL('standalone/index.html',root);await atomicWrite(output,html);
console.log('Standalone built:',output.pathname,Math.round(Buffer.byteLength(html)/1024)+'KB');
