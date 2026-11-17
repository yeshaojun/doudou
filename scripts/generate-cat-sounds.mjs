import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const rate=22050,root=resolve(import.meta.dirname,'../web/sounds');await mkdir(root,{recursive:true});
let seed=417;function noise(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;}
const smooth=x=>Math.max(0,Math.min(1,x));
function meow(out,start,length,pitch=610,volume=.24){
 let phase=0;const filters=[{y1:0,y2:0},{y1:0,y2:0},{y1:0,y2:0}];
 for(let i=0;i<length*rate;i++){
  const t=i/rate,u=t/length,at=Math.round(start*rate)+i;if(at>=out.length)break;
  const contour=u<.3?.83+u*1.15:1.175-(u-.3)*.73;
  const f=pitch*contour*(1+.018*Math.sin(2*Math.PI*7*t)+.007*Math.sin(t*57));phase+=2*Math.PI*f/rate;
  const voiced=Math.sin(phase)+.46*Math.sin(2*phase)+.23*Math.sin(3*phase)+.10*Math.sin(4*phase);
  const raw=voiced*.45+noise()*.028;
  const envelope=Math.pow(Math.sin(Math.PI*smooth(u)),.75)*smooth(t/.045)*smooth((length-t)/.09);
  // Moving vocal resonances turn a pitched glottal signal into a soft "myaow".
  const formants=[650+720*Math.sin(Math.PI*u),1750-650*u,2900-500*u];let voice=raw*.15;
  for(let j=0;j<filters.length;j++){
   const r=Math.exp(-Math.PI*(j===0?260:380)/rate),a=2*r*Math.cos(2*Math.PI*formants[j]/rate),filter=filters[j];
   const y=(1-r)*raw+a*filter.y1-r*r*filter.y2;filter.y2=filter.y1;filter.y1=y;voice+=y*[1,.65,.25][j];
  }
  out[at]+=Math.tanh(voice*2.2)*volume*envelope;
 }
}
function purr(out,start,length,volume=.085){let low=0;for(let i=0;i<length*rate;i++){
 const t=i/rate,at=Math.round(start*rate)+i;if(at>=out.length)break;low=low*.83+noise()*.17;
 const flutter=Math.pow(.5+.5*Math.sin(2*Math.PI*(26*t+.07*Math.sin(t*4))),2);
 const breath=.65+.35*Math.sin(2*Math.PI*.9*t);
 const envelope=smooth(t/.15)*smooth((length-t)/.28);
 out[at]+=(Math.sin(2*Math.PI*83*t)*.35+low*1.7)*flutter*breath*volume*envelope;
}}
const recipes={
 pet:{seconds:1.9,draw:o=>{meow(o,.02,.62,630,.22);purr(o,.48,1.35,.15);}},
 play:{seconds:.75,draw:o=>{meow(o,.02,.26,760,.18);meow(o,.35,.31,850,.16);}},
 eat:{seconds:.95,draw:o=>{meow(o,.02,.32,570,.18);purr(o,.27,.63,.14);}},
 sleep:{seconds:1.7,draw:o=>{purr(o,.02,1.6,.17);}},
 wake:{seconds:1.1,draw:o=>{meow(o,.03,.85,510,.21);}},
 content:{seconds:1.3,draw:o=>{meow(o,.02,.55,650,.20);purr(o,.40,.85,.13);}},
 curious:{seconds:.65,draw:o=>{meow(o,.02,.49,740,.18);}}
};
function wav(samples){const buffer=Buffer.alloc(44+samples.length*2);buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(samples.length*2,40);samples.forEach((v,i)=>buffer.writeInt16LE(Math.round(Math.max(-.65,Math.min(.65,v))*32767),44+i*2));return buffer;}
const all=[];
for(const [name,recipe] of Object.entries(recipes)){const data=new Float32Array(Math.ceil(recipe.seconds*rate));recipe.draw(data);await writeFile(resolve(root,name+'.wav'),wav(data));all.push(data,new Float32Array(rate*.4));}
const demo=new Float32Array(all.reduce((n,a)=>n+a.length,0));let at=0;for(const a of all){demo.set(a,at);at+=a.length;}
if(process.argv.includes('--demo'))await writeFile(resolve(import.meta.dirname,'../../../outputs/豆豆猫咪音效试听.wav'),wav(demo));
console.log('Generated 7 original synthesized cat effects (mono WAV).');
