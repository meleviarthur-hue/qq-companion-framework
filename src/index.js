import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, rootDir, saveEnv, loadPersonas } from './config.js';
import { Memory } from './memory.js';
import { Bot } from './bot.js';
import { chatWithDeepSeek } from './deepseek.js';
import { listCustomStickers } from './stickers.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const memory = new Memory(path.join(rootDir, 'data', 'memory.json'));

// 向导页会把用户填的值回显到 HTML 里，必须转义，否则一个带引号的值就能插脚本。
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const bot = new Bot({
  config,
  memory,
  llm: ({ system, userText, history }) => chatWithDeepSeek({ ...config, system, userText, history }),
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function sendOne(userId, message) {
  const res = await fetch(`${config.onebotHttpUrl}/send_private_msg`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: Number(userId), message }),
  });
  if (!res.ok) console.error('发送失败', res.status, await res.text());
}

// 真人不会 0.8 秒回完一大段：先“打字”再发，长消息更久，分条之间留间隔。
async function sendPrivate(userId, message) {
  const parts = Array.isArray(message) ? message : [message];
  const base = config.replyDelayMs ?? 1500;
  const typing = Math.min(base + parts.join('').length * 90, 8000);
  await sleep(Math.round(typing * (0.7 + Math.random() * 0.6)));
  for (let i = 0; i < parts.length; i++) {
    await sendOne(userId, parts[i]);
    if (i < parts.length - 1) await sleep(600 + Math.random() * 1400);
  }
}

function wizardHtml(saved) {
  const personas = loadPersonas();
  const options = Object.entries(personas).map(([k, p]) =>
    `<option value="${k}" ${config.persona === k ? 'selected' : ''}>${p.name}</option>`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QQ 陪伴机器人 · 设置向导</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:32px auto;padding:0 16px;line-height:1.7}label{display:block;margin:12px 0 4px}input,select{width:100%;padding:8px}button{padding:10px 18px;margin-top:16px}.warn{background:#fff3cd;padding:12px;border-radius:8px}</style></head><body>
<h1>QQ 个人专属陪伴机器人 · 设置向导</h1>
${saved ? '<p>已保存。重启后生效。</p>' : ''}
<div class="warn"><b>安全提醒：</b>只用小号登录 NapCat，不要用大号；DeepSeek 费用由你自己的 Key 承担；只有主人 QQ 能私聊机器人。</div>
<form method="post" action="/setup">\n<input type="hidden" name="baseUrl" value="${esc(config.baseUrl)}"><input type="hidden" name="model" value="${esc(config.model)}">
<label>DeepSeek API Key（你自己出费用）</label><input name="apiKey" type="password" value="${esc(config.apiKey)}" required>
<label>主人 QQ 号（只有这个号能用）</label><input name="ownerQq" value="${esc(config.ownerQq)}" required>
<label>人设</label><select name="persona">${options}</select>
<label>表情包模式</label><select name="stickerMode">
<option value="emoji" ${config.stickerMode === 'emoji' ? 'selected' : ''}>emoji（默认）</option>
<option value="face" ${config.stickerMode === 'face' ? 'selected' : ''}>QQ 表情</option>
<option value="custom" ${config.stickerMode === 'custom' ? 'selected' : ''}>自定义图片（放 stickers/custom/）</option>
<option value="off" ${config.stickerMode === 'off' ? 'selected' : ''}>关闭</option></select>
<label>每日调用上限</label><input name="dailyLimit" type="number" value="${esc(config.dailyLimit)}">
<label>NapCat HTTP 地址</label><input name="onebotHttpUrl" value="${esc(config.onebotHttpUrl)}">
<button type="submit">保存设置</button></form>
<p><a href="/dashboard">查看运行状态</a> · 自定义表情包文件：${esc(listCustomStickers().join('、')) || '（stickers/custom/ 里还没有文件）'}</p>
<p>接 NapCat：把 NapCat 的上报地址指向本机 <code>http://127.0.0.1:${esc(config.port)}</code>，再用小号扫码登录。</p>
</body></html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // 只认本机来源，挡两件事：
  // 1) DNS rebinding —— 外部域名解析到 127.0.0.1，浏览器仍会带它自己的 Host 头；
  // 2) 跨站表单 POST —— 浏览器只要带 Origin 就校验，本机 / NapCat 的调用不带 Origin，放行。
  const host = String(req.headers.host || '').replace(/:\d+$/, '').replace(/^\[|\]$/g, '').toLowerCase();
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    res.writeHead(403); res.end('forbidden'); return;
  }
  const origin = req.headers.origin;
  if (origin && !/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(origin)) {
    res.writeHead(403); res.end('forbidden'); return;
  }

  if (req.method === 'GET' && url.pathname === '/dashboard') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      persona: bot.personaName(), personaKey: config.persona,
      paused: bot.paused, callsToday: bot.callsToday, dailyLimit: config.dailyLimit,
      stickerMode: config.stickerMode, ownerQq: config.ownerQq ? '已设置' : '未设置',
      apiKey: config.apiKey ? '已设置' : '未设置', memory: memory.stats(),
      customStickers: listCustomStickers(), groupChat: 'v1 不支持（个人专属）',
    }, null, 2));
    return;
  }
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/wizard')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(wizardHtml(url.searchParams.get('saved') === '1'));
    return;
  }
  if (req.method === 'POST' && url.pathname === '/setup') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      const v = new URLSearchParams(body);
      saveEnv({
        apiKey: v.get('apiKey'), ownerQq: v.get('ownerQq'), persona: v.get('persona'),
        baseUrl: v.get('baseUrl'), model: v.get('model'),
        stickerMode: v.get('stickerMode'), dailyLimit: v.get('dailyLimit'),
        stickerRate: config.stickerRate, replyDelayMs: config.replyDelayMs,
        onebotHttpUrl: v.get('onebotHttpUrl'), port: config.port,
      });
      // 同步到当前进程，方便不重启先看状态；正式使用请重启。
      config.apiKey = v.get('apiKey') || ''; config.ownerQq = v.get('ownerQq') || '';
      config.persona = v.get('persona') || 'lover'; config.stickerMode = v.get('stickerMode') || 'emoji';
      config.dailyLimit = Number(v.get('dailyLimit') || 100);
      res.writeHead(302, { Location: '/?saved=1' }); res.end();
    });
    return;
  }
  if (req.method === 'POST') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', async () => {
      res.writeHead(200); res.end('ok');
      try {
        const event = JSON.parse(body || '{}');
        const reply = await bot.handle(event);
        if (reply) await sendPrivate(event.user_id, reply);
      } catch (e) { console.error(e); }
    });
    return;
  }
  res.writeHead(200); res.end('ok');
});

// 只监听本机：向导里有 API Key 明文输入框，不能让局域网直接打开。
server.listen(config.port, '127.0.0.1', () => {
  console.log(`框架已启动：向导 http://127.0.0.1:${config.port}/  状态 http://127.0.0.1:${config.port}/dashboard`);
  if (!config.apiKey || !config.ownerQq) console.log('未检测到完整配置：请先打开上面的向导页面填写 DeepSeek Key 和主人 QQ。');
});
