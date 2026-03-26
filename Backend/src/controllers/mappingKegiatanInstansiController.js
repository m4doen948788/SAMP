const pool = require('../config/db');

// Get all mapping for kegiatan and sub-kegiatan
const getAll = async (req, res) => {
    try {
        // We need a comprehensive list of all possible mappings
        // Or simply the current state of mappings
        
        const [kegiatanMappings] = await pool.query(`
            SELECT 
                mk.id as kegiatan_id, mk.nama_kegiatan, 
                mp.id as program_id, mp.nama_program,
                mbu.id as urusan_id, mbu.urusan as nama_urusan,
                mki.instansi_id, mi.instansi as nama_instansi, mi.singkatan as singkatan_instansi
            FROM mapping_kegiatan_instansi mki
            JOIN master_kegiatan mk ON mki.kegiatan_id = mk.id
            JOIN master_program mp ON mk.program_id = mp.id
            JOIN master_bidang_urusan mbu ON mp.urusan_id = mbu.id
            LEFT JOIN master_instansi_daerah mi ON mki.instansi_id = mi.id
            ORDER BY mbu.urusan ASC, mp.nama_program ASC, mk.nama_kegiatan ASC
        `);

        const [subKegiatanMappings] = await pool.query(`
            SELECT 
                msk.id as sub_kegiatan_id, msk.nama_sub_kegiatan,
                mk.id as kegiatan_id, mk.nama_kegiatan,
                mp.id as program_id, mp.nama_program,
                mbu.id as urusan_id, mbu.urusan as nama_urusan,
                mski.instansi_id, mi.instansi as nama_instansi, mi.singkatan as singkatan_instansi
            FROM mapping_sub_kegiatan_instansi mski
            JOIN master_sub_kegiatan msk ON mski.sub_kegiatan_id = msk.id
            JOIN master_kegiatan mk ON msk.kegiatan_id = mk.id
            JOIN master_program mp ON mk.program_id = mp.id
            JOIN master_bidang_urusan mbu ON mp.urusan_id = mbu.id
            LEFT JOIN master_instansi_daerah mi ON mski.instansi_id = mi.id
            ORDER BY mbu.urusan ASC, mp.nama_program ASC, mk.nama_kegiatan ASC, msk.nama_sub_kegiatan ASC
        `);

        // Fetch program mappings as well
        const [programMappings] = await pool.query(`
            SELECT program_id, instansi_id FROM mapping_program_instansi
        `);

        res.json({ 
            success: true, 
            data: {
                program: programMappings,
                kegiatan: kegiatanMappings,
                sub_kegiatan: subKegiatanMappings
            } 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Sync mapping for specific kegiatan
const updateKegiatan = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { kegiatan_id, instansi_ids } = req.body;

        if (!kegiatan_id || !Array.isArray(instansi_ids)) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Kegiatan ID dan daftar Instansi wajib diisi' });
        }

        // Delete existing mappings for this kegiatan
        await connection.query('DELETE FROM mapping_kegiatan_instansi WHERE kegiatan_id = ?', [kegiatan_id]);

        // Insert new mappings
        if (instansi_ids.length > 0) {
            const values = instansi_ids.map(instansi_id => [kegiatan_id, instansi_id]);
            await connection.query('INSERT INTO mapping_kegiatan_instansi (kegiatan_id, instansi_id) VALUES ?', [values]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Pemetaan kegiatan berhasil diperbarui' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

// Sync mapping for specific sub-kegiatan
const updateSubKegiatan = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { sub_kegiatan_id, instansi_ids } = req.body;

        if (!sub_kegiatan_id || !Array.isArray(instansi_ids)) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Sub-kegiatan ID dan daftar Instansi wajib diisi' });
        }

        // Delete existing mappings for this sub-kegiatan
        await connection.query('DELETE FROM mapping_sub_kegiatan_instansi WHERE sub_kegiatan_id = ?', [sub_kegiatan_id]);

        // Insert new mappings
        if (instansi_ids.length > 0) {
            const values = instansi_ids.map(instansi_id => [sub_kegiatan_id, instansi_id]);
            await connection.query('INSERT INTO mapping_sub_kegiatan_instansi (sub_kegiatan_id, instansi_id) VALUES ?', [values]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Pemetaan sub-kegiatan berhasil diperbarui' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

// Sync all mapping for a specific instansi
const syncInstansiBulk = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { instansi_id, program_ids, kegiatan_ids, sub_kegiatan_ids } = req.body;

        if (!instansi_id) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Instansi ID wajib diisi' });
        }

        // 1. Sync Program
        await connection.query('DELETE FROM mapping_program_instansi WHERE instansi_id = ?', [instansi_id]);
        if (Array.isArray(program_ids) && program_ids.length > 0) {
            const pValues = program_ids.map(pid => [pid, instansi_id]);
            await connection.query('INSERT INTO mapping_program_instansi (program_id, instansi_id) VALUES ?', [pValues]);
        }

        // 2. Sync Kegiatan
        await connection.query('DELETE FROM mapping_kegiatan_instansi WHERE instansi_id = ?', [instansi_id]);
        if (Array.isArray(kegiatan_ids) && kegiatan_ids.length > 0) {
            const kValues = kegiatan_ids.map(kid => [kid, instansi_id]);
            await connection.query('INSERT INTO mapping_kegiatan_instansi (kegiatan_id, instansi_id) VALUES ?', [kValues]);
        }

        // 3. Sync Sub-Kegiatan
        await connection.query('DELETE FROM mapping_sub_kegiatan_instansi WHERE instansi_id = ?', [instansi_id]);
        if (Array.isArray(sub_kegiatan_ids) && sub_kegiatan_ids.length > 0) {
            const skValues = sub_kegiatan_ids.map(skid => [skid, instansi_id]);
            await connection.query('INSERT INTO mapping_sub_kegiatan_instansi (sub_kegiatan_id, instansi_id) VALUES ?', [skValues]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Pemetaan instansi berhasil disimpan' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

module.exports = { getAll, updateKegiatan, updateSubKegiatan, syncInstansiBulk };
