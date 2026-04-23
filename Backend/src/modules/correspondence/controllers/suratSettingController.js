const pool = require('../../../config/db');

const suratSettingController = {
    getSettings: async (req, res) => {
        try {
            const instansi_id = req.user.instansi_id;
            const [rows] = await pool.query(
                'SELECT slot_size, buffer_size FROM surat_numbering_settings WHERE instansi_id = ?',
                [instansi_id]
            );

            if (rows.length === 0) {
                return res.json({ 
                    success: true, 
                    data: { slot_size: 15, buffer_size: 5 } 
                });
            }

            res.json({ success: true, data: rows[0] });
        } catch (error) {
            console.error('Error fetching numbering settings:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    updateSettings: async (req, res) => {
        try {
            const instansi_id = req.user.instansi_id;
            const { slot_size, buffer_size } = req.body;

            const [rows] = await pool.query(
                'SELECT id FROM surat_numbering_settings WHERE instansi_id = ?',
                [instansi_id]
            );

            if (rows.length > 0) {
                await pool.query(
                    'UPDATE surat_numbering_settings SET slot_size = ?, buffer_size = ? WHERE instansi_id = ?',
                    [slot_size, buffer_size, instansi_id]
                );
            } else {
                await pool.query(
                    'INSERT INTO surat_numbering_settings (instansi_id, slot_size, buffer_size) VALUES (?, ?, ?)',
                    [instansi_id, slot_size, buffer_size]
                );
            }

            res.json({ success: true, message: 'Pengaturan berhasil diperbarui' });
        } catch (error) {
            console.error('Error updating numbering settings:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    getSlotStats: async (req, res) => {
        try {
            const isSuperAdmin = req.user.tipe_user_id == 1;
            let instansi_id = req.user.instansi_id;
            const { month, year, bidang_id, instansi_id: queryInstansiId } = req.query;

            if (isSuperAdmin && queryInstansiId && queryInstansiId !== 'all') {
                instansi_id = queryInstansiId;
            }

            if (instansi_id === 'all') {
                return res.json({ success: true, data: [] });
            }

            // Robust Month/Year range (cover entire day until 23:59:59)
            const m = parseInt(month) || new Date().getMonth() + 1;
            const y = parseInt(year) || new Date().getFullYear();
            const lastDay = new Date(y, m, 0).getDate();
            const startDate = `${y}-${m.toString().padStart(2, '0')}-01 00:00:00`;
            const endDate = `${y}-${m.toString().padStart(2, '0')}-${lastDay} 23:59:59`;

            let querySlots = `
                SELECT tanggal, start_number, end_number 
                FROM surat_daily_slots 
                WHERE instansi_id = ? AND tanggal BETWEEN ? AND ?
                ORDER BY tanggal ASC
            `;
            const [slots] = await pool.query(querySlots, [instansi_id, startDate, endDate]);

            let queryUsage = `
                SELECT DATE(tanggal_surat) as tanggal, bidang_id, COUNT(*) as used_count
                FROM surat_nomor_log
                WHERE instansi_id = ? AND tanggal_surat BETWEEN ? AND ?
                AND nomor_suffix IS NULL
            `;
            const paramsUsage = [instansi_id, startDate, endDate];

            if (bidang_id && bidang_id !== 'all') {
                queryUsage += ' AND bidang_id = ?';
                paramsUsage.push(bidang_id);
            }

            queryUsage += ' GROUP BY DATE(tanggal_surat), bidang_id';
            const [usageRows] = await pool.query(queryUsage, paramsUsage);

            const usageMap = {};
            usageRows.forEach(row => {
                const dateKey = new Date(row.tanggal).toISOString().split('T')[0];
                if (!usageMap[dateKey]) usageMap[dateKey] = 0;
                usageMap[dateKey] += row.used_count;
            });

            const stats = slots.map(slot => {
                const dateKey = slot.tanggal.toISOString ? slot.tanggal.toISOString().split('T')[0] : slot.tanggal;
                const used = usageMap[dateKey] || 0;
                const total = (slot.end_number - slot.start_number) + 1;
                return {
                    tanggal: dateKey,
                    start_number: slot.start_number,
                    end_number: slot.end_number,
                    used,
                    total,
                    percentage: Math.min(100, Math.round((used / total) * 100))
                };
            });

            res.json({ success: true, data: stats });
        } catch (error) {
            console.error('Error fetching slot statistics:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    getLogs: async (req, res) => {
        try {
            const isSuperAdmin = req.user.tipe_user_id == 1;
            let instansi_id = req.user.instansi_id;
            const { month, year, bidang_id, instansi_id: queryInstansiId, search } = req.query;

            if (isSuperAdmin && queryInstansiId && queryInstansiId !== 'all') {
                instansi_id = queryInstansiId;
            }

            let query = `
                SELECT l.*, b.nama_bidang, b.singkatan as bidang_singkatan, i.instansi as nama_instansi, u.username as creator_name
                FROM surat_nomor_log l
                LEFT JOIN master_bidang_instansi b ON l.bidang_id = b.id
                LEFT JOIN master_instansi_daerah i ON l.instansi_id = i.id
                LEFT JOIN users u ON l.created_by = u.id
                WHERE 1=1
            `;
            const params = [];

            // Always enforce date filters unless a robust search overrides it
            if (!search || search.trim() === '') {
                const m = parseInt(month) || new Date().getMonth() + 1;
                const y = parseInt(year) || new Date().getFullYear();
                const lastDay = new Date(y, m, 0).getDate();
                const startDate = `${y}-${m.toString().padStart(2, '0')}-01 00:00:00`;
                const endDate = `${y}-${m.toString().padStart(2, '0')}-${lastDay} 23:59:59`;
                
                query += ' AND l.tanggal_surat BETWEEN ? AND ?';
                params.push(startDate, endDate);
            }

            if (!isSuperAdmin || (queryInstansiId && queryInstansiId !== 'all')) {
                query += ' AND l.instansi_id = ?';
                params.push(instansi_id);
            }

            if (bidang_id && bidang_id !== 'all') {
                query += ' AND l.bidang_id = ?';
                params.push(bidang_id);
            }

            if (search && search.trim() !== '') {
                query += ' AND (l.nomor_surat_full LIKE ? OR l.perihal LIKE ? OR b.nama_bidang LIKE ? OR b.singkatan LIKE ?)';
                const searchParam = `%${search.trim()}%`;
                params.push(searchParam, searchParam, searchParam, searchParam);
            }

            query += ' ORDER BY l.id DESC';

            const [rows] = await pool.query(query, params);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching numbering logs:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    debugGetAll: async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM surat_nomor_log ORDER BY id DESC LIMIT 10');
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Debug error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = suratSettingController;
