import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import '../standalone/build.mjs';
const root=resolve(import.meta.dirname,'..');
const assets={};
for(const [path,type] of [['index.html','text/html; charset=utf-8'],['style.css','text/css; charset=utf-8'],['app.js','text/javascript; charset=utf-8'],['chat.js','text/javascript; charset=utf-8'],['boot.js','text/javascript; charset=utf-8'],['cat-sounds.js','text/javascript; charset=utf-8'],['memory-ui.js','text/javascript; charset=utf-8'],['pet-life.js','text/javascript; charset=utf-8'],['voice-policy.js','text/javascript; charset=utf-8']]){
  assets['/'+path]={type,body:await readFile(resolve(root,'web',path),'utf8')};
}
assets['/chat.html']=assets['/index.html'];
const standalone=await readFile(resolve(root,'standalone/index.html'),'utf8');
const scriptHashes=[...standalone.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>"'sha256-"+createHash('sha256').update(match[1]).digest('base64')+"'").join(' ');
assets['/index.html']={type:'text/html; charset=utf-8',body:standalone,scriptHashes};
assets['/pet-home.html']=assets['/index.html'];
for(const name of ['pet','play','eat','sleep','wake','content','curious']){for(const [extension,type] of [['wav','audio/wav'],['m4a','audio/mp4']])assets['/sounds/'+name+'.'+extension]={type,encoding:'base64',body:(await readFile(resolve(root,'web/sounds',name+'.'+extension))).toString('base64')};}
const memoryPolicy=(await readFile(resolve(root,'worker/memory-policy.js'),'utf8')).replaceAll('export ','');
const worker=(await readFile(resolve(root,'worker/index.js'),'utf8')).replace(/^import[^\n]+memory-policy.js';\n/,memoryPolicy+'\n');
const manifest=JSON.parse(await readFile(resolve(root,'.openai/hosting.json'),'utf8'));
if(manifest.static) throw new Error('Remove static.directory after completing the Worker migration.');
await rm(resolve(root,'dist'),{recursive:true,force:true});
await mkdir(resolve(root,'dist/server'),{recursive:true});
await mkdir(resolve(root,'dist/.openai'),{recursive:true});
await writeFile(resolve(root,'dist/server/index.js'),worker.replace('const ASSETS = {};',`const ASSETS = ${JSON.stringify(assets)};`));
await writeFile(resolve(root,'dist/.openai/hosting.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Built Worker with embedded web assets; no credentials are bundled.');
