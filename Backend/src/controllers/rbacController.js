const pool = require('../config/db');

const rbacController = {
    // Get all roles
    getRoles: async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT id, tipe_user as name FROM master_tipe_user ORDER BY id ASC');
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching roles:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch roles' });
        }
    },

    // Get menu access for a specific role
    getRoleAccess: async (req, res) => {
        try {
            const { roleId } = req.params;
            const [rows] = await pool.query('SELECT menu_id FROM role_menu_access WHERE role_id = ?', [roleId]);
            const menuIds = rows.map(r => r.menu_id);
            res.json({ success: true, data: menuIds });
        } catch (error) {
            console.error('Error fetching role access:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch role access' });
        }
    },

    // Update menu access for a specific role
    updateRoleAccess: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            const { roleId } = req.params;
            const { menuIds } = req.body; // Array of menu IDs [1, 5, 12, etc]

            if (!Array.isArray(menuIds)) {
                return res.status(400).json({ success: false, message: 'menuIds must be an array' });
            }

            await connection.beginTransaction();

            // 1. Delete all existing access for this role
            await connection.query('DELETE FROM role_menu_access WHERE role_id = ?', [roleId]);

            // 2. Insert new access rights
            if (menuIds.length > 0) {
                const values = menuIds.map(menuId => [roleId, menuId]);
                await connection.query('INSERT INTO role_menu_access (role_id, menu_id) VALUES ?', [values]);
            }

            await connection.commit();
            res.json({ success: true, message: 'Role access updated successfully' });

        } catch (error) {
            await connection.rollback();
            console.error('Error updating role access:', error);
            res.status(500).json({ success: false, message: 'Failed to update role access' });
        } finally {
            connection.release();
        }
    }
};

module.exports = rbacController;
