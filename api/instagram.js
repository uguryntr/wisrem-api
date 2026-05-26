export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { endpoint, token, action, type, target } = req.query;
  const APIFY_TOKEN = process.env.APIFY_TOKEN;

  // ── APİFY YARDIMCI FONKSİYON ─────────────────────────
  async function runApify(actor, input) {
    const startRes = await fetch(`https://api.apify.com/v2/acts/${actor}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${APIFY_TOKEN}` },
      body: JSON.stringify(input)
    });
    const startData = await startRes.json();
    const runId = startData.data?.id;
    if (!runId) throw new Error('Run başlatılamadı: ' + JSON.stringify(startData));

    let status = 'RUNNING';
    let attempts = 0;
    while (status === 'RUNNING' && attempts < 40) {
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
    return await dataRes.json();
  }

  // ── APİFY ────────────────────────────────────────────
  if (action === 'apify') {
    if (!APIFY_TOKEN) return res.status(500).json({ error: 'Apify token yok' });
    try {
      let data;

      if (type === 'competitor') {
        data = await runApify('apify~instagram-profile-scraper', { usernames: [target], resultsLimit: 1 });

      } else if (type === 'hashtag') {
        data = await runApify('apify~instagram-hashtag-scraper', { hashtags: [target], resultsLimit: 20 });

      } else if (type === 'own') {
        data = await runApify('apify~instagram-profile-scraper', { usernames: ['ugurcaglar.wisrem'], resultsLimit: 1 });

      } else if (type === 'youtube') {
        // YouTube scraper - gayrimenkul araması
        const keywords = target ? [target] : ['gayrimenkul', 'emlak', 'kıbrıs gayrimenkul', 'dubai gayrimenkul', 'yatırım'];
        data = await runApify('streamers~youtube-scraper', {
          searchTerms: keywords,
          maxVideos: 10
        });

      } else if (type === 'tiktok') {
        // TikTok scraper - gayrimenkul hashtagi
        const hashtag = target || 'gayrimenkul';
        data = await runApify('clockworks~tiktok-scraper', {
          hashtags: [hashtag],
          resultsPerPage: 20
        });

      } else if (type === 'trends') {
        // Google Trends scraper
        const keyword = target || 'gayrimenkul';
        data = await runApify('apify~google-trends-scraper', {
          searchTerms: [keyword, 'emlak', 'tapu', 'konut yatırım', 'kıbrıs gayrimenkul'],
          geo: 'TR'
        });
      }

      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

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
