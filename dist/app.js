(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const scene = $('scene'), cat = $('cat'), head = $('head'), tail = $('tail');
  const pupils = document.querySelector('.pupil');
  const mood = $('mood-text'), speech = $('speech'), hit = $('head-hit');
  const petBtn = $('pet-button'), playBtn = $('play-button'), napBtn = $('nap-button');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let mode = 'idle', happyUntil = 0, blinkUntil = 0, nextBlink = performance.now() + 2100;
  let nextEar = performance.now() + 4100, earUntil = 0, lastPointer = 0;
  let target = {x: 400, y: 230}, gaze = {x: 0, y: 0}, aim = {x: 0, y: 0};
  let feather = {x: 570, y: 220}, pressed = false, lastPet = 0, happyTimer, bubbleTimer;
  const petMessages = ['嗯～好舒服呀 ♡', '再摸一下下嘛 ♡', '你的小手好温柔呀', '呼噜呼噜，喜欢你 ♡'];
  let pets = 0;

  function pointFromEvent(event) {
    const matrix = scene.getScreenCTM();
    if (!matrix) return {x: 400, y: 230};
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return {x: p.x, y: p.y};
  }
  function say(text, status) {
    speech.textContent = text;
    if (status) mood.textContent = status;
  }
  function idleMessage() {
    if (mode === 'sleep') return;
    if (mode === 'play') say('小羽毛，我要抓到你啦！', '眼睛里都是你的小羽毛');
    else say('你好呀，来摸摸我吧 ♡', '一只心情很好的小猫');
  }
  function hearts(x, y) {
    if (reducedMotion.matches) return;
    const ns = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < 4; i++) {
      const el = document.createElementNS(ns, 'path');
      el.setAttribute('d', 'M0 4C-18-5-11-17 0-9 11-17 18-5 0 4Z');
      el.setAttribute('fill', ['#dba395','#d6b979','#b2bf9c','#e5c3b6'][i]);
      const px = x + (Math.random() - .5) * 110, py = y + (Math.random() - .5) * 15;
      el.setAttribute('transform', `translate(${px} ${py}) scale(.65)`);
      $('particles').appendChild(el);
      const start = performance.now(), duration = 1200 + Math.random() * 500;
      function float(now) {
        const t = (now - start) / duration;
        if (t >= 1) { el.remove(); return; }
        el.setAttribute('transform', `translate(${px + Math.sin(t * 4 + i) * 16} ${py - t * 105}) rotate(${(t-.5)*24}) scale(${.5 + Math.sin(t * Math.PI)*.24})`);
        el.setAttribute('opacity', String(Math.sin(Math.PI * t) * .9));
        requestAnimationFrame(float);
      }
      requestAnimationFrame(float);
    }
  }
  function wake() {
    mode = 'idle';
    cat.classList.remove('is-sleeping');
    scene.classList.remove('is-sleeping');
    napBtn.setAttribute('aria-pressed','false');
    $('nap-label').innerHTML = '打个盹<small>陪我做一个好梦</small>';
    $('hint-text').textContent = '试着移动鼠标，或者用手指轻轻摸摸它。';
  }
  function pet(p = {x: 400, y: 172}) {
    const now = performance.now();
    if (now - lastPet < 240) return;
    const wasSleeping = mode === 'sleep';
    if (wasSleeping) wake();
    lastPet = now; happyUntil = now + 1700;
    cat.classList.add('is-happy');
    say(wasSleeping ? '唔，是你呀……蹭蹭 ♡' : petMessages[pets++ % petMessages.length], '呼噜呼噜 · 被温柔包围啦');
    hearts(Math.max(320, Math.min(480, p.x)), Math.max(135, Math.min(200, p.y)));
    clearTimeout(happyTimer);
    happyTimer = setTimeout(() => {cat.classList.remove('is-happy'); idleMessage();}, 1900);
  }
  function togglePlay() {
    clearTimeout(happyTimer); cat.classList.remove('is-happy'); happyUntil = 0;
    if (mode === 'play') {
      mode = 'idle';scene.classList.remove('is-playing');playBtn.setAttribute('aria-pressed','false');
      $('hint-text').textContent = '试着移动鼠标，或者用手指轻轻摸摸它。';idleMessage();return;
    }
    if (mode === 'sleep') wake();
    mode = 'play'; scene.classList.add('is-playing');playBtn.setAttribute('aria-pressed','true');
    target = {x: 565, y: 210}; lastPointer = 0;
    say('小羽毛，我要抓到你啦！', '眼睛里都是你的小羽毛');
    $('hint-text').textContent = '移动鼠标或在画面里滑动手指，带着小羽毛跑一跑。';
  }
  function toggleNap() {
    clearTimeout(happyTimer);cat.classList.remove('is-happy');happyUntil = 0;
    if (mode === 'sleep') {wake();say('睡饱啦，我们继续玩吧 ♡','伸个小懒腰，又是精神小猫');return;}
    mode = 'sleep';scene.classList.remove('is-playing');playBtn.setAttribute('aria-pressed','false');
    cat.classList.add('is-sleeping');scene.classList.add('is-sleeping');
    napBtn.setAttribute('aria-pressed','true');$('nap-label').innerHTML = '叫醒它<small>一起伸个小懒腰</small>';
    say('呼……梦里也有你 ♡', '嘘，糯米正在做一个软软的梦');
    $('hint-text').textContent = '轻轻摸摸脑袋，或者点一下「叫醒它」。';
  }
  document.addEventListener('pointermove', event => {
    const p = pointFromEvent(event); target = p; lastPointer = performance.now();
    if (pressed && mode !== 'play') {
      const dx = p.x - 400, dy = p.y - 218;
      if ((dx * dx / (133 * 133) + dy * dy / (90 * 90)) < 1.2) pet(p);
    }
  }, {passive:true});
  scene.addEventListener('pointerdown', event => {
    target = pointFromEvent(event);lastPointer = performance.now();
    if (mode === 'play') { scene.setPointerCapture(event.pointerId); event.preventDefault(); }
  });
  hit.addEventListener('pointerdown', event => {
    if (mode === 'play') return;
    pressed = true;hit.setPointerCapture(event.pointerId);pet(pointFromEvent(event));event.preventDefault();
  });
  document.addEventListener('pointerup', () => {pressed = false;});
  document.addEventListener('pointercancel', () => {pressed = false;});
  hit.addEventListener('lostpointercapture', () => {pressed = false;});
  hit.addEventListener('keydown', event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();pet();}});
  petBtn.addEventListener('click', () => pet());
  playBtn.addEventListener('click', togglePlay);
  napBtn.addEventListener('click', toggleNap);
  $('theme-button').addEventListener('click', () => {
    const night = document.body.classList.toggle('night');
    $('theme-button').setAttribute('aria-pressed', String(night));
    $('theme-button').setAttribute('aria-label', night ? '切换到白天' : '切换到夜晚');
    clearTimeout(bubbleTimer);
    if (mode === 'idle') {
      say(night ? '月亮出来啦，陪我看星星吧' : '暖暖的太阳，照到小肚皮啦');
      bubbleTimer = setTimeout(idleMessage, 3500);
    }
  });
  document.addEventListener('keydown', event => {if (event.key === 'Escape' && mode === 'play') togglePlay();});

  let previous = 0;
  function animate(now) {
    const dt = Math.min((now - previous) / 16.67, 3); previous = now;
    const sleepy = mode === 'sleep', happy = now < happyUntil, reduced = reducedMotion.matches;
    const t = now / 1000;
    let x = target.x, y = target.y;
    if (now - lastPointer > 3400) {
      x = 400 + Math.sin(t * .46) * 68; y = 242 + Math.sin(t * .32) * 25;
      if (mode === 'play') {x = 400 + Math.sin(t * .9) * 160; y = 215 + Math.cos(t * 1.4) * 65;}
    }
    aim.x = sleepy ? 0 : Math.max(-1, Math.min(1, (x - 400) / 230));
    aim.y = sleepy ? .2 : Math.max(-1, Math.min(1, (y - 245) / 190));
    const follow = 1 - Math.pow(.86, dt);
    gaze.x += (aim.x - gaze.x) * follow; gaze.y += (aim.y - gaze.y) * follow;
    pupils.setAttribute('transform', `translate(${gaze.x * 6.5} ${gaze.y * 5})`);
    const breath = reduced ? 0 : Math.sin(t * (sleepy ? 1.35 : 1.8));
    const lean = happy && !reduced ? Math.sin(t * 4) * 3 : 0;
    head.style.transform = `translate(${gaze.x * 3}px,${breath * 1.5 + (happy ? 2 : 0)}px) rotate(${gaze.x * 3 + lean + (sleepy ? 5 : 0)}deg)`;
    $('body-breathe').style.transform = `scale(${1 + breath * .005},${1 + breath * .009})`;
    tail.style.transform = `rotate(${reduced ? 0 : Math.sin(t * (happy ? 4.5 : sleepy ? .65 : 1.6)) * (sleepy ? 2 : happy ? 12 : 8)}deg)`;
    if (now > nextBlink && !sleepy && !happy) {blinkUntil = now + 150;nextBlink = now + 2500 + Math.random() * 4200;if (Math.random() < .25) nextBlink = now + 340;}
    cat.classList.toggle('is-blinking', now < blinkUntil && !happy && !sleepy);
    if (now > nextEar && !reduced) {earUntil = now + 480;nextEar = now + 4500 + Math.random() * 6500;}
    $('ear-left').style.transform = `rotate(${now < earUntil ? Math.sin((earUntil - now) / 480 * Math.PI * 2) * 7 : 0}deg)`;
    $('ear-right').style.transform = `rotate(${now < earUntil ? Math.sin((earUntil - now) / 480 * Math.PI * 2 + .7) * -4 : 0}deg)`;
    const playing = mode === 'play';
    $('paw-right').style.transform = `rotate(${playing ? -23 + gaze.x * -9 : happy && !reduced ? Math.sin(t*2.8)*3 : 0}deg) translateY(${playing ? -13 : 0}px)`;
    if (playing) {
      const fx = Math.max(180,Math.min(625,x)), fy = Math.max(125,Math.min(375,y));
      feather.x += (fx - feather.x) * follow;feather.y += (fy - feather.y) * follow;
      $('feather').setAttribute('transform',`translate(${feather.x} ${feather.y}) rotate(${Math.sin(t*3)*12})`);
      $('toy-string').setAttribute('d',`M${feather.x} ${feather.y-24}Q${feather.x+32} ${feather.y-100} ${feather.x+105} ${feather.y-140}`);
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
