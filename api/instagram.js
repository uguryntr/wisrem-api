export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { endpoint, token, action, type, target } = req.query;

  // ── TOKEN UZATMA ──────────────────────────────────────
  if (action === 'refresh_token') {
    const oldToken = process.env.IG_ACCESS_TOKEN;
    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    const url = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${oldToken}`;
    try {
      const r = await fetch(url);
      const d = await r.json();
      return res.status(200).json(d);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── APİFY ────────────────────────────────────────────
  if (action === 'apify') {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    if (!APIFY_TOKEN) return res.status(500).json({ error: 'Apify token yok' });

    try {
      let input = {};
      let actor = '';

      if (type === 'competitor') {
        actor = 'apify~instagram-profile-scraper';
        input = { usernames: [target], resultsLimit: 1 };
      } else if (type === 'hashtag') {
        actor = 'apify~instagram-hashtag-scraper';
        input = { hashtags: [target], resultsLimit: 20 };
      }

      const startRes = await fetch(`https://api.apify.com/v2/acts/${actor}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${APIFY_TOKEN}` },
        body: JSON.stringify(input)
      });

      const startData = await startRes.json();
      const runId = startData.data?.id;
      if (!runId) return res.status(500).json({ error: 'Run başlatılamadı', details: startData });

      let status = 'RUNNING';
      let attempts = 0;
      while (status === 'RUNNING' && attempts < 30) {
        await new Promise(r => setTimeout(r, 2000));
        const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
          headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` }
        });
        const statusData = await statusRes.json();
        status = statusData.data?.status;
        attempts++;
      }

      const runRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` }
      });
      const runData = await runRes.json();
      const datasetId = runData.data?.defaultDatasetId;

      const dataRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
        headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` }
      });
      const data = await dataRes.json();
      return res.status(200).json(data);

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ── META GRAPH API ────────────────────────────────────
  const HARDCODED_TOKEN = 'EAAchKZCe2pa8BRk4sZC8dPVoGk5AA9o4ZAXLy6uScRQlWu7PFe0B5ShzgTBUdrZAsSug0YmLKJOkZBEShrPZAL8OzpXOI3k8l95bxpEjUVjQr2u52s3NzKwKmQ6ZAbrYoWtZBXSdzdi2HdTHzmhq3pykArrCXzVj74ZBqpbDCpeXNhoL82MfF6M0ZAARshrBdT60q2UZC2IntZAni6ZCXuoZCJeSZCSCaoLxVzYhTgt52EGKv8OYtF7FFN81fucQJB1c2PzG8GxUAKzB3eeO6uAcJaaO1ZCiYu0kgfZCDstgkiAZDZD';
const finalToken = token || HARDCODED_TOKEN;

  if (!finalToken || !endpoint) {
    return res.status(400).json({ error: 'Token ve endpoint gerekli' });
  }

  try {
    let fields = '';
    if (endpoint.includes('media')) {
      fields = '&fields=id,caption,media_type,timestamp,like_count,comments_count,reach,impressions';
    }

    const url = `https://graph.facebook.com/v19.0/${endpoint}${fields}&access_token=${finalToken}`;
    const response = await fetch(url);
    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
