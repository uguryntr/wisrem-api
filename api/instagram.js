export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { endpoint, token, action, type, target } = req.query;

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
  const finalToken = token || process.env.IG_ACCESS_TOKEN;

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
