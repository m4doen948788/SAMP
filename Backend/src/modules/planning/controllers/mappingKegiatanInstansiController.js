const pool = require('../../../config/db');
const auditService = require('../../../utils/auditService');

// Get all mapping for kegiatan and sub-kegiatan
const getAll = async (req, res) => {
    try {
        const { instansi_id } = req.query;
        let whereSubKeg = "";
        let whereKeg = "";
        let whereProg = "";
        const paramsSubKeg = [];
        const paramsKeg = [];
        const paramsProg = [];

        if (instansi_id) {
            whereSubKeg = " WHERE mski.instansi_id = ?";
            paramsSubKeg.push(instansi_id);
            
            whereKeg = " WHERE mki.instansi_id = ?";
            paramsKeg.push(instansi_id);
            
            whereProg = " WHERE mpi.instansi_id = ?";
            paramsProg.push(instansi_id);
        }

        const [kegiatanMappings] = await pool.query(`
            SELECT 
                mki.id as mapping_id, mk.id as kegiatan_id, mk.nama_kegiatan, 
                mp.id as program_id, mp.nama_program,
                mbu.id as urusan_id, mbu.urusan as nama_urusan,
                mki.instansi_id, mi.instansi as nama_instansi, mi.singkatan as singkatan_instansi,
                mki.penanggung_jawab_id, p.nama_lengkap as nama_penanggung_jawab, j.jabatan as nama_jabatan
            FROM mapping_kegiatan_instansi mki
            JOIN master_kegiatan mk ON mki.kegiatan_id = mk.id
            JOIN master_program mp ON mk.program_id = mp.id
            JOIN master_bidang_urusan mbu ON mp.urusan_id = mbu.id
            LEFT JOIN master_instansi_daerah mi ON mki.instansi_id = mi.id
            LEFT JOIN profil_pegawai p ON mki.penanggung_jawab_id = p.id
            LEFT JOIN master_jabatan j ON p.jabatan_id = j.id
            ${whereKeg}
            ORDER BY mbu.urusan ASC, mp.nama_program ASC, mk.nama_kegiatan ASC
        `, paramsKeg);

        const [subKegiatanMappings] = await pool.query(`
            SELECT 
                mski.id as mapping_id, msk.id as sub_kegiatan_id, msk.nama_sub_kegiatan, msk.kode_sub_kegiatan,
                mk.id as kegiatan_id, mk.nama_kegiatan,
                mp.id as program_id, mp.nama_program,
                mbu.id as urusan_id, mbu.urusan as nama_urusan,
                mski.instansi_id, mi.instansi as nama_instansi, mi.singkatan as singkatan_instansi,
                mski.penanggung_jawab_id, p.nama_lengkap as nama_penanggung_jawab, j.jabatan as nama_jabatan
            FROM mapping_sub_kegiatan_instansi mski
            JOIN master_sub_kegiatan msk ON mski.sub_kegiatan_id = msk.id
            JOIN master_kegiatan mk ON msk.kegiatan_id = mk.id
            JOIN master_program mp ON mk.program_id = mp.id
            JOIN master_bidang_urusan mbu ON mp.urusan_id = mbu.id
            LEFT JOIN master_instansi_daerah mi ON mski.instansi_id = mi.id
            LEFT JOIN profil_pegawai p ON mski.penanggung_jawab_id = p.id
            LEFT JOIN master_jabatan j ON p.jabatan_id = j.id
            ${whereSubKeg}
            ORDER BY mbu.urusan ASC, mp.nama_program ASC, mk.nama_kegiatan ASC, msk.nama_sub_kegiatan ASC
        `, paramsSubKeg);

        const [programMappings] = await pool.query(`
            SELECT 
                mpi.id as mapping_id, mpi.program_id, mpi.instansi_id, mpi.penanggung_jawab_id,
                p.nama_lengkap as nama_penanggung_jawab, j.jabatan as nama_jabatan
            FROM mapping_program_instansi mpi
            LEFT JOIN profil_pegawai p ON mpi.penanggung_jawab_id = p.id
            LEFT JOIN master_jabatan j ON p.jabatan_id = j.id
            ${whereProg}
        `, paramsProg);

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

        // Fetch old mapping for audit trail
        const [oldRows] = await connection.query('SELECT instansi_id FROM mapping_kegiatan_instansi WHERE kegiatan_id = ?', [kegiatan_id]);
        const oldInstansiIds = oldRows.map(r => r.instansi_id);

        // Delete existing mappings for this kegiatan
        await connection.query('DELETE FROM mapping_kegiatan_instansi WHERE kegiatan_id = ?', [kegiatan_id]);

        // Insert new mappings
        if (instansi_ids.length > 0) {
            const values = instansi_ids.map(instansi_id => [kegiatan_id, instansi_id]);
            await connection.query('INSERT INTO mapping_kegiatan_instansi (kegiatan_id, instansi_id) VALUES ?', [values]);
        }

        await connection.commit();

        // Log to Audit Trail
        await auditService.log({
            user_id: req.user.id,
            action: 'UPDATE_MAPPING_KEGIATAN',
            table_name: 'mapping_kegiatan_instansi',
            record_id: kegiatan_id,
            old_values: { instansi_ids: oldInstansiIds },
            new_values: { instansi_ids: instansi_ids },
            req: req
        });

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

        // Fetch old mapping for audit trail
        const [oldRows] = await connection.query('SELECT instansi_id FROM mapping_sub_kegiatan_instansi WHERE sub_kegiatan_id = ?', [sub_kegiatan_id]);
        const oldInstansiIds = oldRows.map(r => r.instansi_id);

        // Delete existing mappings for this sub-kegiatan
        await connection.query('DELETE FROM mapping_sub_kegiatan_instansi WHERE sub_kegiatan_id = ?', [sub_kegiatan_id]);

        // Insert new mappings
        if (instansi_ids.length > 0) {
            const values = instansi_ids.map(instansi_id => [sub_kegiatan_id, instansi_id]);
            await connection.query('INSERT INTO mapping_sub_kegiatan_instansi (sub_kegiatan_id, instansi_id) VALUES ?', [values]);
        }

        await connection.commit();

        // Log to Audit Trail
        await auditService.log({
            user_id: req.user.id,
            action: 'UPDATE_MAPPING_SUB_KEGIATAN',
            table_name: 'mapping_sub_kegiatan_instansi',
            record_id: sub_kegiatan_id,
            old_values: { instansi_ids: oldInstansiIds },
            new_values: { instansi_ids: instansi_ids },
            req: req
        });

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

        // Security check for SKPD users:
        // Superadmin (tipe_user_id === 1) and Bapperida planners have full access.
        // Others (SKPD users) can ONLY manage their own instansi_id.
        const isSuperAdmin = req.user.tipe_user_id === 1;
        const isBapperida = req.user.instansi_id === 2 || (req.user.instansi_singkatan && req.user.instansi_singkatan.toUpperCase() === 'BAPPERIDA') || req.user.tipe_user_id === 8;

        if (!isSuperAdmin && !isBapperida && req.user.instansi_id) {
            if (Number(instansi_id) !== Number(req.user.instansi_id)) {
                await connection.rollback();
                return res.status(403).json({ 
                    success: false, 
                    message: 'Akses ditolak: Anda hanya diperbolehkan mengelola pemetaan kegiatan untuk SKPD Anda sendiri.' 
                });
            }
        }

        // Helper to parse inputs which might be numbers or objects: { id, penanggung_jawab_id }
        const parseInputList = (list) => {
            if (!Array.isArray(list)) return [];
            return list.map(item => {
                if (typeof item === 'object' && item !== null) {
                    return {
                        id: item.id,
                        penanggung_jawab_id: item.penanggung_jawab_id || null
                    };
                }
                // Try parsing stringified JSON object if it comes in that format
                if (typeof item === 'string' && item.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(item);
                        return {
                            id: parsed.id,
                            penanggung_jawab_id: parsed.penanggung_jawab_id || null
                        };
                    } catch (e) {
                        // fallback
                    }
                }
                return {
                    id: Number(item),
                    penanggung_jawab_id: null
                };
            });
        };

        // 1. Sync Program
        await connection.query('DELETE FROM mapping_program_instansi WHERE instansi_id = ?', [instansi_id]);
        if (Array.isArray(program_ids) && program_ids.length > 0) {
            const parsedPrograms = parseInputList(program_ids).filter(p => p.id !== -1);
            if (parsedPrograms.length > 0) {
                const pValues = parsedPrograms.map(p => [p.id, instansi_id, p.penanggung_jawab_id]);
                await connection.query('INSERT INTO mapping_program_instansi (program_id, instansi_id, penanggung_jawab_id) VALUES ?', [pValues]);
            }
        }

        // 2. Sync Kegiatan
        await connection.query('DELETE FROM mapping_kegiatan_instansi WHERE instansi_id = ?', [instansi_id]);
        if (Array.isArray(kegiatan_ids) && kegiatan_ids.length > 0) {
            const parsedKegiatans = parseInputList(kegiatan_ids).filter(k => k.id !== -1);
            if (parsedKegiatans.length > 0) {
                const kValues = parsedKegiatans.map(k => [k.id, instansi_id, k.penanggung_jawab_id]);
                await connection.query('INSERT INTO mapping_kegiatan_instansi (kegiatan_id, instansi_id, penanggung_jawab_id) VALUES ?', [kValues]);
            }
        }

        // 3. Sync Sub-Kegiatan
        await connection.query('DELETE FROM mapping_sub_kegiatan_instansi WHERE instansi_id = ?', [instansi_id]);
        if (Array.isArray(sub_kegiatan_ids) && sub_kegiatan_ids.length > 0) {
            const parsedSubKegiatans = parseInputList(sub_kegiatan_ids).filter(sk => sk.id !== -1);
            if (parsedSubKegiatans.length > 0) {
                const skValues = parsedSubKegiatans.map(sk => [sk.id, instansi_id, sk.penanggung_jawab_id]);
                await connection.query('INSERT INTO mapping_sub_kegiatan_instansi (sub_kegiatan_id, instansi_id, penanggung_jawab_id) VALUES ?', [skValues]);
            }
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
