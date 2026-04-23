const pool = require('./src/config/db');

async function checkPenunjangUnder47() {
    const [bidangs] = await pool.query("SELECT * FROM master_bidang_urusan WHERE parent_id = 47");
    console.log('--- Bidangs:', JSON.stringify(bidangs, null, 2));
    
    if (bidangs.length > 0) {
        const bidangIds = bidangs.map(b => b.id);
        const [programs] = await pool.query("SELECT * FROM master_program WHERE urusan_id IN (?)", [bidangIds]);
        console.log('--- Programs:', JSON.stringify(programs, null, 2));
    }
    process.exit(0);
}

checkPenunjangUnder47();
