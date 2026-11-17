import test from 'node:test';
import assert from 'node:assert/strict';
import {parseWakePhrase,isStopPhrase,nextListeningMode,splitSpeechText,parsePetCommand,petCommandReply} from '../web/voice-policy.js';
test('wake word accepts greetings, repeated names, and an attached request',()=>{
  assert.deepEqual(parseWakePhrase('你好，豆豆，给步步讲个故事。'),{command:'给步步讲个故事。'});
  assert.deepEqual(parseWakePhrase('豆豆豆豆！'),{command:''});
  assert.deepEqual(parseWakePhrase('小豆豆，我来啦'),{command:'我来啦'});
  assert.deepEqual(parseWakePhrase('逗逗，讲故事'),{command:'讲故事'});
});
test('mentions in the middle of speech do not wake the cat',()=>{
  for(const text of ['我喜欢吃豆豆','今天看见一个叫豆豆的小朋友','小兔子回家了','',null])assert.equal(parseWakePhrase(text),null);
});
test('explicit stop phrases are recognized without stopping on story narration',()=>{
  for(const text of ['豆豆，不聊了。','我们先不聊了','暂停聊天','再见！'])assert.equal(isStopPhrase(text),true);
  for(const text of ['小兔子说再见','你知道什么时候该休息一下吗？','我想听故事'])assert.equal(isStopPhrase(text),false);
});
test('continuous dialogue listens again after a response',()=>{
  assert.equal(nextListeningMode({continuous:true,wakeEnabled:false,awake:true}),'dialogue');
  assert.equal(nextListeningMode({continuous:false,wakeEnabled:false,awake:true}),null);
});
test('wake standby is distinct from an active conversation',()=>{
  assert.equal(nextListeningMode({continuous:true,wakeEnabled:true,awake:false}),'wake');
  assert.equal(nextListeningMode({continuous:true,wakeEnabled:true,awake:true}),'dialogue');
  assert.equal(nextListeningMode({continuous:false,wakeEnabled:true,awake:false}),'wake');
});
test('backgrounding and errors never restart the microphone',()=>{
  assert.equal(nextListeningMode({continuous:true,wakeEnabled:true,awake:true,hidden:true}),null);
  assert.equal(nextListeningMode({continuous:true,wakeEnabled:true,awake:false,failed:true}),null);
});

test('speech splits at a natural phrase and preserves all text',()=>{
  const text='步步，小兔子在窗边看见一颗闪亮的星星。它带上小灯笼，沿着弯弯的小路去找星星的朋友。';
  const parts=splitSpeechText(text);assert.equal(parts.length,2);assert(parts[0].endsWith('。'));assert.equal(parts.join(''),text);
  assert.deepEqual(splitSpeechText('步步你好。'),['步步你好。']);
});

test('direct pet commands accept natural child phrases, aliases and combined weather',()=>{
  for(const [text,expected] of [['豆豆吃饭啦',{action:'eat'}],['豆豆去睡觉',{action:'sleep'}],['我们一起叠被子',{action:'fold'}],['你好逗逗，睡觉吧！',{action:'sleep'}],['豆豆起床啦',{action:'wake'}],['请追毛线球吧',{action:'yarn'}],['下雨啦，豆豆吃饭啦',{weather:'rain',action:'eat'}],['我们一起切换到晴天吧',{weather:'sunny'}],['豆豆笑一笑',{action:'pet'}]])assert.deepEqual(parsePetCommand(text),expected,text);
});
test('negation, stories, hypotheticals, questions and ambiguous multi-actions do not execute',()=>{
  for(const text of ['豆豆不要睡觉','别下雨啦','豆豆不吃饭','讲一个豆豆吃饭的故事','如果豆豆去睡觉会怎么样','小猫说了吃饭啦','“豆豆去睡觉”','豆豆吃饭了吗？','你知道怎么叠被子吗','我有点困了','我不开心','豆豆吃饭啦，去睡觉','下雨啦，不要睡觉',null,''])assert.equal(parsePetCommand(text),null,String(text));
});
test('state questions are read-only and replies reflect the actual scene',()=>{
  for(const [text,query] of [['豆豆你在干嘛','activity'],['豆豆现在心情怎么样','emotion'],['你现在开心吗','emotion'],['现在天气怎么样','weather']])assert.deepEqual(parsePetCommand(text),{query});
  const context={weather:'rain',activity:'sleep',emotion:'sleepy'};
  assert.match(petCommandReply({action:'sleep'},context),/困困.*盖好被子/);
  assert.match(petCommandReply({action:'sleep'},context),/下着雨/);
  assert.match(petCommandReply({query:'emotion'},context),/困困.*盖着小被子睡觉/);
  const wind=petCommandReply({weather:'wind'},{...context,weather:'wind'});assert.match(wind,/挡住风/);assert(!wind.includes('站稳'));
});
