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
