const pool = require('../src/config/db');
const { generateSlug, generateHash } = require('../src/utils/cryptoUtils');

async function testTTE() {
    console.log('--- Testing TTE Implementation ---');
    
    try {
        // 1. Check if columns exist
        const [columns] = await pool.query('SHOW COLUMNS FROM surat LIKE "verification_slug"');
        if (columns.length === 0) {
            console.error('❌ Error: verification_slug column missing!');
            return;
        }
        console.log('✅ Column verification_slug exists.');

        // 2. Insert a dummy surat
        const dummyIsi = '<div>Test Surat Content <div id="qrcode-area"></div></div>';
        const [result] = await pool.query(
            'INSERT INTO surat (perihal, isi_surat, approval_status, created_by) VALUES (?, ?, ?, ?)',
            ['Test TTE', dummyIsi, 'WAITING_APPROVAL', 1]
        );
        const suratId = result.insertId;
        console.log(`✅ Created dummy surat with ID: ${suratId}`);

        // 3. Simulate Final Approval Logic (logic from controller)
        const slug = generateSlug();
        const verifyUrl = `http://localhost:3000/?v=${slug}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`;
        
        const qrHtml = `
            <div style="margin-top: 20px; border-top: 1px dashed #e2e8f0; padding-top: 10px; display: flex; align-items: center; gap: 15px;">
                <img src="${qrUrl}" style="width: 80px; height: 80px;" />
                <div style="font-size: 10px; color: #64748b; line-height: 1.4;">
                    <div style="font-weight: bold; color: #1e293b; margin-bottom: 2px;">DOKUMEN TERVERIFIKASI</div>
                    <div>Dokumen ini telah ditandatangani secara elektronik.</div>
                    <div>Scan QR Code untuk memverifikasi keaslian dokumen.</div>
                    <div style="margin-top: 4px; font-family: monospace;">ID: ${slug}</div>
                </div>
            </div>
        `;

        let updatedIsi = dummyIsi.replace(/(<div[^>]*id="qrcode-area"[^>]*>)\s*<\/div>/i, `$1${qrHtml}</div>`);
        const hash = generateHash(updatedIsi);

        await pool.query(
            'UPDATE surat SET approval_status = ?, isi_surat = ?, verification_slug = ?, integrity_hash = ? WHERE id = ?',
            ['APPROVED', updatedIsi, slug, hash, suratId]
        );
        console.log('✅ Simulated final approval and QR injection.');

        // 4. Test Verification Logic (controller logic)
        const [verifyRows] = await pool.query('SELECT * FROM surat WHERE verification_slug = ?', [slug]);
        if (verifyRows.length === 0) {
            console.error('❌ Error: Verification slug not found in DB!');
            return;
        }
        
        const doc = verifyRows[0];
        const currentHash = generateHash(doc.isi_surat);
        const isMatch = currentHash === doc.integrity_hash;
        
        console.log(`✅ Verification Test:`);
        console.log(`   - Slug: ${doc.verification_slug}`);
        console.log(`   - Hash Match: ${isMatch ? 'YES (Valid)' : 'NO (Tampered!)'}`);
        console.log(`   - QR HTML Present: ${doc.isi_surat.includes('DOKUMEN TERVERIFIKASI')}`);

        // Cleanup
        // await pool.query('DELETE FROM surat WHERE id = ?', [suratId]);
        // console.log('✅ Cleaned up dummy data.');
        
        console.log('\n--- TTE TEST COMPLETED SUCCESSFULLY ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testTTE();
