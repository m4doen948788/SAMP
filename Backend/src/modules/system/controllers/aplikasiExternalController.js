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
    const [rows] = await pool.query(`
      SELECT 
        a.*, 
        l.jenis_link AS nama_tipe_link,
        p.bidang_id AS creator_bidang_id,
        mbi.nama_bidang AS creator_nama_bidang,
        mbi.singkatan AS creator_singkatan_bidang
      FROM master_aplikasi_external a 
      LEFT JOIN master_link l ON a.tipe_link_id = l.id AND l.deleted_at IS NULL 
      LEFT JOIN users u ON a.created_by = u.id 
      LEFT JOIN profil_pegawai p ON u.profil_pegawai_id = p.id 
      LEFT JOIN master_bidang_instansi mbi ON p.bidang_id = mbi.id 
      WHERE a.deleted_at IS NULL 
      ORDER BY a.id DESC
    `);

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
    const { nama_aplikasi, url, pembuat, sumber, asal_instansi, tipe_link_id, urusan_id, urusan_ids, tematik_ids, tagging, keterangan, tanggal_link } = req.body;
    const finalSumber = sumber !== undefined ? sumber : (asal_instansi || '');
    const finalTanggal = tanggal_link || new Date().toISOString().split('T')[0];

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

    const [result] = await pool.query(
      'INSERT INTO master_aplikasi_external (nama_aplikasi, url, pembuat, sumber, tipe_link_id, urusan_id, urusan_ids, tematik_ids, tagging, keterangan, tanggal_link, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        nama_aplikasi, 
        url, 
        pembuat || null, 
        finalSumber || null, 
        tipe_link_id || null, 
        singleUrusanId, 
        finalUrusanIdsStr, 
        finalTematikIdsStr, 
        tagging || null, 
        keterangan || null,
        finalTanggal,
        req.user?.id || req.user?.userId || req.body.created_by || 0
      ]
    );

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
        tanggal_link: finalTanggal
      } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update
const update = async (req, res) => {
  try {
    const { nama_aplikasi, url, pembuat, sumber, asal_instansi, tipe_link_id, urusan_id, urusan_ids, tematik_ids, tagging, keterangan, tanggal_link } = req.body;
    const finalSumber = sumber !== undefined ? sumber : (asal_instansi || '');

    if (!nama_aplikasi || !url) {
      return res.status(400).json({ success: false, message: 'Nama aplikasi dan URL wajib diisi' });
    }

    // Check ownership or admin exception
    const [existingRows] = await pool.query(
      'SELECT created_by FROM master_aplikasi_external WHERE id = ? AND deleted_at IS NULL',
      [req.params.id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }

    const existing = existingRows[0];
    const currentUserId = req.user ? Number(req.user.id || req.user.userId) : null;
    const currentUserRoleId = req.user ? Number(req.user.role_id || req.user.roleId || 0) : 0;
    const isSuperAdminOrAdmin = currentUserRoleId === 1 || currentUserRoleId === 2 || (req.user && (req.user.is_admin || req.user.isAdmin));

    if (currentUserId && existing.created_by && Number(existing.created_by) !== 0) {
      if (Number(existing.created_by) !== currentUserId && !isSuperAdminOrAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Akses ditolak. Anda hanya dapat mengubah link yang Anda input sendiri.' 
        });
      }
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

    const [result] = await pool.query(
      'UPDATE master_aplikasi_external SET nama_aplikasi = ?, url = ?, pembuat = ?, sumber = ?, tipe_link_id = ?, urusan_id = ?, urusan_ids = ?, tematik_ids = ?, tagging = ?, keterangan = ?, tanggal_link = ?, updated_by = ? WHERE id = ? AND deleted_at IS NULL',
      [
        nama_aplikasi, 
        url, 
        pembuat || null, 
        finalSumber || null, 
        tipe_link_id || null, 
        singleUrusanId, 
        finalUrusanIdsStr, 
        finalTematikIdsStr, 
        tagging || null, 
        keterangan || null,
        tanggal_link || null,
        currentUserId || 0, 
        req.params.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
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
        tanggal_link: tanggal_link || null
      } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Soft Delete
const remove = async (req, res) => {
  try {
    const [existingRows] = await pool.query(
      'SELECT created_by FROM master_aplikasi_external WHERE id = ? AND deleted_at IS NULL',
      [req.params.id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
    }

    const existing = existingRows[0];
    const currentUserId = req.user ? Number(req.user.id || req.user.userId) : null;
    const currentUserRoleId = req.user ? Number(req.user.role_id || req.user.roleId || 0) : 0;
    const isSuperAdminOrAdmin = currentUserRoleId === 1 || currentUserRoleId === 2 || (req.user && (req.user.is_admin || req.user.isAdmin));

    if (currentUserId && existing.created_by && Number(existing.created_by) !== 0) {
      if (Number(existing.created_by) !== currentUserId && !isSuperAdminOrAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Akses ditolak. Anda hanya dapat menghapus link yang Anda input sendiri.' 
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

module.exports = { getAll, getById, create, update, remove };
