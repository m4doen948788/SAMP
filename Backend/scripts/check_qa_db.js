const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  console.log('--- SIMULATING GETALL QUERY FOR USER ID 1 ---');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    const currentUserId = 1; // sammyl

    let query = `
      SELECT 
        a.id,
        a.nama_aplikasi,
        l.jenis_link AS nama_tipe_link,
        p.bidang_id AS creator_bidang_id,
        mbi.nama_bidang AS creator_nama_bidang,
        mbi.singkatan AS creator_singkatan_bidang,
        COALESCE(p_creator.nama_lengkap, u_creator.username, 'Admin') AS created_by_name,
        p_updater.nama_lengkap AS updated_by_name
    `;

    query += `, (CASE WHEN uqp.id IS NOT NULL THEN 1 ELSE 0 END) AS user_is_qa_personal, COALESCE(uqp.urutan, 0) AS personal_urutan `;

    query += `
      FROM master_aplikasi_external a 
      LEFT JOIN master_link l ON a.tipe_link_id = l.id AND l.deleted_at IS NULL 
      LEFT JOIN users u ON a.created_by = u.id 
      LEFT JOIN profil_pegawai p ON u.profil_pegawai_id = p.id 
      LEFT JOIN master_bidang_instansi mbi ON p.bidang_id = mbi.id 
      LEFT JOIN users u_creator ON a.created_by = u_creator.id
      LEFT JOIN profil_pegawai p_creator ON u_creator.profil_pegawai_id = p_creator.id
      LEFT JOIN users u_updater ON a.updated_by = u_updater.id
      LEFT JOIN profil_pegawai p_updater ON u_updater.profil_pegawai_id = p_updater.id
    `;

    const params = [];
    query += ` LEFT JOIN user_qa_personal uqp ON a.id = uqp.aplikasi_external_id AND uqp.user_id = ? `;
    params.push(currentUserId);

    query += ` WHERE a.deleted_at IS NULL `;
    query += ` ORDER BY a.urutan ASC, a.id DESC `;

    const [rows] = await pool.query(query, params);
    
    console.log(`\nQuery results for User ID ${currentUserId}:`);
    rows.forEach(r => {
      if (r.user_is_qa_personal === 1 || r.personal_urutan > 0) {
        console.log(`- App ID: ${r.id}, Name: ${r.nama_aplikasi}, QA Personal: ${r.user_is_qa_personal}, Personal Urutan: ${r.personal_urutan}`);
      }
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  }

  await pool.end();
}

run();
