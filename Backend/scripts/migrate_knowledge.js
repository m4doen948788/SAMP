const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log("Starting Nayaxa Dynamic Knowledge migration...");

    try {
        // 1. Create nayaxa_knowledge table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS nayaxa_knowledge (
                id INT AUTO_INCREMENT PRIMARY KEY,
                feature_name VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                context_rules JSON NULL,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log("Table 'nayaxa_knowledge' created/verified.");

        // 2. Insert initial knowledge (Orchestrator Logic)
        const [existing] = await connection.query("SELECT id FROM nayaxa_knowledge WHERE feature_name = 'Orchestrator Data'");
        if (existing.length === 0) {
            await connection.query(`
                INSERT INTO nayaxa_knowledge (feature_name, description, context_rules) 
                VALUES (
                    'Orchestrator Data', 
                    'Nayaxa bertindak sebagai penghubung lintas sektor. Jika ditanya tentang isu kompleks seperti TBC atau Kemiskinan, AI harus mencoba menghubungkan data Kesehatan, Sosial, dan Ekonomi.',
                    '{"priority": "high", "logic": "cross-sectoral"}'
                )
            `);
            console.log("Initial knowledge inserted.");
        }

    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        await connection.end();
        process.exit(0);
    }
}

migrate();
