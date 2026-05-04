const notificationService = require('../services/notificationService');

const notificationController = {
    getAll: async (req, res) => {
        try {
            const user_id = req.user.id;
            const notifications = await notificationService.getByUser(user_id);
            res.json({ success: true, data: notifications });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    markRead: async (req, res) => {
        try {
            const { id } = req.params;
            const user_id = req.user.id;
            await notificationService.markAsRead(id, user_id);
            res.json({ success: true, message: 'Notifikasi ditandai telah dibaca' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    markAllRead: async (req, res) => {
        try {
            const user_id = req.user.id;
            await notificationService.markAllAsRead(user_id);
            res.json({ success: true, message: 'Semua notifikasi ditandai telah dibaca' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = notificationController;
