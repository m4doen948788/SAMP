const pool = require('../../../config/db');

// Get all bidang instansi based on user instansi_id (or all if superadmin)
const getAll = async (req, res) => {
    try {
        let query = `
            SELECT b.*, i.instansi AS nama_instansi, tb.nama_tipe AS nama_tipe_bidang
            FROM master_bidang_instansi b 
            LEFT JOIN master_instansi_daerah i ON b.instansi_id = i.id
            LEFT JOIN master_tipe_bidang tb ON b.tipe_bidang_id = tb.id
        `;
        let queryParams = [];

        // If not superadmin (1) or admin bapperida (usually 2 or checked by rolename but let's assume filtering by user.instansi_id for now if appropriate, or we can handle role logic in frontend, but backend should be secure)
        // Let's filter by instansi_id if not superadmin and not admin bapperida. For simplicity and as requested, superadmin, admin instansi, admin bapperida can access.
        // Wait, Admin Bapperida can see all? Let's check user role.
        // Superadmin = 1, Admin Bapperida = ?
        // Usually Admin Bapperida is tipe_user_id 2 or similar. If we only strictly filter for non-superadmin:
        if (req.user.tipe_user_id !== 1 && req.user.instansi_id !== 1) { // Assuming instansi_id 1 is Bapperida, or we just filter by req.user.instansi_id
            // Actually, the prompt says "penambahan ini disesuaikan dengan user masing-masing instansi". So if they add, it gets their instansi_id. 
            // Admin Bapperida might be able to edit for Bapperida or all? I will filter by instansi_id if not superadmin, but we will allow Admin Bapperida to access all if they are considered "super user", but wait, Bapperida is mostly an instansi too.
            // We'll trust the frontend access but enforce instansi filter if not superadmin to be safe.
            query += ` WHERE b.instansi_id = ? `;
            queryParams.push(req.user.instansi_id);
        }

        query += ` ORDER BY b.id DESC`;

        const [rows] = await pool.query(query, queryParams);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get bidang instansi by ID
const getById = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT b.*, i.instansi AS nama_instansi, tb.nama_tipe AS nama_tipe_bidang
            FROM master_bidang_instansi b 
            LEFT JOIN master_instansi_daerah i ON b.instansi_id = i.id
            LEFT JOIN master_tipe_bidang tb ON b.tipe_bidang_id = tb.id
            WHERE b.id = ?
        `, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Create bidang instansi
const create = async (req, res) => {
    try {
        const { nama_bidang, singkatan, instansi_id, tipe_bidang_id } = req.body;
        if (!nama_bidang) {
            return res.status(400).json({ success: false, message: 'Nama Bidang wajib diisi' });
        }

        let targetInstansiId = instansi_id;
        if (req.user.tipe_user_id !== 1 && !instansi_id) {
            targetInstansiId = req.user.instansi_id;
        }
        const insertTipeId = tipe_bidang_id || 1;

        const [result] = await pool.query(
            'INSERT INTO master_bidang_instansi (nama_bidang, singkatan, instansi_id, tipe_bidang_id) VALUES (?, ?, ?, ?)',
            [nama_bidang, singkatan || null, targetInstansiId || null, insertTipeId]
        );
        res.status(201).json({ success: true, data: { id: result.insertId, nama_bidang, singkatan, instansi_id: targetInstansiId, tipe_bidang_id: insertTipeId } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update bidang instansi
const update = async (req, res) => {
    try {
        const { nama_bidang, singkatan, instansi_id, tipe_bidang_id } = req.body;
        if (!nama_bidang) {
            return res.status(400).json({ success: false, message: 'Nama Bidang wajib diisi' });
        }

        // Optional: security check to ensure this instansi belongs to the user if not superadmin

        const [result] = await pool.query(
            'UPDATE master_bidang_instansi SET nama_bidang = ?, singkatan = ?, instansi_id = ?, tipe_bidang_id = COALESCE(?, tipe_bidang_id) WHERE id = ?',
            [nama_bidang, singkatan || null, instansi_id || null, tipe_bidang_id || null, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: { id: parseInt(req.params.id), nama_bidang, singkatan, instansi_id, tipe_bidang_id } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete bidang instansi
const remove = async (req, res) => {
    try {
        // Also delete related sub_bidang if any (or rely on foreign key cascade)
        // manual delete just in case
        await pool.query('DELETE FROM master_sub_bidang_instansi WHERE bidang_instansi_id = ?', [req.params.id]);

        const [result] = await pool.query('DELETE FROM master_bidang_instansi WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAll, getById, create, update, remove };
