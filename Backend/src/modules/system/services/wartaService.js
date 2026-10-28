/**
 * Warta Service - Agregator Berita Realtime & Dinamis
 * Mengambil feed warta daerah, provinsi, dan nasional secara dinamis
 * dengan foto jurnalistik asli dari portal berita terkemuka,
 * serta menyediakan caching memori agar cepat dan aman.
 */

let newsCache = {
  data: [],
  lastUpdated: 0,
  key: '',
};

const CACHE_TTL_MS = 25 * 60 * 1000; // 25 Menit Cache

// Fallback image pool jika artikel tertentu sama sekali tidak memiliki foto thumbnail
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

    if (isNaN(diffSec)) return 'Hari ini';
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
 * Parse XML feed dan mengekstrak foto jurnalistik asli dari tag enclosure / media / img
 */
const parseRssXml = (xmlText, scope, scopeLabel, defaultSource) => {
  if (!xmlText) return [];
  const items = [];
  const itemMatches = xmlText.match(/<item>[\s\S]*?<\/item>/gi) || [];

  for (let i = 0; i < Math.min(itemMatches.length, 6); i++) {
    const itemXml = itemMatches[i];

    // Extract Title & Clean CDATA
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
    let rawTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim() : '';
    // Unescape HTML entities
    rawTitle = rawTitle
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    // Extract Source
    const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    let source = sourceMatch ? sourceMatch[1].trim() : defaultSource;

    // Remove source suffix from title if repeated (e.g. "Judul Berita - Detikcom")
    let cleanTitle = rawTitle;
    if (cleanTitle.includes(' - ')) {
      const parts = cleanTitle.split(' - ');
      if (parts.length > 1) {
        source = parts.pop().trim() || source;
        cleanTitle = parts.join(' - ').trim();
      }
    }

    // Extract Link (Direct URL)
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
    let link = linkMatch ? linkMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, '$1').trim() : '';

    // Extract PubDate
    const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const timeAgo = dateMatch ? formatRelativeTime(dateMatch[1].trim()) : 'Terbaru';

    // Extract Real Image from XML tags: enclosure, media:content, or img tag inside description/content
    const enclosureMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
    const mediaMatch = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i);
    const imgMatch = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i);

    let realImage = '';
    if (enclosureMatch && enclosureMatch[1]) {
      realImage = enclosureMatch[1];
    } else if (mediaMatch && mediaMatch[1]) {
      realImage = mediaMatch[1];
    } else if (imgMatch && imgMatch[1]) {
      realImage = imgMatch[1];
    }

    if (realImage) {
      realImage = realImage.replace(/&amp;/g, '&');
    }

    const finalImage = realImage || FALLBACK_CATEGORY_IMAGES[(i * 3 + (scope === 'district' ? 0 : scope === 'province' ? 1 : 2)) % FALLBACK_CATEGORY_IMAGES.length];

    if (cleanTitle) {
      items.push({
        id: `rss-${scope}-${i}-${Date.now()}`,
        title: cleanTitle,
        source: source,
        scope: scope,
        scopeLabel: scopeLabel,
        timeAgo: timeAgo,
        url: link,
        imageUrl: finalImage,
      });
    }
  }

  return items;
};

/**
 * Fetch feed secara aman dengan proteksi timeout & fallback error
 */
const fetchSafe = async (url) => {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
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
 * Service utama untuk mengambil feed warta dinamis dengan foto liputan asli
 */
const getDynamicNewsFeed = async (district = 'Kabupaten Bogor', province = 'Jawa Barat') => {
  const cacheKey = `${district}_${province}`;
  const now = Date.now();

  // Return cache jika masih valid
  if (newsCache.data.length > 0 && newsCache.key === cacheKey && now - newsCache.lastUpdated < CACHE_TTL_MS) {
    return newsCache.data;
  }

  try {
    // 1. Fetch Feed Berita Daerah (Khusus Bogor dengan foto liputan asli)
    let districtXml = await fetchSafe('https://bogor.pojoksatu.id/feed');
    let districtSource = 'PojokBogor';
    if (!districtXml) {
      districtXml = await fetchSafe('https://megapolitan.antaranews.com/rss/terkini.xml');
      districtSource = 'Antara Megapolitan';
    }

    // 2. Fetch Feed Berita Provinsi (Jawa Barat dengan foto liputan asli)
    let provinceXml = await fetchSafe('https://www.detik.com/jabar/rss');
    let provinceSource = 'Detik Jabar';
    if (!provinceXml) {
      provinceXml = await fetchSafe('https://jabar.antaranews.com/rss/terkini.xml');
      provinceSource = 'Antara Jabar';
    }

    // 3. Fetch Feed Berita Nasional (Kebijakan Pembangunan dengan foto liputan asli)
    let nationalXml = await fetchSafe('https://www.antaranews.com/rss/terkini.xml');
    let nationalSource = 'Antara News';
    if (!nationalXml) {
      nationalXml = await fetchSafe('https://www.cnnindonesia.com/nasional/rss');
      nationalSource = 'CNN Indonesia';
    }

    const districtItems = parseRssXml(districtXml, 'district', 'KAB. BOGOR', districtSource);
    const provinceItems = parseRssXml(provinceXml, 'province', 'JAWA BARAT', provinceSource);
    const nationalItems = parseRssXml(nationalXml, 'national', 'NASIONAL', nationalSource);

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
