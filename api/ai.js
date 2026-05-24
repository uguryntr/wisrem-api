export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { system, prompt } = req.body;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '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',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: system || '',
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const d = await r.json();
    const text = d.content ? d.content.map(b => b.text || '').join('') : JSON.stringify(d);
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
