const pool = require('../../../config/db');

// Get all menu with aplikasi external info
const getAll = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?.userId || null;
        
        let query = `
          SELECT m.id, m.nama_menu, m.tipe, m.aplikasi_external_id, m.action_page, m.icon, m.parent_id, m.urutan, m.is_active, m.created_at, m.updated_at,
                 a.nama_aplikasi, a.url AS aplikasi_url,
                 (CASE WHEN m.aplikasi_external_id IS NOT NULL THEN a.is_qa_all ELSE m.is_qa_all END) AS is_qa_all,
                 (CASE WHEN m.aplikasi_external_id IS NOT NULL THEN a.is_qa_bidang ELSE m.is_qa_bidang END) AS is_qa_bidang,
                 (CASE WHEN m.aplikasi_external_id IS NOT NULL THEN a.is_qa_personal ELSE m.is_qa_personal END) AS is_qa_personal,
                 (CASE WHEN m.aplikasi_external_id IS NOT NULL THEN a.created_by ELSE m.created_by END) AS created_by,
                 (CASE WHEN m.aplikasi_external_id IS NOT NULL THEN p_ae.bidang_id ELSE m.creator_bidang_id END) AS creator_bidang_id
        `;
        
        if (currentUserId) {
            query += `, (CASE WHEN uqp.id IS NOT NULL THEN 1 ELSE 0 END) AS is_quick_access `;
            query += `, (CASE WHEN m.aplikasi_external_id IS NOT NULL THEN (CASE WHEN uqp_ae.id IS NOT NULL THEN 1 ELSE 0 END) ELSE (CASE WHEN uqp.id IS NOT NULL THEN 1 ELSE 0 END) END) AS ae_user_is_qa_personal `;
        } else {
            query += `, m.is_quick_access `;
            query += `, 0 AS ae_user_is_qa_personal `;
        }
        
        query += `
          FROM kelola_menu m
          LEFT JOIN master_aplikasi_external a ON m.aplikasi_external_id = a.id AND a.deleted_at IS NULL
          LEFT JOIN users u_ae ON a.created_by = u_ae.id
          LEFT JOIN profil_pegawai p_ae ON u_ae.profil_pegawai_id = p_ae.id
        `;
        
        const params = [];
        if (currentUserId) {
            query += ` LEFT JOIN user_qa_personal uqp ON m.id = uqp.menu_id AND uqp.user_id = ? `;
            query += ` LEFT JOIN user_qa_personal uqp_ae ON a.id = uqp_ae.aplikasi_external_id AND uqp_ae.user_id = ? `;
            params.push(currentUserId, currentUserId);
        }
        
        query += ` ORDER BY m.urutan ASC, m.id ASC `;
        
        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get menu by ID
const getById = async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT m.*, a.nama_aplikasi, a.url AS aplikasi_url
      FROM kelola_menu m
      LEFT JOIN master_aplikasi_external a ON m.aplikasi_external_id = a.id AND a.deleted_at IS NULL
      WHERE m.id = ?
    `, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Create menu
const create = async (req, res) => {
    try {
        const { nama_menu, tipe, aplikasi_external_id, action_page, icon, parent_id, urutan, is_active, is_quick_access } = req.body;
        if (!nama_menu) {
            return res.status(400).json({ success: false, message: 'Nama menu wajib diisi' });
        }
        const [result] = await pool.query(
            'INSERT INTO kelola_menu (nama_menu, tipe, aplikasi_external_id, action_page, icon, parent_id, urutan, is_active, is_quick_access) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [nama_menu, tipe || 'menu1', aplikasi_external_id || null, action_page || null, icon || null, parent_id || null, urutan || 0, is_active !== undefined ? is_active : 1, is_quick_access ? 1 : 0]
        );
        res.status(201).json({ success: true, data: { id: result.insertId, nama_menu, tipe, aplikasi_external_id, action_page, icon, parent_id, urutan, is_active, is_quick_access: is_quick_access ? 1 : 0 } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update menu
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            nama_menu, 
            tipe, 
            aplikasi_external_id, 
            action_page, 
            icon, 
            parent_id, 
            urutan, 
            is_active, 
            is_quick_access,
            is_qa_all,
            is_qa_bidang
        } = req.body;

        if (!nama_menu) {
            return res.status(400).json({ success: false, message: 'Nama menu wajib diisi' });
        }

        const [existing] = await pool.query('SELECT * FROM kelola_menu WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }

        const currentUserId = req.user?.id || req.user?.userId || null;
        const currentUserBidangId = req.user?.bidang_id || null;

        let creatorBidangId = existing[0].creator_bidang_id;
        let createdBy = existing[0].created_by;

        if (is_qa_bidang === 1 && !creatorBidangId) {
            creatorBidangId = currentUserBidangId;
        }
        if ((is_qa_bidang === 1 || is_qa_all === 1) && !createdBy) {
            createdBy = currentUserId;
        }

        const [result] = await pool.query(
            `UPDATE kelola_menu 
             SET nama_menu = ?, tipe = ?, aplikasi_external_id = ?, action_page = ?, icon = ?, 
                 parent_id = ?, urutan = ?, is_active = ?, is_quick_access = ?, 
                 is_qa_all = ?, is_qa_bidang = ?, creator_bidang_id = ?, created_by = ? 
             WHERE id = ?`,
            [
                nama_menu, 
                tipe || 'menu1', 
                aplikasi_external_id || null, 
                action_page || null, 
                icon || null, 
                parent_id || null, 
                urutan || 0, 
                is_active !== undefined ? is_active : 1, 
                is_quick_access ? 1 : 0,
                is_qa_all !== undefined ? (is_qa_all ? 1 : 0) : (existing[0].is_qa_all || 0),
                is_qa_bidang !== undefined ? (is_qa_bidang ? 1 : 0) : (existing[0].is_qa_bidang || 0),
                creatorBidangId,
                createdBy,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }

        res.json({ 
            success: true, 
            data: { 
                id: parseInt(id), 
                nama_menu, 
                tipe, 
                aplikasi_external_id, 
                action_page, 
                icon, 
                parent_id, 
                urutan, 
                is_active, 
                is_quick_access: is_quick_access ? 1 : 0,
                is_qa_all: is_qa_all ? 1 : 0,
                is_qa_bidang: is_qa_bidang ? 1 : 0,
                creator_bidang_id: creatorBidangId,
                created_by: createdBy
            } 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete menu
const remove = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM kelola_menu WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Batch reorder menus
const reorder = async (req, res) => {
    try {
        const { items } = req.body; // [{id, urutan}, ...]
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Items array wajib diisi' });
        }
        for (const item of items) {
            await pool.query('UPDATE kelola_menu SET urutan = ? WHERE id = ?', [item.urutan, item.id]);
        }
        res.json({ success: true, message: 'Urutan berhasil diperbarui' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Toggle Quick Access for a menu item
const toggleQuickAccess = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user?.id || req.user?.userId || null;
        
        if (!currentUserId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        
        const [menuRows] = await pool.query('SELECT id FROM kelola_menu WHERE id = ?', [id]);
        if (menuRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Menu tidak ditemukan' });
        }
        
        const [existing] = await pool.query(
            'SELECT id FROM user_qa_personal WHERE user_id = ? AND menu_id = ?',
            [currentUserId, id]
        );
        
        let nextState;
        if (existing.length > 0) {
            await pool.query('DELETE FROM user_qa_personal WHERE id = ?', [existing[0].id]);
            nextState = 0;
        } else {
            await pool.query(
                'INSERT INTO user_qa_personal (user_id, menu_id) VALUES (?, ?)',
                [currentUserId, id]
            );
            nextState = 1;
        }
        
        res.json({ success: true, is_quick_access: nextState });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAll, getById, create, update, remove, reorder, toggleQuickAccess };
