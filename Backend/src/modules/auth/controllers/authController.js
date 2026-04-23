const pool = require('../../../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const safeParseJSON = (str, fallback = null) => {
    if (!str) return fallback;
    try {
        return JSON.parse(str);
    } catch (e) {
        return fallback;
    }
};

const authController = {
    login: async (req, res) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ success: false, message: 'Please provide Username/Email and password' });
            }

            // Find user by Username or Email (email now in profil_pegawai)
            const query = `
                SELECT 
                    u.id, u.username, u.password, u.profil_pegawai_id,
                    pp.nama_lengkap, pp.email, pp.is_active,
                    pp.tipe_user_id, pp.instansi_id, pp.jabatan_id, pp.bidang_id, pp.sub_bidang_id,
                    pp.foto_profil, pp.tema, pp.tema_custom_colors,
                    t.tipe_user as tipe_user_nama,
                    i.instansi as instansi_nama,
                    i.singkatan as instansi_singkatan,
                    j.jabatan as jabatan_nama,
                    b.nama_bidang as bidang_nama,
                    b.singkatan as bidang_singkatan,
                    sb.nama_sub_bidang as sub_bidang_nama
                FROM users u
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                LEFT JOIN master_tipe_user t ON pp.tipe_user_id = t.id
                LEFT JOIN master_instansi_daerah i ON pp.instansi_id = i.id
                LEFT JOIN master_jabatan j ON pp.jabatan_id = j.id
                LEFT JOIN master_bidang_instansi b ON pp.bidang_id = b.id
                LEFT JOIN master_sub_bidang_instansi sb ON pp.sub_bidang_id = sb.id
                WHERE u.username = ? OR pp.email = ?
            `;

            const [rows] = await pool.query(query, [username, username]);

            if (rows.length === 0) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            const user = rows[0];

            if (user.is_active === 0) {
                return res.status(401).json({ success: false, message: 'Account is inactive' });
            }

            // Check password
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            // Create JWT Payload
            const payload = {
                id: user.id,
                username: user.username,
                profil_pegawai_id: user.profil_pegawai_id,
                nama_lengkap: user.nama_lengkap,
                tipe_user_id: user.tipe_user_id,
                tipe_user_nama: user.tipe_user_nama,
                instansi_id: user.instansi_id,
                instansi_nama: user.instansi_nama,
                instansi_singkatan: user.instansi_singkatan,
                jabatan_id: user.jabatan_id,
                jabatan_nama: user.jabatan_nama,
                bidang_id: user.bidang_id,
                bidang_nama: user.bidang_nama,
                bidang_singkatan: user.bidang_singkatan,
                sub_bidang_id: user.sub_bidang_id,
                sub_bidang_nama: user.sub_bidang_nama
            };

            // Sign Token
            const secret = process.env.JWT_SECRET || 'fallback_secret_key_123';
            const token = jwt.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });

            // Update last_login_at in profil_pegawai
            if (user.profil_pegawai_id) {
                await pool.query('UPDATE profil_pegawai SET last_login_at = NOW() WHERE id = ?', [user.profil_pegawai_id]);
            }

            // Fetch app settings
            const [settingsRows] = await pool.query('SELECT pengaturan_key, pengaturan_value FROM pengaturan_aplikasi WHERE pengaturan_key IN ("theme_mode", "admin_theme", "admin_custom_colors")');
            const appSettings = {};
            settingsRows.forEach(row => {
                appSettings[row.pengaturan_key] = row.pengaturan_value;
            });

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    token,
                    user: {
                        ...payload,
                        foto_profil: user.foto_profil,
                        tema: user.tema,
                        tema_custom_colors: safeParseJSON(user.tema_custom_colors),
                        appSettings: {
                            ...appSettings,
                            admin_custom_colors: safeParseJSON(appSettings.admin_custom_colors, { primary: '#0f172a', secondary: '#1e293b' })
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ success: false, message: 'Server error during login' });
        }
    },

    // Get current user endpoint
    me: async (req, res) => {
        try {
            const userId = req.user.id;

            const query = `
                SELECT 
                    u.id, u.username, u.profil_pegawai_id,
                    pp.nama_lengkap, pp.email, pp.no_hp,
                    pp.tipe_user_id, pp.instansi_id, pp.jabatan_id, pp.bidang_id, pp.sub_bidang_id,
                    pp.foto_profil, pp.tema, pp.tema_custom_colors, pp.is_active, pp.last_login_at,
                    t.tipe_user as tipe_user_nama, i.instansi as instansi_nama,
                    i.singkatan as instansi_singkatan,
                    j.jabatan as jabatan_nama,
                    b.nama_bidang as bidang_nama,
                    b.singkatan as bidang_singkatan,
                    sb.nama_sub_bidang as sub_bidang_nama
                FROM users u
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                LEFT JOIN master_tipe_user t ON pp.tipe_user_id = t.id
                LEFT JOIN master_instansi_daerah i ON pp.instansi_id = i.id
                LEFT JOIN master_jabatan j ON pp.jabatan_id = j.id
                LEFT JOIN master_bidang_instansi b ON pp.bidang_id = b.id
                LEFT JOIN master_sub_bidang_instansi sb ON pp.sub_bidang_id = sb.id
                WHERE u.id = ?
            `;

            const [rows] = await pool.query(query, [userId]);

            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Fetch app settings
            const [settingsRows] = await pool.query('SELECT pengaturan_key, pengaturan_value FROM pengaturan_aplikasi WHERE pengaturan_key IN ("theme_mode", "admin_theme", "admin_custom_colors")');
            const appSettings = {};
            settingsRows.forEach(row => {
                appSettings[row.pengaturan_key] = row.pengaturan_value;
            });

            const userData = rows[0];
            res.json({
                success: true,
                data: {
                    ...userData,
                    tema_custom_colors: safeParseJSON(userData.tema_custom_colors),
                    appSettings: {
                        ...appSettings,
                        admin_custom_colors: safeParseJSON(appSettings.admin_custom_colors, { primary: '#0f172a', secondary: '#1e293b' })
                    }
                }
            });
        } catch (error) {
            console.error('Get me error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch user data' });
        }
    },

    // Logout endpoint
    logout: async (req, res) => {
        try {
            // For JWT, server-side logout is often just a notification
            // but we can add logic here if we use a blacklist or session table
            res.json({ success: true, message: 'Logged out successfully' });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ success: false, message: 'Server error during logout' });
        }
    }
};

module.exports = authController;
