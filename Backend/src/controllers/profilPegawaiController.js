const pool = require('../config/db');

// Helper to parse full name into gelar_depan, nama, and gelar_belakang
function parseNameWithTitles(full) {
    if (!full) return { gelar_depan: null, nama: null, gelar_belakang: null };
    
    let gDepan = '';
    let nama = '';
    let gBelakang = '';

    const commonGelarDepan = ['Prof.', 'Dr.', 'Drs.', 'Dra.', 'Ir.', 'H.', 'Hj.', 'K.H.', 'Rd.', 'R.', 'K.'];

    // Split by comma for suffix titles
    const parts = full.split(',');
    nama = parts[0].trim();
    if (parts.length > 1) {
        gBelakang = parts.slice(1).join(',').trim();
    }

    // Split first part by space for prefix titles
    const nameParts = nama.split(' ');
    let nameStartIdx = 0;
    
    for (let i = 0; i < nameParts.length; i++) {
        const part = nameParts[i];
        const isDepan = commonGelarDepan.some(g => 
            part.toLowerCase() === g.toLowerCase() || 
            (part.includes('.') && commonGelarDepan.some(cg => part.toLowerCase().startsWith(cg.toLowerCase().split('.')[0])))
        );
        
        if (isDepan) {
            gDepan += (gDepan ? ' ' : '') + part;
            nameStartIdx = i + 1;
        } else {
            break;
        }
    }

    nama = nameParts.slice(nameStartIdx).join(' ').trim();

    return {
        gelar_depan: gDepan || null,
        nama: nama || null,
        gelar_belakang: gBelakang || null
    };
}
const bcrypt = require('bcryptjs');

const profilPegawaiController = {
    // Get all profiles (filtered by instansi if not super admin)
    getAll: async (req, res) => {
        try {
            const isSuperAdmin = req.user.tipe_user_id === 1;
            const userInstansiId = req.user.instansi_id;

            let query = `
                SELECT pp.*, 
                       CONCAT(
                           IF(pp.gelar_depan IS NOT NULL AND pp.gelar_depan != '', CONCAT(pp.gelar_depan, ' '), ''),
                           pp.nama,
                           IF(pp.gelar_belakang IS NOT NULL AND pp.gelar_belakang != '', CONCAT(', ', pp.gelar_belakang), '')
                       ) as nama_lengkap,
                       i.instansi as instansi_nama,
                       j.jabatan as jabatan_nama,
                       b.nama_bidang as bidang_nama,
                       (SELECT GROUP_CONCAT(sb2.nama_sub_bidang) 
                        FROM profil_pegawai_sub_bidang ppsb 
                        JOIN master_sub_bidang_instansi sb2 ON ppsb.sub_bidang_id = sb2.id 
                        WHERE ppsb.profil_pegawai_id = pp.id) as sub_bidang_nama,
                       pg.pangkat_golongan as pangkat_golongan_nama,
                       jp.nama as jenis_pegawai_nama,
                       u.id as user_id, u.username
                FROM profil_pegawai pp
                LEFT JOIN master_instansi_daerah i ON pp.instansi_id = i.id
                LEFT JOIN master_jabatan j ON pp.jabatan_id = j.id
                LEFT JOIN master_bidang b ON pp.bidang_id = b.id
                LEFT JOIN master_pangkat_golongan pg ON pp.pangkat_golongan_id = pg.id
                LEFT JOIN master_jenis_pegawai jp ON pp.jenis_pegawai_id = jp.id
                LEFT JOIN users u ON u.profil_pegawai_id = pp.id
                WHERE 1=1
            `;

            const params = [];
            // Hierarchical Access Control
            // 1. Superadmin (1): Full Access (no filters)

            // 2. Agency-level: Admin Instansi (2), Kepala Badan (5), Superadmin instansi (7), Admin Bapperida (8)
            const isAgencyLevel = [2, 5, 7, 8].includes(req.user.tipe_user_id);

            // 3. Division-level: User (3), Admin Bidang (4), Kepala Bidang (6)
            const isDivisionLevel = [3, 4, 6].includes(req.user.tipe_user_id);

            if (!isSuperAdmin) {
                query += ` AND pp.instansi_id = ? `;
                params.push(userInstansiId);

                if (isDivisionLevel && req.user.bidang_id) {
                    query += ` AND pp.bidang_id = ? `;
                    params.push(req.user.bidang_id);
                }
            }

            query += ` 
                ORDER BY 
                    CASE 
                        WHEN j.jabatan IN ('Bupati', 'Wakil Bupati', 'Sekretaris Daerah', 'Kepala', 'Direktur') OR j.jabatan LIKE 'Kepala Badan%' THEN 1
                        WHEN j.jabatan LIKE 'Sekretaris%' OR j.jabatan = 'Wakil Direktur' THEN 2
                        WHEN j.jabatan LIKE 'Kepala Bidang%' OR j.jabatan LIKE 'Kepala Bagian%' THEN 3
                        WHEN j.jabatan LIKE 'Kepala Sub Bagian%' OR j.jabatan LIKE 'Kepala Seksi%' OR j.jabatan LIKE 'Ketua Tim%' THEN 4
                        ELSE 5
                    END ASC,
                    pp.nama_lengkap ASC 
            `;
            const [rows] = await pool.query(query, params);
            const updatedRows = rows.map(async (row) => {
            const [teams] = await pool.query(
                'SELECT sub_bidang_id FROM profil_pegawai_sub_bidang WHERE profil_pegawai_id = ?',
                [row.id]
            );
            return {
                ...row,
                sub_bidang_ids: teams.map(t => t.sub_bidang_id)
            };
        });

        res.json({ success: true, data: await Promise.all(updatedRows) });
        } catch (error) {
            console.error('Error fetching all profiles:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch profiles' });
        }
    },

    // Get specific profile by ID
    getById: async (req, res) => {
        try {
            const { id } = req.params;
            const isSuperAdmin = req.user.tipe_user_id === 1;
            const userInstansiId = req.user.instansi_id;

            const [rows] = await pool.query(`
                SELECT pp.*, 
                       CONCAT(
                           IF(pp.gelar_depan IS NOT NULL AND pp.gelar_depan != '', CONCAT(pp.gelar_depan, ' '), ''),
                           pp.nama,
                           IF(pp.gelar_belakang IS NOT NULL AND pp.gelar_belakang != '', CONCAT(', ', pp.gelar_belakang), '')
                       ) as nama_lengkap,
                       jp.nama as jenis_pegawai_nama,
                       (SELECT GROUP_CONCAT(sb2.nama_sub_bidang) 
                        FROM profil_pegawai_sub_bidang ppsb 
                        JOIN master_sub_bidang_instansi sb2 ON ppsb.sub_bidang_id = sb2.id 
                        WHERE ppsb.profil_pegawai_id = pp.id) as sub_bidang_nama
                FROM profil_pegawai pp 
                LEFT JOIN master_jenis_pegawai jp ON pp.jenis_pegawai_id = jp.id
                WHERE pp.id = ?
            `, [id]);
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Profile not found' });
            }

            const profile = rows[0];

            // Fetch multiple team IDs
            const [teams] = await pool.query(
                'SELECT sub_bidang_id FROM profil_pegawai_sub_bidang WHERE profil_pegawai_id = ?',
                [id]
            );
            profile.sub_bidang_ids = teams.map(t => t.sub_bidang_id);
            const isAgencyLevel = [2, 5, 7, 8].includes(req.user.tipe_user_id);
            const isDivisionLevel = [3, 4, 6].includes(req.user.tipe_user_id);

            if (!isSuperAdmin) {
                // Agency check
                if (profile.instansi_id !== userInstansiId) {
                    return res.status(403).json({ success: false, message: 'Access denied: Profile belongs to another agency' });
                }
            }
            // Notes: Users can always view their own profile (handled by Number(id) !== Number(req.user.profil_pegawai_id) check)

            res.json({ success: true, data: profile });
        } catch (error) {
            console.error('Error fetching profile by id:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch profile' });
        }
    },

    // Create standalone profile
    create: async (req, res) => {
        try {
            const isSuperAdmin = req.user.tipe_user_id === 1;
            const userInstansiId = req.user.instansi_id;
            const data = req.body;

            // Auto-parse if split fields are missing
            if (!data.nama && data.nama_lengkap) {
                const parsed = parseNameWithTitles(data.nama_lengkap);
                data.gelar_depan = parsed.gelar_depan || data.gelar_depan;
                data.nama = parsed.nama || data.nama;
                data.gelar_belakang = parsed.gelar_belakang || data.gelar_belakang;
            }
            const isKepegawaianAdmin = req.user.jabatan_nama === 'Kepala Sub Bagian' && req.user.sub_bidang_nama === 'Umum dan Kepegawaian';

            if (!isSuperAdmin && !isKepegawaianAdmin) {
                return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to create employee data' });
            }

            // Enforce instansi_id
            const finalInstansiId = isSuperAdmin ? (data.instansi_id || null) : userInstansiId;

            const query = `
                INSERT INTO profil_pegawai (
                    gelar_depan, nama, gelar_belakang, nama_lengkap,
                    nip, jenis_pegawai_id, email, no_hp, 
                    tipe_user_id, instansi_id, jabatan_id, bidang_id, sub_bidang_id,
                    tempat_lahir, tanggal_lahir, jenis_kelamin, agama,
                    status_perkawinan, golongan_darah, alamat_lengkap,
                    provinsi_id, kota_kabupaten_id, kecamatan_id, kelurahan_id,
                    npwp, no_bpjs_kesehatan, no_bpjs_ketenagakerjaan, pangkat_golongan_id,
                    tmt_cpns, tmt_pns, masa_kerja_tahun, masa_kerja_bulan, pendidikan_terakhir
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const finalSub_bidang_id = data.sub_bidang_id || (Array.isArray(data.sub_bidang_ids) && data.sub_bidang_ids.length > 0 ? data.sub_bidang_ids[0] : null);

            const [result] = await pool.query(query, [
                data.gelar_depan || null,
                data.nama || null,
                data.gelar_belakang || null,
                data.nama_lengkap || null,
                data.nip || null,
                data.jenis_pegawai_id || null,
                data.email || null,
                data.no_hp || null,
                data.tipe_user_id || null,
                finalInstansiId,
                data.jabatan_id || null,
                data.bidang_id || null,
                finalSub_bidang_id,
                data.tempat_lahir || null,
                data.tanggal_lahir || null,
                data.jenis_kelamin || null,
                data.agama || null,
                data.status_perkawinan || null,
                data.golongan_darah || null,
                data.alamat_lengkap || null,
                data.provinsi_id || null,
                data.kota_kabupaten_id || null,
                data.kecamatan_id || null,
                data.kelurahan_id || null,
                data.npwp || null,
                data.no_bpjs_kesehatan || null,
                data.no_bpjs_ketenagakerjaan || null,
                data.pangkat_golongan_id || null,
                data.tmt_cpns || null,
                data.tmt_pns || null,
                data.masa_kerja_tahun || null,
                data.masa_kerja_bulan || null,
                data.pendidikan_terakhir || null
            ]);

            const profilId = result.insertId;

            // Handle multiple sub_bidang assignments
            const sub_bidang_ids = data.sub_bidang_ids;
            const finalSubBidangIds = Array.isArray(sub_bidang_ids) ? sub_bidang_ids : (data.sub_bidang_id ? [data.sub_bidang_id] : []);
            if (finalSubBidangIds.length > 0) {
                const teamValues = finalSubBidangIds.map(sid => [profilId, sid]);
                await pool.query(
                    'INSERT IGNORE INTO profil_pegawai_sub_bidang (profil_pegawai_id, sub_bidang_id) VALUES ?',
                    [teamValues]
                );
            }

            // Handle user account creation if username and password are provided
            if (data.username && data.username.trim() !== '') {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(data.password || '123456', salt);

                // Check if username already exists
                const [existingUser] = await pool.query('SELECT id FROM users WHERE username = ?', [data.username.trim()]);
                if (existingUser.length > 0) {
                    // Rollback profile creation if username exists? 
                    // For now, just return error but the profile is already created. 
                    // Better to check before INSERT profile or use a transaction.
                    // But for simplicity in this current structure:
                    return res.status(201).json({
                        success: true,
                        message: 'Profile created, but username already taken',
                        id: profilId,
                        userError: 'Username already exists'
                    });
                }

                await pool.query('INSERT INTO users (profil_pegawai_id, username, password) VALUES (?, ?, ?)', [
                    profilId, data.username.trim(), hashedPassword
                ]);
            }

            res.status(201).json({ success: true, message: 'Profile created', id: profilId });
        } catch (error) {
            console.error('Error creating profile:', error);
            res.status(500).json({ success: false, message: 'Failed to create profile' });
        }
    },

    // Update standalone profile
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const isSuperAdmin = req.user.tipe_user_id === 1;
            const userInstansiId = req.user.instansi_id;
            const data = req.body;

            // Auto-parse if split fields are missing
            if (!data.nama && data.nama_lengkap) {
                const parsed = parseNameWithTitles(data.nama_lengkap);
                data.gelar_depan = parsed.gelar_depan || data.gelar_depan;
                data.nama = parsed.nama || data.nama;
                data.gelar_belakang = parsed.gelar_belakang || data.gelar_belakang;
            }
            const isKepegawaianAdmin = req.user.jabatan_nama === 'Kepala Sub Bagian' && req.user.sub_bidang_nama === 'Umum dan Kepegawaian';

            if (!isSuperAdmin && !isKepegawaianAdmin) {
                return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to update employee data' });
            }

            // Check existence and permission
            const [existing] = await pool.query('SELECT instansi_id FROM profil_pegawai WHERE id = ?', [id]);
            if (existing.length === 0) {
                return res.status(404).json({ success: false, message: 'Profile not found' });
            }

            if (!isSuperAdmin && existing[0].instansi_id !== userInstansiId) {
                return res.status(403).json({ success: false, message: 'Access denied: Cannot update profile from another agency' });
            }

            const finalInstansiId = isSuperAdmin ? (data.instansi_id || existing[0].instansi_id) : userInstansiId;

            const query = `
                UPDATE profil_pegawai SET 
                    gelar_depan = ?, nama = ?, gelar_belakang = ?, nama_lengkap = ?,
                    nip = ?, jenis_pegawai_id = ?, email = ?, no_hp = ?, 
                    tipe_user_id = ?, instansi_id = ?, jabatan_id = ?, bidang_id = ?, sub_bidang_id = ?,
                    tempat_lahir = ?, tanggal_lahir = ?, jenis_kelamin = ?, agama = ?,
                    status_perkawinan = ?, golongan_darah = ?, alamat_lengkap = ?,
                    provinsi_id = ?, kota_kabupaten_id = ?, kecamatan_id = ?, kelurahan_id = ?,
                    npwp = ?, no_bpjs_kesehatan = ?, no_bpjs_ketenagakerjaan = ?, pangkat_golongan_id = ?,
                    tmt_cpns = ?, tmt_pns = ?, masa_kerja_tahun = ?, masa_kerja_bulan = ?, pendidikan_terakhir = ?
                WHERE id = ?
            `;

            const finalSub_bidang_id = data.sub_bidang_id || (Array.isArray(data.sub_bidang_ids) && data.sub_bidang_ids.length > 0 ? data.sub_bidang_ids[0] : null);

            await pool.query(query, [
                data.gelar_depan || null,
                data.nama || null,
                data.gelar_belakang || null,
                data.nama_lengkap || null,
                data.nip || null,
                data.jenis_pegawai_id || null,
                data.email || null,
                data.no_hp || null,
                data.tipe_user_id || null,
                finalInstansiId,
                data.jabatan_id || null,
                data.bidang_id || null,
                finalSub_bidang_id,
                data.tempat_lahir || null,
                data.tanggal_lahir || null,
                data.jenis_kelamin || null,
                data.agama || null,
                data.status_perkawinan || null,
                data.golongan_darah || null,
                data.alamat_lengkap || null,
                data.provinsi_id || null,
                data.kota_kabupaten_id || null,
                data.kecamatan_id || null,
                data.kelurahan_id || null,
                data.npwp || null,
                data.no_bpjs_kesehatan || null,
                data.no_bpjs_ketenagakerjaan || null,
                data.pangkat_golongan_id || null,
                data.tmt_cpns || null,
                data.tmt_pns || null,
                data.masa_kerja_tahun || null,
                data.masa_kerja_bulan || null,
                data.pendidikan_terakhir || null,
                id
            ]);

            // Handle multiple sub_bidang assignments
            const sub_bidang_ids = data.sub_bidang_ids;
            if (sub_bidang_ids !== undefined || data.sub_bidang_id !== undefined) {
                const finalSubBidangIds = Array.isArray(sub_bidang_ids) ? sub_bidang_ids : (data.sub_bidang_id ? [data.sub_bidang_id] : []);
                
                // Clear existing and re-insert
                await pool.query('DELETE FROM profil_pegawai_sub_bidang WHERE profil_pegawai_id = ?', [id]);
                
                if (finalSubBidangIds.length > 0) {
                    const teamValues = finalSubBidangIds.map(sid => [id, sid]);
                    await pool.query(
                        'INSERT IGNORE INTO profil_pegawai_sub_bidang (profil_pegawai_id, sub_bidang_id) VALUES ?',
                        [teamValues]
                    );
                }
            }

            // Handle user account update or creation
            if (data.username && data.username.trim() !== '') {
                const [existingUser] = await pool.query('SELECT id FROM users WHERE profil_pegawai_id = ?', [id]);

                if (existingUser.length > 0) {
                    // Update existing user
                    let updateUQuery = 'UPDATE users SET username = ?';
                    let uParams = [data.username.trim()];

                    if (data.password && data.password.trim() !== '') {
                        const salt = await bcrypt.genSalt(10);
                        const hashedPassword = await bcrypt.hash(data.password, salt);
                        updateUQuery += ', password = ?';
                        uParams.push(hashedPassword);
                    }

                    updateUQuery += ' WHERE id = ?';
                    uParams.push(existingUser[0].id);
                    await pool.query(updateUQuery, uParams);
                } else {
                    // Create new user for existing profile
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(data.password || '123456', salt);
                    await pool.query('INSERT INTO users (profil_pegawai_id, username, password) VALUES (?, ?, ?)', [
                        id, data.username.trim(), hashedPassword
                    ]);
                }
            }

            res.json({ success: true, message: 'Profile updated' });
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ success: false, message: 'Failed to update profile' });
        }
    },

    // Delete standalone profile
    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const isSuperAdmin = req.user.tipe_user_id === 1;
            const userInstansiId = req.user.instansi_id;
            const isKepegawaianAdmin = req.user.jabatan_nama === 'Kepala Sub Bagian' && req.user.sub_bidang_nama === 'Umum dan Kepegawaian';

            if (!isSuperAdmin && !isKepegawaianAdmin) {
                return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to delete employee data' });
            }

            // Check existence and permission
            const [existing] = await pool.query('SELECT instansi_id FROM profil_pegawai WHERE id = ?', [id]);
            if (existing.length === 0) {
                return res.status(404).json({ success: false, message: 'Profile not found' });
            }

            if (!isSuperAdmin && existing[0].instansi_id !== userInstansiId) {
                return res.status(403).json({ success: false, message: 'Access denied: Cannot delete profile from another agency' });
            }

            // Check if linked to user
            const [linked] = await pool.query('SELECT id FROM users WHERE profil_pegawai_id = ?', [id]);
            if (linked.length > 0) {
                return res.status(400).json({ success: false, message: 'Gagal! Pegawai ini masih terhubung dengan akun user. Hapus user terlebih dahulu.' });
            }

            await pool.query('DELETE FROM profil_pegawai WHERE id = ?', [id]);
            res.json({ success: true, message: 'Profile deleted' });
        } catch (error) {
            console.error('Error deleting profile:', error);
            res.status(500).json({ success: false, message: 'Failed to delete profile' });
        }
    },
    // Get profile by User ID
    getByUserId: async (req, res) => {
        try {
            const { userId } = req.params;
            const isSuperAdmin = req.user.tipe_user_id === 1;
            const userInstansiId = req.user.instansi_id;

            const query = `
                SELECT pp.* FROM profil_pegawai pp
                INNER JOIN users u ON u.profil_pegawai_id = pp.id
                WHERE u.id = ?
            `;
            const [rows] = await pool.query(query, [userId]);

            if (rows.length === 0) {
                return res.json({ success: true, data: null });
            }

            const profileData = rows[0];
            // Permission check: if not super admin, must be same instansi
            if (!isSuperAdmin && profileData.instansi_id !== userInstansiId) {
                return res.status(403).json({ success: false, message: 'Access denied: Profile belongs to another agency' });
            }

            res.json({ success: true, data: profileData });
        } catch (error) {
            console.error('Error fetching profile:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch profile' });
        }
    },

    // Get full profile (users + profil_pegawai combined)
    getFullProfile: async (req, res) => {
        try {
            const { userId } = req.params;
            const isSuperAdmin = req.user.tipe_user_id === 1;
            const userInstansiId = req.user.instansi_id;

            const userQuery = `
                SELECT u.id, u.username, u.profil_pegawai_id,
                       pp.gelar_depan, pp.nama, pp.gelar_belakang,
                       pp.nama_lengkap, pp.email, pp.no_hp,
                       pp.tipe_user_id, pp.instansi_id, pp.jabatan_id, pp.bidang_id, pp.sub_bidang_id, pp.jenis_pegawai_id,
                       pp.foto_profil,
                       t.tipe_user as tipe_user_nama,
                       i.instansi as instansi_nama,
                       j.jabatan as jabatan_nama,
                       b.nama_bidang as bidang_nama,
                       (SELECT GROUP_CONCAT(sb2.nama_sub_bidang) 
                        FROM profil_pegawai_sub_bidang ppsb 
                        JOIN master_sub_bidang_instansi sb2 ON ppsb.sub_bidang_id = sb2.id 
                        WHERE ppsb.profil_pegawai_id = pp.id) as sub_bidang_nama,
                       jp.nama as jenis_pegawai_nama
                FROM users u
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                LEFT JOIN master_tipe_user t ON pp.tipe_user_id = t.id
                LEFT JOIN master_instansi_daerah i ON pp.instansi_id = i.id
                LEFT JOIN master_jabatan j ON pp.jabatan_id = j.id
                LEFT JOIN master_bidang_instansi b ON pp.bidang_id = b.id
                LEFT JOIN master_jenis_pegawai jp ON pp.jenis_pegawai_id = jp.id
                WHERE u.id = ?
            `;
            const [userRows] = await pool.query(userQuery, [userId]);
            if (userRows.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            const userData = userRows[0];
            const isDivisionLevel = [3, 4, 6].includes(req.user.tipe_user_id);

            // Permission check: if not super admin, must be same instansi
            if (!isSuperAdmin && userData.instansi_id !== userInstansiId) {
                // Special case: users can ALWAYS view their own profile
                if (Number(userId) !== Number(req.user.id)) {
                    return res.status(403).json({ success: false, message: 'Access denied: User belongs to another agency' });
                }
            }

            // Division-level check
            if (!isSuperAdmin && isDivisionLevel && userData.bidang_id !== req.user.bidang_id) {
                if (Number(userId) !== Number(req.user.id)) {
                    return res.status(403).json({ success: false, message: 'Access denied: User belongs to another division' });
                }
            }

            // Get full profil_pegawai data
            const profilId = userData.profil_pegawai_id;
            let profilData = null;
            if (profilId) {
                const [profilRows] = await pool.query('SELECT * FROM profil_pegawai WHERE id = ?', [profilId]);
                profilData = profilRows.length > 0 ? profilRows[0] : null;

                if (profilData) {
                    // Fetch multiple team IDs
                    const [teams] = await pool.query(
                        'SELECT sub_bidang_id FROM profil_pegawai_sub_bidang WHERE profil_pegawai_id = ?',
                        [profilId]
                    );
                    profilData.sub_bidang_ids = teams.map(t => t.sub_bidang_id);
                }
            }

            res.json({
                success: true,
                data: {
                    user: userData,
                    profil: profilData
                }
            });
        } catch (error) {
            console.error('Error fetching full profile:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch full profile' });
        }
    },

    // Update account info (username, no_hp, nama_lengkap, email, instansi_id)
    updateAccount: async (req, res) => {
        try {
            const { userId } = req.params;
            const isSuperAdmin = req.user.tipe_user_id === 1;
            const userInstansiId = req.user.instansi_id;
            const { username, no_hp, nama_lengkap, email, instansi_id, nip, jenis_pegawai_id } = req.body;

            if (!username || !username.trim()) {
                return res.status(400).json({ success: false, message: 'Username wajib diisi' });
            }

            // Get current user data to check instansi
            const [currentUser] = await pool.query(`
                SELECT u.id, pp.instansi_id 
                FROM users u 
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id 
                WHERE u.id = ?
            `, [userId]);

            if (currentUser.length === 0) {
                return res.status(404).json({ success: false, message: 'User data not found' });
            }

            // Permission check: if not super admin, must be same instansi or self
            if (!isSuperAdmin && currentUser[0].instansi_id !== userInstansiId) {
                if (Number(userId) !== Number(req.user.id)) {
                    return res.status(403).json({ success: false, message: 'Access denied: Cannot update user from another agency' });
                }
            }

            // Check for duplicate username (exclude current user)
            const [dupes] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
            if (dupes.length > 0) {
                return res.status(400).json({ success: false, message: 'Username sudah digunakan oleh user lain' });
            }

            // Check for duplicate email (exclude current user's profil)
            if (email && email.trim()) {
                const [emailDupes] = await pool.query(`
                    SELECT pp.id FROM profil_pegawai pp
                    INNER JOIN users u ON u.profil_pegawai_id = pp.id
                    WHERE pp.email = ? AND u.id != ?
                `, [email.trim(), userId]);
                if (emailDupes.length > 0) {
                    return res.status(400).json({ success: false, message: 'Email sudah digunakan oleh user lain' });
                }
            }

            // Update username in users table
            await pool.query('UPDATE users SET username = ? WHERE id = ?', [username.trim(), userId]);

            // Get profil_pegawai_id
            const [userRow] = await pool.query('SELECT profil_pegawai_id FROM users WHERE id = ?', [userId]);
            if (userRow.length > 0 && userRow[0].profil_pegawai_id) {
                // Build update query for profil_pegawai
                const { gelar_depan, nama, gelar_belakang, nama_lengkap } = req.body;
                let updateFields = 'no_hp = ?, nama_lengkap = ?, email = ?';
                let params = [no_hp || null, nama_lengkap || null, email || null];

                if (gelar_depan !== undefined) {
                    updateFields += ', gelar_depan = ?';
                    params.push(gelar_depan || null);
                }
                if (nama !== undefined) {
                    updateFields += ', nama = ?';
                    params.push(nama || null);
                }
                if (gelar_belakang !== undefined) {
                    updateFields += ', gelar_belakang = ?';
                    params.push(gelar_belakang || null);
                }

                if (instansi_id !== undefined) {
                    updateFields += ', instansi_id = ?';
                    params.push(instansi_id || null);
                }

                if (nip !== undefined) {
                    updateFields += ', nip = ?';
                    params.push(nip || null);
                }

                if (jenis_pegawai_id !== undefined) {
                    updateFields += ', jenis_pegawai_id = ?';
                    params.push(jenis_pegawai_id || null);
                }

                params.push(userRow[0].profil_pegawai_id);
                await pool.query(`UPDATE profil_pegawai SET ${updateFields} WHERE id = ?`, params);
            }

            res.json({ success: true, message: 'Akun berhasil diperbarui' });
        } catch (error) {
            console.error('Error updating account:', error);
            res.status(500).json({ success: false, message: 'Failed to update account' });
        }
    },

    // Change password (direct, no old password validation)
    changePassword: async (req, res) => {
        try {
            const { userId } = req.params;
            const isSuperAdmin = req.user.tipe_user_id === 1;
            const userInstansiId = req.user.instansi_id;
            const { password } = req.body;

            if (!password || password.trim().length < 4) {
                return res.status(400).json({ success: false, message: 'Password minimal 4 karakter' });
            }

            // Permission check: if not super admin, must be same instansi or self
            const [targetUser] = await pool.query(`
                SELECT pp.instansi_id FROM users u
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id
                WHERE u.id = ?
            `, [userId]);

            if (targetUser.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            if (!isSuperAdmin && targetUser[0].instansi_id !== userInstansiId) {
                if (Number(userId) !== Number(req.user.id)) {
                    return res.status(403).json({ success: false, message: 'Access denied: Cannot change password for user in another agency' });
                }
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

            res.json({ success: true, message: 'Password berhasil diubah' });
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({ success: false, message: 'Failed to change password' });
        }
    },

    // Upsert (Create or Update) profile data (personal details)
    upsertProfile: async (req, res) => {
        try {
            const { userId } = req.params;
            const isSuperAdmin = req.user.tipe_user_id === 1;
            const userInstansiId = req.user.instansi_id;
            const payload = req.body;

            // Get profil_pegawai_id and its instansi from users/profil
            const [userRow] = await pool.query(`
                SELECT u.profil_pegawai_id, pp.instansi_id 
                FROM users u 
                LEFT JOIN profil_pegawai pp ON u.profil_pegawai_id = pp.id 
                WHERE u.id = ?
            `, [userId]);

            if (userRow.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Permission check: if not super admin, must be same instansi or self
            if (!isSuperAdmin && userRow[0].instansi_id !== userInstansiId) {
                if (Number(userId) !== Number(req.user.id)) {
                    return res.status(403).json({ success: false, message: 'Access denied: Cannot update profile for user in another agency' });
                }
            }

            const profilId = userRow[0].profil_pegawai_id;

            if (profilId) {
                // Update existing profil_pegawai
                const updateQuery = `
                    UPDATE profil_pegawai SET 
                    tempat_lahir = ?, tanggal_lahir = ?, jenis_kelamin = ?, agama = ?,
                    status_perkawinan = ?, golongan_darah = ?, alamat_lengkap = ?,
                    provinsi_id = ?, kota_kabupaten_id = ?, kecamatan_id = ?, kelurahan_id = ?,
                    npwp = ?, no_bpjs_kesehatan = ?, no_bpjs_ketenagakerjaan = ?,
                    pangkat_golongan_id = ?, tmt_cpns = ?, tmt_pns = ?,
                    masa_kerja_tahun = ?, masa_kerja_bulan = ?, pendidikan_terakhir = ?,
                    nip = ?, jenis_pegawai_id = ?
                    WHERE id = ?
                `;
                await pool.query(updateQuery, [
                    payload.tempat_lahir || null,
                    payload.tanggal_lahir || null,
                    payload.jenis_kelamin || null,
                    payload.agama || null,
                    payload.status_perkawinan || null,
                    payload.golongan_darah || null,
                    payload.alamat_lengkap || null,
                    payload.provinsi_id || null,
                    payload.kota_kabupaten_id || null,
                    payload.kecamatan_id || null,
                    payload.kelurahan_id || null,
                    payload.npwp || null,
                    payload.no_bpjs_kesehatan || null,
                    payload.no_bpjs_ketenagakerjaan || null,
                    payload.pangkat_golongan_id || null,
                    payload.tmt_cpns || null,
                    payload.tmt_pns || null,
                    payload.masa_kerja_tahun || null,
                    payload.masa_kerja_bulan || null,
                    payload.pendidikan_terakhir || null,
                    payload.nip || null,
                    payload.jenis_pegawai_id || null,
                    profilId
                ]);

                // Update teams
                const sub_bidang_ids = payload.sub_bidang_ids;
                const sub_bidang_id = payload.sub_bidang_id;
                if (sub_bidang_ids !== undefined || sub_bidang_id !== undefined) {
                    const finalSubBidangIds = Array.isArray(sub_bidang_ids) ? sub_bidang_ids : (sub_bidang_id ? [sub_bidang_id] : []);
                    await pool.query('DELETE FROM profil_pegawai_sub_bidang WHERE profil_pegawai_id = ?', [profilId]);
                    if (finalSubBidangIds.length > 0) {
                        const teamValues = finalSubBidangIds.map(sid => [profilId, sid]);
                        await pool.query('INSERT IGNORE INTO profil_pegawai_sub_bidang (profil_pegawai_id, sub_bidang_id) VALUES ?', [teamValues]);
                    }
                }
                res.json({ success: true, message: 'Profile updated successfully' });
            } else {
                // Create new profil_pegawai and link to user
                const insertQuery = `
                    INSERT INTO profil_pegawai (
                    tempat_lahir, tanggal_lahir, jenis_kelamin, agama,
                    status_perkawinan, golongan_darah, alamat_lengkap,
                    provinsi_id, kota_kabupaten_id, kecamatan_id, kelurahan_id,
                    npwp, no_bpjs_kesehatan, no_bpjs_ketenagakerjaan, pangkat_golongan_id,
                    tmt_cpns, tmt_pns, masa_kerja_tahun, masa_kerja_bulan, pendidikan_terakhir,
                    nip, jenis_pegawai_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                const [result] = await pool.query(insertQuery, [
                    payload.tempat_lahir || null,
                    payload.tanggal_lahir || null,
                    payload.jenis_kelamin || null,
                    payload.agama || null,
                    payload.status_perkawinan || null,
                    payload.golongan_darah || null,
                    payload.alamat_lengkap || null,
                    payload.provinsi_id || null,
                    payload.kota_kabupaten_id || null,
                    payload.kecamatan_id || null,
                    payload.kelurahan_id || null,
                    payload.npwp || null,
                    payload.no_bpjs_kesehatan || null,
                    payload.no_bpjs_ketenagakerjaan || null,
                    payload.pangkat_golongan_id || null,
                    payload.tmt_cpns || null,
                    payload.tmt_pns || null,
                    payload.masa_kerja_tahun || null,
                    payload.masa_kerja_bulan || null,
                    payload.pendidikan_terakhir || null,
                    payload.nip || null,
                    payload.jenis_pegawai_id || null
                ]);
                // Link to user
                await pool.query('UPDATE users SET profil_pegawai_id = ? WHERE id = ?', [result.insertId, userId]);
                res.status(201).json({ success: true, message: 'Profile created successfully' });
            }
        } catch (error) {
            console.error('Error upserting profile:', error);
            res.status(500).json({ success: false, message: 'Failed to save profile' });
        }
    },

    // Bulk create profiles (used for Excel import)
    bulkCreate: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const profiles = req.body; // Array of profile objects
            const isSuperAdmin = req.user.tipe_user_id === 1;
            const userInstansiId = req.user.instansi_id;
            const isKepegawaianAdmin = req.user.jabatan_nama === 'Kepala Sub Bagian' && req.user.sub_bidang_nama === 'Umum dan Kepegawaian';

            if (!isSuperAdmin && !isKepegawaianAdmin) {
                connection.release();
                return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to bulk create employee data' });
            }

            if (!Array.isArray(profiles)) {
                return res.status(400).json({ success: false, message: 'Data must be an array' });
            }

            const query = `
                INSERT INTO profil_pegawai (
                    gelar_depan, nama, gelar_belakang, nama_lengkap,
                    nip, jenis_pegawai_id, email, no_hp, 
                    tipe_user_id, instansi_id, jabatan_id, bidang_id, sub_bidang_id,
                    tempat_lahir, tanggal_lahir, jenis_kelamin, agama,
                    status_perkawinan, golongan_darah, alamat_lengkap,
                    provinsi_id, kota_kabupaten_id, kecamatan_id, kelurahan_id,
                    npwp, no_bpjs_kesehatan, no_bpjs_ketenagakerjaan, pangkat_golongan_id,
                    tmt_cpns, tmt_pns, masa_kerja_tahun, masa_kerja_bulan, pendidikan_terakhir
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            for (let data of profiles) {
                // Auto-parse if split fields are missing
                if (!data.nama && data.nama_lengkap) {
                    const parsed = parseNameWithTitles(data.nama_lengkap);
                    data.gelar_depan = parsed.gelar_depan;
                    data.nama = parsed.nama;
                    data.gelar_belakang = parsed.gelar_belakang;
                }

                const finalInstansiId = isSuperAdmin ? (data.instansi_id || null) : userInstansiId;
                await connection.query(query, [
                    data.gelar_depan || null,
                    data.nama || null,
                    data.gelar_belakang || null,
                    data.nama_lengkap || null,
                    data.nip || null,
                    data.jenis_pegawai_id || null,
                    data.email || null,
                    data.no_hp || null,
                    data.tipe_user_id || 2, // Default to Pegawai if null
                    finalInstansiId,
                    data.jabatan_id || null,
                    data.bidang_id || null,
                    data.sub_bidang_id || null,
                    data.tempat_lahir || null,
                    data.tanggal_lahir || null,
                    data.jenis_kelamin || null,
                    data.agama || null,
                    data.status_perkawinan || null,
                    data.golongan_darah || null,
                    data.alamat_lengkap || null,
                    data.provinsi_id || null,
                    data.kota_kabupaten_id || null,
                    data.kecamatan_id || null,
                    data.kelurahan_id || null,
                    data.npwp || null,
                    data.no_bpjs_kesehatan || null,
                    data.no_bpjs_ketenagakerjaan || null,
                    data.pangkat_golongan_id || null,
                    data.tmt_cpns || null,
                    data.tmt_pns || null,
                    data.masa_kerja_tahun || null,
                    data.masa_kerja_bulan || null,
                    data.pendidikan_terakhir || null
                ]);
            }

            await connection.commit();
            res.json({ success: true, message: `${profiles.length} profiles created successfully` });
        } catch (error) {
            await connection.rollback();
            console.error('Error in bulkCreate:', error);
            res.status(500).json({ success: false, message: 'Failed to bulk create profiles' });
        } finally {
            if (connection) connection.release();
        }
    },

    // Bulk create accounts for all employees who don't have one
    bulkCreateAccounts: async (req, res) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const isSuperAdmin = req.user.tipe_user_id === 1;
            const userInstansiId = req.user.instansi_id;

            // 1. Get all profiles without users
            let query = `
                SELECT pp.id, pp.nama_lengkap 
                FROM profil_pegawai pp
                LEFT JOIN users u ON pp.id = u.profil_pegawai_id
                WHERE u.id IS NULL
            `;
            const params = [];

            // If not superadmin, only for their instansi
            if (!isSuperAdmin) {
                query += ` AND pp.instansi_id = ? `;
                params.push(userInstansiId);
            }

            const [pegawaiWithoutAcc] = await connection.query(query, params);

            if (pegawaiWithoutAcc.length === 0) {
                await connection.rollback();
                return res.json({ success: true, message: 'Semua pegawai sudah memiliki akun', count: 0 });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedDefaultPassword = await bcrypt.hash('123456', salt);
            let createdCount = 0;

            for (const p of pegawaiWithoutAcc) {
                if (!p.nama_lengkap) continue;

                // Generate base username: first word, lowercase
                let baseUsername = p.nama_lengkap.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                if (!baseUsername) baseUsername = 'user';

                // Ensure uniqueness
                let finalUsername = baseUsername;
                let suffix = 1;
                let exists = true;

                while (exists) {
                    const [rows] = await connection.query('SELECT id FROM users WHERE username = ?', [finalUsername]);
                    if (rows.length === 0) {
                        exists = false;
                    } else {
                        finalUsername = baseUsername + suffix;
                        suffix++;
                    }
                }

                // Create user
                await connection.query('INSERT INTO users (profil_pegawai_id, username, password) VALUES (?, ?, ?)', [
                    p.id, finalUsername, hashedDefaultPassword
                ]);

                // Update profil_pegawai.tipe_user_id to 3 (User) if currently null or not set
                await connection.query('UPDATE profil_pegawai SET tipe_user_id = COALESCE(tipe_user_id, 3) WHERE id = ?', [p.id]);

                createdCount++;
            }

            await connection.commit();
            res.json({ success: true, message: `Berhasil membuat ${createdCount} akun baru`, count: createdCount });

        } catch (error) {
            await connection.rollback();
            console.error('Error in bulkCreateAccounts:', error);
            res.status(500).json({ success: false, message: 'Gagal membuat akun secara otomatis' });
        } finally {
            connection.release();
        }
    }
};

module.exports = profilPegawaiController;
