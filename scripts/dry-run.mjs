// 不连真实 QQ、不调真实 DeepSeek 的本地测试。
import { Bot } from '../src/bot.js';
import { Memory } from '../src/memory.js';
import { pickSticker } from '../src/stickers.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const memFile = path.join(os.tmpdir(), 'qq-framework-memory.json');
if (fs.existsSync(memFile)) fs.unlinkSync(memFile);

const config = { ownerQq: '10001', persona: 'lover', stickerMode: 'emoji', stickerRate: 1, dailyLimit: 100 };
let lastSystem = '';
const bot = new Bot({
  config,
  memory: new Memory(memFile),
  llm: async ({ system, userText }) => { lastSystem = system; return `收到，你说的是“${userText}”，我记下了，开心！`; },
});

function ev(user_id, raw_message, type = 'private') {
  return { post_type: 'message', message_type: type, user_id, raw_message };
}
const cases = [
  { label: '主人私聊有回复且带表情', event: ev(10001, '今天好开心'), check: o => typeof o === 'string' && o.includes('😄') },
  { label: '陌生人私聊应被忽略', event: ev(99999, '在吗'), check: o => o === null },
  { label: '群聊在 v1 应被忽略', event: ev(10001, '在吗', 'group'), check: o => o === null },
  { label: '记住事实', event: ev(10001, '记住：我不吃香菜'), check: o => typeof o === 'string' },
  { label: '记忆命令能报出事实', event: ev(10001, '记忆'), check: o => typeof o === 'string' && o.includes('不吃香菜') },
  { label: '人设切换：人设 妻子', event: ev(10001, '人设 妻子'), check: o => typeof o === 'string' && o.includes('妻子') && config.persona === 'wife' },
  { label: '切换后状态显示新的人设', event: ev(10001, '状态'), check: o => typeof o === 'string' && o.includes('妻子') },
  { label: '人设命令列出可选人设', event: ev(10001, '人设'), check: o => typeof o === 'string' && o.includes('女朋友') },
  { label: '暂停后普通消息被忽略', event: ev(10001, '暂停'), check: o => typeof o === 'string' },
  { label: '暂停期间消息返回空', event: ev(10001, '在吗'), check: o => o === null },
  { label: '继续后恢复', event: ev(10001, '继续'), check: o => typeof o === 'string' && o.includes('回来') },
  { label: '帮助命令', event: ev(10001, '帮助'), check: o => typeof o === 'string' && o.includes('暂停') },
  { label: '清除记忆', event: ev(10001, '清除记忆'), check: o => typeof o === 'string' && o.includes('清掉') },
  { label: '清除后记忆为空', event: ev(10001, '记忆'), check: o => typeof o === 'string' && o.includes('还没记住') },
  { label: '表情包：开心关键词出开心表情', event: null, check: () => pickSticker('今天好开心', 'emoji') === '😄' },
  { label: '表情包：off 模式不出表情', event: null, check: () => pickSticker('今天好开心', 'off') === '' },
  { label: '表情包：custom 无文件时回落 emoji', event: null, check: () => pickSticker('今天好开心', 'custom') === '😄' },
];

let ok = true;
for (const c of cases) {
  bot.lastCallAt = 0; // 避开 5 秒限流
  const out = c.event ? await bot.handle(c.event) : null;
  const pass = c.check(out);
  console.log(`${pass ? 'PASS' : 'FAIL'} ${c.label}: ${out ?? '(无回复)'}`);
  if (!pass) ok = false;
}
// 切换人设后，LLM 应收到新的人设提示词（用知己人设再聊一次验证，检查提示词是否真的换了）
bot.lastCallAt = 0;
await bot.handle(ev(10001, '人设 知己'));
bot.lastCallAt = 0;
await bot.handle(ev(10001, '你好'));
const personaPass = lastSystem.includes('不评判');
console.log(`${personaPass ? 'PASS' : 'FAIL'} 切换人设后 LLM 收到对应提示词`);
if (!personaPass) ok = false;

console.log(ok ? '全部通过' : '有测试未通过');
process.exit(ok ? 0 : 1);
