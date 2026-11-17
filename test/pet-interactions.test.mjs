import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
async function petHarness(options={}){
  let now=1000,frames=[];const elements=new Map(),listeners=new Map();
  class Element{
    constructor(){this.attrs={};this.listeners=new Map();this.style={setProperty(k,v){this[k]=v;}};this.dataset={};this.classList={toggle(){},add(){},remove(){}};}
    setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,fn){if(!this.listeners.has(k))this.listeners.set(k,[]);this.listeners.get(k).push(fn);}
    fire(k,event={}){for(const fn of this.listeners.get(k)||[])fn({preventDefault(){},stopPropagation(){},...event});}
    setPointerCapture(){}getScreenCTM(){return {inverse(){return {};}};}appendChild(){}remove(){}
  }
  const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  // DOMPoint coordinates are accessors, so spreading a DOMPoint loses x and y.
  class Point{constructor(x,y){this._x=x;this._y=y;}get x(){return this._x;}get y(){return this._y;}matrixTransform(){return this;}}
  const document={hidden:false,body:new Element(),getElementById:get,querySelector:()=>get('pupil'),createElementNS:()=>new Element(),dispatchEvent(){},addEventListener:(k,fn)=>{if(!listeners.has(k))listeners.set(k,[]);listeners.get(k).push(fn);}};
  const saved=options.saved||new Map();
  const context={localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)},document,window:{matchMedia:()=>({matches:false})},DOMPoint:Point,performance:{now:()=>now},requestAnimationFrame:fn=>frames.push(fn),CustomEvent:class{constructor(type,o){this.type=type;this.detail=o?.detail;}},console};
  vm.runInNewContext(await readFile(new URL('../web/pet-life.js',import.meta.url),'utf8'),context);
  vm.runInNewContext(await readFile(new URL('../web/app.js',import.meta.url),'utf8'),context);
  function step(ms=16){now+=ms;const callbacks=frames;frames=[];for(const fn of callbacks)fn(now);}
  function event(name,detail){for(const fn of listeners.get(name)||[])fn({detail});}
  step();return {get,step,event,saved,document};
}

test('dragging and releasing a ball using DOMPoint accessors keeps physics finite',async()=>{
  const h=await petHarness(),ball=h.get('yarn');
  ball.fire('pointerdown',{clientX:565,clientY:438,pointerId:1});h.step();
  ball.fire('pointermove',{clientX:590,clientY:410,pointerId:1});h.step();ball.fire('pointerup',{pointerId:1});
  for(let i=0;i<100;i++)h.step();
  for(const id of ['yarn','cat','head'])assert(!JSON.stringify(h.get(id).attrs).includes('NaN'));
  assert.equal(h.get('scene').dataset.activity,'yarn');
});

test('conversation takes priority over autonomous play and sleep can be woken by petting',async()=>{
  const h=await petHarness();h.get('yarn-button').fire('click');assert.equal(h.get('scene').dataset.activity,'yarn');
  h.event('nuomi:state',{state:'listening'});h.step(20000);assert.equal(h.get('scene').dataset.activity,'idle');
  h.event('nuomi:state',{state:'idle'});h.get('nap-button').fire('click');assert.equal(h.get('scene').dataset.activity,'sleep');
  h.get('pet-button').fire('click');assert.equal(h.get('scene').dataset.activity,'idle');
});

test('care actions finish into contentment, while weather reacts gently around sleep',async()=>{
  const h=await petHarness();h.get('feed-button').fire('click');assert.equal(h.get('scene').dataset.activity,'eat');
  h.step(6100);assert.equal(h.get('scene').dataset.emotion,'content');
  h.get('fold-button').fire('click');h.step(5300);assert.equal(h.get('fold-quilt').style.opacity,'1');assert(!h.get('quilt-flap').attrs.transform.includes('NaN'));
  h.get('weather-button').fire('click');assert.equal(h.get('scene').dataset.weather,'rain');assert.equal(h.get('scene').dataset.activity,'rainwatch');
  h.get('nap-button').fire('click');h.step();assert.equal(h.get('sleep-quilt').style.opacity,'1');
  h.get('weather-button').fire('click');assert.equal(h.get('scene').dataset.weather,'wind');assert.equal(h.get('scene').dataset.activity,'sleep');
  h.get('pet-button').fire('click');assert.equal(h.get('scene').dataset.emotion,'happy');
});

test('voice care commands survive listening and speaking; weather does not wake a sleeping pet',async()=>{
  const h=await petHarness();h.event('nuomi:command',{command:{action:'sleep'}});
  h.event('nuomi:state',{state:'speaking'});h.event('nuomi:state',{state:'listening'});h.step();
  assert.equal(h.get('scene').dataset.activity,'sleep');assert.equal(h.get('scene').dataset.emotion,'sleepy');
  h.event('nuomi:command',{command:{weather:'wind'}});assert.equal(h.get('scene').dataset.activity,'sleep');assert.equal(h.get('scene').dataset.emotion,'sleepy');
  h.event('nuomi:command',{command:{action:'wake'}});assert.equal(h.get('scene').dataset.activity,'stretch');
  h.event('nuomi:command',{command:{action:'fold'}});h.event('nuomi:state',{state:'speaking'});h.step(5300);assert.equal(h.get('scene').dataset.activity,'idle');assert.equal(h.get('scene').dataset.emotion,'content');assert.equal(h.get('fold-quilt').style.opacity,'1');
});

test('a friend can visit, respond to petting, join a toy chase and return home',async()=>{
 const h=await petHarness();h.get('friend-button').fire('click');h.step(2500);assert.equal(h.get('scene').dataset.friend,'together');
 h.get('friend-hit').fire('pointerdown');h.step();assert.equal(h.get('friend').style.opacity,'1');assert.equal(h.get('discovery-count').textContent,'1');
 h.get('yarn').fire('pointerdown',{clientX:565,clientY:438,pointerId:2});h.get('yarn').fire('pointermove',{clientX:220,clientY:340,pointerId:2});
 for(let i=0;i<100;i++)h.step();assert(!h.get('friend').attrs.transform.includes('NaN'));assert(!h.get('friend-pupils').attrs.transform.includes('NaN'));
 h.get('yarn').fire('pointerup',{pointerId:2});h.get('friend-button').fire('click');h.step(2500);assert.equal(h.get('scene').dataset.friend,'none');
});
test('garden visits change location; random invitations wait for a tap and never interrupt sleep',async()=>{
 const h=await petHarness();h.get('trip-button').fire('click');h.step(2500);assert.equal(h.get('scene').dataset.location,'garden');
 h.get('trip-button').fire('click');h.step(2500);assert.equal(h.get('scene').dataset.location,'home');
 const quiet=await petHarness();quiet.get('nap-button').fire('click');quiet.step(80000);assert.equal(quiet.get('scene').dataset.friend,'none');
 quiet.get('nap-button').fire('click');quiet.step(3000);assert.equal(quiet.get('scene').dataset.friend,'knocking');assert.equal(quiet.get('friend').style.opacity,'0');
 quiet.get('friend-button').fire('click');quiet.step(2500);assert.equal(quiet.get('scene').dataset.friend,'together');
});
test('touch ball drag moves the cat continuously and preserved care discoveries survive reload',async()=>{
 const h=await petHarness();const ball=h.get('yarn');ball.fire('pointerdown',{clientX:565,clientY:438,pointerId:5});
 ball.fire('pointermove',{clientX:190,clientY:350,pointerId:5});for(let i=0;i<80;i++)h.step();
 const first=+h.get('cat').attrs.transform.match(/translate\(([-.0-9]+)/)[1];assert(first<-80);
 ball.fire('pointermove',{clientX:650,clientY:350,pointerId:5});for(let i=0;i<110;i++)h.step();const second=+h.get('cat').attrs.transform.match(/translate\(([-.0-9]+)/)[1];assert(second>80);
 ball.fire('pointerup',{pointerId:5});h.get('pet-button').fire('click');assert.equal(h.get('discovery-count').textContent,'1');
 const restored=await petHarness({saved:h.saved});assert.equal(restored.get('discovery-count').textContent,'1');
});

test('touch feather drag steers both gaze and chase without activating belly actions',async()=>{
 const h=await petHarness();h.get('play-button').fire('click');h.get('scene').fire('pointerdown',{clientX:570,clientY:200,pointerId:6});
 h.get('scene').fire('pointermove',{clientX:190,clientY:180,pointerId:6});for(let i=0;i<100;i++)h.step();
 assert(+h.get('cat').attrs.transform.match(/translate\(([-.0-9]+)/)[1]<-80);assert.equal(h.get('scene').dataset.activity,'play');
 h.get('scene').fire('pointermove',{clientX:640,clientY:220,pointerId:6});for(let i=0;i<110;i++)h.step();
 assert(+h.get('cat').attrs.transform.match(/translate\(([-.0-9]+)/)[1]>80);h.get('belly-hit').fire('pointerdown');assert.equal(h.get('scene').dataset.activity,'play');
 h.get('scene').fire('pointercancel',{pointerId:6});
});
test('distinct care actions light all six discoveries; background time consumes no energy',async()=>{
 const h=await petHarness();h.get('pet-button').fire('click');h.get('feed-button').fire('click');h.step(6100);h.get('fold-button').fire('click');h.step(5300);
 h.get('friend-button').fire('click');h.step(2500);const ball=h.get('yarn');ball.fire('pointerdown',{clientX:550,clientY:430,pointerId:3});
 for(let i=0;i<550;i++){if(i%15===0)ball.fire('pointermove',{clientX:i%30===0?220:620,clientY:370,pointerId:3});h.step();}
 ball.fire('pointerup',{pointerId:3});h.get('nap-button').fire('click');for(let i=0;i<800;i++)h.step();assert.equal(h.get('discovery-count').textContent,'6');
 const energy=h.get('care-energy').attrs['aria-valuenow'];h.document.hidden=true;h.step(3600000);assert.equal(h.get('care-energy').attrs['aria-valuenow'],energy);
});
