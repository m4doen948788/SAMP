const pool = require('../../../config/db');

const auditController = {
    getAll: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 50, 
                user_id, 
                action, 
                table_name,
                search,
                start_date,
                end_date
            } = req.query;

            const offset = (page - 1) * limit;
            let query = `
                SELECT 
                    a.*, 
                    u.username,
                    p.nama_lengkap as user_nama
                FROM audit_logs a
                LEFT JOIN users u ON a.user_id = u.id
                LEFT JOIN profil_pegawai p ON u.profil_pegawai_id = p.id
                WHERE 1=1
            `;
            const params = [];

            if (user_id) {
                query += ' AND a.user_id = ?';
                params.push(user_id);
            }

            if (action) {
                query += ' AND a.action = ?';
                params.push(action);
            }

            if (table_name) {
                query += ' AND a.table_name = ?';
                params.push(table_name);
            }

            if (search) {
                query += ' AND (a.action LIKE ? OR a.table_name LIKE ? OR u.username LIKE ? OR p.nama_lengkap LIKE ?)';
                const searchPat = `%${search}%`;
                params.push(searchPat, searchPat, searchPat, searchPat);
            }

            if (start_date) {
                query += ' AND a.created_at >= ?';
                params.push(start_date);
            }

            if (end_date) {
                query += ' AND a.created_at <= ?';
                params.push(end_date);
            }

            // Total count for pagination
            const countQuery = `SELECT COUNT(*) as total FROM (${query}) as t`;
            const [countRows] = await pool.query(countQuery, params);
            const total = countRows[0].total;

            // Final query with ordering and limit
            query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
            params.push(Number(limit), Number(offset));

            const [rows] = await pool.query(query, params);

            res.json({
                success: true,
                data: rows,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    total_pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            res.status(500).json({ success: false, message: 'Gagal mengambil data audit trail' });
        }
    },

    getActions: async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT DISTINCT action FROM audit_logs ORDER BY action');
            res.json({ success: true, data: rows.map(r => r.action) });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Gagal mengambil daftar aksi' });
        }
    },

    getTables: async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT DISTINCT table_name FROM audit_logs WHERE table_name IS NOT NULL ORDER BY table_name');
            res.json({ success: true, data: rows.map(r => r.table_name) });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Gagal mengambil daftar tabel' });
        }
    }
};

module.exports = auditController;
