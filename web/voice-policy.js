export function parseWakePhrase(text){
  if(typeof text!=='string')return null;
  const value=text.trim().replace(/^[，。！？、,.!?\s]+/,'');
  const match=value.match(/^(?:(?:你好|嗨|嘿)[，,\s]*)?(?:小)?(?:豆豆|逗逗|兜兜)(?:[，,\s]*(?:豆豆|逗逗|兜兜))*/);
  if(!match)return null;
  return {command:value.slice(match[0].length).replace(/^[，。！？、,.!?：:\s]+/,'').trim()};
}
export function isStopPhrase(text){
  return typeof text==='string'&&/^(?:(?:你好[，,\s]*)?豆豆[，,\s]*)?(?:我们)?(?:先)?(?:不聊了|暂停聊天|停止聊天|休息一下|睡觉吧|再见)[，。！？、,.!?\s]*$/.test(text.trim());
}
export function nextListeningMode({continuous,wakeEnabled,awake,hidden=false,failed=false}){
  if(hidden||failed||!continuous&&!wakeEnabled)return null;
  return wakeEnabled&&!awake?'wake':'dialogue';
}

// Keep complete phrases together; prepare the remaining voice while the first plays.
export function splitSpeechText(text){
  const value=String(text||'').trim();
  if(value.length<=36)return [value].filter(Boolean);
  const matches=[...value.matchAll(/[。！？!?；;，,]/g)];
  const boundary=matches.find(m=>m.index>=12&&m.index<=38)||matches.find(m=>m.index>=8&&m.index<=48);
  return boundary?[value.slice(0,boundary.index+1),value.slice(boundary.index+1).trim()].filter(Boolean):[value];
}

// Only explicit, fully matched commands control the pet. Stories, negation and
// questions about an action stay in conversation rather than moving the cat.
export function parsePetCommand(text){
  if(typeof text!=='string'||text.length>160)return null;
  if(/不要|别|不想|不吃|不睡|不叠|不玩|不用|不下雨|故事|如果|假如|说过|说了|说着|梦见|“|”|「|」|"/.test(text))return null;
  let value=text.trim().replace(/^(?:(?:你好|嗨|嘿)[，,\s]*)?(?:小)?(?:豆豆|逗逗|兜兜)[，,\s]*/, '');
  const query=value.replace(/[，。！？、,.!?\s]/g,'');
  if(/^(?:你|豆豆)?(?:现在)?(?:在干什么|在做什么|在干嘛)(?:呀|呢|啊)?$/.test(query))return {query:'activity'};
  if(/^(?:这里|我们这里|小世界|现在|今天|豆豆这里|你那里)*(?:的)?天气(?:怎么样|是什么|如何)(?:呀|呢|啊)?$/.test(query))return {query:'weather'};
  if(/^(?:你|豆豆)?(?:现在|今天)?(?:的)?心情(?:怎么样|好不好|是什么|如何)(?:呀|呢|啊)?$/.test(query)||/^(?:你|豆豆)(?:现在)?开心吗$/.test(query))return {query:'emotion'};
  const actions=[
    ['eat',/^(?:来|去|开始)?(?:吃饭饭|吃饭|吃东西|开饭|吃点饭)(?:啦|了|吧|呀|喽|咯)?$/],
    ['sleep',/^(?:去|来|该|准备)?(?:睡觉觉|睡觉|睡一觉|打个盹|盖好被子睡觉)(?:啦|了|吧|呀|喽|咯)?$/],
    ['wake',/^(?:快|该)?(?:起床|醒醒|醒一醒|起来|叫醒豆豆)(?:啦|了|吧|呀|喽|咯)?$/],
    ['fold',/^(?:来|去|开始)?(?:叠被子|叠小被子|把被子叠好|折被子)(?:啦|了|吧|呀|喽|咯)?$/],
    ['yarn',/^(?:来|去)?(?:追毛线球|玩毛线球|推毛线球)(?:啦|了|吧|呀)?$/],
    ['play',/^(?:来|去)?(?:追羽毛|玩羽毛|玩小羽毛|玩逗猫棒)(?:啦|了|吧|呀)?$/],
    ['pet',/^(?:来)?(?:摸摸头|摸摸你的头|摸摸脑袋|摸摸你的脑袋)(?:吧|呀)?$/],
    ['stretch',/^(?:来)?(?:伸懒腰|伸个懒腰|伸一个懒腰)(?:吧|呀)?$/],
    ['highfive',/^(?:来|和我)?(?:击掌|击个掌)(?:吧|呀)?$/],
    ['groom',/^(?:来|去)?(?:洗脸|洗洗脸)(?:吧|呀|啦)?$/],
    ['idle',/^(?:停下|停止)(?:玩耍|玩毛线球|玩羽毛|追球|动作)(?:吧|啦)?$/]
  ];
  const command={};
  for(let clause of value.split(/[，。！？；,.!?;]/).map(x=>x.trim()).filter(Boolean)){
    clause=clause.replace(/^(?:豆豆|逗逗|兜兜)[，,\s]*/, '').replace(/^(?:请你|请|我们一起|我们|一起|咱们一起|咱们)\s*/, '').replace(/\s/g,'');
    const weatherRules=[['rain',/^(?:让我们这里|让这里|这里|现在)?(?:下雨|下小雨|变成雨天|变成下雨天|切换到雨天)(?:了|啦|吧|呀)?$/],['wind',/^(?:让我们这里|让这里|这里|现在)?(?:刮风|起风|变成刮风天|切换到刮风天)(?:了|啦|吧|呀)?$/],['sunny',/^(?:让我们这里|让这里|这里|现在)?(?:天晴|出太阳|变成晴天|切换到晴天)(?:了|啦|吧|呀)?$/]];
    const foundWeather=weatherRules.find(([,pattern])=>pattern.test(clause));
    if(foundWeather){if(command.weather&&command.weather!==foundWeather[0])return null;command.weather=foundWeather[0];continue;}
    const found=actions.find(([,pattern])=>pattern.test(clause));
    if(found){if(command.action&&command.action!==found[0])return null;command.action=found[0];continue;}
    if(/^(?:笑一个|笑一笑|开心一点)(?:吧|呀)?$/.test(clause)){command.action='pet';continue;}
    if(/^(?:放松一下|安静一下)(?:吧|呀)?$/.test(clause)){command.action='idle';command.emotion='calm';continue;}
    return null;
  }
  return Object.keys(command).length?command:null;
}

export function petCommandReply(command,context={}){
  const weather={sunny:'小世界里是晴天。',rain:'小世界里下着雨，小伞撑好啦。',wind:context.activity==='sleep'?'小世界里起风了，小被子替豆豆挡住风。':'小世界里起风了，豆豆把小爪子站稳。'}[context.weather]||'';
  const feeling={happy:'开心',curious:'好奇',content:'满足',sleepy:'困困',calm:'安心'}[context.emotion]||'安心';
  const activity={idle:'安静陪着步步',eat:'小口吃饭',sleep:'盖着小被子睡觉',fold:'伸出小爪子叠被子',yarn:'追着毛线球玩',play:'盯着小羽毛玩',stretch:'伸一个大大的懒腰',highfive:'举起小爪子击掌',groom:'认真洗洗小脸',tickle:'扭扭软软的小肚皮',rainwatch:'撑着伞听雨',windbrace:'把爪子站稳，感受小风',yawn:'打一个小哈欠'}[context.activity]||'陪着步步';
  if(command.query==='weather')return '步步，'+weather;
  if(command.query==='emotion')return `步步，豆豆现在${feeling}，正在${activity}。`;
  if(command.query==='activity')return `步步，豆豆正在${activity}，心里${feeling}。`+(context.location==='garden'?'我们在团团的小花园里。':'')+(['entering','together'].includes(context.friend)?'团团也在旁边陪着。':'');
  const replies={eat:'好呀，步步，豆豆开始小口吃饭，心里暖暖的。',sleep:'好呀，步步，豆豆困困地盖好被子，闭上眼睛。',wake:'步步，豆豆醒来啦！伸伸小爪子，开心地陪你玩。',fold:'步步，我们先折一边，再折另一边，安心地叠小被子。',yarn:'步步，豆豆好奇地追毛线球啦！轻轻推给我吧。',play:'步步，豆豆盯住小羽毛啦！带着它跑一跑吧。',pet:'呼噜呼噜，步步，豆豆开心得想蹭蹭你。',stretch:'步步，豆豆伸伸前爪，再伸伸小尾巴。',highfive:'啪！步步，和豆豆的小爪子击掌啦。',groom:'步步，豆豆先洗洗小脸，再陪你玩。',idle:'好呀，步步，豆豆停下来，安心地陪着你。'};
  return (replies[command.action]||`步步，豆豆心里${feeling}，正在${activity}。`)+(command.weather||context.weather==='rain'||context.weather==='wind'?weather:'');
}
