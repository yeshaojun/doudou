import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../standalone/events.js',import.meta.url),'utf8');
function harness(saved=new Map()){
 let now=0,timers=[],intervals=[];const nodes=new Map(),listeners=new Map(),emitted=[];
 class Element{
  constructor(){this.listeners=new Map();this.attrs={};this.dataset={};this.style={};this.hidden=false;this.disabled=false;this._classes=new Set();this.classList={add:(...ks)=>ks.forEach(k=>this._classes.add(k)),remove:(...ks)=>ks.forEach(k=>this._classes.delete(k)),contains:k=>this._classes.has(k),toggle:(k,b)=>{if(b??!this._classes.has(k))this._classes.add(k);else this._classes.delete(k);}};}
  set id(v){this._id=v;nodes.set(v,this);}get id(){return this._id;}
  set className(v){this._classes=new Set(v.split(' '));}get className(){return [...this._classes].join(' ');}
  setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}focus(){}appendChild(){}setPointerCapture(){}
  querySelector(){return get('stage');}querySelectorAll(){return[];}getScreenCTM(){return{inverse:()=>({})};}getBoundingClientRect(){return{width:80,height:80};}
  addEventListener(k,f){if(!this.listeners.has(k))this.listeners.set(k,[]);this.listeners.get(k).push(f);}
  fire(k,o={}){if(k==='click'&&this.disabled)return;for(const f of this.listeners.get(k)||[])f({preventDefault(){},stopPropagation(){},...o});}
 }
 const get=id=>{if(!nodes.has(id)){const el=new Element();el.id=id;}return nodes.get(id);};
 const menus=['tidy','find','spill','share','water','laundry','drink','rain','bath','cook'].map(k=>{const b=new Element();b.dataset.story=k;return b;});
 for(const id of ['story-room','brush-room','fold-game','settings','discovery-panel','drag-ghost','event-invitation'])get(id).hidden=true;
 get('scene').dataset={activity:'idle',location:'home',friend:'none'};
 const document={hidden:false,getElementById:get,createElement:()=>new Element(),querySelectorAll:()=>menus,querySelector:s=>menus.find(b=>s.includes('"'+b.dataset.story+'"')),addEventListener:(k,f)=>{if(!listeners.has(k))listeners.set(k,[]);listeners.get(k).push(f);},dispatchEvent(e){emitted.push(e);for(const f of listeners.get(e.type)||[])f(e);}};
 const window={addEventListener:(k,f)=>{listeners.set('window:'+k,[f]);}};
 const ctx={document,window,localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},performance:{now:()=>now},CustomEvent:class{constructor(type,o){this.type=type;this.detail=o?.detail;}},DOMPoint:class{constructor(x,y){this.x=x;this.y=y;}matrixTransform(){return this;}},setTimeout:(f,ms)=>{const id={f,at:now+ms};timers.push(id);return id;},clearTimeout:id=>{timers=timers.filter(t=>t!==id);},setInterval:f=>intervals.push(f)};
 vm.runInNewContext(source,ctx);
 const step=(ms=500)=>{for(let end=now+ms;now<end;){now=Math.min(end,now+500);const due=timers.filter(t=>t.at<=now);timers=timers.filter(t=>t.at>now);due.forEach(t=>t.f());intervals.forEach(f=>f());}};
 const drag=(id,x,y,steps=16)=>{const b=get(id),ox=+b.dataset.x,oy=+b.dataset.y;b.fire('pointerdown',{pointerId:1,clientX:ox,clientY:oy});for(let i=1;i<=steps;i++)b.fire('pointermove',{pointerId:1,clientX:ox+(x-ox)*i/steps,clientY:oy+(y-oy)*i/steps});b.fire('pointerup',{pointerId:1,clientX:x,clientY:y});};
 return{get,step,drag,document,window,saved,open:k=>menus.find(b=>b.dataset.story===k).fire('click'),event:(type,detail)=>document.dispatchEvent({type,detail}),emitted};
}
test('sorting requires matching pictures; a wrong basket returns the toy and the kitten handles the last item',()=>{
 const h=harness();h.open('tidy');h.drag('tidy-ball',640,440);assert.equal(h.get('story-steps').attrs['aria-label'],'已完成0步，共4步');assert.equal(h.get('tidy-ball').dataset.x,'280');
 h.drag('tidy-ball',160,440);h.drag('tidy-feather',400,440);h.drag('tidy-block',640,440);assert.equal(h.get('story-steps').attrs['aria-label'],'已完成3步，共4步');h.step(1500);assert(h.get('story-room').classList.contains('story-success'));assert.deepEqual(JSON.parse(h.saved.get('doudou-stories-v1')).done,['tidy']);
});
test('cabinet game needs light, then the wand, then carrying the exposed ball to the kitten',()=>{
 const h=harness();h.open('find');assert(h.get('lost-ball').disabled);h.drag('find-torch',470,416);h.step(500);assert(!h.get('find-wand').hidden);assert(h.get('lost-ball').disabled);
 h.drag('find-wand',435,416);assert(!h.get('lost-ball').disabled);h.drag('lost-ball',740,470);assert(!h.get('story-room').classList.contains('story-success'));h.drag('lost-ball',220,350);assert(h.get('story-room').classList.contains('story-success'));
});
test('spilled water cannot be wiped until the cup is upright, and only movement in the puddle cleans it',()=>{
 const h=harness();h.open('spill');assert(h.get('spill-cloth').disabled);h.get('spill-cup').fire('click');assert(!h.get('spill-cloth').disabled);h.drag('spill-cloth',130,160);assert.notEqual(h.get('story-puddle').style.opacity,'0');
 h.drag('spill-cloth',310,395);for(let i=0;i<4;i++)h.drag('spill-cloth',i%2?310:510,395);assert.equal(h.get('story-puddle').style.opacity,'0');assert(h.get('story-room').classList.contains('story-success'));
});
test('sharing accepts only the highlighted kitten and alternates four passes',()=>{
 const h=harness();h.open('share');h.drag('share-ball',630,359);assert.equal(h.get('story-steps').attrs['aria-label'],'已完成0步，共4步');for(const x of [220,630,220,630]){h.drag('share-ball',x,359);h.step(1000);}assert(h.get('story-room').classList.contains('story-success'));
});
test('natural invitations have a play prerequisite, do not interrupt sleep or gestures, and wait for a tap',()=>{
 const h=harness();h.step(30000);assert(h.get('event-invitation').hidden);h.event('doudou:used',{item:'yarn'});h.event('doudou:used',{item:'feather'});h.get('scene').dataset.activity='sleep';h.step(30000);assert(h.get('event-invitation').hidden);
 h.get('scene').dataset.activity='idle';h.event('pointerdown');h.step(2000);assert(h.get('event-invitation').hidden);h.event('pointerup');h.step();assert(!h.get('event-invitation').hidden);assert(h.get('story-room').hidden);h.get('event-invitation').fire('click');assert(!h.get('story-room').hidden);
});
test('background time is paused; idle assistance completes gently without earning a manual discovery',()=>{
 const h=harness();h.open('spill');h.document.hidden=true;h.step(120000);assert(!h.get('story-room').classList.contains('story-success'));h.document.hidden=false;h.step(46000);assert(h.get('story-room').classList.contains('story-success'));assert(!h.saved.has('doudou-stories-v1'));
});
test('closing cancels pending helper callbacks and completed memories restore with a bounded save format',()=>{
 const h=harness();h.open('tidy');h.drag('tidy-ball',160,440);h.drag('tidy-feather',400,440);h.drag('tidy-block',640,440);h.get('story-close').fire('click');h.step(2000);assert(h.get('story-room').hidden);assert(!h.saved.has('doudou-stories-v1'));
 assert(!h.window.DoudouEvents.validSave({done:['unknown']}));assert(!h.window.DoudouEvents.validSave({done:Array(5).fill('tidy')}));h.window.DoudouEvents.restoreSave({done:['find']});assert.deepEqual(JSON.parse(h.saved.get('doudou-stories-v1')).done,['find']);
});

test('watering only progresses over the plant, stops at the full amount and blooms without overflow',()=>{
 const h=harness();h.open('water');h.drag('water-can',730,470);assert.equal(h.get('water-fill').attrs.height,'0');h.drag('water-can',500,280);for(let i=0;i<8;i++)h.drag('water-can',i%2?480:550,i%2?260:330);assert(h.get('story-room').classList.contains('plant-bloom'));assert(h.get('story-room').classList.contains('story-success'));assert.equal(h.get('water-fill').attrs.height,'60');assert.equal(h.get('water-drops').attrs.opacity,'0');
});
test('a quilt must be hung before the two pegs unlock and both corners must be fastened',()=>{
 const h=harness();h.open('laundry');assert(h.get('laundry-peg-left').disabled);h.drag('laundry-quilt',450,265);assert(!h.get('laundry-peg-left').disabled);h.drag('laundry-peg-left',355,222);assert(!h.get('story-room').classList.contains('story-success'));h.drag('laundry-peg-right',545,222);h.step(1500);assert(h.get('story-room').classList.contains('story-success'));assert.deepEqual(JSON.parse(h.saved.get('doudou-stories-v1')).done,['laundry']);
});

test('water ritual requires bowl placement, a held tap, carrying, then a gentle stroke; stops at full',()=>{
 const h=harness();h.open('drink');assert(h.get('drink-tap').disabled);h.drag('drink-bowl',220,360);assert.equal(h.get('story-steps').attrs['aria-label'],'已完成0步，共4步');
 h.drag('drink-bowl',485,330);h.get('drink-tap').fire('pointerdown',{pointerId:1});h.step(1000);h.get('drink-tap').fire('pointerup');const level=h.get('drink-water-level').attrs.height;h.step(3000);assert.equal(h.get('drink-water-level').attrs.height,level);
 h.get('drink-tap').fire('pointerdown',{pointerId:1});h.step(4000);assert(h.get('drink-tap').disabled);assert(!h.get('story-room').classList.contains('tap-running'));assert.equal(h.get('drink-water-level').attrs.height,'65');assert(h.get('drink-cuddle').hidden);
 h.drag('drink-bowl',220,360);assert(!h.get('drink-cuddle').hidden);for(let i=0;i<4;i++)h.drag('drink-cuddle',i%2?170:270,280);assert(h.get('story-room').classList.contains('story-success'));assert.deepEqual(JSON.parse(h.saved.get('doudou-stories-v1')).done,['drink']);
});
test('leaving the foreground stops the tap and reopening clears water progress',()=>{
 const h=harness();h.open('drink');h.drag('drink-bowl',485,330);h.get('drink-tap').fire('pointerdown',{pointerId:1});h.step(1000);h.document.hidden=true;h.event('visibilitychange');assert(!h.get('story-room').classList.contains('tap-running'));h.step(10000);h.document.hidden=false;h.get('story-close').fire('click');h.open('drink');assert.equal(h.get('drink-water-level').attrs.height,'0');assert(h.get('drink-tap').disabled);
});
test('rain ritual unlocks towel after shelter, then blanket only after the paws are dry',()=>{
 const h=harness();h.open('rain');assert(h.get('rain-cloth').disabled);assert(h.get('rain-quilt').disabled);h.drag('ritual-umbrella',220,180);assert(!h.get('rain-cloth').disabled);h.drag('rain-cloth',220,360);for(let i=0;i<6;i++)h.drag('rain-cloth',i%2?165:270,360);assert(!h.get('rain-quilt').disabled);assert.equal(h.get('rain-paw-drops').style.opacity,'0');h.drag('rain-quilt',220,350);assert(h.get('story-room').classList.contains('cozy-rain'));assert(h.get('story-room').classList.contains('story-success'));
});
test('growth counts distinct completed rituals, restores old saves and has eight bounded memories',()=>{
 const h=harness(new Map([['doudou-stories-v1',JSON.stringify({done:['tidy','find']})]]));assert.match(h.get('growth-summary').textContent,/放心/);h.window.DoudouEvents.restoreSave({done:['tidy','find','spill','share','water']});assert.match(h.get('growth-summary').textContent,/默契/);h.window.DoudouEvents.restoreSave({done:['tidy','find','spill','share','water','laundry','drink','rain']});assert.match(h.get('growth-summary').textContent,/小家人/);h.open('drink');h.step(46000);assert.equal(h.window.DoudouEvents.getSave().done.length,8);assert(!h.window.DoudouEvents.validSave({done:['drink','drink']}));
});
test('random life invitations arrive without toy prerequisites and never open a story by themselves',()=>{
 const h=harness();h.step(80000);assert(!h.get('event-invitation').hidden);assert(h.get('story-room').hidden);assert.match(h.get('event-invitation').attrs['aria-label'],/接一碗水/);h.get('event-invitation').fire('click');assert(!h.get('story-room').hidden);assert.match(h.get('story-title').textContent,/接一碗水/);
});

function finishBath(h){h.open('bath');h.drag('bath-shower',350,280);for(let i=0;i<6;i++)h.drag('bath-shower',i%2?345:465,290);h.drag('bath-soap',350,280);for(let i=0;i<7;i++)h.drag('bath-soap',i%2?345:465,290);h.drag('bath-shower',350,280);for(let i=0;i<7;i++)h.drag('bath-shower',i%2?345:465,290);h.drag('bath-towel',350,380);for(let i=0;i<7;i++)h.drag('bath-towel',i%2?345:465,390);}
test('bath needs wetting, soap, rinsing, then drying and only body strokes count',()=>{
 const h=harness();h.open('bath');assert(h.get('bath-soap').disabled);assert(h.get('bath-towel').disabled);h.drag('bath-shower',400,180);assert.equal(h.get('story-steps').attrs['aria-label'],'已完成0步，共4步');h.drag('bath-shower',350,280);for(let i=0;i<6;i++)h.drag('bath-shower',i%2?345:465,290);assert(!h.get('bath-soap').disabled);assert.equal(h.get('bath-shower').dataset.x,'660');assert(h.get('bath-towel').disabled);h.drag('bath-soap',350,280);for(let i=0;i<7;i++)h.drag('bath-soap',i%2?345:465,290);assert(!h.get('bath-shower').disabled);assert.equal(h.get('bath-soap').dataset.x,'635');assert(h.get('bath-towel').disabled);h.drag('bath-shower',350,280);for(let i=0;i<7;i++)h.drag('bath-shower',i%2?345:465,290);assert(!h.get('bath-towel').disabled);assert(h.get('story-room').classList.contains('bath-drying'));assert.equal(h.get('bath-foam').style.opacity,'0');h.drag('bath-towel',350,380);for(let i=0;i<7;i++)h.drag('bath-towel',i%2?345:465,390);assert(h.get('story-room').classList.contains('bath-fluffy'));assert.deepEqual(JSON.parse(h.saved.get('doudou-stories-v1')).done,['bath']);
});
test('bath water stops on release, cancel, background and closing; assistance adds no growth',()=>{
 const h=harness();h.open('bath');h.drag('bath-shower',400,280);assert.equal(h.get('bath-spray').attrs.opacity,'0');const b=h.get('bath-shower');b.fire('pointerdown',{pointerId:1,clientX:400,clientY:280});b.fire('pointermove',{pointerId:1,clientX:410,clientY:280});assert.equal(h.get('bath-spray').attrs.opacity,'1');b.fire('pointercancel');assert.equal(h.get('bath-spray').attrs.opacity,'0');h.document.hidden=true;h.event('visibilitychange');assert.equal(h.get('bath-spray').attrs.opacity,'0');h.document.hidden=false;h.step(46000);assert(!h.saved.has('doudou-stories-v1'));
});
test('growth changes physical size, preserves old saves and limits repeatedly farming one ritual',()=>{
 const h=harness();assert.match(h.get('kitten-growth').attrs.transform,/scale\(0.68\)/);finishBath(h);assert.equal(h.window.DoudouEvents.getSave().growth.xp,3);h.get('story-close').fire('click');finishBath(h);assert.equal(h.window.DoudouEvents.getSave().growth.xp,3);h.window.DoudouEvents.restoreSave({done:['tidy','find']});assert.match(h.get('kitten-growth').attrs.transform,/scale\(0.76\)/);h.window.DoudouEvents.restoreSave({done:['tidy','find','spill','share','water']});assert.match(h.get('kitten-growth').attrs.transform,/scale\(0.84\)/);h.window.DoudouEvents.restoreSave({done:['tidy','find','spill','share','water','rain','drink','laundry']});assert.match(h.get('kitten-growth').attrs.transform,/scale\(0.94\)/);assert(!h.window.DoudouEvents.validSave({done:[],growth:{xp:999,practice:[]}}));
});
test('completed meals, naps and brushing grow the kitten, and imported growth retains its progress',()=>{
 const h=harness();h.event('doudou:care-complete',{kind:'meal'});assert.equal(h.window.DoudouEvents.getSave().growth.xp,2);h.event('doudou:care-complete',{kind:'meal'});assert.equal(h.window.DoudouEvents.getSave().growth.xp,2);h.event('doudou:care-complete',{kind:'nap'});h.event('doudou:care-complete',{kind:'brush'});assert.match(h.get('kitten-growth').attrs.transform,/scale\(0.76\)/);const save=h.window.DoudouEvents.getSave();const restored=harness(new Map([['doudou-stories-v1',JSON.stringify(save)]]));assert.equal(restored.window.DoudouEvents.getSave().growth.xp,6);assert.equal(restored.window.DoudouEvents.getSave().growth.care.length,3);h.event('doudou:care-complete',{kind:'unknown'});assert.equal(h.window.DoudouEvents.getSave().growth.xp,6);
});

function washFood(h,id){h.drag(id,635,260);for(let i=0;i<6&&!h.get(id).classList.contains('food-clean');i++)h.drag(id,i%2?610:660,260);}
function cookToBowl(h){h.open('cook');washFood(h,'cook-fish');washFood(h,'cook-pumpkin');h.drag('cook-fish',470,320);h.drag('cook-pumpkin',470,320);h.drag('cook-spoon',425,310);for(let i=0;i<8&&!h.get('story-room').classList.contains('food-cooked');i++)h.drag('cook-spoon',i%2?425:515,310);h.drag('cook-spoon',470,310);h.drag('cook-spoon',330,435);}
test('cooking washes both ingredients before adding them and stirring, then portions, cools and serves',()=>{
 const h=harness();h.open('cook');assert(h.get('cook-spoon').hidden);h.drag('cook-fish',470,320);assert(!h.get('cook-fish').classList.contains('food-clean'));washFood(h,'cook-fish');assert.equal(h.get('story-steps').attrs['aria-label'],'已完成0步，共6步');washFood(h,'cook-pumpkin');assert.equal(h.get('story-steps').attrs['aria-label'],'已完成1步，共6步');h.drag('cook-fish',100,180);assert(!h.get('cook-fish').hidden);h.drag('cook-fish',470,320);h.drag('cook-pumpkin',470,320);assert(!h.get('cook-spoon').hidden);h.drag('cook-spoon',735,450);assert.equal(h.get('cook-mix-fill').attrs.width,'0');h.drag('cook-spoon',425,310);for(let i=0;i<8&&!h.get('story-room').classList.contains('food-cooked');i++)h.drag('cook-spoon',i%2?425:515,310);assert.equal(h.get('cook-mix-fill').attrs.width,'88');assert(!h.get('cook-bowl').hidden);h.drag('cook-spoon',330,435);assert(!h.get('cook-bowl').classList.contains('meal-filled'));h.drag('cook-spoon',470,310);h.drag('cook-spoon',330,435);assert(h.get('cook-bowl').classList.contains('meal-filled'));assert(h.get('cook-bowl').disabled);h.drag('cook-fan',330,410);for(let i=0;i<7&&h.get('cook-bowl').disabled;i++)h.drag('cook-fan',i%2?280:380,410);assert(!h.get('cook-bowl').disabled);assert.equal(h.get('cook-bowl-steam').style.opacity,'0');h.drag('cook-bowl',220,325);assert(h.get('cook-bowl').classList.contains('meal-eaten'));assert(!h.get('story-room').classList.contains('story-success'));h.step(1700);assert(h.get('story-room').classList.contains('story-success'));assert.deepEqual(JSON.parse(h.saved.get('doudou-stories-v1')).done,['cook']);assert.equal(h.window.DoudouEvents.getSave().growth.xp,3);assert.equal(h.emitted.filter(e=>e.type==='doudou:prepared-meal').length,1);
});
test('cooking water stops on release and cancel, and leaving before the meal finishes cancels rewards',()=>{
 const h=harness();h.open('cook');h.drag('cook-fish',635,260);assert(!h.get('story-room').classList.contains('food-rinsing'));const f=h.get('cook-pumpkin');f.fire('pointerdown',{pointerId:1,clientX:270,clientY:430});f.fire('pointermove',{pointerId:1,clientX:630,clientY:260});assert(h.get('story-room').classList.contains('food-rinsing'));f.fire('pointercancel');assert(!h.get('story-room').classList.contains('food-rinsing'));h.get('story-close').fire('click');cookToBowl(h);h.drag('cook-fan',330,410);for(let i=0;i<7&&h.get('cook-bowl').disabled;i++)h.drag('cook-fan',i%2?280:380,410);h.drag('cook-bowl',220,325);h.get('story-close').fire('click');h.step(3000);assert(!h.saved.has('doudou-stories-v1'));assert.equal(h.emitted.filter(e=>e.type==='doudou:prepared-meal').length,0);
});
test('idle help in the kitchen is gentle but adds neither growth nor a completed meal',()=>{const h=harness();h.open('cook');h.document.hidden=true;h.step(60000);assert(!h.get('story-room').classList.contains('story-success'));h.document.hidden=false;h.step(46000);assert(h.get('story-room').classList.contains('story-success'));assert(!h.saved.has('doudou-stories-v1'));assert(!h.emitted.some(e=>e.type==='doudou:prepared-meal'));});
