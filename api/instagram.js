export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { endpoint, token, action } = req.query;

  // Apify scraping
  if (action === 'apify') {
    const { type, target } = req.query;
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    
    try {
      const actorMap = {
        competitor: 'apify/instagram-profile-scraper',
        hashtag: 'apify/instagram-hashtag-scraper',
        trending: 'apify/instagram-search-scraper'
      };
      
      const actor = actorMap[type] || 'apify/instagram-profile-scraper';
      const input = type === 'hashtag' 
        ? { hashtags: [target], resultsLimit: 20 }
        : { usernames: [target], resultsLimit: 20 };

      const runRes = await fetch(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      
      const data = await runRes.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Meta Graph API
  if (!token || !endpoint) {
    return res.status(400).json({ error: 'Token ve endpoint gerekli' });
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${endpoint}&access_token=${token}`;
    const response = await fetch(url);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
