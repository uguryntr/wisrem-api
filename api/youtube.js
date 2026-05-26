export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  if (!APIFY_TOKEN) return res.status(500).json({ error: 'Apify token yok' });

  const { type } = req.query;

  try {
    let actor = '';
    let input = {};

    if (type === 'youtube') {
      actor = 'streamers~youtube-scraper';
      input = {
        searchKeywords: 'gayrimenkul',
        maxResults: 8,
        maxResultStreams: 0,
        maxResultsShorts: 0
      };
    } else if (type === 'trends') {
      actor = 'apify~google-trends-scraper';
      input = {
        searchTerms: ['gayrimenkul', 'emlak', 'tapu'],
        geo: 'TR',
        timeRange: 'now 7-d'
      };
    } else {
      return res.status(400).json({ error: 'type parametresi gerekli' });
    }

    // Run başlat
    const startRes = await fetch(`https://api.apify.com/v2/acts/${actor}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APIFY_TOKEN}`
      },
      body: JSON.stringify(input)
    });

    const startData = await startRes.json();
    const runId = startData.data?.id;
    if (!runId) return res.status(500).json({ error: 'Run başlatılamadı', details: startData });

    // Max 200 saniye bekle
    let status = 'RUNNING';
    let attempts = 0;
    while (status === 'RUNNING' && attempts < 80) {
      await new Promise(r => setTimeout(r, 2500));
      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` }
      });
      const statusData = await statusRes.json();
      status = statusData.data?.status;
      attempts++;
    }

    // Dataset'ten veriyi çek
    const runRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
      headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` }
    });
    const runData = await runRes.json();
    const datasetId = runData.data?.defaultDatasetId;
    if (!datasetId) return res.status(500).json({ error: 'Dataset bulunamadı' });

    const dataRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?limit=15`, {
      headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` }
    });
    const data = await dataRes.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
