export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  Eğer `req.method` 'OPTIONS' ise `res.status(200).end();` döndürün.

  const { endpoint, token, action, type, target } = req.query;
  const APIFY_TOKEN = process.env.APIFY_TOKEN;

  // ── APİFY YARDIMCI FONKSİYON ─────────────────────────
  asenkron fonksiyon runApify(aktör, giriş) {
    const startRes = await fetch(`https://api.apify.com/v2/acts/${actor}/runs`, {
      yöntem: 'POST',
      başlıklar: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${APIFY_TOKEN}` },
      gövde: JSON.stringify(giriş)
    });
    const startData = startRes.json()'u bekliyor;
    const runId = startData.data?.id;
    if (!runId) throw new Error('Çalıştırılamadı: ' + JSON.stringify(startData));

    let status = 'RUNNING';
    deneme sayısını 0'a indirelim;
    while (status === 'RUNNING' && attempts < 40) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
        başlıklar: { 'Yetkilendirme': `Taşıyıcı ${APIFY_TOKEN}` }
      });
      const statusData = await statusRes.json();
      durum = durumVerisi.verisi?.durum;
      denemeler++;
    }

    const runRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
      başlıklar: { 'Yetkilendirme': `Taşıyıcı ${APIFY_TOKEN}` }
    });
    const runData = wait runRes.json();
    const datasetId = runData.data?.defaultDatasetId;

    const dataRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
      başlıklar: { 'Yetkilendirme': `Taşıyıcı ${APIFY_TOKEN}` }
    });
    return await dataRes.json();
  }

  // ──APİFY ────────────────────── ──────────────────────
  if (action === 'apify') {
    Eğer (!APIFY_TOKEN) mevcut değilse, 'Apify token yok' şeklinde bir hata mesajı döndürün (500).
    denemek {
      Verileri bırak;

      eğer (tür === 'rakip' ise) {
        data = await runApify('apify~instagram-profile-scraper', { usernames: [target], resultsLimit: 1 });

      } aksi takdirde eğer (tür === 'hashtag') {
        data = await runApify('apify~instagram-hashtag-scraper', { hashtags: [target], resultsLimit: 20 });

      } aksi takdirde eğer (tür === 'kendi' ise) {
        data = await runApify('apify~instagram-profile-scraper', { usernames: ['ugurcaglar.wisrem'], resultsLimit: 1 });

      } aksi takdirde eğer (type === 'youtube') {
        // YouTube kazıyıcı - gayrimenkul araması
        const anahtar kelimeler = hedef ? [hedef] : ['gayrimenkul', 'emlak', 'kıbrıs gayrimenkul', 'dubai gayrimenkul', 'yatırım'];
        veri = await runApify('streamers~youtube-scraper', {
          Arama terimleri: anahtar kelimeler,
          maxResultsPerSearch: 10,
          maxVideosPerSearch: 10
        });

      } aksi takdirde eğer (tür === 'tiktok') {
        // TikTok kazıyıcı - gayrimenkul hashtagi
        const hashtag = target || 'gayrimenkul';
        veri = wait runApify('clockworks~tiktok-scraper', {
          hashtagler: [hashtag],
          Sayfa başına sonuç: 20
        });

      } aksi takdirde eğer (tür === 'trendler') {
        // Google Trends veri çekme aracı
        const keyword = target || 'gayrimenkul';
        veri = await runApify('apify~google-trends-scraper', {
          Arama Şartları: [anahtar kelime, 'emlak', 'konut yatırım', 'kıbrıs gayrimenkul', 'dubai gayrimenkul'],
          coğrafi: 'TR',
          zaman aralığı: 'bugün 3 ay'
        });
      }

      res.status(200).json(data) değerini döndür;
    } hata yakala {
      res.status(500).json({ error: error.message });
    }
  }

  // ── TOKEN UZATMA ──────────────────────────────────────
  if (action === 'refresh_token') {
    const oldToken = process.env.IG_ACCESS_TOKEN;
    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    const url = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${oldToken}`;
    denemek {
      const r = await fetch(url);
      const d = await r.json();
      res.status(200).json(d) döndür;
    } yakala (e) {
      res.status(500).json({ error: e.message });
    }
  }

  // ── META GRAF API ────────────────────────────────────
  const finalToken = belirteç || proses.env.IG_ACCESS_TOKEN;
  if (!finalToken || !endpoint) {
    return res.status(400).json({ error: 'Token ve uç nokta gerekli' });
  }

  denemek {
    alanlar = '';
    if (endpoint.includes('media')) {
      alanlar = '&alanlar=id,başlık,medya_türü,zaman_damgası,beğeni_sayısı,yorum_sayısı,erişim,gösterimler';
    }
    const url = `https://graph.facebook.com/v19.0/${endpoint}${fields}&access_token=${finalToken}`;
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data) değerini döndür;
  } hata yakala {
    res.status(500).json({ error: error.message });
  }
}
