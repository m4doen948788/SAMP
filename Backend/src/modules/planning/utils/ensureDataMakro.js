const pool = require('../../../config/db');

/**
 * Ensures all Data Makro tables exist, and ensures historical values
 * for the 4 primary macro indicators are 100% filled matching localhost.
 * Maps values to any matching indicator IDs (even if IDs differ on VPS).
 */
async function ensureDataMakroTablesAndData() {
    try {
        // 1. Ensure master_satuan table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS master_satuan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                satuan VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Insert default units
        await pool.query("INSERT IGNORE INTO master_satuan (id, satuan) VALUES (1, 'Jiwa'), (2, 'Poin'), (3, 'Persen')");

        // 2. Ensure data_makro table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS data_makro (
                id INT AUTO_INCREMENT PRIMARY KEY,
                kode VARCHAR(255) NULL,
                nama_data VARCHAR(255) NOT NULL,
                tematik_id INT NULL,
                sumber_data VARCHAR(255) NULL,
                satuan_id INT NULL,
                urutan INT DEFAULT 0,
                is_active TINYINT DEFAULT 1,
                parent_id INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_tematik (tematik_id),
                INDEX idx_satuan (satuan_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 3. Ensure data_makro_nilai table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS data_makro_nilai (
                id INT AUTO_INCREMENT PRIMARY KEY,
                data_makro_id INT NOT NULL,
                tahun INT NOT NULL,
                tipe ENUM('target', 'realisasi') NOT NULL DEFAULT 'realisasi',
                nilai VARCHAR(100) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                updated_by INT NULL,
                UNIQUE KEY uniq_nilai (data_makro_id, tahun, tipe),
                INDEX idx_makro_id (data_makro_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 4. Ensure data_makro_otoritas table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS data_makro_otoritas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                profil_pegawai_id INT NOT NULL,
                UNIQUE KEY uniq_otoritas (profil_pegawai_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 5. Ensure data_makro_pegawai table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS data_makro_pegawai (
                id INT AUTO_INCREMENT PRIMARY KEY,
                data_makro_id INT NOT NULL,
                profil_pegawai_id INT NOT NULL,
                UNIQUE KEY uniq_pegawai (data_makro_id, profil_pegawai_id),
                INDEX idx_pegawai (profil_pegawai_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 6. Ensure data_makro_tematik table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS data_makro_tematik (
                id INT AUTO_INCREMENT PRIMARY KEY,
                data_makro_id INT NOT NULL,
                tematik_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_dmt_makro (data_makro_id),
                INDEX idx_dmt_tematik (tematik_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 7. Ensure user_dashboard_settings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_dashboard_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                setting_key VARCHAR(100) NOT NULL,
                setting_value TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_user_setting (user_id, setting_key),
                INDEX idx_user_id (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 8. Definition of the 4 standard indicators and their exact values from localhost
        const standardIndicators = [
            {
                key: 'ipm',
                defaultId: 4,
                kode: 'IPM',
                nama_data: 'Indeks Pembangunan Manusia (IPM)',
                sumber_data: 'BPS',
                satuan_id: 2,
                urutan: 1,
                matches: (row) => {
                    const k = (row.kode || '').toUpperCase();
                    const n = (row.nama_data || '').toLowerCase();
                    return row.id === 4 || k === 'IPM' || n.includes('indeks pembangunan manusia') || n.includes('ipm');
                },
                values: [
                    [2017, 'realisasi', '69,13'],
                    [2018, 'realisasi', '69,69'],
                    [2019, 'realisasi', '70,65'],
                    [2020, 'realisasi', '71,63'],
                    [2021, 'realisasi', '71,83'],
                    [2022, 'realisasi', '72,45'],
                    [2023, 'realisasi', '73,02'],
                    [2024, 'realisasi', '73,63'],
                    [2025, 'target', '74,20'],
                    [2026, 'target', '74,85']
                ]
            },
            {
                key: 'kemiskinan',
                defaultId: 5,
                kode: '',
                nama_data: 'Persentase Penduduk Miskin',
                sumber_data: 'BPS',
                satuan_id: 3,
                urutan: 2,
                tematik_id: 2,
                matches: (row) => {
                    const n = (row.nama_data || '').toLowerCase();
                    return row.id === 5 || n.includes('miskin') || n.includes('kemiskinan');
                },
                values: [
                    [2017, 'realisasi', '8,57'],
                    [2018, 'realisasi', '7,14'],
                    [2019, 'realisasi', '6,66'],
                    [2020, 'realisasi', '7,69'],
                    [2021, 'realisasi', '8,13'],
                    [2022, 'realisasi', '7,73'],
                    [2023, 'realisasi', '7,27'],
                    [2024, 'realisasi', '7,05'],
                    [2025, 'realisasi', '6,26'],
                    [2026, 'target', '6,10']
                ]
            },
            {
                key: 'stunting',
                defaultId: 6,
                kode: '',
                nama_data: 'Prevalensi Stunting',
                sumber_data: 'SKI / SSGI',
                satuan_id: 3,
                urutan: 3,
                tematik_id: 3,
                matches: (row) => {
                    const n = (row.nama_data || '').toLowerCase();
                    return row.id === 6 || n.includes('stunting');
                },
                values: [
                    [2019, 'realisasi', '34,96'],
                    [2021, 'realisasi', '28,60'],
                    [2022, 'realisasi', '24,90'],
                    [2023, 'realisasi', '27,60'],
                    [2024, 'realisasi', '18,90'],
                    [2025, 'target', '14,00']
                ]
            },
            {
                key: 'penduduk',
                defaultId: 7,
                kode: '',
                nama_data: 'Jumlah Penduduk',
                sumber_data: 'BPS',
                satuan_id: 1,
                urutan: 4,
                matches: (row) => {
                    const n = (row.nama_data || '').toLowerCase();
                    return row.id === 7 || n.includes('jumlah penduduk') || (n.includes('penduduk') && !n.includes('miskin'));
                },
                values: [
                    [2017, 'realisasi', '5.715.009'],
                    [2018, 'realisasi', '5.840.907'],
                    [2019, 'realisasi', '5.965.410'],
                    [2020, 'realisasi', '5.427.068'],
                    [2021, 'realisasi', '5.489.536'],
                    [2022, 'realisasi', '5.566.838'],
                    [2023, 'realisasi', '5.627.021'],
                    [2024, 'realisasi', '5.682.303'],
                    [2025, 'realisasi', '5.948.925']
                ]
            }
        ];

        // Fetch current rows in data_makro
        const [existingRows] = await pool.query('SELECT * FROM data_makro');

        for (const std of standardIndicators) {
            // Find all matching indicators (whether active or any ID)
            const matched = existingRows.filter(r => std.matches(r));
            let targetIds = [];

            if (matched.length > 0) {
                targetIds = matched.map(m => m.id);
                // Ensure they have proper satuan_id and are marked active
                for (const m of matched) {
                    await pool.query(
                        `UPDATE data_makro 
                         SET satuan_id = COALESCE(satuan_id, ?), 
                             sumber_data = COALESCE(sumber_data, ?),
                             is_active = 1
                         WHERE id = ?`,
                        [std.satuan_id, std.sumber_data, m.id]
                    );
                }
            } else {
                // If not found at all, create it using defaultId
                try {
                    await pool.query(
                        `INSERT INTO data_makro (id, kode, nama_data, sumber_data, satuan_id, urutan, is_active)
                         VALUES (?, ?, ?, ?, ?, ?, 1)`,
                        [std.defaultId, std.kode, std.nama_data, std.sumber_data, std.satuan_id, std.urutan]
                    );
                    targetIds.push(std.defaultId);
                } catch (insErr) {
                    // If defaultId has primary key collision, insert without explicit id
                    const [res] = await pool.query(
                        `INSERT INTO data_makro (kode, nama_data, sumber_data, satuan_id, urutan, is_active)
                         VALUES (?, ?, ?, ?, ?, 1)`,
                        [std.kode, std.nama_data, std.sumber_data, std.satuan_id, std.urutan]
                    );
                    targetIds.push(res.insertId);
                }
            }

            // Populate all values to all matching target indicator IDs
            for (const targetId of targetIds) {
                for (const [tahun, tipe, nilai] of std.values) {
                    await pool.query(
                        `INSERT INTO data_makro_nilai (data_makro_id, tahun, tipe, nilai)
                         VALUES (?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE nilai = VALUES(nilai)`,
                        [targetId, tahun, tipe, nilai]
                    );
                }

                if (std.tematik_id) {
                    try {
                        await pool.query(
                            'INSERT IGNORE INTO data_makro_tematik (data_makro_id, tematik_id) VALUES (?, ?)',
                            [targetId, std.tematik_id]
                        );
                    } catch (tErr) {
                        // ignore if tematik table issue
                    }
                }
            }
        }

        console.log('✅ [DataMakro AutoEnsure] All data_makro tables, standard indicators, and exact values synchronized.');
        return true;
    } catch (err) {
        console.error('❌ [DataMakro AutoEnsure] Error ensuring tables/data:', err.message);
        return false;
    }
}

module.exports = { ensureDataMakroTablesAndData };
