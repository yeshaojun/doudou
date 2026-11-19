(() => {
 'use strict';
 const $=id=>document.getElementById(id),tabs=[...document.querySelectorAll('[data-section]')],dock=document.querySelector('.toy-dock'),stories=document.querySelector('.little-stories'),garden=document.querySelector('.growth-garden');
 const toys=[...dock.querySelectorAll('button')];
 const art={play:document.querySelector('[data-native="feather"] .item-art').innerHTML,care:document.querySelector('[data-item="food"] .item-art').innerHTML,stories:document.querySelector('[data-story="tidy"] svg').outerHTML,growth:'<svg viewBox="0 0 64 56" fill="none"><path d="M31 48V25" stroke="#8a9e76" stroke-width="3"/><path d="M31 33Q5 35 13 12q23 0 18 21Z" fill="#b5c59c" stroke="#899e73" stroke-width="1.5"/><path d="M31 23Q32 4 54 7q2 23-23 16Z" fill="#9fb88a" stroke="#819c70" stroke-width="1.5"/><path d="M23 49h16" stroke="#c6ae84" stroke-width="3" stroke-linecap="round"/></svg>'};
 tabs.forEach(b=>b.querySelector('span').innerHTML=art[b.dataset.section]);
 function select(section){
  document.dispatchEvent(new CustomEvent('doudou:clear-tools'));
  tabs.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.section===section)));
  dock.dataset.drawer=section;dock.hidden=!['play','care'].includes(section);stories.hidden=section!=='stories';garden.hidden=section!=='growth';
  for(const b of toys){const play=!!b.dataset.native||b.dataset.item==='box';b.hidden=section==='play'?!play:play;}
  $('basket-section-title').textContent=section==='care'?'照顾篮':'玩具篮';
  if(section==='growth'){$('growth-details').hidden=false;$('growth-button').setAttribute('aria-expanded','true');}
 }
 tabs.forEach(b=>b.addEventListener('click',()=>select(b.dataset.section)));
 select('play');
})();
