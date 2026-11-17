(() => {
 'use strict';const $=id=>document.getElementById(id),categories={animal:'动物',color:'颜色',story:'故事',game:'游戏',food:'食物'};
 let data=null,editingId=null,revision=0;
 function notice(text,error=false){$('memory-status').textContent=text;$('memory-status').classList.toggle('is-error',error);}
 async function request(body){const res=await fetch('/api/memory',{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Nuomi-Client':'1','X-Parent-Preview':'1'},...(body?{body:JSON.stringify(body)}:{})});const value=await res.json();if(!res.ok)throw new Error(value.error?.message||'记忆暂时无法保存，请重试。');return value;}
 function resetForm(){editingId=null;$('memory-value').value='';$('memory-save').textContent='保存这条偏好';}
 async function change(body){const ticket=++revision;const value=await request(body);if(ticket===revision){data=value;render();}return value;}
 function actionButton(text,fn){const el=document.createElement('button');el.type='button';el.textContent=text;el.addEventListener('click',async()=>{el.disabled=true;try{await fn();}catch(e){notice(e.message,true);el.disabled=false;}});return el;}
 function render(){
  if(!data)return;$('memory-enabled').checked=data.enabled;
  notice((data.enabled?'记忆已开启':'记忆已暂停')+' · 已确认 '+data.facts.length+' 条 · 待确认 '+data.pending.length+' 条');
  for(const [id,items,pending]of [['memory-facts',data.facts,false],['memory-pending',data.pending,true]]){
   const list=$(id);list.replaceChildren();if(!items.length){const empty=document.createElement('p');empty.className='memory-empty';empty.textContent=pending?'孩子提到的偏好会出现在这里，确认后才长期记住。':'还没有长期偏好，可以在下面添加。';list.append(empty);}
   for(const fact of items){const row=document.createElement('div');row.className='memory-item';const text=document.createElement('span');text.textContent=categories[fact.category]+' · '+(fact.preference==='like'?'喜欢':'不喜欢')+' '+fact.value;row.append(text);
    if(pending)row.append(actionButton('确认记住',()=>change({action:'approve',id:fact.id})),actionButton('忽略',()=>change({action:'reject',id:fact.id})));
    else row.append(actionButton('修改',()=>{editingId=fact.id;$('memory-category').value=fact.category;$('memory-preference').value=fact.preference;$('memory-value').value=fact.value;$('memory-save').textContent='保存修改';$('memory-value').focus();}),actionButton('忘记',async()=>{const value=await change({action:'delete',id:fact.id});resetEvent(value);}));
    list.append(row);
   }
  }
  const recent=$('memory-recent');recent.replaceChildren();for(const turn of data.recent.slice(-8)){const p=document.createElement('p');p.textContent=(turn.role==='user'?'步步：':'豆豆：')+turn.content;recent.append(p);}
  if(!data.recent.length)recent.textContent='还没有保存近期对话。';
 }
 async function load(){const ticket=++revision;try{const value=await request();if(ticket===revision){data=value;render();}return value;}catch(e){if(ticket===revision)notice(e.message,true);return null;}}
 function resetEvent(value){document.dispatchEvent(new CustomEvent('nuomi:memory-reset',{detail:{recent:value.enabled?value.recent:[]}}));}
 $('memory-enabled').addEventListener('change',async()=>{try{const value=await change({action:'settings',enabled:$('memory-enabled').checked});resetEvent(value);}catch(e){$('memory-enabled').checked=data?.enabled!==false;notice(e.message,true);}});
 $('memory-form').addEventListener('submit',async e=>{e.preventDefault();$('memory-save').disabled=true;try{const value=await change({action:'save',oldId:editingId,fact:{category:$('memory-category').value,preference:$('memory-preference').value,value:$('memory-value').value}});resetForm();resetEvent(value);}catch(err){notice(err.message,true);}finally{$('memory-save').disabled=false;}});
 $('memory-refresh').addEventListener('click',load);
 $('memory-clear-all').addEventListener('click',()=>{$('memory-clear-confirm').hidden=false;});
 $('memory-cancel-clear').addEventListener('click',()=>{$('memory-clear-confirm').hidden=true;});
 $('memory-confirm-clear').addEventListener('click',async()=>{try{const value=await change({action:'clearAll'});$('memory-clear-confirm').hidden=true;resetForm();resetEvent(value);}catch(e){notice(e.message,true);}});
 window.DoudouMemory={load,async clearRecent(){const value=await change({action:'clearRecent'});return value;},recordTurn(user,assistant){if(!data?.enabled)return;const epoch=data.epoch,ticket=++revision;request({action:'turn',user,assistant,epoch}).then(value=>{if(ticket===revision&&data.epoch===epoch){data=value;render();}}).catch(e=>notice(e.message,true));},refresh:load,failure:()=>notice('这次对话暂未保存到记忆，请检查本机存储后重试。',true)};
})();
