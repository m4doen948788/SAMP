const pool = require('./db');

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_tahun (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(100) NOT NULL
      )
    `);
    console.log('Table master_tahun created/verified.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_tematik (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(255) NOT NULL
      )
    `);
    console.log('Table master_tematik created/verified.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_aplikasi_external (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_aplikasi VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        pembuat VARCHAR(255),
        asal_instansi VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by INT,
        deleted_at DATETIME NULL,
        deleted_by INT
      )
    `);
    console.log('Table master_aplikasi_external created/verified.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_urusan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        urusan VARCHAR(255) NOT NULL
      )
    `);
    console.log('Table master_urusan created/verified.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_bidang (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_bidang VARCHAR(255) NOT NULL,
        singkatan VARCHAR(100),
        instansi_id INT NULL
      )
    `);
    console.log('Table master_bidang created/verified.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_instansi_daerah (
        id INT AUTO_INCREMENT PRIMARY KEY,
        instansi VARCHAR(255) NOT NULL,
        singkatan VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by INT,
        deleted_at DATETIME NULL,
        deleted_by INT
      )
    `);
    // Add columns if table already exists without them
    try { await pool.query('ALTER TABLE master_instansi_daerah ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP AFTER singkatan'); } catch (e) { }
    try { await pool.query('ALTER TABLE master_instansi_daerah ADD COLUMN created_by INT AFTER created_at'); } catch (e) { }
    console.log('Table master_instansi_daerah created/verified.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS kelola_menu (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_menu VARCHAR(255) NOT NULL,
        tipe ENUM('menu1','menu2','menu3') NOT NULL DEFAULT 'menu1',
        aplikasi_external_id INT NULL,
        action_page VARCHAR(100) NULL,
        icon VARCHAR(100),
        parent_id INT NULL,
        urutan INT DEFAULT 0,
        is_active TINYINT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Table kelola_menu created/verified.');

    console.log('Table kelola_menu created/verified.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_data_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_tabel VARCHAR(100) NOT NULL UNIQUE,
        label VARCHAR(255) NOT NULL,
        kolom JSON NOT NULL,
        is_active TINYINT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Table master_data_config created/verified.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_jenis_dokumen (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Table master_jenis_dokumen created/verified.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_jenis_kegiatan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Table master_jenis_kegiatan created/verified.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_jenis_pegawai (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Table master_jenis_pegawai created/verified.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS table_labels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_name VARCHAR(100) NOT NULL,
        column_key VARCHAR(100) NOT NULL,
        label VARCHAR(255) NOT NULL,
        UNIQUE KEY table_col (table_name, column_key)
      )
    `);
    console.log('Table table_labels created/verified.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS generated_pages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        table_name VARCHAR(100) NOT NULL,
        icon VARCHAR(50) DEFAULT 'Layout',
        menu_id INT NULL,
        tipe_akses VARCHAR(50) DEFAULT 'Privat',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table generated_pages created/verified.');

    // Seed existing pre-built pages into generated_pages
    const pagesToSeed = [
      { title: 'Master Tahun', slug: 'master-tahun', table_name: 'master_tahun', icon: 'Layout' },
      { title: 'Master Tematik', slug: 'master-tematik', table_name: 'master_tematik', icon: 'Layout' },
      { title: 'Master Aplikasi Eksternal', slug: 'master-aplikasi-external', table_name: 'master_aplikasi_external', icon: 'Layout' },
      { title: 'Master Urusan', slug: 'master-urusan', table_name: 'master_urusan', icon: 'Layout' },
      { title: 'Master Bidang', slug: 'master-bidang', table_name: 'master_bidang', icon: 'Layout' },
      { title: 'Master Instansi Daerah', slug: 'master-instansi-daerah', table_name: 'master_instansi_daerah', icon: 'Layout' },
      { title: 'Master Jenis Dokumen', slug: 'master-jenis-dokumen', table_name: 'master_jenis_dokumen', icon: 'Layout' },
      { title: 'Master Jenis Kegiatan', slug: 'master-jenis-kegiatan', table_name: 'master_jenis_kegiatan', icon: 'Layout' },
      { title: 'Master Jenis Pegawai', slug: 'master-jenis-pegawai', table_name: 'master_jenis_pegawai', icon: 'Layout' },
      { title: 'Petunjuk Teknis', slug: 'petunjuk-teknis', table_name: '-', icon: 'BookOpen' },
      { title: 'Kelola Menu', slug: 'kelola-menu', table_name: 'kelola_menu', icon: 'LayoutDashboard' },
      { title: 'Pelabelan Tabel', slug: 'pelabelan-tabel', table_name: 'table_labels', icon: 'Database' },
      { title: 'Buat Master Data', slug: 'buat-master-data', table_name: 'master_data_config', icon: 'Database' },
      { title: 'Generator Halaman', slug: 'generator-halaman', table_name: 'generated_pages', icon: 'FileCheck' },
    ];

    for (const p of pagesToSeed) {
      await pool.query(
        'INSERT IGNORE INTO generated_pages (title, slug, table_name, icon) VALUES (?, ?, ?, ?)',
        [p.title, p.slug, p.table_name, p.icon]
      );
    }
    console.log('Seeded pre-existing pages into generated_pages (if not already exist).');

    // Seed existing master tables into master_data_config
    const tablesToSeed = [
      { name: 'master_tahun', label: 'Master Tahun' },
      { name: 'master_tematik', label: 'Master Tematik' },
      { name: 'master_aplikasi_external', label: 'Master Aplikasi Eksternal' },
      { name: 'master_urusan', label: 'Master Urusan' },
      { name: 'master_bidang', label: 'Master Bidang' },
      { name: 'master_instansi_daerah', label: 'Master Instansi Daerah' },
      { name: 'master_jenis_dokumen', label: 'Master Jenis Dokumen' },
      { name: 'master_jenis_kegiatan', label: 'Master Jenis Kegiatan' },
      { name: 'master_jenis_pegawai', label: 'Master Jenis Pegawai' }
    ];

    console.log('Seeding existing master tables into master_data_config...');
    for (const t of tablesToSeed) {
      const [existing] = await pool.query('SELECT id FROM master_data_config WHERE nama_tabel = ?', [t.name]);
      if (existing.length === 0) {
        const [columns] = await pool.query(`SHOW COLUMNS FROM \`${t.name}\``);
        const kolomDef = [];
        for (const col of columns) {
          if (['id', 'created_at', 'updated_at', 'deleted_at', 'created_by', 'updated_by', 'deleted_by'].includes(col.Field)) continue;

          let tipe = 'string';
          if (col.Type.includes('int')) tipe = 'number';
          else if (col.Type.includes('text')) tipe = 'text';
          else if (col.Type.includes('date')) tipe = 'date';
          else if (col.Type.includes('decimal')) tipe = 'decimal';

          kolomDef.push({
            nama: col.Field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            nama_db: col.Field,
            tipe: tipe,
            wajib: col.Null === 'NO'
          });
        }

        await pool.query(
          'INSERT INTO master_data_config (nama_tabel, label, kolom, is_active) VALUES (?, ?, ?, 1)',
          [t.name, t.label, JSON.stringify(kolomDef)]
        );
        console.log(`Seeded config for ${t.name}`);
      }
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
