const pool = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function seedSuperAdmin() {
    try {
        console.log('Starting superadmin seed...');

        // Check if user already exists
        const [existing] = await pool.query('SELECT * FROM users WHERE username = ?', ['superadmin']);
        if (existing.length > 0) {
            console.log('Superadmin user already exists!');
            console.log('Username: superadmin');
            console.log('If you forgot the password, please delete the user or update its password manually.');
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        // 1. Create profil_pegawai first
        const [profilResult] = await pool.query(`
            INSERT INTO profil_pegawai 
            (nama_lengkap, email, no_hp, tipe_user_id, is_active)
            VALUES (?, ?, ?, ?, ?)
        `, [
            'Super Administrator',
            'superadmin@example.com',
            '081234567890',
            1, // tipe_user_id
            1  // is_active
        ]);

        const profilId = profilResult.insertId;

        // 2. Create user with FK to profil_pegawai
        await pool.query(`
            INSERT INTO users 
            (profil_pegawai_id, username, password)
            VALUES (?, ?, ?)
        `, [profilId, 'superadmin', hashedPassword]);

        console.log('✅ Superadmin created successfully!');
        console.log('-----------------------------------');
        console.log('Login Details:');
        console.log('Username: superadmin');
        console.log('Password: admin123');
        console.log('-----------------------------------');

    } catch (err) {
        console.error('Error seeding superadmin:', err);
    } finally {
        process.exit();
    }
}

seedSuperAdmin();
