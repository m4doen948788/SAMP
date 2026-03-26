const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const userController = {
    // Get all users
    getAll: async (req, res) => {
        try {
            const isSuperAdmin = req.user.tipe_user_id === 1;
            const userInstansiId = req.user.instansi_id;

            let query = `
                SELECT 
                    u.id, u.username, u.profil_pegawai_id,
                    pp.nama_lengkap, pp.email, pp.no_hp,
                    pp.tipe_user_id, pp.instansi_id,
                    pp.foto_profil, pp.is_active, pp.last_login_at,
                    pp.created_at, pp.updated_at,
                    t.tipe_user as tipe_user_nama,
                    i.instansi as instansi_nama
                FROM users u
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                LEFT JOIN master_tipe_user t ON pp.tipe_user_id = t.id
                LEFT JOIN master_instansi_daerah i ON pp.instansi_id = i.id
            `;

            const params = [];
            if (!isSuperAdmin) {
                query += ` WHERE pp.instansi_id = ? `;
                params.push(userInstansiId);
            }

            query += ` ORDER BY u.id DESC `;
            const [rows] = await pool.query(query, params);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch users' });
        }
    },

    // Get simple list of users (for dropdowns/selection)
    getSimpleList: async (req, res) => {
        try {
            const isSuperAdmin = req.user.tipe_user_id === 1;
            const userInstansiId = req.user.instansi_id;

            let query = `
                SELECT 
                    u.id, u.username, pp.nama_lengkap
                FROM users u
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
            `;

            const params = [];
            if (!isSuperAdmin) {
                query += ` WHERE pp.instansi_id = ? `;
                params.push(userInstansiId);
            }

            query += ` ORDER BY pp.nama_lengkap ASC `;
            const [rows] = await pool.query(query, params);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching user simple list:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch user list' });
        }
    },


    // Get profiles that are not yet linked to any user
    getUnlinkedProfiles: async (req, res) => {
        try {
            const isSuperAdmin = req.user.tipe_user_id === 1;
            const userInstansiId = req.user.instansi_id;

            let query = `
                SELECT pp.id, pp.nama_lengkap, pp.email, i.instansi as instansi_nama
                FROM profil_pegawai pp
                LEFT JOIN users u ON u.profil_pegawai_id = pp.id
                LEFT JOIN master_instansi_daerah i ON pp.instansi_id = i.id
                WHERE u.id IS NULL
            `;

            const params = [];
            if (!isSuperAdmin) {
                query += ` AND pp.instansi_id = ? `;
                params.push(userInstansiId);
            }

            query += ` ORDER BY pp.nama_lengkap `;
            const [rows] = await pool.query(query, params);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching unlinked profiles:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch available profiles' });
        }
    },

    // Get single user
    getById: async (req, res) => {
        try {
            const { id } = req.params;
            const isSuperAdmin = req.user.tipe_user_id === 1;
            const userInstansiId = req.user.instansi_id;

            const query = `
                SELECT 
                    u.id, u.username, u.profil_pegawai_id,
                    pp.nama_lengkap, pp.email, pp.no_hp, 
                    pp.tipe_user_id, pp.instansi_id,
                    pp.foto_profil, pp.is_active, pp.last_login_at,
                    t.tipe_user as tipe_user_nama,
                    i.instansi as instansi_nama
                FROM users u
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                LEFT JOIN master_tipe_user t ON pp.tipe_user_id = t.id
                LEFT JOIN master_instansi_daerah i ON pp.instansi_id = i.id
                WHERE u.id = ?
            `;
            const [rows] = await pool.query(query, [id]);
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            const userData = rows[0];
            // Check permission: if not super admin, must be same instansi
            if (!isSuperAdmin && userData.instansi_id !== userInstansiId) {
                return res.status(403).json({ success: false, message: 'Access denied: User belongs to another agency' });
            }

            res.json({ success: true, data: userData });
        } catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch user' });
        }
    },

    // Create user
    create: async (req, res) => {
        try {
            const isSuperAdmin = req.user.tipe_user_id === 1;
            const creatorInstansiId = req.user.instansi_id;

            const {
                username, password, nama_lengkap, email, no_hp,
                tipe_user_id, instansi_id, is_active
            } = req.body;

            // If not super admin, enforce creator's instansi
            const finalInstansiId = isSuperAdmin ? instansi_id : creatorInstansiId;

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password || '123456', salt);

            // Always create a new profil_pegawai
            const [profilResult] = await pool.query(`
                INSERT INTO profil_pegawai 
                (nama_lengkap, email, no_hp, tipe_user_id, instansi_id, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                nama_lengkap, email || null, no_hp || null,
                tipe_user_id || null, finalInstansiId || null,
                is_active !== undefined ? is_active : 1
            ]);
            const profilId = profilResult.insertId;

            // Create users with FK to profil_pegawai
            const [userResult] = await pool.query(`
                INSERT INTO users 
                (profil_pegawai_id, username, password)
                VALUES (?, ?, ?)
            `, [profilId, username, hashedPassword]);

            res.status(201).json({ success: true, message: 'User created successfully', data: { id: userResult.insertId } });
        } catch (error) {
            console.error('Error creating user:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'Username or Email already exists' });
            }
            res.status(500).json({ success: false, message: 'Failed to create user' });
        }
    },

    // Update user
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const isSuperAdmin = req.user.tipe_user_id === 1;
            const userInstansiId = req.user.instansi_id;

            const {
                username, password, nama_lengkap, email, no_hp,
                tipe_user_id, instansi_id, is_active
            } = req.body;

            // Check if user exists and get their instansi
            const [existing] = await pool.query(`
                SELECT u.id, u.profil_pegawai_id, pp.instansi_id 
                FROM users u 
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id 
                WHERE u.id = ?
            `, [id]);

            if (existing.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Permission check
            if (!isSuperAdmin && existing[0].instansi_id !== userInstansiId) {
                return res.status(403).json({ success: false, message: 'Access denied: Cannot edit user from another agency' });
            }

            const profilId = existing[0].profil_pegawai_id;
            const finalInstansiId = isSuperAdmin ? instansi_id : userInstansiId;

            // 1. Update profil_pegawai
            if (profilId) {
                await pool.query(`
                    UPDATE profil_pegawai SET 
                    nama_lengkap = ?, email = ?, no_hp = ?, 
                    tipe_user_id = ?, instansi_id = ?, is_active = ?
                    WHERE id = ?
                `, [
                    nama_lengkap, email || null, no_hp || null,
                    tipe_user_id || null, finalInstansiId || null,
                    is_active !== undefined ? is_active : 1,
                    profilId
                ]);
            }

            // 2. Update users (username + optional password)
            let updateQuery = 'UPDATE users SET username = ?';
            let params = [username];

            if (password && password.trim() !== '') {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                updateQuery += ', password = ?';
                params.push(hashedPassword);
            }

            updateQuery += ' WHERE id = ?';
            params.push(id);

            await pool.query(updateQuery, params);

            res.json({ success: true, message: 'User updated successfully' });
        } catch (error) {
            console.error('Error updating user:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'Username or Email already exists' });
            }
            res.status(500).json({ success: false, message: 'Failed to update user' });
        }
    },

    // Delete user
    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const isSuperAdmin = req.user.tipe_user_id === 1;
            const userInstansiId = req.user.instansi_id;

            // Get user info and instansi_id before deleting
            const [existing] = await pool.query(`
                SELECT u.profil_pegawai_id, pp.instansi_id 
                FROM users u 
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id 
                WHERE u.id = ?
            `, [id]);

            if (existing.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Permission check
            if (!isSuperAdmin && existing[0].instansi_id !== userInstansiId) {
                return res.status(403).json({ success: false, message: 'Access denied: Cannot delete user from another agency' });
            }

            const profilId = existing[0].profil_pegawai_id;

            // Delete user first (FK constraint)
            await pool.query('DELETE FROM users WHERE id = ?', [id]);

            // Then delete profil_pegawai
            if (profilId) {
                await pool.query('DELETE FROM profil_pegawai WHERE id = ?', [profilId]);
            }

            res.json({ success: true, message: 'User deleted successfully' });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ success: false, message: 'Failed to delete user. They might be referenced in other tables.' });
        }
    }
};

module.exports = userController;
