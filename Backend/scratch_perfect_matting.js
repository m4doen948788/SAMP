const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

const darkBg = {r: 50.5, g: 50.5, b: 50.5};
const lightBg = {r: 86.5, g: 86.5, b: 86.5};

function getBgColor(x, y) {
    const cx = Math.floor(x / 16);
    const cy = Math.floor(y / 16);
    return ((cx + cy) % 2 === 0) ? darkBg : lightBg;
}

async function runMatting(inputPath, outputPath) {
    const img = await loadImage(inputPath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imgData.data;
    const width = img.width;
    const height = img.height;

    const t1 = 18; // threshold 1 (pure background)
    const t2 = 70; // threshold 2 (pure foreground)

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];

            const bg = getBgColor(x, y);
            const dist = Math.sqrt(
                Math.pow(r - bg.r, 2) +
                Math.pow(g - bg.g, 2) +
                Math.pow(b - bg.b, 2)
            );

            if (dist < t1) {
                // Pure background
                data[i+3] = 0;
            } else if (dist > t2) {
                // Pure foreground
                data[i+3] = 255;
            } else {
                // Semi-transparent edge (blend)
                const alpha = (dist - t1) / (t2 - t1);
                data[i+3] = Math.round(alpha * 255);

                // Reconstruct foreground color to prevent background bleeding
                // F = (C - (1 - alpha)*B) / alpha
                const rf = Math.min(255, Math.max(0, Math.round((r - (1 - alpha) * bg.r) / alpha)));
                const gf = Math.min(255, Math.max(0, Math.round((g - (1 - alpha) * bg.g) / alpha)));
                const bf = Math.min(255, Math.max(0, Math.round((b - (1 - alpha) * bg.b) / alpha)));

                data[i] = rf;
                data[i+1] = gf;
                data[i+2] = bf;
            }
        }
    }

    ctx.putImageData(imgData, 0, 0);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Saved perfectly matted image to ${outputPath}`);
}

runMatting(
    'C:/Users/mufli/.gemini/antigravity/brain/ea23e7ea-4038-4a82-bde9-906f9efb31ee/scratch/favicon.png',
    'd:/copy-dashboard/Frontend/public/favicon.png'
).catch(console.error);
