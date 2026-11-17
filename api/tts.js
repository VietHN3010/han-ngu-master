module.exports = async function handler(req, res) {
  const text = (req.query && req.query.text) ? req.query.text : '';
  if (!text) {
    return res.status(400).send('Missing text parameter');
  }

  try {
    const cleanText = String(text).replace(/<[^>]*>/g, '').trim().slice(0, 200);
    const encoded = encodeURIComponent(cleanText);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=zh-CN&q=${encoded}`;

    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      }
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send('TTS upstream error');
    }

    const buffer = await upstream.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
    return res.send(Buffer.from(buffer));
  } catch (err) {
    return res.status(500).send(err.message || 'TTS Error');
  }
};
module.exports.default = module.exports;
