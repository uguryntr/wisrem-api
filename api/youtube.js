export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  if (!APIFY_TOKEN) return res.status(500).json({ error: 'Apify token yok' });

  const { type, target } = req.query;

  try {
    let actor = '';
    let input = {};

    if (type === 'youtube') {
      actor = 'streamers~youtube-scraper';
      const keywords = target ? [target] : ['gayrimenkul', 'emlak yatırım', 'tapu hukuku', 'kıbrıs gayrimenkul', 'dubai yatırım'];
      input = { searchTerms: keywords, maxVideos: 8 };

    } else if (type === 'trends') {
      actor = 'apify~google-trends-scraper';
      input = {
        searchTerms: ['gayrimenkul', 'emlak', 'tapu', 'konut yatırım', 'kıbrıs gayrimenkul'],
        geo: 'TR'
      };
    }

    // Run başlat
    const startRes = await fetch(`https://api.apify.com/v2/acts/${actor}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${APIFY_TOKEN}` },
      body: JSON.stringify(input)
    });
    const startData = await startRes.json();
    const runId = startData.data?.id;
    if (!runId) return res.status(500).json({ error: 'Run başlatılamadı', details: startData });

    // Max 55 saniye bekle
    let status = 'RUNNING';
    let attempts = 0;
    while (status === 'RUNNING' && attempts < 27) {
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
