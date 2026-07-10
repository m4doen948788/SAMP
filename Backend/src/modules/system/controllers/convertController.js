const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const os = require('os');

// Common LibreOffice paths across platforms
const LIBREOFFICE_CANDIDATES = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    '/usr/bin/soffice',
    '/usr/lib/libreoffice/program/soffice',
    '/opt/libreoffice7.6/program/soffice',
    '/opt/libreoffice/program/soffice',
    'soffice',       // Linux PATH
    'soffice.exe',   // Windows PATH
];

const findLibreOffice = () => {
    for (const candidate of LIBREOFFICE_CANDIDATES) {
        // For absolute paths, check if file exists
        if (candidate.includes('/') || candidate.includes('\\')) {
            if (fs.existsSync(candidate)) return candidate;
        } else {
            // Relative commands - assume they're in PATH
            return candidate;
        }
    }
    return null;
};

/**
 * Convert a PPTX file to PDF using LibreOffice and stream the result.
 * Query params:
 *   - path: relative URL path of the file (e.g. /uploads/dashboard/file.pptx)
 */
const convertPptxToPdf = (req, res) => {
    const { path: filePath, api_key } = req.query;

    const NAYAXA_API_KEY = process.env.VITE_NAYAXA_API_KEY || 'NAYAXA-BAPPERIDA-8888-9999-XXXX';
    if (!api_key || api_key !== NAYAXA_API_KEY) {
        return res.status(401).json({ error: 'Akses ditolak. API key tidak valid.' });
    }

    if (!filePath) {
        return res.status(400).json({ error: 'Parameter path diperlukan.' });
    }

    // Sanitize: only allow /uploads/ paths, no directory traversal
    const cleanPath = filePath.split('?')[0]; // remove any query string
    if (!cleanPath.startsWith('/uploads/')) {
        return res.status(403).json({ error: 'Path tidak diizinkan.' });
    }
    if (cleanPath.includes('..')) {
        return res.status(403).json({ error: 'Path tidak valid.' });
    }
    const lowerPath = cleanPath.toLowerCase();
    const isSupported = lowerPath.endsWith('.pptx') || lowerPath.endsWith('.xlsx') || lowerPath.endsWith('.xls');
    if (!isSupported) {
        return res.status(400).json({ error: 'Format file tidak didukung untuk pratinjau.' });
    }

    // Resolve absolute path on filesystem
    const absolutePath = path.join(__dirname, '../../../../uploads', cleanPath.replace('/uploads/', ''));

    if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({ error: `File tidak ditemukan: ${cleanPath}` });
    }

    const libreOfficeBin = findLibreOffice();
    if (!libreOfficeBin) {
        return res.status(503).json({
            error: 'LibreOffice tidak terinstall di server ini. Silakan install LibreOffice untuk mengaktifkan pratinjau PPTX.',
            install: 'https://www.libreoffice.org/download/download/'
        });
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pptx-convert-'));
    const baseName = path.basename(absolutePath, path.extname(absolutePath));
    const outputPdfPath = path.join(tmpDir, `${baseName}.pdf`);

    const args = [
        '--headless',
        '--norestore',
        '--convert-to', 'pdf',
        '--outdir', tmpDir,
        absolutePath
    ];

    execFile(libreOfficeBin, args, { timeout: 60000 }, (err, stdout, stderr) => {
        if (err) {
            // Cleanup
            fs.rmSync(tmpDir, { recursive: true, force: true });
            console.error('[PPTX Convert] LibreOffice error:', err.message, stderr);
            return res.status(500).json({ error: `Konversi gagal: ${err.message}` });
        }

        if (!fs.existsSync(outputPdfPath)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
            return res.status(500).json({ error: 'File PDF hasil konversi tidak ditemukan.' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Cache-Control', 'private, max-age=300'); // Cache 5 menit

        const readStream = fs.createReadStream(outputPdfPath);
        readStream.pipe(res);
        readStream.on('close', () => {
            // Cleanup temp directory after streaming
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });
        readStream.on('error', () => {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });
    });
};

module.exports = { convertPptxToPdf };
