const pool = require('../../../config/db');

const formatDateString = (val) => {
  if (!val) return null;
  if (typeof val === 'string') {
    return val.split(' ')[0].split('T')[0];
  }
  if (val instanceof Date) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(val).split(' ')[0].split('T')[0];
};

// Helper to format rows with multi-select labels
const formatRows = async (rows) => {
  if (!rows || rows.length === 0) return [];

  const [[urusanRows], [tematikRows], [userRows]] = await Promise.all([
    pool.query('SELECT id, urusan FROM master_bidang_urusan'),
    pool.query('SELECT id, nama FROM master_tematik'),
    pool.query('SELECT u.id, u.username, p.nama_lengkap FROM users u LEFT JOIN profil_pegawai p ON u.profil_pegawai_id = p.id')
  ]);

  const urusanMap = new Map();
  urusanRows.forEach(u => {
    const cleanName = (u.urusan || '').replace(/\s+/g, ' ').trim();
    urusanMap.set(Number(u.id), cleanName);
  });

  const tematikMap = new Map();
  tematikRows.forEach(t => {
    tematikMap.set(Number(t.id), t.nama);
  });

  const userMap = new Map();
  userRows.forEach(usr => {
    const displayName = usr.nama_lengkap || usr.username || `User #${usr.id}`;
    userMap.set(Number(usr.id), displayName);
  });

  return rows.map(row => {
    // Parse urusan_ids
    let urusanIdArr = [];
    if (Array.isArray(row.urusan_ids)) {
      urusanIdArr = row.urusan_ids.map(Number);
    } else if (typeof row.urusan_ids === 'string' && row.urusan_ids.trim()) {
      try {
        const parsed = JSON.parse(row.urusan_ids);
        urusanIdArr = Array.isArray(parsed) ? parsed.map(Number) : [];
      } catch {
        urusanIdArr = row.urusan_ids.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      }
    } else if (row.urusan_id) {
      urusanIdArr = [Number(row.urusan_id)];
    }

    const namaUrusanList = urusanIdArr.map(id => urusanMap.get(id)).filter(Boolean);

    // Parse tematik_ids
    let tematikIdArr = [];
    if (Array.isArray(row.tematik_ids)) {
      tematikIdArr = row.tematik_ids.map(Number);
    } else if (typeof row.tematik_ids === 'string' && row.tematik_ids.trim()) {
      try {
        const parsed = JSON.parse(row.tematik_ids);
        tematikIdArr = Array.isArray(parsed) ? parsed.map(Number) : [];
      } catch {
        tematikIdArr = row.tematik_ids.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      }
    }

    const namaTematikList = tematikIdArr.map(id => tematikMap.get(id)).filter(Boolean);

    const formattedTanggalLink = formatDateString(row.tanggal_link) || formatDateString(row.created_at);

    const creatorName = row.created_by ? (userMap.get(Number(row.created_by)) || `User #${row.created_by}`) : 'Admin';
    const updaterName = row.updated_by ? (userMap.get(Number(row.updated_by)) || `User #${row.updated_by}`) : null;

    return {
      ...row,
      is_quick_access: Number(row.is_quick_access || 0),
      is_qa_all: Number(row.is_qa_all || 0),
      is_qa_bidang: Number(row.is_qa_bidang || 0),
      is_qa_personal: Number(row.user_is_qa_personal || 0),
      user_is_qa_personal: Number(row.user_is_qa_personal || 0),
      urusan_ids: urusanIdArr,
      nama_urusan_list: namaUrusanList,
      nama_urusan: namaUrusanList.join(', '),
      tematik_ids: tematikIdArr,
      nama_tematik_list: namaTematikList,
      tagging: namaTematikList.join(', '),
      tanggal_link: formattedTanggalLink,
      created_by_name: creatorName,
      updated_by_name: updaterName
    };
  });
};

// Get all aplikasi external
const getAll = async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.user?.userId || null;
    
    let query = `
      SELECT 
        a.*, 
        l.jenis_link AS nama_tipe_link,
        p.bidang_id AS creator_bidang_id,
        mbi.nama_bidang AS creator_nama_bidang,
        mbi.singkatan AS creator_singkatan_bidang
    `;

    if (currentUserId) {
      query += `, (CASE WHEN uqp.id IS NOT NULL THEN 1 ELSE 0 END) AS user_is_qa_personal `;
    } else {
      query += `, 0 AS user_is_qa_personal `;
    }

    query += `
      FROM master_aplikasi_external a 
      LEFT JOIN master_link l ON a.tipe_link_id = l.id AND l.deleted_at IS NULL 
      LEFT JOIN users u ON a.created_by = u.id 
      LEFT JOIN profil_pegawai p ON u.profil_pegawai_id = p.id 
      LEFT JOIN master_bidang_instansi mbi ON p.bidang_id = mbi.id 
    `;

    const params = [];
    if (currentUserId) {
      query += ` LEFT JOIN user_qa_personal uqp ON a.id = uqp.aplikasi_external_id AND uqp.user_id = ? `;
      params.push(currentUserId);
    }

    const userInstansiId = req.user?.instansi_id || req.user?.instansiId || null;
    const roleId = Number(req.user?.role_id || req.user?.roleId || req.user?.tipe_user_id || 0);
    const isSuperadmin = roleId === 1 || Boolean(req.user?.is_admin || req.user?.isAdmin);

    query += `
      WHERE a.deleted_at IS NULL 
    `;

    if (!isSuperadmin && userInstansiId) {
      query += ` AND (a.instansi_id IS NULL OR a.instansi_id = ?) `;
      params.push(userInstansiId);
    }

    query += ` ORDER BY a.urutan ASC, a.id DESC `;

    const [rows] = await pool.query(query, params);

    const formatted = await formatRows(rows);
    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get by ID
const getById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, l.jenis_link AS nama_tipe_link 
      FROM master_aplikasi_external a 
      LEFT JOIN master_link l ON a.tipe_link_id = l.id AND l.deleted_at IS NULL 
      WHERE a.id = ? AND a.deleted_at IS NULL
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }

    const formatted = await formatRows(rows);
    res.json({ success: true, data: formatted[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create
const create = async (req, res) => {
  try {
    const { nama_aplikasi, url, pembuat, sumber, asal_instansi, tipe_link_id, urusan_id, urusan_ids, tematik_ids, tagging, keterangan, tanggal_link, is_quick_access, is_qa_all, is_qa_bidang, is_qa_personal } = req.body;
    const finalSumber = sumber !== undefined ? sumber : (asal_instansi || '');
    const finalTanggal = tanggal_link || new Date().toISOString().split('T')[0];
    
    const qaAllVal = is_qa_all ? 1 : 0;
    const qaBidangVal = is_qa_bidang ? 1 : 0;
    const qaPersonalVal = is_qa_personal ? 1 : 0;
    const quickAccessVal = (qaAllVal || qaBidangVal || qaPersonalVal || is_quick_access) ? 1 : 0;

    if (!nama_aplikasi || !url) {
      return res.status(400).json({ success: false, message: 'Nama aplikasi dan URL wajib diisi' });
    }

    // Process urusan_ids to JSON string
    let finalUrusanIdsStr = null;
    let singleUrusanId = urusan_id || null;
    if (Array.isArray(urusan_ids) && urusan_ids.length > 0) {
      finalUrusanIdsStr = JSON.stringify(urusan_ids.map(Number));
      singleUrusanId = Number(urusan_ids[0]);
    } else if (typeof urusan_ids === 'string' && urusan_ids.trim()) {
      finalUrusanIdsStr = urusan_ids.trim();
    }

    // Process tematik_ids to JSON string
    let finalTematikIdsStr = null;
    if (Array.isArray(tematik_ids) && tematik_ids.length > 0) {
      finalTematikIdsStr = JSON.stringify(tematik_ids.map(Number));
    } else if (typeof tematik_ids === 'string' && tematik_ids.trim()) {
      finalTematikIdsStr = tematik_ids.trim();
    }

    const currentUserId = req.user?.id || req.user?.userId || req.body.created_by || 0;
    const userInstansiId = req.user?.instansi_id || req.user?.instansiId || req.body.instansi_id || 2;

    const [result] = await pool.query(
      'INSERT INTO master_aplikasi_external (nama_aplikasi, url, pembuat, sumber, tipe_link_id, instansi_id, urusan_id, urusan_ids, tematik_ids, tagging, keterangan, tanggal_link, is_quick_access, is_qa_all, is_qa_bidang, is_qa_personal, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        nama_aplikasi, 
        url, 
        pembuat || null, 
        finalSumber || null, 
        tipe_link_id || null, 
        userInstansiId,
        singleUrusanId, 
        finalUrusanIdsStr, 
        finalTematikIdsStr, 
        tagging || null, 
        keterangan || null,
        finalTanggal,
        quickAccessVal,
        qaAllVal,
        qaBidangVal,
        qaPersonalVal,
        currentUserId
      ]
    );

    if (qaPersonalVal === 1 && currentUserId) {
      try {
        await pool.query(
          'INSERT IGNORE INTO user_qa_personal (user_id, aplikasi_external_id) VALUES (?, ?)',
          [currentUserId, result.insertId]
        );
      } catch (e) {
        console.warn('Failed to insert user_qa_personal on create:', e.message);
      }
    }

    res.status(201).json({ 
      success: true, 
      data: { 
        id: result.insertId, 
        nama_aplikasi, 
        url, 
        pembuat, 
        sumber: finalSumber, 
        asal_instansi: finalSumber, 
        tipe_link_id: tipe_link_id || null,
        urusan_id: singleUrusanId,
        urusan_ids: urusan_ids || [],
        tematik_ids: tematik_ids || [],
        keterangan: keterangan || null,
        tanggal_link: finalTanggal,
        is_quick_access: quickAccessVal,
        is_qa_all: qaAllVal,
        is_qa_bidang: qaBidangVal,
        is_qa_personal: qaPersonalVal
      } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update
const update = async (req, res) => {
  try {
    const { nama_aplikasi, url, pembuat, sumber, asal_instansi, tipe_link_id, urusan_id, urusan_ids, tematik_ids, tagging, keterangan, tanggal_link, is_quick_access, is_qa_all, is_qa_bidang, is_qa_personal } = req.body;
    const finalSumber = sumber !== undefined ? sumber : (asal_instansi || '');

    if (!nama_aplikasi || !url) {
      return res.status(400).json({ success: false, message: 'Nama aplikasi dan URL wajib diisi' });
    }

    // Check ownership or admin/bidang exception
    const [existingRows] = await pool.query(`
      SELECT a.created_by, a.is_quick_access, a.is_qa_all, a.is_qa_bidang, a.is_qa_personal, p.bidang_id AS creator_bidang_id 
      FROM master_aplikasi_external a 
      LEFT JOIN users u ON a.created_by = u.id 
      LEFT JOIN profil_pegawai p ON u.profil_pegawai_id = p.id 
      WHERE a.id = ? AND a.deleted_at IS NULL
    `, [req.params.id]);

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }

    const existing = existingRows[0];
    const currentUserId = req.user ? Number(req.user.id || req.user.userId) : null;
    const currentUserRoleId = req.user ? Number(req.user.role_id || req.user.roleId || 0) : 0;
    const isSuperAdminOrAdmin = currentUserRoleId === 1 || currentUserRoleId === 2 || (req.user && (req.user.is_admin || req.user.isAdmin));

    if (!isSuperAdminOrAdmin) {
      const isCreator = currentUserId && existing.created_by && Number(existing.created_by) === currentUserId;
      const userBidangId = req.user ? (req.user.bidang_id || req.user.bidangId || null) : null;
      
      const jab = req.user ? String(req.user.jabatan_nama || req.user.jabatan || '').toLowerCase() : '';
      const roleName = req.user ? String(req.user.tipe_user_nama || req.user.role_name || '').toLowerCase() : '';
      const isKabidKatimAdminBidang = jab.includes('kabid') || jab.includes('kepala bidang') || jab.includes('katim') || jab.includes('ketua tim') || roleName.includes('admin') || jab.includes('admin bidang') || roleName.includes('verifikator');

      const isOwnBidang = isKabidKatimAdminBidang && userBidangId && existing.creator_bidang_id && Number(existing.creator_bidang_id) === Number(userBidangId);

      if (!isCreator && !isOwnBidang) {
        return res.status(403).json({ 
          success: false, 
          message: 'Akses ditolak. Anda hanya dapat mengubah link buatan sendiri atau link yang berada di bidang Anda.' 
        });
      }
    }

    const qaAllVal = is_qa_all !== undefined ? (is_qa_all ? 1 : 0) : (existing.is_qa_all || 0);
    const qaBidangVal = is_qa_bidang !== undefined ? (is_qa_bidang ? 1 : 0) : (existing.is_qa_bidang || 0);
    const qaPersonalVal = is_qa_personal !== undefined ? (is_qa_personal ? 1 : 0) : (existing.is_qa_personal || 0);

    let quickAccessVal;
    if (is_qa_all !== undefined || is_qa_bidang !== undefined || is_qa_personal !== undefined) {
      quickAccessVal = (qaAllVal || qaBidangVal || qaPersonalVal) ? 1 : 0;
    } else {
      quickAccessVal = is_quick_access !== undefined ? (is_quick_access ? 1 : 0) : (existing.is_quick_access || 0);
    }

    let finalUrusanIdsStr = null;
    let singleUrusanId = urusan_id || null;
    if (Array.isArray(urusan_ids)) {
      finalUrusanIdsStr = JSON.stringify(urusan_ids.map(Number));
      singleUrusanId = urusan_ids.length > 0 ? Number(urusan_ids[0]) : null;
    } else if (typeof urusan_ids === 'string') {
      finalUrusanIdsStr = urusan_ids.trim() || null;
    }

    let finalTematikIdsStr = null;
    if (Array.isArray(tematik_ids)) {
      finalTematikIdsStr = JSON.stringify(tematik_ids.map(Number));
    } else if (typeof tematik_ids === 'string') {
      finalTematikIdsStr = tematik_ids.trim() || null;
    }

    let finalTanggal = existing.tanggal_link;
    if (tanggal_link && typeof tanggal_link === 'string' && tanggal_link.includes('-')) {
      finalTanggal = tanggal_link.split('T')[0];
    }

    const [result] = await pool.query(
      'UPDATE master_aplikasi_external SET nama_aplikasi = ?, url = ?, pembuat = ?, sumber = ?, tipe_link_id = ?, urusan_id = ?, urusan_ids = ?, tematik_ids = ?, tagging = ?, keterangan = ?, tanggal_link = ?, is_quick_access = ?, is_qa_all = ?, is_qa_bidang = ?, is_qa_personal = ?, updated_by = ? WHERE id = ? AND deleted_at IS NULL',
      [
        nama_aplikasi || existing.nama_aplikasi, 
        url || existing.url, 
        pembuat !== undefined ? pembuat : existing.pembuat, 
        finalSumber !== undefined ? finalSumber : existing.sumber, 
        tipe_link_id !== undefined ? tipe_link_id : existing.tipe_link_id, 
        singleUrusanId, 
        finalUrusanIdsStr, 
        finalTematikIdsStr, 
        tagging !== undefined ? tagging : existing.tagging, 
        keterangan !== undefined ? keterangan : existing.keterangan,
        finalTanggal,
        quickAccessVal,
        qaAllVal,
        qaBidangVal,
        qaPersonalVal,
        currentUserId || 0, 
        req.params.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }

    if (currentUserId && is_qa_personal !== undefined) {
      try {
        if (qaPersonalVal === 1) {
          await pool.query(
            'INSERT IGNORE INTO user_qa_personal (user_id, aplikasi_external_id) VALUES (?, ?)',
            [currentUserId, req.params.id]
          );
        } else {
          await pool.query(
            'DELETE FROM user_qa_personal WHERE user_id = ? AND aplikasi_external_id = ?',
            [currentUserId, req.params.id]
          );
        }
      } catch (e) {
        console.warn('Failed to sync user_qa_personal on update:', e.message);
      }
    }

    res.json({ 
      success: true, 
      data: { 
        id: parseInt(req.params.id), 
        nama_aplikasi, 
        url, 
        pembuat, 
        sumber: finalSumber, 
        asal_instansi: finalSumber, 
        tipe_link_id: tipe_link_id || null,
        urusan_ids: urusan_ids || [],
        tematik_ids: tematik_ids || [],
        keterangan: keterangan || null,
        tanggal_link: tanggal_link || null,
        is_quick_access: quickAccessVal
      } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Soft Delete
const remove = async (req, res) => {
  try {
    const [existingRows] = await pool.query(`
      SELECT a.created_by, p.bidang_id AS creator_bidang_id 
      FROM master_aplikasi_external a 
      LEFT JOIN users u ON a.created_by = u.id 
      LEFT JOIN profil_pegawai p ON u.profil_pegawai_id = p.id 
      WHERE a.id = ? AND a.deleted_at IS NULL
    `, [req.params.id]);

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }

    const existing = existingRows[0];
    const currentUserId = req.user ? Number(req.user.id || req.user.userId) : null;
    const currentUserRoleId = req.user ? Number(req.user.role_id || req.user.roleId || 0) : 0;
    const isSuperAdminOrAdmin = currentUserRoleId === 1 || currentUserRoleId === 2 || (req.user && (req.user.is_admin || req.user.isAdmin));

    if (!isSuperAdminOrAdmin) {
      const isCreator = currentUserId && existing.created_by && Number(existing.created_by) === currentUserId;
      const userBidangId = req.user ? (req.user.bidang_id || req.user.bidangId || null) : null;
      
      const jab = req.user ? String(req.user.jabatan_nama || req.user.jabatan || '').toLowerCase() : '';
      const roleName = req.user ? String(req.user.tipe_user_nama || req.user.role_name || '').toLowerCase() : '';
      const isKabidKatimAdminBidang = jab.includes('kabid') || jab.includes('kepala bidang') || jab.includes('katim') || jab.includes('ketua tim') || roleName.includes('admin') || jab.includes('admin bidang') || roleName.includes('verifikator');

      const isOwnBidang = isKabidKatimAdminBidang && userBidangId && existing.creator_bidang_id && Number(existing.creator_bidang_id) === Number(userBidangId);

      if (!isCreator && !isOwnBidang) {
        return res.status(403).json({ 
          success: false, 
          message: 'Akses ditolak. Anda hanya dapat menghapus link buatan sendiri atau link yang berada di bidang Anda.' 
        });
      }
    }

    const userId = currentUserId || 0;
    const [result] = await pool.query(
      'UPDATE master_aplikasi_external SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ? WHERE id = ?',
      [userId, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }
    res.json({ success: true, message: 'Data berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Check if user is allowed to reorder links (Kabid, Katim, Admin Bidang, Superadmin/Admin)
const checkCanReorder = (user) => {
  if (!user) return false;
  const roleId = Number(user.role_id || user.roleId || user.tipe_user_id || 0);
  const isSuperadminOrAdmin = roleId === 1 || roleId === 2 || Boolean(user.is_admin || user.isAdmin);
  if (isSuperadminOrAdmin) return true;

  const jab = String(user.jabatan_nama || user.jabatan || '').toLowerCase();
  const roleName = String(user.tipe_user_nama || user.role_name || '').toLowerCase();

  const isKabid = jab.includes('kabid') || jab.includes('kepala bidang');
  const isKatim = jab.includes('katim') || jab.includes('ketua tim');
  const isAdminBidang = roleName.includes('admin') || jab.includes('admin bidang') || roleName.includes('verifikator');

  return isKabid || isKatim || isAdminBidang;
};

// Reorder aplikasi external (Drag & Drop)
const reorder = async (req, res) => {
  try {
    if (!req.user || !checkCanReorder(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Pengurutan posisi link hanya dapat dilakukan oleh Kabid, Katim, Admin Bidang, atau Superadmin.'
      });
    }

    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Format data items tidak valid' });
    }

    const currentUserRoleId = Number(req.user.role_id || req.user.roleId || 0);
    const isSuperAdminOrAdmin = currentUserRoleId === 1 || currentUserRoleId === 2 || Boolean(req.user.is_admin || req.user.isAdmin);
    const userBidangId = req.user.bidang_id || req.user.bidangId || null;

    for (const item of items) {
      if (item && item.id !== undefined) {
        if (!isSuperAdminOrAdmin) {
          // Verify item belongs to user's bidang or was created by user
          const [existing] = await pool.query(`
            SELECT a.id, a.created_by, p.bidang_id AS creator_bidang_id 
            FROM master_aplikasi_external a 
            LEFT JOIN users u ON a.created_by = u.id 
            LEFT JOIN profil_pegawai p ON u.profil_pegawai_id = p.id 
            WHERE a.id = ? AND a.deleted_at IS NULL
          `, [item.id]);

          if (existing.length > 0) {
            const row = existing[0];
            const isOwnBidang = userBidangId && row.creator_bidang_id && Number(row.creator_bidang_id) === Number(userBidangId);
            const isCreator = row.created_by && Number(row.created_by) === Number(req.user.id);
            if (!isOwnBidang && !isCreator) {
              return res.status(403).json({
                success: false,
                message: 'Akses ditolak. Kabid dan Katim hanya dapat mengatur posisi link untuk bidangnya sendiri.'
              });
            }
          }
        }

        await pool.query(
          'UPDATE master_aplikasi_external SET urutan = ? WHERE id = ?',
          [Number(item.urutan || 0), Number(item.id)]
        );
      }
    }

    res.json({ success: true, message: 'Urutan link berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Toggle QA Personal for the logged in user
const togglePersonal = async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.user?.userId;
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Autentikasi diperlukan' });
    }
    const appId = Number(req.params.id);
    if (!appId) {
      return res.status(400).json({ success: false, message: 'ID Aplikasi tidak valid' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM user_qa_personal WHERE user_id = ? AND aplikasi_external_id = ?',
      [currentUserId, appId]
    );

    let isQaPersonal = 0;
    if (existing.length > 0) {
      await pool.query('DELETE FROM user_qa_personal WHERE id = ?', [existing[0].id]);
      isQaPersonal = 0;
    } else {
      await pool.query(
        'INSERT INTO user_qa_personal (user_id, aplikasi_external_id) VALUES (?, ?)',
        [currentUserId, appId]
      );
      isQaPersonal = 1;
    }

    res.json({
      success: true,
      message: isQaPersonal === 1 ? 'Ditambahkan ke Quick Access Personal' : 'Dihapus dari Quick Access Personal',
      data: { is_qa_personal: isQaPersonal, user_is_qa_personal: isQaPersonal }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getById, create, update, remove, reorder, togglePersonal };
