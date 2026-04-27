const pool = require('../src/config/db');

async function migrate() {
    try {
        console.log('--- Migrasi Tambah Kolom Template Isi Surat ---');

        // 1. Tambah kolom isi_template
        console.log('Menambah kolom isi_template ke surat_templates...');
        try {
            await pool.query(`ALTER TABLE surat_templates ADD COLUMN isi_template TEXT AFTER paper_size`);
            console.log('✅ Kolom isi_template berhasil ditambahkan.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Kolom isi_template sudah ada.');
            } else {
                throw e;
            }
        }

        // 2. Update default templates with base structure
        console.log('Updating default templates...');
        
        const cutiTemplate = `
            <p>Saya yang bertandatangan di bawah ini:</p>
            <table style="width: 100%;">
                <tbody>
                    <tr><td style="width: 25%;">Nama</td><td style="width: 2%;">:</td><td>{{nama}}</td></tr>
                    <tr><td>NIP</td><td>:</td><td>{{nip}}</td></tr>
                    <tr><td>Pangkat/Gol.</td><td>:</td><td>{{pangkat_golongan}}</td></tr>
                    <tr><td>Jabatan</td><td>:</td><td>{{jabatan}}</td></tr>
                    <tr><td>Unit Kerja</td><td>:</td><td>{{instansi}}</td></tr>
                </tbody>
            </table>
            <p><br></p>
            <p>Dengan ini mengajukan permohonan Cuti Tahunan untuk Tahun {{tahun}} selama {{durasi}} hari kerja, terhitung mulai tanggal {{tanggal_mulai}} sampai dengan {{tanggal_selesai}} dikarenakan keperluan keluarga.</p>
            <p><br></p>
            <p>Selama menjalankan cuti alamat saya adalah di {{alamat_cuti}}.</p>
            <p><br></p>
            <p>Demikian permintaan ini saya buat untuk dapat dipertimbangkan sebagaimana mestinya.</p>
            <p><br></p>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid black;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="border: 1px solid black; padding: 5px;">CATATAN PEJABAT KEPEGAWAIAN</th>
                        <th style="border: 1px solid black; padding: 5px;">PERTIMBANGAN ATASAN LANGSUNG</th>
                        <th style="border: 1px solid black; padding: 5px;">KEPUTUSAN PEJABAT BERWENANG</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border: 1px solid black; padding: 10px; vertical-align: top; width: 33%;">
                            <p>Cuti yang telah diambil dalam tahun berjalan:</p>
                            <ol>
                                <li>Cuti Tahunan : ....</li>
                                <li>Cuti Besar : ....</li>
                                <li>Cuti Sakit : ....</li>
                                <li>Cuti Bersalin : ....</li>
                                <li>Cuti Karena Alasan Penting : ....</li>
                                <li>Keterangan lain-lain : ....</li>
                            </ol>
                        </td>
                        <td style="border: 1px solid black; padding: 10px; vertical-align: top; width: 33%; text-align: center;">
                            <p><br></p>
                            <p><strong>{{jabatan_atasan}}</strong></p>
                            <p><br></p>
                            <p><br></p>
                            <p><strong><u>{{nama_atasan}}</u></strong><br>NIP. {{nip_atasan}}</p>
                        </td>
                        <td style="border: 1px solid black; padding: 10px; vertical-align: top; width: 33%; text-align: center;">
                            <p><br></p>
                            <p><strong>KEPALA BADAN</strong></p>
                            <p><br></p>
                            <p><br></p>
                            <p><strong><u>DR. BAMBAM SETIA AJI, S.T., M.B.A.</u></strong><br>NIP. 197305012005011009</p>
                        </td>
                    </tr>
                </tbody>
            </table>
        `;

        const undanganTemplate = `
            <p>Sehubungan dengan pelaksanaan sinergitas dan harmonisasi perencanaan pembangunan daerah dalam rangka mendukung percepatan pengentasan kemiskinan, maka akan dilaksanakan rapat koordinasi pada:</p>
            <table style="width: 100%;">
                <tbody>
                    <tr><td style="width: 20%;">Hari/Tanggal</td><td style="width: 2%;">:</td><td>{{hari_tanggal_kegiatan}}</td></tr>
                    <tr><td>Waktu</td><td>:</td><td>{{waktu_kegiatan}}</td></tr>
                    <tr><td>Tempat</td><td>:</td><td>{{tempat_kegiatan}}</td></tr>
                    <tr><td>Agenda</td><td>:</td><td>{{agenda_kegiatan}}</td></tr>
                </tbody>
            </table>
            <p><br></p>
            <p>Untuk kelancaran agenda dimaksud, agar dapat menghadirkan Pejabat Pelaksana Teknis (PPTK) sebagaimana terlampir, dan dapat mempersiapkan input data ke tautan berikut: <a href="https://bit.ly/FORMAT-DESK-TKPKD">https://bit.ly/FORMAT-DESK-TKPKD</a>.</p>
            <p><br></p>
            <p>Demikian disampaikan, atas kehadirannya diucapkan terima kasih.</p>
        `;

        await pool.query('UPDATE surat_templates SET isi_template = ? WHERE nama_jenis_surat = "Surat Cuti"', [cutiTemplate]);
        await pool.query('UPDATE surat_templates SET isi_template = ? WHERE nama_jenis_surat = "Surat Undangan/Keluar"', [undanganTemplate]);

        console.log('✅ Migrasi Berhasil!');
    } catch (err) {
        console.error('❌ Migrasi Gagal:', err.message);
    } finally {
        process.exit();
    }
}

migrate();
