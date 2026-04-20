const { Document, Packer, Paragraph, TextRun, AlignmentType } = require('docx');
const fs = require('fs');
const path = require('path');

async function generateTemplate() {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: "{nama_instansi}", bold: true, size: 28 }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: "{alamat_instansi}", size: 20 }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: "Telp: {telepon_instansi} | Email: {email_instansi}", size: 18 }),
                    ],
                }),
                new Paragraph({ children: [new TextRun({ text: "__________________________________________________________________", bold: true })] }),
                new Paragraph({ children: [new TextRun({ text: "" })] }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Nomor: {nomor_surat}", bold: true }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Perihal: {perihal}", bold: true }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                        new TextRun({ text: "Bogor, {tanggal_format}" }),
                    ],
                }),
                new Paragraph({ children: [new TextRun({ text: "" })] }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Kepada Yth," }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "{tujuan}", bold: true }),
                    ],
                }),
                new Paragraph({ children: [new TextRun({ text: "" })] }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "{isi}" }),
                    ],
                }),
                new Paragraph({ children: [new TextRun({ text: "" })] }),
                new Paragraph({ children: [new TextRun({ text: "" })] }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                        new TextRun({ text: "{jabatan}" }),
                    ],
                }),
                new Paragraph({ children: [new TextRun({ text: "" })] }),
                new Paragraph({ children: [new TextRun({ text: "" })] }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                        new TextRun({ text: "{nama_pejabat}", bold: true, underline: {} }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                        new TextRun({ text: "NIP. {nip_pejabat}" }),
                    ],
                }),
            ],
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    const dir = path.join(__dirname, '../templates');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(path.join(dir, 'template_surat_undangan.docx'), buffer);
    console.log("Template generated successfully at Backend/templates/template_surat_undangan.docx");
}

generateTemplate();
