const mysql = require('mysql2/promise');
require('dotenv').config();

const BASE_URL = 'https://emsifa.github.io/api-wilayah-indonesia/api';

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.json();
}

async function seedWilayah() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('=== SEED WILAYAH INDONESIA ===\n');

        // Step 1: Create tables
        console.log('Creating tables...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS master_provinsi (
                id VARCHAR(10) PRIMARY KEY,
                nama VARCHAR(255) NOT NULL
            )
        `);
        console.log('  ✅ master_provinsi');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS master_kota_kabupaten (
                id VARCHAR(10) PRIMARY KEY,
                provinsi_id VARCHAR(10) NOT NULL,
                nama VARCHAR(255) NOT NULL,
                INDEX idx_provinsi (provinsi_id)
            )
        `);
        console.log('  ✅ master_kota_kabupaten');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS master_kecamatan (
                id VARCHAR(10) PRIMARY KEY,
                kota_kabupaten_id VARCHAR(10) NOT NULL,
                nama VARCHAR(255) NOT NULL,
                INDEX idx_kota (kota_kabupaten_id)
            )
        `);
        console.log('  ✅ master_kecamatan');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS master_kelurahan (
                id VARCHAR(10) PRIMARY KEY,
                kecamatan_id VARCHAR(10) NOT NULL,
                nama VARCHAR(255) NOT NULL,
                INDEX idx_kecamatan (kecamatan_id)
            )
        `);
        console.log('  ✅ master_kelurahan');

        // Add address columns to profil_pegawai if not exist
        const addressCols = [
            { name: 'provinsi_id', def: 'VARCHAR(10) AFTER alamat_lengkap' },
            { name: 'kota_kabupaten_id', def: 'VARCHAR(10) AFTER provinsi_id' },
            { name: 'kecamatan_id', def: 'VARCHAR(10) AFTER kota_kabupaten_id' },
            { name: 'kelurahan_id', def: 'VARCHAR(10) AFTER kecamatan_id' },
        ];
        for (const col of addressCols) {
            try {
                await pool.query(`ALTER TABLE profil_pegawai ADD COLUMN ${col.name} ${col.def}`);
                console.log(`  ✅ Added ${col.name} to profil_pegawai`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') console.log(`  ⏭️  ${col.name} already exists`);
                else throw e;
            }
        }

        // Check if data already seeded
        /*
        const [existing] = await pool.query('SELECT COUNT(*) as cnt FROM master_provinsi');
        if (existing[0].cnt > 0) {
            console.log(`\n⏭️  Data already seeded (${existing[0].cnt} provinsi found). Delete tables first to re-seed.`);

            // Still register in master_data_config
            await registerMasterDataConfig(pool);
            await pool.end();
            return;
        }
        */

        // Step 2: Fetch and seed provinsi
        console.log('\nFetching provinsi...');
        const provinsiList = await fetchJSON(`${BASE_URL}/provinces.json`);
        console.log(`  Found ${provinsiList.length} provinsi`);

        for (const prov of provinsiList) {
            await pool.query('INSERT IGNORE INTO master_provinsi (id, nama) VALUES (?, ?)', [prov.id, prov.name]);
        }
        console.log('  ✅ Provinsi seeded');

        // Step 3: Fetch and seed kota/kabupaten
        console.log('\nFetching kota/kabupaten...');
        let totalKota = 0;
        for (const prov of provinsiList) {
            const kotaList = await fetchJSON(`${BASE_URL}/regencies/${prov.id}.json`);
            for (const kota of kotaList) {
                await pool.query('INSERT IGNORE INTO master_kota_kabupaten (id, provinsi_id, nama) VALUES (?, ?, ?)',
                    [kota.id, prov.id, kota.name]);
            }
            totalKota += kotaList.length;
            process.stdout.write(`\r  Progress: ${prov.name} (${totalKota} kota/kab total)`);
        }
        console.log(`\n  ✅ ${totalKota} kota/kabupaten seeded`);

        // Step 4: Fetch and seed kecamatan
        console.log('\nFetching kecamatan...');
        const [allKota] = await pool.query('SELECT id, nama FROM master_kota_kabupaten');
        let totalKec = 0;
        for (let i = 0; i < allKota.length; i++) {
            try {
                const kecList = await fetchJSON(`${BASE_URL}/districts/${allKota[i].id}.json`);
                for (const kec of kecList) {
                    await pool.query('INSERT IGNORE INTO master_kecamatan (id, kota_kabupaten_id, nama) VALUES (?, ?, ?)',
                        [kec.id, allKota[i].id, kec.name]);
                }
                totalKec += kecList.length;
            } catch (e) {
                console.log(`\n  ⚠️  Error fetching kecamatan for ${allKota[i].nama}: ${e.message}`);
            }
            if ((i + 1) % 20 === 0 || i === allKota.length - 1) {
                process.stdout.write(`\r  Progress: ${i + 1}/${allKota.length} kota (${totalKec} kecamatan total)`);
            }
        }
        console.log(`\n  ✅ ${totalKec} kecamatan seeded`);

        // Step 5: Fetch and seed kelurahan
        console.log('\nFetching kelurahan (this may take a while)...');
        const [allKec] = await pool.query('SELECT id, nama FROM master_kecamatan');
        let totalKel = 0;
        const batchSize = 50;
        for (let i = 0; i < allKec.length; i++) {
            try {
                const kelList = await fetchJSON(`${BASE_URL}/villages/${allKec[i].id}.json`);
                if (kelList.length > 0) {
                    // Batch insert for performance
                    const values = kelList.map(k => [k.id, allKec[i].id, k.name]);
                    const placeholders = values.map(() => '(?, ?, ?)').join(', ');
                    const flatValues = values.flat();
                    await pool.query(
                        `INSERT IGNORE INTO master_kelurahan (id, kecamatan_id, nama) VALUES ${placeholders}`,
                        flatValues
                    );
                    totalKel += kelList.length;
                }
            } catch (e) {
                // Silent skip for failed fetches
            }
            if ((i + 1) % 100 === 0 || i === allKec.length - 1) {
                process.stdout.write(`\r  Progress: ${i + 1}/${allKec.length} kecamatan (${totalKel} kelurahan total)`);
            }
        }
        console.log(`\n  ✅ ${totalKel} kelurahan seeded`);

        // Register in master_data_config
        await registerMasterDataConfig(pool);

        console.log('\n✅ SEEDING SELESAI!');

    } catch (err) {
        console.error('\n❌ ERROR:', err);
    } finally {
        await pool.end();
    }
}

async function registerMasterDataConfig(pool) {
    console.log('\nRegistering in master_data_config...');

    const configs = [
        {
            nama_tabel: 'master_provinsi',
            label: 'Provinsi',
            kolom: [{ nama: 'Nama', nama_db: 'nama', tipe: 'string', wajib: true }]
        },
        {
            nama_tabel: 'master_kota_kabupaten',
            label: 'Kota/Kabupaten',
            kolom: [
                { nama: 'Provinsi ID', nama_db: 'provinsi_id', tipe: 'string', wajib: true },
                { nama: 'Nama', nama_db: 'nama', tipe: 'string', wajib: true }
            ]
        },
        {
            nama_tabel: 'master_kecamatan',
            label: 'Kecamatan',
            kolom: [
                { nama: 'Kota/Kab ID', nama_db: 'kota_kabupaten_id', tipe: 'string', wajib: true },
                { nama: 'Nama', nama_db: 'nama', tipe: 'string', wajib: true }
            ]
        },
        {
            nama_tabel: 'master_kelurahan',
            label: 'Kelurahan',
            kolom: [
                { nama: 'Kecamatan ID', nama_db: 'kecamatan_id', tipe: 'string', wajib: true },
                { nama: 'Nama', nama_db: 'nama', tipe: 'string', wajib: true }
            ]
        }
    ];

    for (const cfg of configs) {
        const [ex] = await pool.query('SELECT id FROM master_data_config WHERE nama_tabel = ?', [cfg.nama_tabel]);
        if (ex.length === 0) {
            await pool.query('INSERT INTO master_data_config (nama_tabel, label, kolom, is_active) VALUES (?, ?, ?, 1)',
                [cfg.nama_tabel, cfg.label, JSON.stringify(cfg.kolom)]);
            console.log(`  ✅ Registered: ${cfg.nama_tabel}`);
        } else {
            console.log(`  ⏭️  ${cfg.nama_tabel} already registered`);
        }
    }
}

if (require.main === module) {
    seedWilayah();
}

module.exports = { seedWilayah };
