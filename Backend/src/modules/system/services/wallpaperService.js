/**
 * Wallpaper Service - Sistem Wallpaper Harian Dinamis Terkurasi Khusus Kabupaten Bogor
 * Mengelola rotasi batch 30 foto bulanan dengan mekanisme Hapus Permanen (Wipe & Replace)
 * untuk foto bulan sebelumnya agar database dan memori selalu ringan dan ramping.
 */

const pool = require('../../../config/db');

// Koleksi 30 Foto Lanskap Terkurasi Khusus Wilayah Administratif Kabupaten Bogor
// (100% Pemandangan Alam Pegunungan, Perkebunan Teh, Curug, Danau, Hutan Pinus, & Landmark Bogor - Tanpa Pantai/Laut)
const BOGOR_CURATED_WALLPAPERS = [
  {
    day_number: 1,
    title: 'Hamparan Perkebunan Teh Puncak & Agrowisata Gunung Mas',
    location: 'Kawasan Puncak, Kec. Cisarua',
    district: 'Kabupaten Bogor',
    author: 'Pesona Lanskap Puncak Cisarua',
    image_url: 'https://images.unsplash.com/photo-1670555383989-e76a0ac0057c?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 2,
    title: 'Keheningan Telaga Saat (Titik Nol Hulu Sungai Ciliwung)',
    location: 'Telaga Saat Puncak, Kec. Cisarua',
    district: 'Kabupaten Bogor',
    author: 'Konservasi Hulu Sungai Ciliwung',
    image_url: 'https://images.unsplash.com/photo-1623031223926-c9a6968ac4e1?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 3,
    title: 'Pesona Kemegahan Hutan Pinus Alami Gunung Pancar',
    location: 'Taman Wisata Alam Gunung Pancar, Kec. Babakan Madang',
    district: 'Kabupaten Bogor',
    author: 'Ekowisata Hutan Pinus Sentul',
    image_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 4,
    title: 'Kemegahan Kompleks Olahraga Stadion Gelora Pakansari',
    location: 'Kawasan Pusat Pemerintahan Daerah, Kec. Cibinong',
    district: 'Kabupaten Bogor',
    author: 'Landmark Olahraga & Pemda Cibinong',
    image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 5,
    title: 'Air Terjun Alami Bertingkat Curug Leuwi Hejo & Barong',
    location: 'Curug Leuwi Hejo & Barong, Kec. Babakan Madang',
    district: 'Kabupaten Bogor',
    author: 'Kekayaan Sumber Air Alami Kabupaten Bogor',
    image_url: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 6,
    title: 'Gugusan Perbukitan Hijau Ekologis Kaki Gunung Salak',
    location: 'Kawasan Kaki Gunung Salak, Kec. Pamijahan',
    district: 'Kabupaten Bogor',
    author: 'Lanskap Ekologis Kabupaten Bogor',
    image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 7,
    title: 'Lembah Hijau & Perbukitan Bojong Koneng Sentul Selatan',
    location: 'Perbukitan Sentul Selatan, Kec. Babakan Madang',
    district: 'Kabupaten Bogor',
    author: 'Panorama Dataran Tinggi Sentul',
    image_url: 'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 8,
    title: 'Keasrian Alami Air Terjun Curug Cilember & Hutan Tropis',
    location: 'Kawasan Wisata Curug Cilember, Kec. Cisarua',
    district: 'Kabupaten Bogor',
    author: 'Wisata Konservasi Alam Puncak',
    image_url: 'https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 9,
    title: 'Danau Alami Situ Gede & Hutan Konservasi Dramaga',
    location: 'Kawasan Hutan Penelitian CIFOR, Kec. Dramaga',
    district: 'Kabupaten Bogor',
    author: 'Konservasi Sumber Daya Alam Dramaga',
    image_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 10,
    title: 'Panorama Lanskap Hutan Pinus Bukit Alesano & Cijeruk',
    location: 'Perbukitan Cijeruk Kaki Gunung Salak, Kec. Cijeruk',
    district: 'Kabupaten Bogor',
    author: 'Pesona Alam Selatan Kabupaten Bogor',
    image_url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 11,
    title: 'Hamparan Hijau Perkebunan Teh Dataran Tinggi Cianten',
    location: 'Perkebunan Teh Cianten, Kec. Leuwiliang',
    district: 'Kabupaten Bogor',
    author: 'Agrowisata Perkebunan Teh Bogor Barat',
    image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 12,
    title: 'Taman Rekreasi Alam Air Terjun Curug Nangka',
    location: 'Kaki Gunung Salak, Kec. Tamansari',
    district: 'Kabupaten Bogor',
    author: 'Pesona Wisata Alam Tamansari',
    image_url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 13,
    title: 'Pesona Alam Perbukitan Megamendung & Puncak Langit',
    location: 'Kawasan Puncak Langit, Kec. Megamendung',
    district: 'Kabupaten Bogor',
    author: 'Ekowisata Dataran Tinggi Megamendung',
    image_url: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 14,
    title: 'Air Terjun Alami Curug Bidadari Sentul Paradise Park',
    location: 'Kawasan Wisata Sentul, Kec. Babakan Madang',
    district: 'Kabupaten Bogor',
    author: 'Kekayaan Wisata Air Babakan Madang',
    image_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 15,
    title: 'Lanskap Persawahan Terasering Alami Sukamakmur & Jonggol',
    location: 'Perbukitan Sukamakmur, Kec. Sukamakmur',
    district: 'Kabupaten Bogor',
    author: 'Pertanian Berkelanjutan Bogor Timur',
    image_url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 16,
    title: 'Keindahan Danau Cagar Alam Telaga Warna Puncak',
    location: 'Cagar Alam Telaga Warna, Kec. Cisarua',
    district: 'Kabupaten Bogor',
    author: 'Cagar Alam & Hutan Konservasi Puncak',
    image_url: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 17,
    title: 'Panorama Perbukitan Geopark Pongkor & Gunung Halimun',
    location: 'Kawasan Geopark Nasional Pongkor, Kec. Nanggung',
    district: 'Kabupaten Bogor',
    author: 'Geopark Nasional Pongkor Bogor Barat',
    image_url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 18,
    title: 'Rindangnya Hutan Wisata Suaka Elang Loji Kaki Salak',
    location: 'Suaka Elang Loji, Kec. Cigombong',
    district: 'Kabupaten Bogor',
    author: 'Pusat Konservasi Satwa & Hutan Cigombong',
    image_url: 'https://images.unsplash.com/photo-1476231682828-37e571bc172f?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 19,
    title: 'Air Terjun Bertingkat Alami Curug Putri Kencana',
    location: 'Karang Tengah, Kec. Babakan Madang',
    district: 'Kabupaten Bogor',
    author: 'Pesona Alam Asri Babakan Madang',
    image_url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 20,
    title: 'Kompleks Hutan Lindung & Konservasi Kampus IPB Dramaga',
    location: 'Kawasan Kampus Hijau Dramaga, Kec. Dramaga',
    district: 'Kabupaten Bogor',
    author: 'Pusat Edukasi Lingkungan Hidup Dramaga',
    image_url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 21,
    title: 'Panorama Lembah Hijau Jalur Puncak Dua Sukamakmur',
    location: 'Jalur Poros Tengah Timur, Kec. Sukamakmur',
    district: 'Kabupaten Bogor',
    author: 'Pengembangan Wilayah Bogor Timur',
    image_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 22,
    title: 'Kemegahan Curug Seribu Taman Nasional Halimun Salak',
    location: 'Kawasan Gunung Bunder, Kec. Pamijahan',
    district: 'Kabupaten Bogor',
    author: 'Taman Nasional Gunung Halimun Salak',
    image_url: 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 23,
    title: 'Pesona Perdesaan Asri Hijau Desa Wisata Malasari',
    location: 'Kawasan Perkebunan Nirmala, Kec. Nanggung',
    district: 'Kabupaten Bogor',
    author: 'Desa Wisata Lingkungan Malasari',
    image_url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 24,
    title: 'Kawasan Wisata Pemandian Alami Tirta Sanita Ciseeng',
    location: 'Bukit Kapur Ciseeng, Kec. Ciseeng',
    district: 'Kabupaten Bogor',
    author: 'Potensi Geologis & Pemandian Ciseeng',
    image_url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 25,
    title: 'Keindahan Alam Air Terjun Curug Cigamea Kaki Salak',
    location: 'Gunung Picung, Kec. Pamijahan',
    district: 'Kabupaten Bogor',
    author: 'Pariwisata Alam Pamijahan',
    image_url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 26,
    title: 'Lanskap Perbukitan Hijau Sentul Highland & Babakan Madang',
    location: 'Kawasan Sentul City, Kec. Babakan Madang',
    district: 'Kabupaten Bogor',
    author: 'Tata Kelola Wilayah Sentul',
    image_url: 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 27,
    title: 'Danau Alami Situ Cibinong & Plaza Pemkab Bogor',
    location: 'Kawasan Perkantoran Pemda, Kec. Cibinong',
    district: 'Kabupaten Bogor',
    author: 'Pusat Pemerintahan Kabupaten Bogor',
    image_url: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 28,
    title: 'Panorama Alam Menawan Kawasan Riung Gunung Puncak',
    location: 'Riung Gunung Puncak, Kec. Cisarua',
    district: 'Kabupaten Bogor',
    author: 'Pesona Perkebunan Teh Puncak Cisarua',
    image_url: 'https://images.unsplash.com/photo-1670555384802-4f55a2eb9e53?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 29,
    title: 'Agrowisata Perbukitan Kopi Catang Malang Sukamakmur',
    location: 'Kawasan Kopi Catang Malang, Kec. Sukamakmur',
    district: 'Kabupaten Bogor',
    author: 'Potensi Perkebunan Kopi Bogor Timur',
    image_url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2560&q=85',
  },
  {
    day_number: 30,
    title: 'Senja Keemasan di Puncak Pass & Lembah Perkebunan Teh',
    location: 'Puncak Pass Cisarua, Kec. Cisarua',
    district: 'Kabupaten Bogor',
    author: 'Panorama Megah Puncak Kabupaten Bogor',
    image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2560&q=85',
  },
];

/**
 * Inisialisasi tabel database dan sinkronisasi batch 30 foto bulanan
 * (Hapus Permanen data bulan sebelumnya saat berganti bulan)
 */
const initAndSyncWallpapers = async () => {
  try {
    // 1. Pastikan tabel ada
    await pool.query(`
      CREATE TABLE IF NOT EXISTS login_wallpapers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        day_number INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        district VARCHAR(100) DEFAULT 'Kabupaten Bogor',
        author VARCHAR(255) NOT NULL,
        image_url TEXT NOT NULL,
        month_key VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_day_month (month_key, day_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Cek bulan berjalan (Format: YYYY-MM)
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 3. Periksa apakah bulan ini sudah memiliki data
    const [existing] = await pool.query(
      'SELECT COUNT(*) as total FROM login_wallpapers WHERE month_key = ?',
      [currentMonthKey]
    );

    if (existing[0].total < 30) {
      // WIPE & REPLACE: Hapus permanen seluruh batch bulan sebelumnya agar database tetap ramping
      await pool.query('DELETE FROM login_wallpapers WHERE month_key != ?', [currentMonthKey]);

      // Masukkan batch 30 foto terkurasi bulan ini
      for (const item of BOGOR_CURATED_WALLPAPERS) {
        await pool.query(`
          INSERT INTO login_wallpapers 
            (day_number, title, location, district, author, image_url, month_key)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            location = VALUES(location),
            author = VALUES(author),
            image_url = VALUES(image_url);
        `, [
          item.day_number,
          item.title,
          item.location,
          item.district || 'Kabupaten Bogor',
          item.author,
          item.image_url,
          currentMonthKey
        ]);
      }
    }
  } catch (error) {
    console.error('[WallpaperService] Init & sync error:', error.message);
  }
};

/**
 * Mengambil wallpaper aktif hari ini (berdasarkan tanggal berjalan 1-30)
 */
const getTodayWallpaper = async () => {
  await initAndSyncWallpapers();

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dayOfMonth = now.getDate(); // 1 - 31
  const targetDay = Math.min(30, Math.max(1, dayOfMonth));

  try {
    const [rows] = await pool.query(
      'SELECT id, day_number, title, location, district, author, image_url as imageUrl FROM login_wallpapers WHERE month_key = ? AND day_number = ? LIMIT 1',
      [currentMonthKey, targetDay]
    );

    if (rows && rows.length > 0) {
      return rows[0];
    }
  } catch (err) {
    console.error('[WallpaperService] Failed to query today wallpaper:', err.message);
  }

  // Fallback lokal jika database sedang offline
  const fallbackItem = BOGOR_CURATED_WALLPAPERS.find(w => w.day_number === targetDay) || BOGOR_CURATED_WALLPAPERS[0];
  return {
    id: `local-${fallbackItem.day_number}`,
    day_number: fallbackItem.day_number,
    title: fallbackItem.title,
    location: fallbackItem.location,
    district: fallbackItem.district,
    author: fallbackItem.author,
    imageUrl: fallbackItem.image_url,
  };
};

/**
 * Mengambil seluruh batch 30 wallpaper aktif bulan ini
 */
const getActiveWallpapers = async () => {
  await initAndSyncWallpapers();

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  try {
    const [rows] = await pool.query(
      'SELECT id, day_number, title, location, district, author, image_url as imageUrl FROM login_wallpapers WHERE month_key = ? ORDER BY day_number ASC',
      [currentMonthKey]
    );

    if (rows && rows.length > 0) {
      return rows;
    }
  } catch (err) {
    console.error('[WallpaperService] Failed to query active wallpapers:', err.message);
  }

  return BOGOR_CURATED_WALLPAPERS.map(w => ({
    id: `local-${w.day_number}`,
    day_number: w.day_number,
    title: w.title,
    location: w.location,
    district: w.district,
    author: w.author,
    imageUrl: w.image_url,
  }));
};

module.exports = {
  getTodayWallpaper,
  getActiveWallpapers,
  BOGOR_CURATED_WALLPAPERS,
};
