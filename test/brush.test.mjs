import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../standalone/brush.js',import.meta.url),'utf8');
function harness(){
 const nodes=new Map(),events=new Map(),emitted=[],timers=new Map();let timerId=0;
 class Element{constructor(){this.hidden=true;this.disabled=false;this.style={};this.dataset={};this.attrs={};this.children=[];this.listeners=new Map();const classes=new Set();this.classList={add:(...names)=>names.forEach(n=>classes.add(n)),remove:(...names)=>names.forEach(n=>classes.delete(n)),toggle:(n,b)=>b?classes.add(n):classes.delete(n),contains:n=>classes.has(n)};}addEventListener(k,fn){if(!this.listeners.has(k))this.listeners.set(k,[]);this.listeners.get(k).push(fn);}fire(k,o={}){if(k==='click'&&this.disabled)return;for(const fn of this.listeners.get(k)||[])fn({preventDefault(){},...o});}click(){this.fire('click');}setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}focus(){}setPointerCapture(){}getScreenCTM(){return{inverse:()=>({})};}getBoundingClientRect(){return{left:0,top:0,width:800,height:540};}}
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};get('brush-tool').parentElement=new Element();get('brush-score').children=[new Element(),new Element(),new Element()];
 const doc={hidden:false,getElementById:get,dispatchEvent:e=>emitted.push(e),addEventListener:(k,f)=>events.set(k,f)};
 const ctx={document:doc,window:{matchMedia:()=>({matches:false}),addEventListener:(k,f)=>events.set('window:'+k,f)},DOMPoint:class{constructor(x,y){this.x=x;this.y=y;}matrixTransform(){return this;}},CustomEvent:class{constructor(type,o){this.type=type;this.detail=o?.detail;}},setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext(source,ctx);get('brush-open').click();
 const move=(x,y)=>get('brush-tool').fire('pointermove',{clientX:x,clientY:y,pointerId:1});
 const start=(x,y)=>get('brush-tool').fire('pointerdown',{clientX:x,clientY:y,pointerId:1});
 function clean(){start(350,310);for(const x of [350,400,450])for(let i=0;i<12;i++)move(x+(i%2?7:-7),310);get('brush-tool').fire('pointerup');}
 return{get,start,move,clean,emitted,doc,event:k=>events.get(k)?.(),finish:()=>{const copy=[...timers.values()];timers.clear();copy.forEach(fn=>fn());}};
}
test('brushing needs actual movement inside the mouth; holding and outside movement do not clean',()=>{
 const h=harness();h.start(100,200);for(let i=0;i<20;i++)h.move(100+i,200);assert.equal(h.get('brush-score').attrs['aria-valuenow'],'0');
 h.move(350,310);assert.equal(h.get('brush-score').attrs['aria-valuenow'],'0');for(let i=0;i<10;i++)h.move(350,310);assert.equal(h.get('brush-score').attrs['aria-valuenow'],'0');assert(h.get('rinse-button').disabled);
});
test('all three tooth areas must be brushed before rinse unlocks; rinsing finishes with a happy cat',()=>{
 const h=harness();h.start(350,310);for(let i=0;i<20;i++)h.move(350+(i%2?7:-7),310);assert(h.get('rinse-button').disabled);assert.equal(h.get('brush-score').attrs['aria-valuenow'],'33');h.get('brush-tool').fire('pointerup');
 h.clean();assert.equal(h.get('brush-score').attrs['aria-valuenow'],'100');assert(!h.get('rinse-button').disabled);h.get('rinse-button').click();assert.equal(h.get('rinse-water').attrs.opacity,'1');h.finish();assert.equal(h.get('brush-foam').attrs.opacity,'0');assert(h.get('brush-cat').classList.contains('is-happy'));assert(h.emitted.some(e=>e.type==='nuomi:command'&&e.detail.command.action==='pet'));
});
test('cancelled or backgrounded gestures stop scoring and reopening starts a fresh brushing session',()=>{
 const h=harness();h.start(350,310);h.get('brush-tool').fire('pointercancel');h.move(360,310);assert.equal(h.get('brush-score').attrs['aria-valuenow'],'0');
 h.clean();h.get('rinse-button').click();h.doc.hidden=true;h.event('visibilitychange');h.finish();assert(h.get('brush-room').hidden);assert(!h.get('brush-cat').classList.contains('is-happy'));h.get('brush-open').click();assert.equal(h.get('brush-score').attrs['aria-valuenow'],'0');assert(h.get('rinse-button').disabled);
});
