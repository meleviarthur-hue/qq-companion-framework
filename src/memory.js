import fs from 'node:fs';
import path from 'node:path';

// 零依赖记忆：存在 data/memory.json 里。
// 只存主人最近 20 条对话 + 以“记住”开头的事实，够 v1 用，后面再换 SQLite。
export class Memory {
  constructor(file) {
    this.file = file;
    this.data = { messages: [], facts: [] };
    if (fs.existsSync(file)) {
      try { this.data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* 损坏就重建 */ }
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  save() { fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2)); }
  add(role, content) {
    this.data.messages.push({ role, content, at: new Date().toISOString() });
    this.data.messages = this.data.messages.slice(-20);
    this.save();
  }
  remember(text) {
    const fact = text.replace(/^记住[：:，,]?/, '').trim();
    if (fact && !this.data.facts.includes(fact)) {
      this.data.facts.push(fact);
      this.data.facts = this.data.facts.slice(-50);
      this.save();
    }
  }
  clear() { this.data = { messages: [], facts: [] }; this.save(); }
  stats() { return { messages: this.data.messages.length, facts: this.data.facts.length }; }
  context() {
    const facts = this.data.facts.length ? `主人让我记住的事：${this.data.facts.join('；')}\n` : '';
    return facts + this.data.messages.map(m => `${m.role === 'user' ? '主人' : '我'}：${m.content}`).join('\n');
  }
}
