# 上游项目与设计参考

本框架是原创代码（Node.js，零依赖），没有复制下列项目的代码。
它把下列项目当作上游组件 / 设计参考，实际运行时仍需你自己按各项目
的说明安装 NapCat，并遵守各项目的许可与 QQ / 平台规则。

- NapCatQQ — QQ 协议端，负责小号登录与消息收发（OneBot v11）
  https://github.com/NapNeko/NapCatQQ
- tencent-connect/dsh-qqbot — DeepSeek Harness 的官方 QQ 插件思路：
  桌面端安装、扫码连接，适合对照“新手友好”怎么做
  https://github.com/tencent-connect/dsh-qqbot
- Derpyu520/qq-bridge — 把 QQ 经 OneBot 接到 DeepSeek Harness 的桥接思路
  https://github.com/Derpyu520/qq-bridge
- 2710586329/dsh-qq — 把 QQ 做成 DeepSeek Harness 前端的思路，默认搭配 NapCat
  https://github.com/2710586329/dsh-qq
- DengSSHS/qq-ai-bot — 简单的三命令部署示例（Ubuntu + deploy.sh + 扫码）
  https://github.com/DengSSHS/qq-ai-bot
- PleaseBelieveLight/dafeiyu-companion — 基于 AstrBot + NapCat 的陪伴机器人，
  Windows 一键部署 + 配置向导的思路
  https://github.com/PleaseBelieveLight/dafeiyu-companion
- ledshic/qq-ai-companion — 轻量 Node.js 陪伴机器人：OneBot + NapCat + DeepSeek + SQLite 记忆
  https://github.com/ledshic/qq-ai-companion

本框架与它们的区别：不做群聊、不做通用 Agent 工具，只做“个人专属 +
人设包 + 单人记忆 + 表情包 + 向导 + 用量上限”这一条最小闭环。
