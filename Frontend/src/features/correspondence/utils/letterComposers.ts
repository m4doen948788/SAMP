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
 * Get paper dimensions in mm
 */
export const getPaperDimensions = (size: string) => {
    const s = size?.toUpperCase();
    switch(s) {
        case 'F4': return { width: '215mm', height: '330mm' };
        case 'LETTER': return { width: '215.9mm', height: '279.4mm' };
        default: return { width: '210mm', height: '297mm' };
    }
};

/**
 * Generate CSS style block for letter content settings
 */
export const getLetterContentStyle = (settings: { 
    paragraph_spacing_before?: number, 
    paragraph_spacing_after?: number, 
    first_line_indent?: number 
}) => {
    return `
        #letter-content p, .document-content p { 
            margin-top: ${settings.paragraph_spacing_before || 0}pt;
            margin-bottom: ${settings.paragraph_spacing_after || 0}pt;
            text-indent: ${settings.first_line_indent || 0}mm;
        }
    `;
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

import { getEmployeeLevel } from '../components/StructuredLeaveForm';

/**
 * Compose HTML for Leave Request Letter (Surat Cuti)
 */
export const composeLeaveLetterHtml = (data: any, employee: any): string => {
    const durasi = calculateDuration(data.isi?.tgl_mulai, data.isi?.tgl_selesai);
    const durasiTerbilang = terbilangIndo(durasi);
    
    const tglMulai = formatDateIndo(data.isi?.tgl_mulai);
    const tglSelesai = formatDateIndo(data.isi?.tgl_selesai);

    const empLvl = getEmployeeLevel(employee?.jabatan_nama);
    const gapHeight = empLvl >= 5 ? '25px' : (empLvl === 4 ? '50px' : '85px');

    const destinationHtml = `
        <div style="margin-bottom: 15px;">
            <p style="margin: 0;">Yth.</p>
            <p style="margin: 0; padding-left: 0;">${data.tujuan?.jabatan || 'Kepala Badan...'}</p>
            <p style="margin: 0;">Di</p>
            <p style="margin: 0; padding-left: 20px;">${data.tujuan?.lokasi || 'Tempat'}</p>
        </div>
    `;

    const bodyHtml = `
        ${destinationHtml}
        <p style="margin-bottom: 10px;">${data.pembuka || 'Saya yang bertandatangan di bawah ini:'}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; line-height: 1.2;">
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

        <p>
            ${data.isi?.kalimat_pengantar || 'Dengan ini mengajukan permintaan Cuti Tahunan untuk Tahun ' + (data.isi?.tahun || new Date().getFullYear())} 
            ${durasi > 0 ? `selama ${durasi} (${durasiTerbilang}) hari kerja, ` : ''}
            terhitung mulai tanggal ${tglMulai} sampai dengan ${tglSelesai} 
            dikarenakan ${data.isi?.alasan || '...'}.
        </p>

        <p style="margin-top: 10px;">
            Selama menjalankan cuti Alamat saya adalah di ${data.alamat_cuti || '...'}.
        </p>

        <p style="margin-top: 10px; margin-bottom: 5px;">
            ${data.penutup || 'Demikian permintaan ini saya buat untuk dapat dipertimbangkan sebagaimana mestinya.'}
        </p>
    `;

    const footerTablesHtml = `
        <table style="width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 8pt; margin-top: 5px;">
            <tr>
                <td style="width: 50%; border: 1px solid black; padding: 0; vertical-align: top;">
                    <div style="font-weight: bold; text-align: center; padding: 4px; border-bottom: 1px solid black;">
                        CATATAN PEJABAT KEPEGAWAIAN
                    </div>
                    <div style="padding: 4px;">
                        Cuti yang telah diambil dalam tahun yang bersangkutan :
                    </div>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="width: 5%; border: 1px solid black; border-left: none; padding: 2px 4px;">1.</td>
                            <td style="width: 55%; border: 1px solid black; padding: 2px 4px;">Cuti Tahunan</td>
                            <td style="width: 40%; border: 1px solid black; border-right: none; padding: 2px 4px;">: ........</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid black; border-left: none; padding: 2px 4px;">2.</td>
                            <td style="border: 1px solid black; padding: 2px 4px;">Cuti Besar</td>
                            <td style="border: 1px solid black; border-right: none; padding: 2px 4px;">: ........</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid black; border-left: none; padding: 2px 4px;">3.</td>
                            <td style="border: 1px solid black; padding: 2px 4px;">Cuti Sakit</td>
                            <td style="border: 1px solid black; border-right: none; padding: 2px 4px;">: ........</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid black; border-left: none; padding: 2px 4px;">4.</td>
                            <td style="border: 1px solid black; padding: 2px 4px;">Cuti Bersalin</td>
                            <td style="border: 1px solid black; border-right: none; padding: 2px 4px;">: ........</td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid black; border-left: none; padding: 2px 4px;">5.</td>
                            <td style="border: 1px solid black; padding: 2px 4px;">Cuti Karena Alasan Penting</td>
                            <td style="border: 1px solid black; border-right: none; padding: 2px 4px;">: ........</td>
                        </tr>
                        <tr>
                            <td style="border: none; padding: 2px 4px;">6.</td>
                            <td style="border: none; padding: 2px 4px;">Keterangan lain-lain</td>
                            <td style="border: none; padding: 2px 4px;">: ........</td>
                        </tr>
                    </table>
                </td>
                <td style="width: 50%; border: 1px solid black; padding: 0; vertical-align: top;">
                    ${empLvl >= 5 ? `
                    <div style="border-bottom: 1px solid black; padding: 4px;">
                        <div style="font-weight: bold; margin-bottom: 4px; font-size: 0.95em;">CATATAN/PERTIMBANGAN ATASAN LANGSUNG:</div>
                        <p style="margin: 0; line-height: 1;">...........................................................................................</p>
                        <div style="text-align: center; margin-top: 4px;">
                            <p style="margin: 0;">${data.approvers?.ketua_tim?.jabatan_nama || 'Ketua Tim / Atasan Langsung'}</p>
                            <div style="height: ${gapHeight}; display: flex; align-items: center; justify-content: center;" data-signature-role="ketua_tim" data-approver-id="${data.approvers?.ketua_tim?.user_id || ''}"></div>
                            <p style="margin: 0; font-weight: bold;"><u>${data.approvers?.ketua_tim?.nama_lengkap || '.......................................................'}</u></p>
                            <p style="margin: 0;">NIP. ${data.approvers?.ketua_tim?.nip || '...........................................'}</p>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${empLvl >= 4 ? `
                    <div style="border-bottom: 1px solid black; padding: 4px; text-align: center;">
                        <p style="margin: 0;">Mengetahui/Menyetujui,</p>
                        <p style="margin: 0;">${data.approvers?.kepala_bidang?.jabatan_nama || 'Kepala Bidang/Bagian'}</p>
                        <div style="height: ${gapHeight}; display: flex; align-items: center; justify-content: center;" data-signature-role="kabid" data-approver-id="${data.approvers?.kepala_bidang?.user_id || ''}"></div>
                        <p style="margin: 0; font-weight: bold;"><u>${data.approvers?.kepala_bidang?.nama_lengkap || '.......................................................'}</u></p>
                        <p style="margin: 0;">NIP. ${data.approvers?.kepala_bidang?.nip || '...........................................'}</p>
                    </div>
                    ` : ''}

                    <div style="padding: 4px;">
                        <div style="font-weight: bold; margin-bottom: 4px; font-size: 0.95em;">KEPUTUSAN PEJABAT YANG BERWENANG MEMBERIKAN CUTI:</div>
                        <p style="margin: 0; line-height: 1;">...........................................................................................</p>
                        <div style="text-align: center; margin-top: 4px;">
                            <p style="margin: 0; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                <span>${data.approvers?.kepala_badan?.jabatan_nama ? data.approvers.kepala_badan.jabatan_nama + ',' : 'Kepala Badan/Instansi,'}</span>
                                <span style="display: inline-flex; align-items: center;" data-signature-role="sekretaris" data-approver-id="${data.approvers?.sekretaris?.user_id || ''}"></span>
                            </p>
                            <div style="height: ${gapHeight}; display: flex; align-items: center; justify-content: center;" data-signature-role="kaban" data-approver-id="${data.approvers?.kepala_badan?.user_id || ''}"></div>
                            <p style="margin: 0; font-weight: bold;"><u>${data.approvers?.kepala_badan?.nama_lengkap || '.......................................................'}</u></p>
                            <p style="margin: 0;">NIP. ${data.approvers?.kepala_badan?.nip || '...........................................'}</p>
                        </div>
                    </div>
                </td>
            </tr>
        </table>
    `;

    const signatureHtml = `
        <div style="width: 100%; margin-top: 5px; margin-bottom: 5px;">
            <table style="width: 100%;">
                <tr>
                    <td style="width: 50%;"></td>
                    <td style="width: 50%; text-align: center;">
                        <div style="display: inline-block; text-align: left;">
                            Hormat saya,<br/>
                            <div style="height: 40px; display: flex; align-items: center; justify-content: center;" data-signature-role="pengusul" data-approver-id="${employee?.user_id || employee?.id || ''}"></div>
                            <u><strong>${employee?.nama_lengkap?.toUpperCase() || 'NAMA PENGUSUL'}</strong></u><br/>
                            ${employee?.nip ? 'NIP. ' + employee.nip : ''}
                        </div>
                    </td>
                </tr>
            </table>
        </div>
    `;

    return bodyHtml + signatureHtml + footerTablesHtml;
};
