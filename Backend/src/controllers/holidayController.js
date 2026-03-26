const db = require('../config/db');

const holidayController = {
    getAll: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM master_hari_libur ORDER BY tanggal ASC');
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching holidays:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    getByMonth: async (req, res) => {
        const { year, month } = req.query;
        try {
            const [rows] = await db.query(
                "SELECT * FROM master_hari_libur WHERE YEAR(tanggal) = ? AND MONTH(tanggal) = ?",
                [year, month]
            );
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching monthly holidays:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    toggle: async (req, res) => {
        const { tanggal, keterangan } = req.body;
        try {
            // Check if exists
            const [existing] = await db.query('SELECT id FROM master_hari_libur WHERE tanggal = ?', [tanggal]);

            if (existing.length > 0) {
                // Delete if exists (toggle off)
                await db.query('DELETE FROM master_hari_libur WHERE tanggal = ?', [tanggal]);
                res.json({ success: true, message: 'Hari libur dihapus', action: 'deleted' });
            } else {
                // Add if not exists (toggle on)
                await db.query('INSERT INTO master_hari_libur (tanggal, keterangan) VALUES (?, ?)', [tanggal, keterangan]);
                res.json({ success: true, message: 'Hari libur ditambahkan', action: 'added' });
            }
        } catch (error) {
            console.error('Error toggling holiday:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    bulkUpsert: async (req, res) => {
        const { start_tanggal, duration, keterangan } = req.body;
        try {
            const startDate = new Date(start_tanggal);
            const promises = [];

            for (let i = 0; i < duration; i++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + i);
                const dateString = currentDate.toISOString().split('T')[0];

                promises.push(db.query(
                    'INSERT INTO master_hari_libur (tanggal, keterangan) VALUES (?, ?) ON DUPLICATE KEY UPDATE keterangan = VALUES(keterangan)',
                    [dateString, keterangan]
                ));
            }

            await Promise.all(promises);
            res.json({ success: true, message: 'Hari libur berhasil disimpan' });
        } catch (error) {
            console.error('Error bulk upserting holidays:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    bulkDelete: async (req, res) => {
        const { tanggal } = req.body; // Can be a single string or an array of strings
        try {
            const dates = Array.isArray(tanggal) ? tanggal : [tanggal];
            if (dates.length === 0) {
                return res.json({ success: true, message: 'Tidak ada tanggal yang dihapus' });
            }

            await db.query('DELETE FROM master_hari_libur WHERE tanggal IN (?)', [dates]);
            res.json({ success: true, message: 'Hari libur berhasil dihapus' });
        } catch (error) {
            console.error('Error bulk deleting holidays:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = holidayController;
