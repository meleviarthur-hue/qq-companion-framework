import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadJson } from './config.js';

const stickers = loadJson('stickers.json');
const customDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'stickers', 'custom');

// 按关键词粗判情绪，贴一个表情。
// emoji：默认，最稳；face：QQ 表情 CQ 码，需在 stickers.json 里配自己的表情 id；
// custom：优先用 stickers/custom/<情绪>.png 或 .jpg（OneBot 图片 CQ 码），没有文件时回落到 emoji。
export function pickSticker(text, mode, rate = 1) {
  if (mode === 'off') return '';
  // 真人不会每条都挂表情：rate < 1 时按概率跳过。
  if (rate <= 0 || (rate < 1 && Math.random() > rate)) return '';
  let mood = 'default';
  for (const [m, words] of Object.entries(stickers.keywords)) {
    if (words.some(w => text.includes(w))) { mood = m; break; }
  }
  if (mode === 'custom') {
    for (const ext of ['png', 'jpg', 'jpeg', 'gif']) {
      const file = path.join(customDir, `${mood}.${ext}`);
      if (fs.existsSync(file)) return `[CQ:image,file=file://${file}]`;
    }
  }
  const table = stickers[mode] || stickers.emoji;
  return table[mood] || table.default;
}

export function listCustomStickers() {
  if (!fs.existsSync(customDir)) return [];
  return fs.readdirSync(customDir).filter(f => /\.(png|jpg|jpeg|gif)$/i.test(f));
}
