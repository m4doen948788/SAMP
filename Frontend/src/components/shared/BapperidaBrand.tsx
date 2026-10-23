import React from 'react';

/**
 * Palet 4 Warna Resmi Logo Bapperida (Bappedalitbang) Kabupaten Bogor:
 * 1. Biru Langit (#0097fe)
 * 2. Hijau Segar (#009a19)
 * 3. Oranye Terang (#fe9600)
 * 4. Biru Tua (#0069a3)
 * Warna Background: Putih (#ffffff)
 */
export const BAPPERIDA_COLORS = {
  blue: '#0097fe',     // Warna 1: Biru Langit
  green: '#009a19',    // Warna 2: Hijau Segar
  orange: '#fe9600',   // Warna 3: Oranye Terang
  navy: '#0069a3',     // Warna 4: Biru Tua
  background: '#ffffff' // Warna Background: Putih
} as const;

export const DEFAULT_BAPPERIDA_COLORS = {
  color1: BAPPERIDA_COLORS.blue,
  color2: BAPPERIDA_COLORS.green,
  color3: BAPPERIDA_COLORS.orange,
  color4: BAPPERIDA_COLORS.navy,
  background: BAPPERIDA_COLORS.background,
  primary: BAPPERIDA_COLORS.blue,
  secondary: BAPPERIDA_COLORS.navy
};

export type BapperidaColorKey = 'blue' | 'green' | 'orange' | 'navy';

export interface BapperidaColorConfig {
  solid: string;
  bg: string;
  border: string;
  label: string;
}

export const BAPPERIDA_PALETTE: Record<BapperidaColorKey, BapperidaColorConfig> = {
  blue: {
    solid: '#0097fe',
    bg: '#f0f8ff',
    border: '#bae6fd',
    label: 'Perencanaan & Administrasi'
  },
  green: {
    solid: '#009a19',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    label: 'Pelaksanaan & Monev'
  },
  orange: {
    solid: '#fe9600',
    bg: '#fff7ed',
    border: '#fed7aa',
    label: 'Inovasi, Riset & Layanan'
  },
  navy: {
    solid: '#0069a3',
    bg: '#f0f9ff',
    border: '#93c5fd',
    label: 'Kelembagaan & Pengaturan'
  }
};

/**
 * Helper untuk menentukan warna Bapperida yang selaras untuk setiap item menu
 */
export const getMenuBapperidaColor = (name: string, page: string, id: number): BapperidaColorConfig => {
  const n = (name || '').toLowerCase();
  const p = (page || '').toLowerCase();

  // 1. Biru Langit (Perencanaan, Surat, Regulasi, Dokumen)
  if (
    n.includes('surat') || p.includes('surat') ||
    n.includes('rpjpd') || p.includes('rpjpd') ||
    n.includes('renja') || p.includes('renja') ||
    n.includes('perencanaan') || n.includes('peraturan') ||
    n.includes('dashboard') || p === 'dashboard'
  ) {
    return BAPPERIDA_PALETTE.blue;
  }

  // 2. Hijau Segar (Kegiatan Lapangan, Rekap, Monev, Jadwal)
  if (
    n.includes('kegiatan') || p.includes('kegiatan') ||
    n.includes('rekap') || p.includes('rekap') ||
    n.includes('logbook') || p.includes('logbook') ||
    n.includes('jadwal') || p.includes('jadwal') ||
    n.includes('lapangan') || n.includes('evaluasi') ||
    n.includes('spasial') || n.includes('gis')
  ) {
    return BAPPERIDA_PALETTE.green;
  }

  // 3. Oranye Terang (Inovasi, Tematik Hub, SKP, Penomoran, Laporan/Notulen)
  if (
    n.includes('laporan') || p.includes('notulen') ||
    n.includes('tematik') || p.includes('tematik') ||
    n.includes('skp') || p.includes('skp') ||
    n.includes('penomoran') || p.includes('penomoran') ||
    n.includes('todo') || n.includes('tugas') ||
    n.includes('litbang') || n.includes('riset') || n.includes('inovasi')
  ) {
    return BAPPERIDA_PALETTE.orange;
  }

  // 4. Biru Tua (Kelembagaan, Arsip, User, Pengaturan, Eksternal)
  if (
    n.includes('internal') || n.includes('instansi') ||
    n.includes('pengaturan') || p.includes('pengaturan') ||
    n.includes('user') || n.includes('pengguna') ||
    n.includes('master') || n.includes('arsip') ||
    n.includes('dokumen') || n.includes('inbox')
  ) {
    return BAPPERIDA_PALETTE.navy;
  }

  // Distribusi rotasi serasi berdasarkan ID menu jika tidak ada keyword spesifik
  const order: BapperidaColorKey[] = ['blue', 'green', 'orange', 'navy'];
  const key = order[Math.abs(id) % 4];
  return BAPPERIDA_PALETTE[key];
};

/**
 * Komponen Lambang / Simbol Huruf 'b' Bapperida (Transparan, Solid, Tajam)
 */
export const BapperidaSymbol: React.FC<{
  size?: number;
  className?: string;
  silhouette?: boolean;
}> = ({ size = 32, className = '', silhouette = false }) => {
  return (
    <img
      src="/bapperida-b-symbol.png"
      alt="Bapperida Symbol"
      style={{
        width: size,
        height: 'auto',
        objectFit: 'contain',
        filter: silhouette ? 'grayscale(100%) opacity(0.12)' : undefined
      }}
      className={`shrink-0 select-none pointer-events-none ${className}`}
    />
  );
};

/**
 * Garis Melengkung Artistik Khas Huruf 'b' untuk Header (Tanpa Gradasi, Solid & Bersih)
 */
export const BapperidaCurvesHeader: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`absolute inset-y-0 right-0 pointer-events-none overflow-hidden select-none ${className}`}>
      <svg
        viewBox="0 0 160 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto max-w-[120px] opacity-90"
        preserveAspectRatio="none"
      >
        {/* Lengkungan Biru Tua */}
        <path
          d="M60 -10 C90 10, 120 40, 160 45 L160 -10 Z"
          fill="#0069a3"
          opacity="0.12"
        />
        {/* Lengkungan Oranye Terang */}
        <path
          d="M80 0 C110 20, 130 55, 170 65 L170 0 Z"
          fill="#fe9600"
          opacity="0.15"
        />
        {/* Lengkungan Hijau Segar */}
        <path
          d="M100 -5 C125 15, 140 50, 180 55 L180 -5 Z"
          fill="#009a19"
          opacity="0.16"
        />
        {/* Lengkungan Biru Langit Utama */}
        <path
          d="M115 -10 C135 10, 150 40, 180 45 L180 -10 Z"
          fill="#0097fe"
          opacity="0.22"
        />
        {/* Aksen Garis Lengkung Solid Presisi */}
        <path
          d="M95 -5 C120 18, 140 50, 175 60"
          stroke="#0097fe"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path
          d="M110 -5 C130 15, 150 45, 178 50"
          stroke="#009a19"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path
          d="M125 -5 C142 12, 158 38, 180 42"
          stroke="#fe9600"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.75"
        />
      </svg>
    </div>
  );
};

/**
 * Siluet Logo Bapperida Elegan sebagai Watermark di Pojok Pop-up atau Sidebar
 */
export const BapperidaSilhouetteWatermark: React.FC<{ size?: number; className?: string }> = ({
  size = 110,
  className = ''
}) => {
  return (
    <div className={`absolute pointer-events-none select-none overflow-hidden ${className}`}>
      <img
        src="/bapperida-b-symbol.png"
        alt=""
        style={{
          width: size,
          height: 'auto',
          opacity: 0.05,
          filter: 'grayscale(100%)'
        }}
      />
    </div>
  );
};

/**
 * Komponen Latar Belakang Batik Top Navigation Bar
 * Mengusung motif ornamen Batik Kawung & Ceplok khas Nusantara yang diwarnai
 * secara dinamis berdasarkan 4 Kluster Warna Tema Bapperida yang sedang aktif:
 * - Warna 1: Garis kelopak motif Kawung utama
 * - Warna 2: Titik simpul sudut
 * - Warna 3: Inti ceplok ornamen tengah
 * - Warna 4: Isian kontur dalam
 */
export const BatikTopNavBackground: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`absolute inset-0 pointer-events-none select-none overflow-hidden ${className}`}>
      {/* 1. Latar Gradasi Halus Berdasarkan Warna Tema Terpasang */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, color-mix(in srgb, var(--theme-color-1, #0097fe) 6%, #ffffff) 50%, color-mix(in srgb, var(--theme-color-4, #0069a3) 8%, #ffffff) 100%)'
        }}
      />

      {/* 2. Pola Vektor Ornamen Batik Kawung & Ceplok Nusantara (Dinamis Warna Tema) */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id="batikKawungNavPattern"
            width="56"
            height="56"
            patternUnits="userSpaceOnUse"
          >
            {/* Kelopak Utama Kawung (Warna 1) */}
            <ellipse cx="28" cy="14" rx="7.5" ry="11.5" fill="none" stroke="var(--theme-color-1, #0097fe)" strokeWidth="1.25" opacity="0.22" />
            <ellipse cx="28" cy="42" rx="7.5" ry="11.5" fill="none" stroke="var(--theme-color-1, #0097fe)" strokeWidth="1.25" opacity="0.22" />
            <ellipse cx="14" cy="28" rx="11.5" ry="7.5" fill="none" stroke="var(--theme-color-1, #0097fe)" strokeWidth="1.25" opacity="0.22" />
            <ellipse cx="42" cy="28" rx="11.5" ry="7.5" fill="none" stroke="var(--theme-color-1, #0097fe)" strokeWidth="1.25" opacity="0.22" />

            {/* Isian Dalam Kelopak (Warna 4) */}
            <ellipse cx="28" cy="16" rx="3.8" ry="6.8" fill="none" stroke="var(--theme-color-4, #0069a3)" strokeWidth="0.8" opacity="0.18" />
            <ellipse cx="28" cy="40" rx="3.8" ry="6.8" fill="none" stroke="var(--theme-color-4, #0069a3)" strokeWidth="0.8" opacity="0.18" />
            <ellipse cx="16" cy="28" rx="6.8" ry="3.8" fill="none" stroke="var(--theme-color-4, #0069a3)" strokeWidth="0.8" opacity="0.18" />
            <ellipse cx="40" cy="28" rx="6.8" ry="3.8" fill="none" stroke="var(--theme-color-4, #0069a3)" strokeWidth="0.8" opacity="0.18" />

            {/* Inti Ceplok Tengah (Warna 3) */}
            <circle cx="28" cy="28" r="3" fill="var(--theme-color-3, #fe9600)" opacity="0.32" />
            <circle cx="28" cy="28" r="1.3" fill="#ffffff" opacity="0.65" />

            {/* Simpul Sudut Saling Mengunci (Warna 2) */}
            <circle cx="0" cy="0" r="2.4" fill="var(--theme-color-2, #009a19)" opacity="0.35" />
            <circle cx="56" cy="0" r="2.4" fill="var(--theme-color-2, #009a19)" opacity="0.35" />
            <circle cx="0" cy="56" r="2.4" fill="var(--theme-color-2, #009a19)" opacity="0.35" />
            <circle cx="56" cy="56" r="2.4" fill="var(--theme-color-2, #009a19)" opacity="0.35" />

            {/* Kelopak Sudut Pengunci Seamless */}
            <ellipse cx="0" cy="14" rx="7.5" ry="11.5" fill="none" stroke="var(--theme-color-1, #0097fe)" strokeWidth="1.2" opacity="0.18" />
            <ellipse cx="56" cy="14" rx="7.5" ry="11.5" fill="none" stroke="var(--theme-color-1, #0097fe)" strokeWidth="1.2" opacity="0.18" />
            <ellipse cx="0" cy="42" rx="7.5" ry="11.5" fill="none" stroke="var(--theme-color-1, #0097fe)" strokeWidth="1.2" opacity="0.18" />
            <ellipse cx="56" cy="42" rx="7.5" ry="11.5" fill="none" stroke="var(--theme-color-1, #0097fe)" strokeWidth="1.2" opacity="0.18" />
            <ellipse cx="14" cy="0" rx="11.5" ry="7.5" fill="none" stroke="var(--theme-color-1, #0097fe)" strokeWidth="1.2" opacity="0.18" />
            <ellipse cx="42" cy="0" rx="11.5" ry="7.5" fill="none" stroke="var(--theme-color-1, #0097fe)" strokeWidth="1.2" opacity="0.18" />
            <ellipse cx="14" cy="56" rx="11.5" ry="7.5" fill="none" stroke="var(--theme-color-1, #0097fe)" strokeWidth="1.2" opacity="0.18" />
            <ellipse cx="42" cy="56" rx="11.5" ry="7.5" fill="none" stroke="var(--theme-color-1, #0097fe)" strokeWidth="1.2" opacity="0.18" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#batikKawungNavPattern)" />
      </svg>

      {/* 3. Lis Pita Pinggiran Batik di Batas Bawah Header */}
      <div 
        className="absolute bottom-0 inset-x-0 h-[3px]"
        style={{
          background: 'linear-gradient(90deg, var(--theme-color-1, #0097fe) 0%, var(--theme-color-2, #009a19) 33%, var(--theme-color-3, #fe9600) 66%, var(--theme-color-4, #0069a3) 100%)',
          opacity: 0.85
        }}
      />
    </div>
  );
};

/**
 * Komponen Siluet Huruf 'b' Bapperida sebagai Watermark Latar Halaman Konten
 * Berada statis di tengah area konten, transparan dan berwibawa khas kop resmi kedinasan.
 */
export const BapperidaContentWatermark: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div 
      className={`absolute inset-0 pointer-events-none select-none flex items-center justify-center z-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <img
        src="/bapperida-b-symbol.png"
        alt=""
        className="w-[280px] sm:w-[380px] md:w-[460px] lg:w-[540px] max-w-[80vw] h-auto object-contain transition-all duration-500"
        style={{
          opacity: 0.04,
          filter: 'grayscale(100%)',
          userSelect: 'none'
        }}
      />
    </div>
  );
};
