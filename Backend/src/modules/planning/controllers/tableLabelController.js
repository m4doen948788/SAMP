const pool = require('../../../config/db');

// Get all labels (usually for frontend initialization/global state)
const getAll = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM table_labels');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get labels for a specific table
const getByTable = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM table_labels WHERE table_name = ?', [req.params.tableName]);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Upsert label (Create or Update)
const upsert = async (req, res) => {
    try {
        const { table_name, column_key, label } = req.body;
        if (!table_name || !column_key || !label) {
            return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
        }

        const query = `
      INSERT INTO table_labels (table_name, column_key, label) 
      VALUES (?, ?, ?) 
      ON DUPLICATE KEY UPDATE label = VALUES(label)
    `;
        await pool.query(query, [table_name, column_key, label]);

        res.json({ success: true, message: 'Label berhasil disimpan' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get available tables for labeling
const getAvailableTables = async (req, res) => {
    try {
        // Hardcoded base tables
        const baseTables = [
            { name: 'master_tahun', label: 'Master Tahun', columns: [{ key: 'nama', default: 'Nama Tahun' }] },
            { name: 'master_tematik', label: 'Master Tematik', columns: [{ key: 'nama', default: 'Nama Tematik' }] },
            { name: 'master_urusan', label: 'Master Urusan', columns: [{ key: 'urusan', default: 'Nama Urusan' }] },
            {
                name: 'master_bidang', label: 'Master Bidang', columns: [
                    { key: 'nama_bidang', default: 'Nama Bidang' },
                    { key: 'singkatan', default: 'Singkatan' }
                ]
            },
            {
                name: 'master_instansi_daerah', label: 'Master Instansi Daerah', columns: [
                    { key: 'instansi', default: 'Nama Instansi' },
                    { key: 'singkatan', default: 'Singkatan' }
                ]
            },
            { name: 'master_jenis_dokumen', label: 'Master Jenis Dokumen', columns: [{ key: 'nama', default: 'Nama Jenis Dokumen' }] },
            { name: 'master_jenis_kegiatan', label: 'Master Jenis Kegiatan', columns: [{ key: 'nama', default: 'Nama Jenis Kegiatan' }] },
            { name: 'master_jenis_pegawai', label: 'Master Jenis Pegawai', columns: [{ key: 'nama', default: 'Nama Jenis Pegawai' }] },
            {
                name: 'master_aplikasi_external', label: 'Master Aplikasi External', columns: [
                    { key: 'nama_aplikasi', default: 'Nama Aplikasi' },
                    { key: 'url', default: 'URL' },
                    { key: 'pembuat', default: 'Pembuat' },
                    { key: 'asal_instansi', default: 'Asal Instansi' }
                ]
            },
        ];

        // Fetch from generated_pages
        const [generatedPages] = await pool.query('SELECT title, table_name FROM generated_pages');

        const additionalTables = [];
        for (const page of generatedPages) {
            // Get columns from information_schema
            const [columns] = await pool.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = ? 
                AND COLUMN_NAME NOT IN ('id', 'created_at', 'updated_at', 'deleted_at', 'created_by', 'updated_by', 'deleted_by')
            `, [page.table_name]);

            const tableCols = columns.map(c => ({
                key: c.COLUMN_NAME,
                default: c.COLUMN_NAME.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            }));

            if (!baseTables.find(t => t.name === page.table_name)) {
                additionalTables.push({
                    name: page.table_name,
                    label: page.title,
                    columns: tableCols
                });
            }
        }

        // Fetch from master_data_config
        const [configPages] = await pool.query('SELECT nama_tabel, label, kolom FROM master_data_config');
        for (const config of configPages) {
            if (!baseTables.find(t => t.name === config.nama_tabel) && !additionalTables.find(t => t.name === config.nama_tabel)) {
                let columns = [];
                try {
                    const parsedKolom = typeof config.kolom === 'string' ? JSON.parse(config.kolom) : config.kolom;
                    columns = parsedKolom.map(c => ({ key: c.key, default: c.label }));
                } catch (e) { }
                additionalTables.push({
                    name: config.nama_tabel,
                    label: config.label,
                    columns: columns
                });
            }
        }

        const allTables = [...baseTables, ...additionalTables];
        res.json({ success: true, data: allTables });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAll, getByTable, upsert, getAvailableTables };
