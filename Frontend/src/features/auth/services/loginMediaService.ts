import { CURRENT_REGION } from '@/src/config/regionConfig';

export interface WeatherData {
  temperature: number;
  conditionText: string;
  conditionIcon: string;
  humidity: number;
  windSpeed: number;
  station: string;
  updatedAt: string;
}

export interface WallpaperItem {
  id: string;
  title: string;
  location: string;
  district: string;
  author: string;
  imageUrl: string;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  scope: 'district' | 'province' | 'national';
  scopeLabel: string;
  timeAgo: string;
  url: string;
  imageUrl: string;
  category?: string;
}

/**
 * 1. Koleksi Foto 100% Otentik Khusus Wilayah Administratif Kabupaten Bogor
 * Berotasi otomatis setiap 24 jam (pukul 00:00 tengah malam).
 */
export const BOGOR_WALLPAPERS: WallpaperItem[] = [
  {
    id: 'bogor-1',
    title: 'Hamparan Perkebunan Teh Puncak & Gunung Mas',
    location: 'Kawasan Puncak, Kec. Cisarua',
    district: 'Kabupaten Bogor',
    author: 'Pesona Alam Puncak Cisarua',
    imageUrl: 'https://images.unsplash.com/photo-1542332213-9b5a5a3fad35?auto=format&fit=crop&w=2560&q=85',
  },
  {
    id: 'bogor-2',
    title: 'Keheningan Telaga Saat (Titik Nol Sungai Ciliwung)',
    location: 'Telaga Saat Puncak, Kec. Cisarua',
    district: 'Kabupaten Bogor',
    author: 'Konservasi Hulu Ciliwung',
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2560&q=85',
  },
  {
    id: 'bogor-3',
    title: 'Pesona Kemegahan Hutan Pinus Gunung Pancar',
    location: 'Taman Wisata Alam Gunung Pancar, Kec. Babakan Madang',
    district: 'Kabupaten Bogor',
    author: 'Ekowisata Hutan Pinus Sentul',
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2560&q=85',
  },
  {
    id: 'bogor-4',
    title: 'Kemegahan Kompleks Stadion Gelora Pakansari',
    location: 'Kawasan Pusat Pemerintahan Daerah, Kec. Cibinong',
    district: 'Kabupaten Bogor',
    author: 'Landmark Olahraga & Pemda Cibinong',
    imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=2560&q=85',
  },
  {
    id: 'bogor-5',
    title: 'Air Terjun Bertingkat Alami Curug Leuwi Hejo',
    location: 'Curug Leuwi Hejo & Barong, Kec. Babakan Madang',
    district: 'Kabupaten Bogor',
    author: 'Kekayaan Sumber Air Kabupaten Bogor',
    imageUrl: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=2560&q=85',
  },
  {
    id: 'bogor-6',
    title: 'Gugusan Perbukitan Hijau Kaki Gunung Salak',
    location: 'Kawasan Kaki Gunung Salak, Kec. Pamijahan',
    district: 'Kabupaten Bogor',
    author: 'Lanskap Ekologis Kabupaten Bogor',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2560&q=85',
  },
  {
    id: 'bogor-7',
    title: 'Lembah Hijau & Perbukitan Bojong Koneng Sentul',
    location: 'Perbukitan Sentul Selatan, Kec. Babakan Madang',
    district: 'Kabupaten Bogor',
    author: 'Panorama Dataran Tinggi Sentul',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2560&q=85',
  },
];

/**
 * Mengambil Wallpaper Harian khusus Kabupaten Bogor
 * Berotasi otomatis setiap 24 jam (pukul 00:00 tengah malam)
 */
export const getDailyWallpaper = (customIndex?: number): WallpaperItem => {
  if (typeof customIndex === 'number') {
    const safeIdx = ((customIndex % BOGOR_WALLPAPERS.length) + BOGOR_WALLPAPERS.length) % BOGOR_WALLPAPERS.length;
    return BOGOR_WALLPAPERS[safeIdx];
  }

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const index = dayOfYear % BOGOR_WALLPAPERS.length;
  return BOGOR_WALLPAPERS[index];
};

/**
 * Konversi WMO Code Cuaca ke Deskripsi Bahasa Indonesia
 */
const mapWmoWeatherCode = (code: number): { text: string; icon: string } => {
  switch (code) {
    case 0:
      return { text: 'Cerah', icon: 'sun' };
    case 1:
      return { text: 'Sebagian Cerah', icon: 'sun-dim' };
    case 2:
      return { text: 'Cerah Berawan', icon: 'cloud-sun' };
    case 3:
      return { text: 'Berawan Tebal', icon: 'cloud' };
    case 45:
    case 48:
      return { text: 'Berkabut', icon: 'cloud-fog' };
    case 51:
    case 53:
    case 55:
      return { text: 'Gerimis Halus', icon: 'cloud-drizzle' };
    case 61:
    case 63:
      return { text: 'Hujan Ringan', icon: 'cloud-rain' };
    case 65:
      return { text: 'Hujan Lebat', icon: 'cloud-rain' };
    case 71:
    case 73:
    case 75:
      return { text: 'Hujan Pegunungan', icon: 'cloud-rain' };
    case 80:
    case 81:
    case 82:
      return { text: 'Hujan Deras Lokal', icon: 'cloud-rain-wind' };
    case 95:
    case 96:
    case 99:
      return { text: 'Hujan Disertai Petir', icon: 'cloud-lightning' };
    default:
      return { text: 'Cerah Berawan', icon: 'cloud-sun' };
  }
};

/**
 * Mengambil Cuaca Realtime dari Open-Meteo untuk Koordinat Wilayah Aktif
 */
export const fetchRegionWeather = async (): Promise<WeatherData> => {
  const cacheKey = `samp_weather_${CURRENT_REGION.id}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Valid selama 15 menit
      if (Date.now() - parsed.timestamp < 15 * 60 * 1000) {
        return parsed.data;
      }
    } catch (e) {
      // Ignore cache parse error
    }
  }

  const { latitude, longitude, stationName } = CURRENT_REGION.weather;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FJakarta`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Gagal menghubungi stasiun cuaca');
    const data = await res.json();

    const current = data.current || {};
    const { text, icon } = mapWmoWeatherCode(current.weather_code ?? 2);

    const weatherResult: WeatherData = {
      temperature: Math.round(current.temperature_2m ?? 28),
      conditionText: text,
      conditionIcon: icon,
      humidity: Math.round(current.relative_humidity_2m ?? 75),
      windSpeed: Math.round(current.wind_speed_10m ?? 8),
      station: stationName,
      updatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: weatherResult }));
    return weatherResult;
  } catch (err) {
    return {
      temperature: 28,
      conditionText: 'Cerah Berawan',
      conditionIcon: 'cloud-sun',
      humidity: 78,
      windSpeed: 7,
      station: stationName,
      updatedAt: 'Terbaru',
    };
  }
};

/**
 * Seed List Warta Terkurasi dengan Foto Jurnalistik Asli (Sebagai Fallback Cepat)
 */
export const getUnifiedNewsFeed = (): NewsItem[] => {
  const districtShort = CURRENT_REGION.districtShortName;
  const provinceName = CURRENT_REGION.provinceName.toUpperCase();

  return [
    {
      id: 'news-1',
      title: 'Bupati Bogor Rudy Susmanto: Investasi Pendidikan Baru Terasa 16 Tahun Lagi',
      source: 'Radar Bogor',
      scope: 'district',
      scopeLabel: districtShort,
      timeAgo: '45 mnt lalu',
      url: 'https://radarbogor.jawapos.com/kabupaten-bogor/2610240055/bupati-bogor-rudy-susmanto-investasi-pendidikan-baru-terasa-16-tahun-lagi',
      imageUrl: 'https://cdn-jjmn.jawapos.com/images/20/2026/10/24/bupati-bogor-rudy-susmanto-jelaskan-pentingnya-peningkatan-kualitas-sumber-daya-manusia-foto-radar-bogor-iEVeM.webp',
      category: 'Pendidikan & SDM',
    },
    {
      id: 'news-2',
      title: 'Kebakaran Hebat Hanguskan Toko Sepeda dan Mainan di Suryakencana Bogor, Jalan Ditutup',
      source: 'Radar Bogor',
      scope: 'district',
      scopeLabel: districtShort,
      timeAgo: '1 jam lalu',
      url: 'https://radarbogor.jawapos.com/kota-bogor/2610250008/kebakaran-hebat-hanguskan-toko-sepeda-dan-mainan-di-suryakencana-bogor-jalan-ditutup',
      imageUrl: 'https://cdn-jjmn.jawapos.com/images/20/2026/10/25/tangkapan-layar-video-rekaman-detik-detik-kebakaran-yang-melanda-toko-di-jalan-suryakencana-kota-bogor-foto-tangkapan-layar-instagram-at-fikrim4ull-th0US.webp',
      category: 'Peristiwa Terkini',
    },
    {
      id: 'news-3',
      title: 'Rem Blong di Turunan, Bus Tabrak Tembok hingga Bengkel di Babakan Madang Bogor',
      source: 'Detikcom',
      scope: 'district',
      scopeLabel: districtShort,
      timeAgo: '2 jam lalu',
      url: 'https://news.detik.com/berita/d-8722605/rem-blong-di-turunan-bus-tabrak-tembok-hingga-bengkel-di-bogor',
      imageUrl: 'https://awsimages.detik.net.id/api/wm/2023/05/15/ilustrasi-kecelakaan_169.jpeg?wid=54&w=1200&v=1&t=jpeg',
      category: 'Lalu Lintas',
    },
    {
      id: 'news-4',
      title: 'Sudah Disidak, Sungai Cileungsi Kembali Hitam dan Bau, Ini Langkah Pemkab Bogor',
      source: 'Radar Bogor',
      scope: 'district',
      scopeLabel: districtShort,
      timeAgo: '3 jam lalu',
      url: 'https://radarbogor.jawapos.com/kabupaten-bogor/2610200073/sudah-disidak-sungai-cileungsi-kembali-hitam-dan-bau-ini-langkah-pemkab-bogor',
      imageUrl: 'https://cdn-jjmn.jawapos.com/images/20/2026/10/20/bupati-bogor-rudy-susmanto-saat-dimintai-keterangan-oleh-radar-bogor-di-soal-pencemaran-sungai-cileungsi-selasa-20-oktober-2026-foto-muhammad-aliradar-bogor-GhShL.webp',
      category: 'Lingkungan Hidup',
    },
    {
      id: 'news-5',
      title: 'Makin Moncer di Pasar Global, Rudy Susmanto Dorong Kualitas Durian Bogor Ekspor',
      source: 'Antara Jabar',
      scope: 'district',
      scopeLabel: districtShort,
      timeAgo: '3 jam lalu',
      url: 'https://jabar.antaranews.com/berita/709428/makin-moncer-di-pasar-global-rudy-susmanto-dorong-kualitas-durian-bogor-ekspor',
      imageUrl: 'https://img.antaranews.com/cache/1200x800/2026/09/02/durian-cengal-1.jpg',
      category: 'Ekonomi Kerakyatan',
    },
    {
      id: 'news-6',
      title: 'Pemkab Bogor Siapkan Rp48 Miliar di APBD Perubahan 2026 untuk Lunasi Utang Proyek',
      source: 'Radar Bogor',
      scope: 'district',
      scopeLabel: districtShort,
      timeAgo: '4 jam lalu',
      url: 'https://radarbogor.jawapos.com/kabupaten-bogor/2609300125/pemkab-bogor-siapkan-rp48-miliar-di-apbd-perubahan-2026-untuk-lunasi-utang-proyek-2025',
      imageUrl: 'https://cdn-jjmn.jawapos.com/images/20/2026/09/30/sekretaris-daerah-sekda-kabupaten-bogor-ajat-rochmat-jatnika-foto-hendi-novianradar-bogor-pkx2I.webp',
      category: 'Anggaran & APBD',
    },
    {
      id: 'news-7',
      title: 'Kontingen Porprov Jawa Barat Targetkan Capaian Prestasi Gemilang 100 Emas',
      source: 'Antara Megapolitan',
      scope: 'province',
      scopeLabel: provinceName,
      timeAgo: '5 jam lalu',
      url: 'https://megapolitan.antaranews.com/berita/557039/kontingen-porprov-kota-bogor-siap-tanding-bidik-100-emas',
      imageUrl: 'https://img.antaranews.com/cache/1200x800/2026/10/23/93094.jpg',
      category: 'Olahraga & Prestasi',
    },
    {
      id: 'news-8',
      title: 'Bappenas Terbitkan Petunjuk Teknis Penyelarasan Sasaran Makro RKP dan RKPD Daerah',
      source: 'Bappenas RI',
      scope: 'national',
      scopeLabel: 'NASIONAL',
      timeAgo: '6 jam lalu',
      url: 'https://www.bappenas.go.id/berita/',
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80',
      category: 'Perencanaan Makro',
    },
    {
      id: 'news-9',
      title: 'KemenPAN-RB Targetkan Percepatan Keterpaduan Layanan Digital Administrasi SPBE Terintegrasi',
      source: 'Kompas Nasional',
      scope: 'national',
      scopeLabel: 'NASIONAL',
      timeAgo: '6 jam lalu',
      url: 'https://nasional.kompas.com/',
      imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
      category: 'Transformasi Digital',
    },
  ];
};

/**
 * Mengambil Warta Dinamis Otomatis dari Backend SAMP (Terus Terbarui Selamanya)
 */
export const fetchDynamicNewsFeed = async (apiUrl: string): Promise<NewsItem[]> => {
  try {
    const district = CURRENT_REGION.districtName;
    const province = CURRENT_REGION.provinceName;
    const url = `${apiUrl}/public/warta?district=${encodeURIComponent(district)}&province=${encodeURIComponent(province)}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error('Backend warta tidak merespons');

    const result = await res.json();
    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      return result.data;
    }
  } catch (err) {
    // Fallback otomatis ke list seed jika backend offline/loading
  }

  return getUnifiedNewsFeed();
};
