export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { endpoint, token } = req.query;
  
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
