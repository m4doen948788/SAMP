/**
 * Warta Service - Agregator Berita Realtime & Dinamis
 * Mengambil feed warta daerah, provinsi, dan nasional secara dinamis
 * serta menyediakan caching memori agar cepat dan aman.
 */

let newsCache = {
  data: [],
  lastUpdated: 0,
  key: '',
};

const CACHE_TTL_MS = 25 * 60 * 1000; // 25 Menit Cache

// Fallback image pool berdasarkan kategori agar foto selalu tajam dan tidak pernah rusak
const FALLBACK_CATEGORY_IMAGES = [
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80',
];

/**
 * Format relative time (misal: "45 mnt lalu", "2 jam lalu")
 */
const formatRelativeTime = (pubDateStr) => {
  try {
    const pub = new Date(pubDateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - pub.getTime()) / 1000);

    if (diffSec < 60) return 'Baru saja';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mnt lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
    const days = Math.floor(diffSec / 86400);
    return `${days} hari lalu`;
  } catch (e) {
    return 'Hari ini';
  }
};

/**
 * Parse XML feed sederhana tanpa ketergantungan library berat
 */
const parseRssXml = (xmlText, scope, scopeLabel) => {
  const items = [];
  const itemMatches = xmlText.match(/<item>[\s\S]*?<\/item>/gi) || [];

  for (let i = 0; i < Math.min(itemMatches.length, 6); i++) {
    const itemXml = itemMatches[i];

    // Extract Title & Clean source suffix
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
    let rawTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim() : '';
    // Unescape HTML entities
    rawTitle = rawTitle.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    // Extract Source
    const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    let source = sourceMatch ? sourceMatch[1].trim() : 'Media Indonesia';

    // Remove source suffix from title if repeated (e.g. "Judul Berita - Detikcom")
    let cleanTitle = rawTitle;
    if (cleanTitle.includes(' - ')) {
      const parts = cleanTitle.split(' - ');
      if (parts.length > 1) {
        source = parts.pop().trim() || source;
        cleanTitle = parts.join(' - ').trim();
      }
    }

    // Extract Link (Direct URL or Google Redirect URL)
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
    const link = linkMatch ? linkMatch[1].trim() : 'https://news.google.com';

    // Extract PubDate
    const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const timeAgo = dateMatch ? formatRelativeTime(dateMatch[1].trim()) : 'Terbaru';

    if (cleanTitle) {
      items.push({
        id: `rss-${scope}-${i}-${Date.now()}`,
        title: cleanTitle,
        source: source,
        scope: scope,
        scopeLabel: scopeLabel,
        timeAgo: timeAgo,
        url: link,
        imageUrl: FALLBACK_CATEGORY_IMAGES[(i * 3 + (scope === 'district' ? 0 : scope === 'province' ? 1 : 2)) % FALLBACK_CATEGORY_IMAGES.length],
      });
    }
  }

  return items;
};

/**
 * Fetch feed berita secara paralel
 */
const fetchFeed = async (query) => {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=id&gl=ID&ceid=ID:id`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(6000), // Timeout 6 detik
    });
    if (!res.ok) return '';
    return await res.text();
  } catch (err) {
    return '';
  }
};

/**
 * Service utama untuk mengambil feed warta dinamis
 */
const getDynamicNewsFeed = async (district = 'Kabupaten Bogor', province = 'Jawa Barat') => {
  const cacheKey = `${district}_${province}`;
  const now = Date.now();

  // Return cache jika masih valid
  if (newsCache.data.length > 0 && newsCache.key === cacheKey && now - newsCache.lastUpdated < CACHE_TTL_MS) {
    return newsCache.data;
  }

  try {
    // Fetch 3 tingkat berita secara paralel
    const [districtXml, provinceXml, nationalXml] = await Promise.all([
      fetchFeed(district),
      fetchFeed(province),
      fetchFeed('Indonesia Kebijakan Pembangunan Ekonomi Nasional'),
    ]);

    const districtItems = parseRssXml(districtXml, 'district', district.toUpperCase());
    const provinceItems = parseRssXml(provinceXml, 'province', province.toUpperCase());
    const nationalItems = parseRssXml(nationalXml, 'national', 'NASIONAL');

    // Interleave kartu berita (1 Daerah, 1 Provinsi, 1 Nasional, dst.)
    const combined = [];
    const maxLen = Math.max(districtItems.length, provinceItems.length, nationalItems.length);

    for (let i = 0; i < maxLen; i++) {
      if (districtItems[i]) combined.push(districtItems[i]);
      if (provinceItems[i]) combined.push(provinceItems[i]);
      if (nationalItems[i]) combined.push(nationalItems[i]);
    }

    if (combined.length > 0) {
      newsCache = {
        data: combined.slice(0, 12),
        lastUpdated: now,
        key: cacheKey,
      };
      return newsCache.data;
    }
  } catch (error) {
    console.error('[WartaService] Gagal memperbarui warta realtime:', error.message);
  }

  // Fallback ke cache sebelumnya jika ada
  if (newsCache.data.length > 0) {
    return newsCache.data;
  }

  return [];
};

module.exports = {
  getDynamicNewsFeed,
};
