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
    },

    // Get activity permission scopes for all roles
    getKegiatanScopes: async (req, res) => {
        try {
            const query = `
                SELECT 
                    r.id as role_id, 
                    r.tipe_user as role_name,
                    COALESCE(s.scope, 0) as scope
                FROM master_tipe_user r
                LEFT JOIN role_kegiatan_scope s ON r.id = s.role_id
                ORDER BY r.id ASC
            `;
            const [rows] = await pool.query(query);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching kegiatan scopes:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch kegiatan scopes' });
        }
    },

    // Update activity permission scope for a specific role
    updateKegiatanScope: async (req, res) => {
        try {
            const { roleId } = req.params;
            const { scope } = req.body; // 0, 1, 2, 3, or 4

            if (scope === undefined || scope < 0 || scope > 4) {
                return res.status(400).json({ success: false, message: 'Invalid scope value (must be 0-4)' });
            }

            await pool.query(
                'INSERT INTO role_kegiatan_scope (role_id, scope) VALUES (?, ?) ON DUPLICATE KEY UPDATE scope = VALUES(scope)',
                [roleId, scope]
            );

            res.json({ success: true, message: 'Kegiatan access scope updated' });
        } catch (error) {
            console.error('Error updating kegiatan scope:', error);
            res.status(500).json({ success: false, message: 'Failed to update kegiatan scope' });
        }
    }
};


module.exports = rbacController;
