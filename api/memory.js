export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).json({});

  const URL = process.env.KV_REST_API_URL;
  const TOKEN = process.env.KV_REST_API_TOKEN;

  if (!URL || !TOKEN) return res.status(500).json({ error: 'Upstash config eksik' });

  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  };

  const { action, key, value } = req.method === 'POST' ? req.body : req.query;

  try {
    if (action === 'get') {
      const r = await fetch(`${URL}/get/${key}`, { headers });
      const d = await r.json();
      const val = d.result ? JSON.parse(d.result) : null;
      return res.status(200).json({ value: val });
    }

    if (action === 'set') {
      await fetch(`${URL}/set/${key}`, {
        method: 'POST',
        headers,
        body: JSON.stringify([JSON.stringify(value)])
      });
      return res.status(200).json({ ok: true });
    }

    if (action === 'append') {
      // Mevcut listeyi çek
      const r = await fetch(`${URL}/get/${key}`, { headers });
      const d = await r.json();
      const existing = d.result ? JSON.parse(d.result) : [];
      existing.push(value);
      // Max 200 tut
      const trimmed = existing.slice(-200);
      await fetch(`${URL}/set/${key}`, {
        method: 'POST',
        headers,
        body: JSON.stringify([JSON.stringify(trimmed)])
      });
      return res.status(200).json({ ok: true, count: trimmed.length });
    }

    if (action === 'delete') {
      await fetch(`${URL}/del/${key}`, { method: 'POST', headers });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'action gerekli: get/set/append/delete' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
