const db = require('../../../config/db');

const todoController = {
  // Ambil semua to-do list milik user yang sedang login
  getAll: async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { is_completed, filter, search } = req.query;

      let sql = `
        SELECT 
          id, user_id, parent_id, title, description, is_completed, 
          DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date,
          priority, urutan, created_at, updated_at 
        FROM user_todos 
        WHERE user_id = ?
      `;
      const params = [userId];

      if (is_completed !== undefined && is_completed !== '') {
        sql += ` AND is_completed = ?`;
        params.push(Number(is_completed));
      }

      if (filter === 'TODAY') {
        sql += ` AND (due_date = CURDATE() OR (due_date < CURDATE() AND is_completed = 0))`;
      } else if (filter === 'UPCOMING') {
        sql += ` AND due_date > CURDATE()`;
      }

      if (search && search.trim()) {
        sql += ` AND (title LIKE ? OR description LIKE ?)`;
        params.push(`%${search.trim()}%`, `%${search.trim()}%`);
      }

      // Pengurutan berdasarkan urutan manual dan ID
      sql += ` ORDER BY urutan ASC, created_at ASC, id ASC`;

      const [rows] = await db.query(sql, params);
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error('Error in todoController.getAll:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // Statistik ringkas (badge counter)
  getSummary: async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const [rows] = await db.query(`
        SELECT 
          COUNT(CASE WHEN is_completed = 0 THEN 1 END) AS pending_total,
          COUNT(CASE WHEN is_completed = 0 AND (due_date = CURDATE() OR due_date IS NULL) THEN 1 END) AS pending_today,
          COUNT(CASE WHEN is_completed = 0 AND due_date < CURDATE() THEN 1 END) AS overdue_total,
          COUNT(CASE WHEN is_completed = 1 THEN 1 END) AS completed_total
        FROM user_todos
        WHERE user_id = ?
      `, [userId]);

      res.json({ success: true, data: rows[0] || { pending_total: 0, pending_today: 0, overdue_total: 0, completed_total: 0 } });
    } catch (err) {
      console.error('Error in todoController.getSummary:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // Buat to-do item baru
  create: async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { title, description, due_date, priority, parent_id } = req.body;
      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Judul tugas wajib diisi' });
      }

      // Hitung urutan berikutnya
      const [orderRows] = await db.query(
        `SELECT COALESCE(MAX(urutan), 0) + 1 AS next_order FROM user_todos WHERE user_id = ?`,
        [userId]
      );
      const nextOrder = orderRows[0]?.next_order || 1;

      const formattedDueDate = due_date ? String(due_date).split('T')[0] : null;
      const validPriority = ['LOW', 'MEDIUM', 'HIGH'].includes(String(priority).toUpperCase()) 
        ? String(priority).toUpperCase() 
        : 'MEDIUM';
      const validParentId = parent_id ? Number(parent_id) : null;

      const [result] = await db.query(
        `INSERT INTO user_todos (user_id, parent_id, title, description, due_date, priority, urutan)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, validParentId, title.trim(), description ? description.trim() : null, formattedDueDate, validPriority, nextOrder]
      );

      const [createdRows] = await db.query(
        `SELECT id, user_id, parent_id, title, description, is_completed, 
                DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date, priority, urutan, created_at, updated_at
         FROM user_todos WHERE id = ?`,
        [result.insertId]
      );

      res.status(201).json({ success: true, message: 'Tugas berhasil ditambahkan', data: createdRows[0] });
    } catch (err) {
      console.error('Error in todoController.create:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // Update data to-do item
  update: async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { title, description, due_date, priority, is_completed, parent_id } = req.body;
      const updates = [];
      const params = [];

      if (title !== undefined) {
        if (!title.trim()) {
          return res.status(400).json({ success: false, message: 'Judul tugas tidak boleh kosong' });
        }
        updates.push('title = ?');
        params.push(title.trim());
      }

      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description ? description.trim() : null);
      }

      if (due_date !== undefined) {
        updates.push('due_date = ?');
        params.push(due_date ? String(due_date).split('T')[0] : null);
      }

      if (priority !== undefined) {
        const validPriority = ['LOW', 'MEDIUM', 'HIGH'].includes(String(priority).toUpperCase()) 
          ? String(priority).toUpperCase() 
          : 'MEDIUM';
        updates.push('priority = ?');
        params.push(validPriority);
      }

      if (is_completed !== undefined) {
        updates.push('is_completed = ?');
        params.push(is_completed ? 1 : 0);
      }

      if (parent_id !== undefined) {
        updates.push('parent_id = ?');
        params.push(parent_id ? Number(parent_id) : null);
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'Tidak ada data yang diubah' });
      }

      params.push(id, userId);
      const [result] = await db.query(
        `UPDATE user_todos SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        params
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Tugas tidak ditemukan' });
      }

      const [updatedRows] = await db.query(
        `SELECT id, user_id, parent_id, title, description, is_completed, 
                DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date, priority, urutan, created_at, updated_at
         FROM user_todos WHERE id = ?`,
        [id]
      );

      res.json({ success: true, message: 'Tugas berhasil diperbarui', data: updatedRows[0] });
    } catch (err) {
      console.error('Error in todoController.update:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // Toggle status selesai (auto-check sub item jika main item diceklis)
  toggle: async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Ambil data status saat ini dan parent_id
      const [currentRows] = await db.query(
        `SELECT id, parent_id, is_completed FROM user_todos WHERE id = ? AND user_id = ?`,
        [id, userId]
      );

      if (currentRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Tugas tidak ditemukan' });
      }

      const item = currentRows[0];
      const nextStatus = item.is_completed === 1 ? 0 : 1;

      // Update status item itu sendiri
      await db.query(
        `UPDATE user_todos SET is_completed = ? WHERE id = ? AND user_id = ?`,
        [nextStatus, id, userId]
      );

      // Jika item yang diceklis memiliki sub-item, otomatis update semua sub-itemnya
      if (nextStatus === 1) {
        await db.query(
          `UPDATE user_todos SET is_completed = 1 WHERE parent_id = ? AND user_id = ?`,
          [id, userId]
        );
      } else {
        await db.query(
          `UPDATE user_todos SET is_completed = 0 WHERE parent_id = ? AND user_id = ?`,
          [id, userId]
        );
      }

      // Jika yang di-uncheck adalah sub-item, otomatis uncheck parent itemnya juga
      if (item.parent_id && nextStatus === 0) {
        await db.query(
          `UPDATE user_todos SET is_completed = 0 WHERE id = ? AND user_id = ?`,
          [item.parent_id, userId]
        );
      }

      const [updatedRows] = await db.query(
        `SELECT id, user_id, parent_id, title, description, is_completed, 
                DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date, priority, urutan, created_at, updated_at
         FROM user_todos WHERE id = ?`,
        [id]
      );

      res.json({ success: true, message: 'Status tugas berhasil diperbarui', data: updatedRows[0] });
    } catch (err) {
      console.error('Error in todoController.toggle:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // Hapus tugas
  delete: async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Hapus sub-tugas yang terhubung jika ada
      await db.query(`DELETE FROM user_todos WHERE parent_id = ? AND user_id = ?`, [id, userId]);

      const [result] = await db.query(`DELETE FROM user_todos WHERE id = ? AND user_id = ?`, [id, userId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Tugas tidak ditemukan' });
      }

      res.json({ success: true, message: 'Tugas berhasil dihapus' });
    } catch (err) {
      console.error('Error in todoController.delete:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // Ubah urutan tugas (drag & drop)
  reorder: async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ success: false, message: 'Format items tidak valid' });
      }

      for (const item of items) {
        if (item && item.id !== undefined) {
          if (item.parent_id !== undefined) {
            const pId = item.parent_id ? Number(item.parent_id) : null;
            await db.query(
              `UPDATE user_todos SET urutan = ?, parent_id = ? WHERE id = ? AND user_id = ?`,
              [Number(item.urutan || 0), pId, Number(item.id), userId]
            );
          } else {
            await db.query(
              `UPDATE user_todos SET urutan = ? WHERE id = ? AND user_id = ?`,
              [Number(item.urutan || 0), Number(item.id), userId]
            );
          }
        }
      }

      res.json({ success: true, message: 'Urutan tugas berhasil diperbarui' });
    } catch (err) {
      console.error('Error in todoController.reorder:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

module.exports = todoController;
