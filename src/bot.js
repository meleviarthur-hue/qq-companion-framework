import { loadPersonas } from './config.js';
import { pickSticker } from './stickers.js';

// 核心逻辑与传输层分离，方便 dry-run 测试，也方便以后换群聊。
// v1 仍只做个人专属：只处理私聊，且只回白名单主人。群聊以后再加。
// 真人打字几乎不用标点：一句话说完就发出去，下一条接着补。
// 所以先去标点，再按 // 或换行分条；模型没照做时退回按句末符号断。
const PUNCT = /[。！？!?，,、；;：:""''「」『』（）()【】\[\]]/g;

function humanize(text) {
  // 删掉标点而不是换成空格：中文聊天里逗号往往就是直接断句了。
  // 顺便去掉汉字之间的空格，AI 很爱在断句处留空格，真人不会。
  return String(text)
    .replace(PUNCT, '')
    .replace(/(?<=[\u4e00-\u9fa5])\s+(?=[\u4e00-\u9fa5])/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitIntoMessages(text) {
  let parts = String(text).split(/\/\/|\n+/).map(humanize).filter(Boolean);
  if (parts.length === 1) {
    parts = String(text).split(/(?<=[。！？!?~～])/).map(humanize).filter(Boolean);
  }
  if (parts.length === 0) return [text];
  // 最多 4 条，多出来的并进最后一条，别刷屏。
  if (parts.length > 4) parts = [...parts.slice(0, 3), parts.slice(3).join(' ')];
  return parts;
}

// 所有 AI 回复都容易犯的毛病，统一在这里压住，自定义人设也生效。
const STYLE_RULES = `聊天格式：你在手机上聊天，不要用句号、问号、感叹号、逗号、分号、冒号、引号、括号这些标点，该停顿的地方直接断句。
要发的每一句话用 // 分隔，一次 2 到 4 条，每条 5 到 20 个字，像连发几条消息。
例：烦死了//不跟你说//今天又加班
不要用列表、不用 markdown。不要每次说话都反问对方，不要复述或总结对方刚说的话，不要用“有什么可以帮你”“我理解你的感受”这类客服腔。不确定的事就说不知道。`;

export class Bot {
  constructor({ config, memory, llm }) {
    this.config = config;
    this.memory = memory;
    this.llm = llm; // async ({system, userText, history}) => string
    this.paused = false;
    this.callsToday = 0;
    this.day = new Date().toDateString();
    this.lastCallAt = 0;
    this.personas = loadPersonas();
  }

  personaName() {
    const p = this.personas[this.config.persona];
    return p ? p.name : this.config.persona;
  }

  status() {
    return `我现在是${this.personaName()}，今天已经聊了 ${this.callsToday} 次，上限 ${this.config.dailyLimit} 次，表情包模式：${this.config.stickerMode}。`;
  }

  setPersona(key) {
    if (!this.personas[key]) return null;
    this.config.persona = key;
    return this.personas[key];
  }

  async handle(event) {
    if (event.post_type !== 'message' || event.message_type !== 'private') return null;
    if (String(event.user_id) !== this.config.ownerQq) return null;

    const text = String(event.raw_message || '').trim();
    if (!text) return null;

    // 命令（不计 API 次数、不受暂停影响的只有“继续”）
    if (text === '暂停') { this.paused = true; return '好，我先安静一会儿，想我了发“继续”就行。'; }
    if (text === '继续') { this.paused = false; return '我回来啦！'; }
    if (text === '状态') return this.status();
    if (text === '帮助') {
      return '可以发：暂停 / 继续 / 状态 / 记忆 / 清除记忆 / 人设 女朋友 / 人设 妻子 / 人设 知己；想让我记住一件事就发“记住：……”';
    }
    if (text === '记忆') {
      const facts = this.memory.data.facts;
      return facts.length ? `我记住的有：${facts.join('；')}` : '我现在还没记住特别的事，你可以发“记住：……”告诉我。';
    }
    if (text === '清除记忆') { this.memory.clear(); return '好，记忆已经清掉了，我们重新开始。'; }
    const personaMatch = text.match(/^人设\s*(女朋友|妻子|知己|lover|wife|confidant)$/);
    if (personaMatch) {
      const map = { '女朋友': 'lover', '妻子': 'wife', '知己': 'confidant' };
      const key = map[personaMatch[1]] || personaMatch[1];
      const p = this.setPersona(key);
      return p ? `好，我现在是${p.name}啦。` : '没有这个人设哦。';
    }
    if (text === '人设') {
      return `目前可选人设：${Object.values(this.personas).map(p => p.name).join('、')}。发“人设 妻子”这样切换。`;
    }
    if (this.paused) return null;

    // 每日上限 + 简单限流（5 秒一次），防 API 账单失控。
    if (new Date().toDateString() !== this.day) { this.day = new Date().toDateString(); this.callsToday = 0; }
    if (this.callsToday >= this.config.dailyLimit) return '今天聊得够多了，我先休息一下，明天再陪你，好吗？';
    if (Date.now() - this.lastCallAt < 5000) return '你发得太快啦，我慢一点回你。';
    this.lastCallAt = Date.now();

    if (text.startsWith('记住')) this.memory.remember(text);
    this.memory.add('user', text);

    const persona = this.personas[this.config.persona] || this.personas.lover;
    const reply = await this.llm({
      system: `${persona.system}\n\n${STYLE_RULES}`,
      userText: text,
      history: this.memory.context(),
    });
    this.callsToday += 1;
    this.memory.add('assistant', reply);

    const sticker = pickSticker(reply, this.config.stickerMode, this.config.stickerRate ?? 0.25);
    const parts = splitIntoMessages(reply);
    if (sticker) parts[parts.length - 1] += ` ${sticker}`;
    return parts.length === 1 ? parts[0] : parts;
  }
}
