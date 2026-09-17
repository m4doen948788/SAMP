const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');

/**
 * Generates a QR Code with a logo in the center
 * @param {string} text - The data to encode in the QR code
 * @param {string} logoPath - Optional absolute path to the logo image
 * @param {number} size - Size of the QR code (default: 300)
 * @returns {Promise<Buffer>} - Buffer containing the PNG image
 */
async function generateQRWithLogo(text, logoPath = null, size = 300) {
    try {
        // 1. Generate QR Code data as a data URL first to get the basic QR
        // We use a high error correction level (H) to allow for logo overlay
        const qrDataUrl = await QRCode.toDataURL(text, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: size,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // 2. Load the QR image into Canvas
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        const qrImage = await loadImage(qrDataUrl);
        ctx.drawImage(qrImage, 0, 0, size, size);

        // 3. Overlay Logo if provided
        if (logoPath && fs.existsSync(logoPath)) {
            try {
                const logo = await loadImage(logoPath);
                
                // Calculate logo size (roughly 20-25% of QR size)
                const logoSize = size * 0.22;
                const x = (size - logoSize) / 2;
                const y = (size - logoSize) / 2;

                // Draw a white rounded background for the logo to make it pop and preserve QR readability
                const padding = 2;
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                const radius = 4;
                ctx.moveTo(x - padding + radius, y - padding);
                ctx.lineTo(x + logoSize + padding - radius, y - padding);
                ctx.quadraticCurveTo(x + logoSize + padding, y - padding, x + logoSize + padding, y - padding + radius);
                ctx.lineTo(x + logoSize + padding, y + logoSize + padding - radius);
                ctx.quadraticCurveTo(x + logoSize + padding, y + logoSize + padding, x + logoSize + padding - radius, y + logoSize + padding);
                ctx.lineTo(x - padding + radius, y + logoSize + padding);
                ctx.quadraticCurveTo(x - padding, y + logoSize + padding, x - padding, y + logoSize + padding - radius);
                ctx.lineTo(x - padding, y - padding + radius);
                ctx.quadraticCurveTo(x - padding, y - padding, x - padding + radius, y - padding);
                ctx.closePath();
                ctx.fill();

                // Draw the actual logo
                ctx.drawImage(logo, x, y, logoSize, logoSize);
            } catch (logoErr) {
                console.error('Error loading logo for QR:', logoErr.message);
                // Continue without logo if it fails to load
            }
        }

        return canvas.toBuffer('image/png');
    } catch (err) {
        console.error('QR Generation Error:', err);
        throw err;
    }
}

module.exports = { generateQRWithLogo };
