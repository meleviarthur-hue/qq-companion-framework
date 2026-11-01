// 调用 DeepSeek（OpenAI 兼容接口）。API 费用由用户自己的 Key 承担。
export async function chatWithDeepSeek({ apiKey, baseUrl, model, system, userText, history }) {
  if (!apiKey) throw new Error('没有配置 DEEPSEEK_API_KEY，请打开向导填写。');
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    // 网络卡住时不能把整条消息队列拖死，45 秒直接放弃。
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `${history ? `之前的对话：\n${history}\n\n` : ''}主人现在说：${userText}` },
      ],
      temperature: 0.9,
      max_tokens: 300,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '我在呢，刚才没听清，你再说一遍好吗？';
}
