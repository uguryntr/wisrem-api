export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).json({});

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    
    const prompt = body?.prompt || '';
    const system = body?.system || '';

    const R = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: system,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const D = await R.json();
    const result = D.content?.[0]?.text || '';
    res.status(200).json({ result });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
