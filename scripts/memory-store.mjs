import {readFile,mkdir,writeFile,rename,chmod,unlink} from 'node:fs/promises';
import {dirname} from 'node:path';
import {cleanMemory} from '../worker/memory-policy.js';
export function createMemoryStore(path){
 let queue=Promise.resolve(),cached;
 const run=fn=>{const task=queue.then(fn);queue=task.catch(()=>{});return task;};
 async function read(){if(!cached){try{const data=JSON.parse(await readFile(path,'utf8'));if(data.version!==1)throw new Error('unsupported_memory');cached=data;}catch(e){if(e.code!=='ENOENT')throw e;cached=cleanMemory();}}return cleanMemory(cached);}
 async function commit(next){
  await mkdir(dirname(path),{recursive:true,mode:0o700});await chmod(dirname(path),0o700);
  const temporary=path+'.'+crypto.randomUUID()+'.tmp';
  try{await writeFile(temporary,JSON.stringify(next),{mode:0o600,flag:'wx'});await rename(temporary,path);await chmod(path,0o600);}catch(e){await unlink(temporary).catch(()=>{});throw e;}
  cached=next;return structuredClone(next);
 }
 return {
  get:()=>run(async()=>{const next=await read();if(JSON.stringify(cached)!==JSON.stringify(next))return commit(next);return structuredClone(next);}),
  update:fn=>run(async()=>commit(cleanMemory(await fn(structuredClone(await read())))))
 };
}
