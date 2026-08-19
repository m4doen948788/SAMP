const pool = require('../../../config/db');

const notificationService = {
    /**
     * Send a notification to a specific user
     * @param {number} user_id - Recipient user ID
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {string} type - Notification type (e.g., 'SURAT_REJECTED')
     * @param {string} link - Optional link for the notification
     */
    send: async (user_id, title, message, type = 'info', link = null) => {
        try {
            await pool.query(
                'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
                [user_id, title, message, type, link]
            );
            return { success: true };
        } catch (error) {
            console.error('Error sending notification:', error);
            return { success: false, error };
        }
    },

    /**
     * Get notifications for a user
     * @param {number} user_id 
     */
    getByUser: async (user_id, limit = 20) => {
        try {
            // 1. Fetch unread tagihan_dokumen notifications
            const [activeTagihan] = await pool.query(
                "SELECT id, link FROM notifications WHERE user_id = ? AND type = 'tagihan_dokumen' AND is_read = 0",
                [user_id]
            );

            // 2. Perform dynamic validation for each active tagihan
            for (const notif of activeTagihan) {
                if (notif.link && notif.link.startsWith('kegiatan:')) {
                    const parts = notif.link.split(':');
                    const kegiatanId = Number(parts[1]);
                    const docType = parts[2];
                    
                    if (!isNaN(kegiatanId) && docType) {
                        // Check if kegiatan exists and is not deleted
                        const [kRows] = await pool.query(
                            'SELECT bahan_desk, bahan_desk_id, paparan, paparan_id, surat_undangan_masuk, surat_undangan_masuk_id, surat_undangan_keluar, surat_undangan_keluar_id, exempted_docs FROM kegiatan_manajemen WHERE id = ? AND is_deleted = 0',
                            [kegiatanId]
                        );
                        
                        if (kRows.length === 0) {
                            // Kegiatan deleted, mark notification read
                            await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [notif.id]);
                            continue;
                        }
                        
                        const kegiatan = kRows[0];
                        let isUploaded = false;
                        
                        // Check upload based on type
                        if (docType === 'bahan_desk') {
                            isUploaded = !!(kegiatan.bahan_desk || kegiatan.bahan_desk_id);
                        } else if (docType === 'paparan') {
                            isUploaded = !!(kegiatan.paparan || kegiatan.paparan_id);
                        } else if (docType === 'surat_undangan_masuk') {
                            isUploaded = !!(kegiatan.surat_undangan_masuk || kegiatan.surat_undangan_masuk_id);
                        } else if (docType === 'surat_undangan_keluar') {
                            isUploaded = !!(kegiatan.surat_undangan_keluar || kegiatan.surat_undangan_keluar_id);
                        } else if (docType === 'notulensi') {
                            const [nRows] = await pool.query(
                                'SELECT id FROM kegiatan_manajemen_dokumen WHERE kegiatan_id = ? AND tipe_dokumen = ?',
                                [kegiatanId, 'notulensi']
                            );
                            isUploaded = nRows.length > 0;
                        }
                        
                        // Check if exempted
                        const exempted = kegiatan.exempted_docs ? kegiatan.exempted_docs.split(',') : [];
                        const isExempted = exempted.includes(docType);
                        
                        if (isUploaded || isExempted) {
                            // Mark as read in the database
                            await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [notif.id]);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[NotificationService] Error validating active tagihan:', err.message);
        }

        const [rows] = await pool.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
            [user_id, limit]
        );
        return rows;
    },

    /**
     * Mark notification as read
     */
    markAsRead: async (id, user_id) => {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [id, user_id]
        );
    },

    /**
     * Mark all as read
     */
    markAllAsRead: async (user_id) => {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
            [user_id]
        );
    }
};

module.exports = notificationService;
