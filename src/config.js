import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.join(dir, '..');

function loadEnv() {
  const envFile = path.join(rootDir, '.env');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)=(.*)$/);
    // .env 里的值优先于系统环境变量：客户在向导里填的配置必须真的生效，
    // 不能被机器上残留的 DEEPSEEK_API_KEY 之类悄悄顶掉。
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
loadEnv();

export const config = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseUrl: (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, ''),
  model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  ownerQq: String(process.env.OWNER_QQ || ''),
  onebotHttpUrl: (process.env.ONEBOT_HTTP_URL || 'http://127.0.0.1:3000').replace(/\/$/, ''),
  port: Number(process.env.PORT || 8080),
  persona: process.env.PERSONA || 'lover',
  stickerMode: process.env.STICKER_MODE || 'emoji',
  // 表情概率：真人不会每条都挂表情。0–1，默认 0.25。
  stickerRate: Number(process.env.STICKER_RATE ?? 0.25),
  // 回复前的人味延迟（毫秒基数），0 表示秒回
  replyDelayMs: Number(process.env.REPLY_DELAY_MS ?? 1500),
  dailyLimit: Number(process.env.DAILY_LIMIT || 100),
};

export function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
}

// Persona packs: built-ins in src/personas.json, plus an optional
// user file at personas/custom.json (same shape: {key: {name, system}}).
export function loadPersonas() {
  const built = loadJson('personas.json');
  const customFile = path.join(rootDir, 'personas', 'custom.json');
  if (fs.existsSync(customFile)) {
    try { return { ...built, ...JSON.parse(fs.readFileSync(customFile, 'utf8')) }; }
    catch { return built; }
  }
  return built;
}

export function saveEnv(values) {
  // 值要落进 .env，必须先把换行和回车干掉，否则一个值就能往文件里塞新的一行配置。
  const v = (x, fallback) => String(x ?? fallback ?? '').replace(/[\r\n]/g, ' ').trim();
  const lines = [
    '# 由网页向导生成。请勿把真实 .env 提交到公开仓库。',
    `DEEPSEEK_API_KEY=${v(values.apiKey)}`,
    `DEEPSEEK_BASE_URL=${v(values.baseUrl, 'https://api.deepseek.com/v1')}`,
    `DEEPSEEK_MODEL=${v(values.model, 'deepseek-chat')}`,
    `OWNER_QQ=${v(values.ownerQq)}`,
    `ONEBOT_HTTP_URL=${v(values.onebotHttpUrl, 'http://127.0.0.1:3000')}`,
    `PORT=${v(values.port, 8080)}`,
    `PERSONA=${v(values.persona, 'lover')}`,
    `STICKER_MODE=${v(values.stickerMode, 'emoji')}`,
    `STICKER_RATE=${v(values.stickerRate, 0.25)}`,
    `REPLY_DELAY_MS=${v(values.replyDelayMs, 1500)}`,
    `DAILY_LIMIT=${v(values.dailyLimit, 100)}`,
  ];
  fs.writeFileSync(path.join(rootDir, '.env'), lines.join('\n') + '\n');
}
