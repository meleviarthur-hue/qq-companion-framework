# QQ 个人专属陪伴机器人 · 完整框架 v1

只做一件事：**小号私聊主人**，用 DeepSeek 回复，带人设、单人记忆和表情包。
群聊、AI 生成表情、主动聊天、收款，v1 都不做。

## 安全底线（先读，重要）

- 只用**小号**，不要用大号登录 NapCat。个人号协议接入属于非官方接入，
  有被风控、被限制的理论风险，官方 Bot 路线见 `docs/UPSTREAM.md`。
- 只有 `OWNER_QQ` 能私聊机器人，其他人一律忽略。
- DeepSeek API Key 由用户自己填、自己付费，本框架不托管、不补贴 API。
  设好 `DAILY_LIMIT`，并在向导的状态页定期看当日次数。
- 人设均为成年陪伴形象：女朋友 / 妻子 / 知己，三种都是成年人的关系设定，
  不涉及未成年角色，也不输出露骨或性相关内容。
- 不要把真实 `.env` 发给别人、提交到公开仓库。

## 一行安装（macOS / Linux）

```bash
curl -fsSL https://raw.githubusercontent.com/meleviarthur-hue/qq-companion-framework/refs/heads/main/get.sh | bash
```

装到 `~/qq-companion-framework`，启动后打开向导 http://127.0.0.1:8080/。
重复执行就是更新代码，**不会动 `.env` 和 `data/`**。

### Windows

最简单：仓库页 → Code → Download ZIP → 解压 → **双击 `start.bat`**。

或者用命令行：

```powershell
cd $HOME
git clone https://github.com/meleviarthur-hue/qq-companion-framework
cd qq-companion-framework
.\start.bat
```

`start.bat` 会自动绕开 PowerShell 的执行策略限制，不用你手动改设置。
只想单独跑脚本也可以：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1
```

需要 **Node.js 22+**，安装时记得勾选 `Add to PATH`。

启动后打开向导：http://127.0.0.1:8080/
状态页：http://127.0.0.1:8080/dashboard

## 本地先跑通（不连 QQ、不调 DeepSeek）

```bash
node scripts/dry-run.mjs
```

预期：主人私聊有回复、陌生人和群聊被忽略、人设切换、记忆、
表情包、暂停 / 继续 / 状态命令全部通过。

## 真机运行（需要你自己的 NapCat + 小号）

1. 启动本框架，打开向导填 `DEEPSEEK_API_KEY`、`OWNER_QQ`，
   选人设和表情包模式，保存后重启一次。
2. 在 NapCat 里：
   - HTTP 上报地址指向 `http://127.0.0.1:8080`
   - HTTP 调用地址保持默认 `http://127.0.0.1:3000`
   - 用**小号**扫码登录
3. 主人私聊小号测试。命令：`暂停` / `继续` / `状态` / `记忆` /
   `清除记忆` / `帮助` / `人设 女朋友` / `人设 妻子` / `人设 知己`。
   想让我记住一件事就发 `记住：……`。

可选 Docker 路径：见 `docker-compose.yml`。注意 Docker 路径未用真实 QQ
测试过，NapCat 的 HTTP 端口请以 NapCat WebUI（6099）里的实际配置为准。

## 文件说明

- `src/index.js`：HTTP 上报入口 + 网页向导 + 状态页 + 回复发送
- `src/bot.js`：核心逻辑（白名单、限流、每日上限、人设切换、命令）
- `src/deepseek.js`：DeepSeek OpenAI 兼容调用
- `src/memory.js`：最近 20 条对话 + “记住”事实，存在 `data/memory.json`
- `src/personas.json`：3 个人设；自定义见 `personas/custom.example.json`
- `src/stickers.js` + `src/stickers.json`：按关键词贴表情；
  自定义图片放 `stickers/custom/`，按情绪命名（见该文件夹说明）
- `docs/UPSTREAM.md`：上游项目参考与本框架的区别

## v1 不做、以后再说

群聊（@ 触发 + 群白名单）、AI 现场生成表情、主动问候、多用户、收款系统。
