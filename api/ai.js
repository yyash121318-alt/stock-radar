// AI 解盘接口（Vercel Serverless Function，免费额度内自用）
// 支持火山方舟(豆包) 和 DeepSeek，用环境变量切换
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: '只支持 POST' });
    return;
  }
  try {
    const { prompt } = req.body || {};
    if (!prompt) {
      res.status(400).json({ error: '缺少 prompt' });
      return;
    }

    const provider = (process.env.AI_PROVIDER || 'ark').toLowerCase();
    let baseUrl, apiKey, model;

    if (provider === 'deepseek') {
      baseUrl = 'https://api.deepseek.com/v1';
      apiKey = process.env.DEEPSEEK_API_KEY;
      model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    } else {
      baseUrl = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
      apiKey = process.env.ARK_API_KEY;
      model = process.env.ARK_MODEL;
    }

    if (!apiKey || !model || model.indexOf('xxxx') >= 0) {
      res.status(500).json({ error: '服务器未配置 AI 环境变量（ARK_API_KEY / ARK_MODEL 或 DEEPSEEK_API_KEY）' });
      return;
    }

    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              '你是一名资深A股短线复盘助手。根据用户给的实时行情、资金流向和财经快讯，做盘中/收盘解读。' +
              '要求：用简洁中文，分四个小节输出：【盘面情绪】【异动解读】(必须结合快讯分析原因)【资金方向】【风险提示】；' +
              '每节2-4句，只基于给定数据，不编造；不推荐具体买卖点位，末尾注明"仅为数据复盘，不构成投资建议"。',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        stream: false,
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      res.status(500).json({ error: 'AI接口返回错误：' + t.slice(0, 200) });
      return;
    }

    const j = await r.json();
    const content = j.choices?.[0]?.message?.content || 'AI 无回复';
    res.status(200).json({ content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
