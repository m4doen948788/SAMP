/**
 * Konfigurasi Wilayah & Multi-Tenancy SAMP
 * 
 * Konfigurasi ini mengatur identitas daerah, stasiun cuaca,
 * dan preferensi warta berita untuk halaman login dan sistem secara dinamis.
 * Jika sistem di-deploy untuk kabupaten/kota lain di masa depan,
 * cukup sesuaikan nilai pada file konfigurasi ini.
 */

export interface RegionConfig {
  id: string;
  districtName: string;       // Nama resmi Kab/Kota
  districtShortName: string;  // Label ringkas untuk badge warta
  provinceName: string;       // Nama resmi Provinsi
  countryName: string;        // Nama Negara
  agencyName: string;         // Instansi pengampu
  appFullName: string;        // Nama kepanjangan aplikasi
  appShortName: string;       // Singkatan sistem
  weather: {
    stationName: string;      // Nama stasiun / titik pantau
    latitude: number;         // Koordinat lintang
    longitude: number;        // Koordinat bujur
    providerLabel: string;    // Label sumber data cuaca
  };
  news: {
    localMediaKeywords: string[];
    provinceMediaKeywords: string[];
  };
  branding: {
    logoText: string;
    tagline: string;
    subTagline: string;
  };
}

export const CURRENT_REGION: RegionConfig = {
  id: '32.01',
  districtName: 'Kabupaten Bogor',
  districtShortName: 'KAB. BOGOR',
  provinceName: 'Jawa Barat',
  countryName: 'Indonesia',
  agencyName: 'Bapperida Kabupaten Bogor',
  appFullName: 'Sistem Administrasi Manajemen Perencanaan',
  appShortName: 'SAMP',
  weather: {
    stationName: 'Cibinong, Kab. Bogor',
    latitude: -6.4800,
    longitude: 106.8500,
    providerLabel: 'BMKG / Open-Meteo',
  },
  news: {
    localMediaKeywords: ['Kabupaten Bogor', 'Cibinong', 'Puncak', 'Parung Panjang'],
    provinceMediaKeywords: ['Jawa Barat', 'Pemprov Jabar'],
  },
  branding: {
    logoText: 'PPM',
    tagline: 'Dashboard Terpadu PPM',
    subTagline: 'Bapperida Kabupaten Bogor',
  },
};
