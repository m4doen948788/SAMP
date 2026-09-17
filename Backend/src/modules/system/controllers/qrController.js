const { generateQRWithLogo } = require('../../../utils/qrGenerator');
const path = require('path');
const fs = require('fs');

const qrController = {
    /**
     * GET /api/public/qr/generate
     * Query Params:
     * - text: The content of the QR code
     * - logo: (Optional) Relative path to logo from project root, e.g., /uploads/logo.png
     * - size: (Optional) Pixel size, default 300
     */
    generate: async (req, res) => {
        try {
            const { text, logo, size } = req.query;

            if (!text) {
                return res.status(400).json({ success: false, message: 'Text parameter is required' });
            }

            let absoluteLogoPath = null;
            if (logo) {
                let cleanPath = logo;
                
                // If it's a full URL, try to extract the relative path
                if (logo.startsWith('http')) {
                    try {
                        const url = new URL(logo);
                        cleanPath = url.pathname;
                    } catch (e) {
                        // Not a valid URL, keep as is
                    }
                }

                // Normalize: remove leading slash for path.resolve
                if (cleanPath.startsWith('/')) {
                    cleanPath = cleanPath.substring(1);
                }

                // Resolve relative to backend root
                // This assumes the backend is running from the 'Backend' folder
                absoluteLogoPath = path.resolve(__dirname, '../../../../', cleanPath);

                // Verification
                if (!fs.existsSync(absoluteLogoPath)) {
                    console.warn(`Logo path not found: ${absoluteLogoPath}`);
                    absoluteLogoPath = null;
                }
            }

            const qrSize = parseInt(size) || 300;
            const buffer = await generateQRWithLogo(text, absoluteLogoPath, qrSize);

            // Set appropriate headers for an image response
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
            res.send(buffer);
        } catch (err) {
            console.error('QR Controller Error:', err);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }
};

module.exports = qrController;
