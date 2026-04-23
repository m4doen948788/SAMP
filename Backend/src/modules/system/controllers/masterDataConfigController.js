const pool = require('../../../config/db');

// ========== CONFIG CRUD ==========

const getAllConfigs = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM master_data_config ORDER BY label ASC');
        // Parse kolom JSON
        const data = rows.map(r => ({
            ...r,
            kolom: typeof r.kolom === 'string' ? JSON.parse(r.kolom) : r.kolom,
        }));
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getConfigById = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM master_data_config WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Config tidak ditemukan' });
        }
        const row = rows[0];
        row.kolom = typeof row.kolom === 'string' ? JSON.parse(row.kolom) : row.kolom;
        res.json({ success: true, data: row });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const createConfig = async (req, res) => {
    try {
        const { nama_tabel, label, kolom, audit_features = {} } = req.body;
        if (!nama_tabel || !label || !kolom || !Array.isArray(kolom) || kolom.length === 0) {
            return res.status(400).json({ success: false, message: 'nama_tabel, label, dan kolom wajib diisi' });
        }

        // Sanitize table name: only lowercase, numbers, underscore
        const tableName = 'master_' + nama_tabel.toLowerCase().replace(/[^a-z0-9_]/g, '_');

        // Check if table name already used
        const [exists] = await pool.query('SELECT id FROM master_data_config WHERE nama_tabel = ?', [tableName]);
        if (exists.length > 0) {
            return res.status(400).json({ success: false, message: 'Nama tabel sudah digunakan' });
        }

        // Build CREATE TABLE SQL dynamically
        const columnDefs = kolom.map(col => {
            const colName = col.nama.toLowerCase().replace(/[^a-z0-9_]/g, '_');
            let colType = 'VARCHAR(255)';
            switch (col.tipe) {
                case 'number': colType = 'INT'; break;
                case 'relation': colType = 'INT'; break;
                case 'text': colType = 'TEXT'; break;
                case 'date': colType = 'DATE'; break;
                case 'decimal': colType = 'DECIMAL(15,2)'; break;
                default: colType = 'VARCHAR(255)';
            }
            return `\`${colName}\` ${colType} ${col.wajib ? 'NOT NULL' : 'NULL'}`;
        });

        // Add optional audit columns
        const auditDefs = [];
        if (audit_features.created_at) auditDefs.push('created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
        if (audit_features.created_by) auditDefs.push('created_by INT NULL');
        if (audit_features.updated_at) auditDefs.push('updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
        if (audit_features.updated_by) auditDefs.push('updated_by INT NULL');
        if (audit_features.deleted_at) auditDefs.push('deleted_at DATETIME NULL');
        if (audit_features.deleted_by) auditDefs.push('deleted_by INT NULL');

        const allColumns = [
            'id INT AUTO_INCREMENT PRIMARY KEY',
            ...columnDefs,
            ...auditDefs
        ];

        const createSQL = `
            CREATE TABLE IF NOT EXISTS \`${tableName}\` (
                ${allColumns.join(',\n                ')}
            )
        `;

        await pool.query(createSQL);

        // Save the config with sanitized column names
        const sanitizedKolom = kolom.map(col => ({
            ...col,
            nama_db: col.nama.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        }));

        const [result] = await pool.query(
            'INSERT INTO master_data_config (nama_tabel, label, kolom) VALUES (?, ?, ?)',
            [tableName, label, JSON.stringify(sanitizedKolom)]
        );

        res.status(201).json({
            success: true,
            data: { id: result.insertId, nama_tabel: tableName, label, kolom: sanitizedKolom }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const updateConfig = async (req, res) => {
    try {
        const { label } = req.body;
        if (!label) {
            return res.status(400).json({ success: false, message: 'Label wajib diisi' });
        }

        const [result] = await pool.query(
            'UPDATE master_data_config SET label = ? WHERE id = ?',
            [label, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Config tidak ditemukan' });
        }

        res.json({ success: true, message: 'Master data berhasil diperbarui' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const deleteConfig = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT nama_tabel FROM master_data_config WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Config tidak ditemukan' });
        }

        const tableName = rows[0].nama_tabel;

        // Drop the dynamic table
        await pool.query(`DROP TABLE IF EXISTS \`${tableName}\``);

        // Delete config
        await pool.query('DELETE FROM master_data_config WHERE id = ?', [req.params.id]);

        res.json({ success: true, message: 'Master data berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ========== DYNAMIC TABLE CRUD ==========

const getData = async (req, res) => {
    try {
        const [configs] = await pool.query('SELECT * FROM master_data_config WHERE id = ?', [req.params.configId]);
        if (configs.length === 0) {
            return res.status(404).json({ success: false, message: 'Config tidak ditemukan' });
        }
        const tableName = configs[0].nama_tabel;
        const [rows] = await pool.query(`SELECT * FROM \`${tableName}\` ORDER BY id DESC`);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const createData = async (req, res) => {
    try {
        const [configs] = await pool.query('SELECT * FROM master_data_config WHERE id = ?', [req.params.configId]);
        if (configs.length === 0) {
            return res.status(404).json({ success: false, message: 'Config tidak ditemukan' });
        }
        const tableName = configs[0].nama_tabel;
        const kolom = typeof configs[0].kolom === 'string' ? JSON.parse(configs[0].kolom) : configs[0].kolom;

        const fields = kolom.map(k => k.nama_db);
        const values = fields.map(f => req.body[f] !== undefined ? req.body[f] : null);
        const placeholders = fields.map(() => '?').join(', ');

        const [result] = await pool.query(
            `INSERT INTO \`${tableName}\` (${fields.map(f => `\`${f}\``).join(', ')}) VALUES (${placeholders})`,
            values
        );

        res.status(201).json({ success: true, data: { id: result.insertId, ...req.body } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const updateData = async (req, res) => {
    try {
        const [configs] = await pool.query('SELECT * FROM master_data_config WHERE id = ?', [req.params.configId]);
        if (configs.length === 0) {
            return res.status(404).json({ success: false, message: 'Config tidak ditemukan' });
        }
        const tableName = configs[0].nama_tabel;
        const kolom = typeof configs[0].kolom === 'string' ? JSON.parse(configs[0].kolom) : configs[0].kolom;

        const fields = kolom.map(k => k.nama_db);
        const setClauses = fields.map(f => `\`${f}\` = ?`).join(', ');
        const values = fields.map(f => req.body[f] !== undefined ? req.body[f] : null);
        values.push(req.params.dataId);

        const [result] = await pool.query(
            `UPDATE \`${tableName}\` SET ${setClauses} WHERE id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: { id: parseInt(req.params.dataId), ...req.body } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const deleteData = async (req, res) => {
    try {
        const [configs] = await pool.query('SELECT * FROM master_data_config WHERE id = ?', [req.params.configId]);
        if (configs.length === 0) {
            return res.status(404).json({ success: false, message: 'Config tidak ditemukan' });
        }
        const tableName = configs[0].nama_tabel;

        const [result] = await pool.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [req.params.dataId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getDataByTable = async (req, res) => {
    try {
        const { tableName } = req.params;

        // Fetch config to get detailed column info
        const [configs] = await pool.query('SELECT kolom FROM master_data_config WHERE nama_tabel = ?', [tableName]);
        let columnConfig = [];
        if (configs.length > 0) {
            columnConfig = typeof configs[0].kolom === 'string' ? JSON.parse(configs[0].kolom) : configs[0].kolom;
        }

        // Check if deleted_at column exists
        const [columns] = await pool.query(`SHOW COLUMNS FROM \`${tableName}\``);
        const hasDeletedAt = columns.some(c => c.Field === 'deleted_at');
        
        // Fallback or additional columns if config doesn't exist? 
        // For now, let's prioritize config columns
        const columnNames = columnConfig.length > 0 
            ? columnConfig.map(k => k.nama_db)
            : columns.map(c => c.Field).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && k !== 'deleted_at' && k !== 'created_by' && k !== 'updated_by' && k !== 'deleted_by');

        let selectFields = ['t.*'];
        let joins = [];
        columnConfig.forEach(col => {
            if (col.tipe === 'relation' && col.relation_table && col.relation_label) {
                const alias = `rel_${col.nama_db.replace(/_id$/, '')}`;
                const labelField = col.relation_label;
                const resultField = col.nama_db.replace(/_id$/, '_nama');
                selectFields.push(`${alias}.\`${labelField}\` AS \`${resultField}\``);
                joins.push(`LEFT JOIN \`${col.relation_table}\` ${alias} ON t.\`${col.nama_db}\` = ${alias}.id`);
            }
        });

        let query = `SELECT ${selectFields.join(', ')} FROM \`${tableName}\` t`;
        if (joins.length > 0) {
            query += ' ' + joins.join(' ');
        }
        
        if (hasDeletedAt) {
            query += ` WHERE t.deleted_at IS NULL`;
        }
        query += ` ORDER BY t.id DESC`;

        const [rows] = await pool.query(query);
        res.json({ success: true, data: rows, columns: columnNames, columnConfig });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const createDataByTable = async (req, res) => {
    try {
        const { tableName } = req.params;
        const fields = Object.keys(req.body);
        const values = Object.values(req.body);
        const placeholders = fields.map(() => '?').join(', ');

        const [result] = await pool.query(
            `INSERT INTO \`${tableName}\` (${fields.map(f => `\`${f}\``).join(', ')}) VALUES (${placeholders})`,
            values
        );

        res.status(201).json({ success: true, data: { id: result.insertId, ...req.body } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const updateDataByTable = async (req, res) => {
    try {
        const { tableName, dataId } = req.params;
        const fields = Object.keys(req.body);
        const setClauses = fields.map(f => `\`${f}\` = ?`).join(', ');
        const values = Object.values(req.body);
        values.push(dataId);

        const [result] = await pool.query(
            `UPDATE \`${tableName}\` SET ${setClauses} WHERE id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, data: { id: parseInt(dataId), ...req.body } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const deleteDataByTable = async (req, res) => {
    try {
        const { tableName, dataId } = req.params;

        // Check if deleted_at column exists
        const [columns] = await pool.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE 'deleted_at'`);
        const hasDeletedAt = columns.length > 0;

        let result;
        if (hasDeletedAt) {
            [result] = await pool.query(`UPDATE \`${tableName}\` SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, [dataId]);
        } else {
            [result] = await pool.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [dataId]);
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getAllConfigs, getConfigById, createConfig, updateConfig, deleteConfig, getData, createData, updateData, deleteData, getDataByTable, createDataByTable, updateDataByTable, deleteDataByTable };
