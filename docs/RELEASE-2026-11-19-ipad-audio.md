# 2026-11-19：平板声音兼容修复

针对平板Safari无声，补齐以下分支：

- 支持AudioSession时，将宠物音效声明为playback；进入原版语音聊天时恢复auto，避免妨碍麦克风会话。
- 旧版触屏Apple设备在没有AudioSession时，默认使用HTMLAudio播放实际音效；其他设备也可点击“平板兼容播放”切换。所有声音仍内嵌，无外部素材请求。
- 同一个媒体元素在用户的点击或touchend里立即调用play，不等待下载或解码。M4A不支持时切换真实内嵌WAV；手势策略拒绝时显示重试，不假称已开始。
- 恢复Safari的interrupted状态，并在每次完成触摸时重新激活，而非只在第一次pointerdown尝试。
- 保留常驻试听按钮，清除误触静音后可以直接再试听；兼容方式保存到当前浏览器。静音、切后台和对话状态仍停止音效。
- Worker的media-src允许内嵌data音频，保留精确脚本哈希与其余限制。

相关平台行为见[WebKit静音与Web Audio记录](https://bugs.webkit.org/show_bug.cgi?id=237322)和[AudioSession文档](https://developer.mozilla.org/en-US/docs/Web/API/Audio_Session_API)。这说明一种可能原因，不能据此断言用户实体平板的系统设置。

验证：101项检查通过，覆盖旧iPad媒体分支、现代AudioSession、中断恢复、touchend后合成click只播放一次、格式备用、拒绝时重试、静音和后台停止、单文件素材与服务端CSP。真实浏览器中Web Audio和HTMLAudio两种方式均返回播放成功、无控制台错误。768×1024布局复审无P1/P2。未在用户的实体iPad上验证扬声器输出。
