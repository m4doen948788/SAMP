const pool = require('../../../config/db');

const getAll = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT gp.*, km.parent_id 
            FROM generated_pages gp 
            LEFT JOIN kelola_menu km ON gp.menu_id = km.id
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const create = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { title, slug, table_name, icon, parent_id, tipe_akses } = req.body;
        const finalAkses = tipe_akses || 'Privat';

        // 1. Determine parent ID (default to NULL if top level)
        const parentId = parent_id ? parseInt(parent_id) : null;

        // 2. Get urutan
        const [urutanRow] = await connection.query('SELECT MAX(urutan) as maxU FROM kelola_menu WHERE parent_id = ?', [parentId]);
        const nextUrutan = (urutanRow[0].maxU || 0) + 1;

        // 3. Create menu entry
        const [menuResult] = await connection.query(`
      INSERT INTO kelola_menu (nama_menu, tipe, action_page, icon, parent_id, urutan, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [title, parentId ? 'menu2' : 'menu1', slug, icon || 'Layout', parentId, nextUrutan, 1]);
        const menuId = menuResult.insertId;

        // 4. Create generated page entry
        await connection.query(`
      INSERT INTO generated_pages (title, slug, table_name, icon, menu_id, tipe_akses)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [title, slug, table_name, icon || 'Layout', menuId, finalAkses]);

        await connection.commit();
        res.json({ success: true, message: 'Halaman berhasil dibuat dan didaftarkan ke menu.' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

const remove = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        // 1. Get info
        const [rows] = await connection.query('SELECT menu_id FROM generated_pages WHERE id = ?', [id]);
        if (rows.length === 0) throw new Error('Halaman tidak ditemukan');
        const menuId = rows[0].menu_id;

        // 2. Delete generated page
        await connection.query('DELETE FROM generated_pages WHERE id = ?', [id]);

        // 3. Delete menu
        if (menuId) {
            await connection.query('DELETE FROM kelola_menu WHERE id = ?', [menuId]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Halaman dan menu terkait berhasil dihapus.' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

const update = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { title, slug, table_name, icon, parent_id, tipe_akses } = req.body;
        const newParentId = parent_id ? parseInt(parent_id) : null;
        const finalAkses = tipe_akses || 'Privat';

        // 1. Get existing generated page info
        const [rows] = await connection.query('SELECT menu_id FROM generated_pages WHERE id = ?', [id]);
        if (rows.length === 0) throw new Error('Halaman tidak ditemukan');
        const menuId = rows[0].menu_id;

        // 2. Update generated page
        await connection.query(`
            UPDATE generated_pages 
            SET title = ?, slug = ?, table_name = ?, icon = ?, tipe_akses = ?
            WHERE id = ?
        `, [title, slug, table_name, icon || 'Layout', finalAkses, id]);

        // 3. Update menu item if exists
        if (menuId) {
            await connection.query(`
                UPDATE kelola_menu 
                SET nama_menu = ?, action_page = ?, icon = ?, parent_id = ?, tipe = ?
                WHERE id = ?
            `, [title, slug, icon || 'Layout', newParentId, newParentId ? 'menu2' : 'menu1', menuId]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Halaman berhasil diperbarui.' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

module.exports = { getAll, create, remove, update };
