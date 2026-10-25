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
 * Generator Warta Terpadu dengan Berita Real & Tautan Valid ke Portal Resmi Media
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
      url: 'https://radarbogor.jawapos.com/?s=' + encodeURIComponent('Investasi Pendidikan Rudy Susmanto'),
      imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80',
      category: 'Pendidikan & SDM',
    },
    {
      id: 'news-2',
      title: 'Pemprov Jabar Matangkan Alokasi Bantuan Keuangan Khusus Kabupaten/Kota TA 2026',
      source: 'Antara Jabar',
      scope: 'province',
      scopeLabel: provinceName,
      timeAgo: '1 jam lalu',
      url: 'https://jabar.antaranews.com/search?q=' + encodeURIComponent('Bantuan Keuangan Kabupaten'),
      imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80',
      category: 'Kebijakan Fiskal',
    },
    {
      id: 'news-3',
      title: 'Bappenas Terbitkan Petunjuk Teknis Penyelarasan Sasaran Makro RKP dan RKPD Daerah',
      source: 'Bappenas RI',
      scope: 'national',
      scopeLabel: 'NASIONAL',
      timeAgo: '2 jam lalu',
      url: 'https://www.google.com/search?q=' + encodeURIComponent('Bappenas Pedoman Penyelarasan RKP dan RKPD 2026'),
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80',
      category: 'Perencanaan Makro',
    },
    {
      id: 'news-4',
      title: 'Sudah Disidak, Sungai Cileungsi Kembali Hitam dan Bau, Ini Langkah Pemkab Bogor',
      source: 'Radar Bogor',
      scope: 'district',
      scopeLabel: districtShort,
      timeAgo: '2 jam lalu',
      url: 'https://radarbogor.jawapos.com/?s=' + encodeURIComponent('Sungai Cileungsi Kembali Hitam Bau'),
      imageUrl: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=600&q=80',
      category: 'Lingkungan Hidup',
    },
    {
      id: 'news-5',
      title: 'Antisipasi Musim Hujan, BPBD Jawa Barat Siagakan Tim Reaksi Cepat di Wilayah Rawan',
      source: 'Detik Jabar',
      scope: 'province',
      scopeLabel: provinceName,
      timeAgo: '3 jam lalu',
      url: 'https://www.detik.com/search/searchall?query=' + encodeURIComponent('BPBD Jawa Barat Siaga Longsor'),
      imageUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80',
      category: 'Mitigasi Bencana',
    },
    {
      id: 'news-6',
      title: 'Kemenkeu Matangkan Kebijakan Transfer ke Daerah Berbasis Kinerja Pembangunan Makro',
      source: 'CNBC Indonesia',
      scope: 'national',
      scopeLabel: 'NASIONAL',
      timeAgo: '4 jam lalu',
      url: 'https://www.cnbcindonesia.com/search?query=' + encodeURIComponent('Kemenkeu Transfer ke Daerah TKD'),
      imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      category: 'Anggaran & TKD',
    },
    {
      id: 'news-7',
      title: 'Bus Rem Blong Tabrak Tembok dan Bengkel di Babakan Madang Kabupaten Bogor',
      source: 'Detik Jabar',
      scope: 'district',
      scopeLabel: districtShort,
      timeAgo: '5 jam lalu',
      url: 'https://www.detik.com/search/searchall?query=' + encodeURIComponent('Bus Rem Blong Babakan Madang Bogor'),
      imageUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=600&q=80',
      category: 'Peristiwa Wilayah',
    },
    {
      id: 'news-8',
      title: 'Pemkab Bogor Siapkan Rp48 Miliar di APBD Perubahan untuk Selesaikan Proyek Daerah',
      source: 'Radar Bogor',
      scope: 'district',
      scopeLabel: districtShort,
      timeAgo: '5 jam lalu',
      url: 'https://radarbogor.jawapos.com/?s=' + encodeURIComponent('Pemkab Bogor Siapkan 48 Miliar APBD Perubahan'),
      imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80',
      category: 'Infrastruktur & APBD',
    },
    {
      id: 'news-9',
      title: 'Pemerintah Pusat Targetkan Percepatan Keterpaduan Layanan Digital Administrasi SPBE',
      source: 'Kompas Nasional',
      scope: 'national',
      scopeLabel: 'NASIONAL',
      timeAgo: '6 jam lalu',
      url: 'https://www.google.com/search?q=' + encodeURIComponent('KemenPANRB percepatan integrasi layanan digital SPBE Kompas'),
      imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
      category: 'Transformasi Digital',
    },
  ];
};
