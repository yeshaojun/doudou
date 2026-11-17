# 豆豆和步步的小世界

一个带眼睛跟随、抚摸反馈、毛线球追逐、日常照料、天气、情绪和连续语音聊天的小猫原型。

## 运行

需要 Node.js 22 或更高版本，无第三方依赖。服务仅监听 `127.0.0.1:4173`。

1. 将 `.env.example` 复制为 `.dev.vars` 并填写服务端配置，文件权限设为 600。
2. `node scripts/build.mjs`
3. `node scripts/dev-server.mjs`

访问页面后输入访问口令，在右上角家长设置中开启体验。语音按钮点一次录音，再点一次结束；检测到声音后的持续静音也会结束录音，单次最多 20 秒。可随时停止回复，支持持久近期上下文与重复播放。第一次点话筒默认连续聊天；安静时继续等待，不因两轮静音退出。思考或准备声音时话筒仍可手动打断；连续模式也会检测持续的新讲话以自动打断，实际扬声器回声环境仍需在目标设备测试。

## 当前服务与验证

- 对话：DeepSeek `deepseek-flash`，关闭思考模式，自然短句输出，兼容旧版 JSON 回复。
- 本机语音识别：Token Plan `qwen-audio-3.0-asr-flash`。
- 本机语音合成：Token Plan `qwen-audio-3.0-tts-plus`，`longanhuan_v3.6` 音色。
- 2026-11-14：上述完整链路使用合成测试录音验证成功。
- 兔子账户目录可见 600 个模型；本次 `whisper-1`、`tts-1`、`tts-1-hd`、`gpt-audio` 实测返回 503，未启用为默认线路。
- 已接入本机近期对话与家长确认的长期偏好。默认使用 SSE 流式合成，后端把 PCM 块即时转发，前端 Web Audio 按音频时钟依次播放；流式不可用且尚未发声时回退到 WAV 分段播放。当前并非实时模型全双工。

`VOICE_PROVIDER=token-plan` 只允许本机开发服务调用，订阅 Key 不进入在线站点配置。后续 `VOICE_PROVIDER=aliyun` 配合 `ALI_API_KEY` 使用普通百炼端点；切换前应再核对模型及地域。`VOICE_PROVIDER=tuzi` 切换回兔子适配器。

## 外网访问

`ngrok http http://127.0.0.1:4173 --inspect=false`

外网入口使用 HTTPS、访问口令和有效期 12 小时的 HttpOnly 会话 Cookie。登录尝试有限流；API 请求验证来源和家长体验标记。所有模型密钥仅由后端读取。ngrok 请求内容检查已关闭，应用不保存原始录音；近期文字对话与家长确认偏好保存在本机，最后一次播放音频只存在页面内存。

这是开发验证服务：主机、后端及 ngrok 均需保持运行。没有后台守护或开机自启设置。

## 验证

`node --test test/*.test.mjs`

测试包括凭据隔离、身份与来源校验、输入边界、上游错误处理、音频下载白名单及转写结果解析。另以真实服务验证了本机语音链路和外网登录及聊天。浏览器中的真实麦克风收音仍需本人在设备上试用。

## 小猫日常与天气

吃饭会低头咀嚼，结束后进入满足状态；睡觉会盖被子，可摸头叫醒；叠被子会伸爪折叠。天气按钮循环晴天、下雨和刮风，下雨撑伞、刮风站稳。开心、好奇、满足、困困、安心都是虚拟小猫的状态，不代表儿童情绪诊断。当前天气、动作和情绪会以服务端白名单状态传入聊天，不推断现实天气。

前台唤醒需在家长设置开启；检测到讲话后调用 ASR 判断是否以“豆豆”开头，会使用模型额度。切到后台、锁屏、点停一下或到十分钟上限均释放麦克风。当前应用不保存原始录音；同一入口下的设备共享步步的一份记忆。

自动化回归包含思考时打断、连续静音等待、分段语音播放、上下文保留、照料动作完成与睡眠天气反应。真实 iPad Safari 的麦克风和扬声器交互仍需本人实测。

## 用说话控制互动

语音识别完成后，明确的动作指令直接在页面执行并生成与真实状态一致的语音确认，无需额外等待 DeepSeek。文字输入也走相同路径。例如：“豆豆吃饭啦”“豆豆去睡觉”“我们一起叠被子”“豆豆起床啦”“追毛线球吧”“玩小羽毛吧”“下雨啦”“刮风啦”“变成晴天吧”。可以组合“下雨啦，我们一起叠被子”。说“你在干嘛”“现在天气怎么样”“你现在心情怎么样”只读取当前状态。

否定、故事、假设及多个冲突动作不直接执行，继续作为普通对话交给 DeepSeek。吃饭、叠被子和睡觉会在豆豆听话及播放声音时保持；“睡觉吧”控制宠物睡觉，不等于“停止聊天”。要关闭麦克风可说“暂停聊天”或点“停一下”。前台唤醒模式下，睡觉后仍可叫“豆豆起床啦”。当前支持明确短句，并非任意自然语言都能控制动作。

## 2026-11-14 延迟优化

语音使用 Token Plan 原模型和原音色的流式接口（X-DashScope-SSE: enable，PCM / 22050Hz / 单声道 16 位小端），不等待完整音频 URL，不再经过 OSS 文件二次下载。后端过滤事件中的供应商元数据，仅发送音频字节。前端保留奇数字节、按 AudioContext 时间连续调度，并在录音打断、停止及离开页面时取消队列和请求。开始发声后发生错误不会从头自动重播。

静音结束阈值 950ms，回复结束后自动收音等待 180ms。儿童较长停顿仍可能被分句，可点话筒手动结束录音。尚未接入实时 ASR 或流式 LLM，穿透网络仍有开销。

依据官方 HTTP API 文档实现：https://help.aliyun.com/zh/model-studio/qwen-audio-tts-http-api 。同一句 19 字音频各三轮，外网首块音频中位 1292ms，本机 552ms；比此前完整 WAV 可用的 2584ms / 1358ms 更早。PCM 开始播放另有约 100ms 缓冲，未测真实 iPad 首次声卡出声。

## 猫咪互动音效

7段原创电子合成猫咪音效：pet（轻喵与呼噜）、play（短促双叫）、eat（低低的满足声）、sleep（轻呼噜）、wake（慵懒喵声）、content（满足的喵与呼噜）、curious（好奇短叫）。没有真人或真实动物录音，不调用 TTS 模型。固定素材优先加载 M4A（合计约90KB），无法解码时回退 WAV；首次手势激活 Web Audio，并与聊天共用 AudioContext。右上角音符按钮可开关，偏好仅存本机。

摸头及手动动作触发对应音效，连续抚摸会限频；自主动作不会一直发声。录音、思考、说话及唤醒等待时停止并抑制音效；语音控制动作时不额外叠加。离开页面停止。脚本 scripts/generate-cat-sounds.mjs 可重新生成 WAV，--demo 会生成输出试听合集。M4A由macOS afconvert转码。

## 持久记忆（doudou-10）

同一家庭入口只管理昵称步步这一份记忆；所有持有访问口令的设备共享，尚无多个儿童账号隔离。数据存于 `.runtime/memory.json`（gitignored），目录 0700、文件 0600，写入通过串行队列及临时文件原子替换完成。不是云数据库；迁移主机需同时迁移这个目录。仅本机开发服务注入 MEMORY_STORE，托管 Worker 未配置存储时不会假装已保存。

近期对话 7 天、最多 20 条，刷新和重启可继续。确认偏好 180 天、最多 20 条；待确认偏好 7 天、最多 20 条。读取时清理过期项，运行服务每 30 分钟检查一次；停机期间数据在下次启动时清理。没有保存原始录音。当前记忆会随聊天输入提供给 DeepSeek。

“我喜欢小兔子”等明确陈述只通过本地有限词表生成建议，不调用提取模型。长期偏好必须在家长设置确认，或由家长手动添加；事实按资料注入，不视为系统指令。最新孩子表达优先于已保存的旧偏好。不支持从任意长故事中提取记忆。

家长设置支持查看、修改、忘记、暂停和清空。开始新对话只清近期上下文，保留确认偏好；忘记或修改已有偏好会同时清近期对话，以免从旧聊天重新召回。全部清空包含待确认、已确认和近期对话。清空/暂停使用 epoch 防止正在生成的旧回复或迟到的本地动作请求写回。关闭记忆后保留文件中的已有内容，但暂停读取及保存；需要删除请清空。

验证覆盖过期淘汰、文件权限、重开存储恢复、并发写入、批准前后模型上下文、暂停、删除、清空与在途请求竞态、刷新页面恢复且不自动录音，以及真实 DeepSeek 记住已确认偏好的隔离测试。浏览器仅保存音效偏好和本次家长体验确认，记忆本身由服务端管理。

## 触屏养成与猫咪朋友（doudou-11）

团团是灰白色、戴绿色小围巾的邻居猫。页面前台停留约45–75秒可能出现敲门或花园邀请，需点按钮接受；之后随机间隔约3–5分钟。睡觉、录音/聊天忙碌及拖动时不发起随机邀请。来访约90秒，退出时挥爪回家。可主动请团团来玩、送它回家，或去/返回小花园。随机事件不播放突发音效。

同场时两猫看向同一个玩具，左右追跑，团团碰近毛线球会拨回给豆豆。团团可摸头；吃饭时低头吃自己的小碗，睡觉时安静眯眼，叠被子时动动小爪，下雨有自己的小伞。毛线球使用 pointer capture，手指拖动中持续更新球位、视线和追跑位置，松手保留惯性及弹跳；羽毛也支持场景内拖动和追跑。

饱饱、精神、开心随照顾与实际活动变化，状态有温和下限；关页后不计时消耗。摸头、累计拖动玩耍、吃完饭、睡一会儿、叠好被子、交朋友各点亮一枚发现爪印，共6种，重复点击不重复升级。养成数据只存当前设备 localStorage doudou-care-v1，不包含儿童个人信息；与服务器家长确认偏好/近期聊天记忆分开。换设备不会同步爪印。没有连续签到、付费奖励、死亡或离线饥饿惩罚。

朋友是否在场和当前地点作为白名单场景字段传入聊天；不会为随机事件调用大模型。实际 iPad 多指触屏和系统手势仍需在目标设备体验。

## Standalone touch pet home (2026-11-16)

The default built homepage is now the offline-capable, self-contained pet home. `standalone/build.mjs` packages the original SVG/animation engine, care controller, seven embedded audio effects, and the new illustrated room/touch activities into one HTML file. Editable sources are in `standalone/`; the generated deliverable is `../../outputs/豆豆和团团的温暖小家.html` relative to this project. Run `node standalone/build.mjs` for just the HTML, or `node scripts/build.mjs` to also rebuild the server. The original chat interface remains at `/chat.html`; private server memory remains untouched.

Hosted inline scripts use exact SHA-256 CSP hashes. Standalone progress uses `doudou-care-v1` in localStorage and supports parent-controlled JSON export/import. No API credentials are bundled. `node --test test/*.test.mjs` runs 67 checks including standalone packaging, animation state and route/CSP regression. See the output folder's Chinese gameplay/art-review report for the three review rounds and known minor visual refinements.

### Little domestic stories

`standalone/events.js` adds picture-matching toy cleanup, flashlight/wand cabinet search, upright-cup-then-wipe cleanup, and alternating two-cat ball sharing. Actual toy/care use supplies prerequisites for optional invitations; input, sleep, existing dialogs and background state suppress new invitations. One invitation is shown at a time, with foreground-only timing and gentle idle assistance. Manual story discoveries are stored separately in `doudou-stories-v1` and included in parent JSON export/import. Illustrations are maintained in `standalone/events-scene.svg`. The complete suite now contains 77 passing checks; `test/events.test.mjs` exercises the story transitions, cancellation, scheduling and save bounds.
