/**
 * Convert number to Indonesian words (Terbilang)
 */
export const terbilangIndo = (n: number): string => {
    const bilangan = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
    if (n < 12) return bilangan[n];
    if (n < 20) return terbilangIndo(n - 10) + " belas";
    if (n < 100) return terbilangIndo(Math.floor(n / 10)) + " puluh " + terbilangIndo(n % 10);
    if (n < 200) return "seratus " + terbilangIndo(n - 100);
    if (n < 1000) return terbilangIndo(Math.floor(n / 100)) + " ratus " + terbilangIndo(n % 100);
    return n.toString();
};

/**
 * Format date to Indonesian long format (e.g., 13 Maret 2026)
 */
export const formatDateIndo = (dateStr: string): string => {
    if (!dateStr) return "...";
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
        return "...";
    }
};

/**
 * Calculate duration between two dates (inclusive)
 */
export const calculateDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    // Set to midnight to avoid issues with DST/timezones
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
};

/**
 * Compose HTML for Leave Request Letter (Surat Cuti)
 */
export const composeLeaveLetterHtml = (data: any, employee: any): string => {
    const durasi = calculateDuration(data.isi?.tgl_mulai, data.isi?.tgl_selesai);
    const durasiTerbilang = terbilangIndo(durasi);
    
    const tglMulai = formatDateIndo(data.isi?.tgl_mulai);
    const tglSelesai = formatDateIndo(data.isi?.tgl_selesai);

    const destinationHtml = `
        <div style="margin-bottom: 25px;">
            <p style="margin: 0;">Yth.</p>
            <p style="margin: 0; padding-left: 0;">${data.tujuan?.jabatan || 'Kepala Badan...'}</p>
            <p style="margin: 0;">Di</p>
            <p style="margin: 0; padding-left: 20px;">${data.tujuan?.lokasi || 'Tempat'}</p>
        </div>
    `;

    const bodyHtml = `
        ${destinationHtml}
        <p style="margin-bottom: 15px;">${data.pembuka || 'Saya yang bertandatangan di bawah ini:'}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <tr>
                <td style="width: 28%;">Nama</td>
                <td style="width: 2%;">:</td>
                <td style="font-weight: bold;">${employee?.nama_lengkap || '...'}</td>
            </tr>
            <tr>
                <td>NIP.</td>
                <td>:</td>
                <td>${employee?.nip || '...'}</td>
            </tr>
            <tr>
                <td>Pangkat/Gol. Ruang</td>
                <td>:</td>
                <td>${employee?.pangkat_golongan_nama || '...'}</td>
            </tr>
            <tr>
                <td>Jabatan</td>
                <td>:</td>
                <td>${employee?.jabatan_nama || '...'}</td>
            </tr>
            <tr>
                <td>Unit Organisasi</td>
                <td>:</td>
                <td>${employee?.instansi_nama || '...'}</td>
            </tr>
        </table>

        <p style="text-align: justify; line-height: 1.5;">
            ${data.isi?.kalimat_pengantar || 'Dengan ini mengajukan permintaan Cuti Tahunan untuk Tahun ' + (data.isi?.tahun || new Date().getFullYear())} 
            selama ${durasi} (${durasiTerbilang}) hari kerja, 
            terhitung mulai tanggal ${tglMulai} sampai dengan ${tglSelesai} 
            dikarenakan ${data.isi?.alasan || '...'}.
        </p>

        <p style="margin-top: 15px;">
            Selama menjalankan cuti Alamat saya adalah di ${data.alamat_cuti || '...'}.
        </p>

        <p style="margin-top: 15px; margin-bottom: 30px;">
            ${data.penutup || 'Demikian permintaan ini saya buat untuk dapat dipertimbangkan sebagaimana mestinya.'}
        </p>
    `;

    const footerTablesHtml = `
        <table style="width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 9pt; margin-top: 20px;">
            <thead>
                <tr style="background-color: #f8f9fa; text-align: center;">
                    <th style="border: 1px solid black; padding: 8px; width: 33%;">CATATAN PEJABAT KEPEGAWAIAN</th>
                    <th style="border: 1px solid black; padding: 8px; width: 33%;">CATATAN/PERTIMBANGAN ATASAN LANGSUNG:</th>
                    <th style="border: 1px solid black; padding: 8px; width: 34%;">KEPUTUSAN PEJABAT YANG BERWENANG MEMBERIKAN CUTI:</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="border: 1px solid black; padding: 8px; vertical-align: top;">
                        <p style="margin-bottom: 5px;">Cuti yang telah diambil dalam tahun yang bersangkutan :</p>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="width: 5%;">1.</td><td style="width: 60%;">Cuti Tahunan</td><td>: ........</td></tr>
                            <tr><td>2.</td><td>Cuti Besar</td><td>: ........</td></tr>
                            <tr><td>3.</td><td>Cuti Sakit</td><td>: ........</td></tr>
                            <tr><td>4.</td><td>Cuti Bersalin</td><td>: ........</td></tr>
                            <tr><td>5.</td><td>Cuti Alasan Penting</td><td>: ........</td></tr>
                            <tr><td>6.</td><td>Keterangan lain-lain</td><td>: ........</td></tr>
                        </table>
                    </td>
                    <td style="border: 1px solid black; padding: 15px; vertical-align: top; text-align: center;">
                        <div style="height: 60px;"></div>
                        <p>...........................................................</p>
                        <p>NIP. ...................................................</p>
                    </td>
                    <td style="border: 1px solid black; padding: 15px; vertical-align: top; text-align: center;">
                        <p style="margin-bottom: 40px;">Kepala Badan,</p>
                        <p><strong><u>DR. BAMBAM SETIA AJI, S.T., M.B.A.</u></strong></p>
                        <p>NIP. 197305012005011009</p>
                    </td>
                </tr>
            </tbody>
        </table>
    `;

    return bodyHtml + footerTablesHtml;
};
