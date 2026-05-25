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

  let body = {};
  if (req.method === 'POST') {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  }

  const action = req.method === 'POST' ? body.action : req.query.action;
  const key = req.method === 'POST' ? body.key : req.query.key;
  const value = body.value;

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
      const getR = await fetch(`${URL}/get/${key}`, { headers });
      const getD = await getR.json();
      const existing = getD.result ? JSON.parse(getD.result) : [];
      if (!Array.isArray(existing)) return res.status(500).json({ error: 'Not array' });
      existing.push(value);
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

    return res.status(400).json({ error: 'Geçersiz action' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
