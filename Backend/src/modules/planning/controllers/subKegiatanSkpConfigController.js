const pool = require('../../../config/db');

const subKegiatanSkpConfigController = {
    getConfig: async (req, res) => {
        try {
            const { id } = req.params; // sub_kegiatan_id or 'by-butir'
            const instansi_id = req.query.instansi_id ? parseInt(req.query.instansi_id) : null;
            const bidang_id = req.query.bidang_id ? parseInt(req.query.bidang_id) : null;
            const butir_skp = req.query.butir_skp ? req.query.butir_skp.trim() : null;
            const tahun = req.query.tahun ? parseInt(req.query.tahun) : 2026;

            let query = `
                SELECT id, sub_kegiatan_id, butir_skp, bidang_id, instansi_id, tahun, bulan, is_active, target_type, target_description
                FROM sub_kegiatan_skp_monthly_config
                WHERE tahun = ?
            `;
            const queryParams = [tahun];

            if (butir_skp) {
                query += ` AND LOWER(butir_skp) = LOWER(?)`;
                queryParams.push(butir_skp);
                if (bidang_id) {
                    query += ` AND (bidang_id = ? OR bidang_id IS NULL)`;
                    queryParams.push(bidang_id);
                }
            } else if (id && id !== 'by-butir') {
                query += ` AND sub_kegiatan_id = ?`;
                queryParams.push(parseInt(id));
                if (instansi_id) {
                    query += ` AND (instansi_id = ? OR instansi_id IS NULL)`;
                    queryParams.push(instansi_id);
                }
            }

            query += ` ORDER BY bulan ASC`;

            const [rows] = await pool.query(query, queryParams);

            const monthsMap = new Map();
            rows.forEach(r => {
                monthsMap.set(r.bulan, {
                    id: r.id,
                    bulan: r.bulan,
                    is_active: r.is_active === 1 || r.is_active === true,
                    target_type: r.target_type || 'output',
                    target_description: r.target_description || ''
                });
            });

            const monthNames = [
                'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
            ];

            const fullConfig = [];
            for (let b = 1; b <= 12; b++) {
                if (monthsMap.has(b)) {
                    fullConfig.push({
                        ...monthsMap.get(b),
                        nama_bulan: monthNames[b - 1]
                    });
                } else {
                    fullConfig.push({
                        id: null,
                        bulan: b,
                        nama_bulan: monthNames[b - 1],
                        is_active: true,
                        target_type: 'output',
                        target_description: ''
                    });
                }
            }

            let subKegiatanInfo = null;
            if (id && id !== 'by-butir') {
                const [subRows] = await pool.query(
                    `SELECT id, kode_sub_kegiatan, nama_sub_kegiatan FROM master_sub_kegiatan WHERE id = ?`,
                    [parseInt(id)]
                );
                subKegiatanInfo = subRows[0] || null;
            }

            res.json({
                success: true,
                data: {
                    sub_kegiatan: subKegiatanInfo,
                    butir_skp,
                    bidang_id,
                    instansi_id,
                    tahun,
                    months: fullConfig
                }
            });
        } catch (err) {
            console.error('Error fetching sub-kegiatan SKP config:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    saveConfig: async (req, res) => {
        try {
            const { id } = req.params;
            const { instansi_id, bidang_id, butir_skp, tahun = 2026, months } = req.body;

            if (!Array.isArray(months)) {
                return res.status(400).json({ success: false, message: 'Invalid payload' });
            }

            const subKegId = (id && id !== 'by-butir') ? parseInt(id) : null;
            const instId = instansi_id ? parseInt(instansi_id) : null;
            const bidangId = bidang_id ? parseInt(bidang_id) : null;
            const butirStr = butir_skp ? butir_skp.trim() : null;
            const yearVal = parseInt(tahun) || 2026;

            for (const item of months) {
                const bulanVal = parseInt(item.bulan);
                const isActiveVal = item.is_active ? 1 : 0;
                const targetTypeVal = item.target_type === 'progress' ? 'progress' : 'output';
                const targetDescVal = item.target_description ? item.target_description.trim() : null;

                // Check existing record
                let existingId = null;
                if (butirStr) {
                    const [ex] = await pool.query(
                        `SELECT id FROM sub_kegiatan_skp_monthly_config WHERE LOWER(butir_skp) = LOWER(?) AND (bidang_id = ? OR bidang_id IS NULL) AND tahun = ? AND bulan = ?`,
                        [butirStr, bidangId, yearVal, bulanVal]
                    );
                    if (ex.length > 0) existingId = ex[0].id;
                } else if (subKegId) {
                    const [ex] = await pool.query(
                        `SELECT id FROM sub_kegiatan_skp_monthly_config WHERE sub_kegiatan_id = ? AND (instansi_id = ? OR instansi_id IS NULL) AND tahun = ? AND bulan = ?`,
                        [subKegId, instId, yearVal, bulanVal]
                    );
                    if (ex.length > 0) existingId = ex[0].id;
                }

                if (existingId) {
                    await pool.query(`
                        UPDATE sub_kegiatan_skp_monthly_config
                        SET is_active = ?, target_type = ?, target_description = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `, [isActiveVal, targetTypeVal, targetDescVal, existingId]);
                } else {
                    await pool.query(`
                        INSERT INTO sub_kegiatan_skp_monthly_config 
                        (sub_kegiatan_id, butir_skp, bidang_id, instansi_id, tahun, bulan, is_active, target_type, target_description)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [subKegId, butirStr, bidangId, instId, yearVal, bulanVal, isActiveVal, targetTypeVal, targetDescVal]);
                }
            }

            res.json({ success: true, message: 'Konfigurasi bulan SKP berhasil disimpan' });
        } catch (err) {
            console.error('Error saving sub-kegiatan SKP config:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    getBidangConfigs: async (req, res) => {
        try {
            const bidang_id = req.query.bidang_id ? parseInt(req.query.bidang_id) : null;
            const instansi_id = req.query.instansi_id ? parseInt(req.query.instansi_id) : null;
            const tahun = req.query.tahun ? parseInt(req.query.tahun) : 2026;

            let query = `
                SELECT id, sub_kegiatan_id, butir_skp, bidang_id, instansi_id, tahun, bulan, is_active, target_type, target_description
                FROM sub_kegiatan_skp_monthly_config
                WHERE tahun = ?
            `;
            const params = [tahun];

            if (bidang_id || instansi_id) {
                query += ` AND (`;
                const conditions = [];
                if (bidang_id) {
                    conditions.push(`bidang_id = ? OR bidang_id IS NULL`);
                    params.push(bidang_id);
                }
                if (instansi_id) {
                    conditions.push(`instansi_id = ? OR instansi_id IS NULL`);
                    params.push(instansi_id);
                }
                query += conditions.join(' OR ') + `)`;
            }

            query += ` ORDER BY bulan ASC`;

            const [rows] = await pool.query(query, params);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error('Error fetching bidang monthly configs:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    }
};

module.exports = subKegiatanSkpConfigController;
