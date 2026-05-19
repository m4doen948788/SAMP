const { createCanvas, loadImage } = require('canvas');

async function analyze() {
    const img = await loadImage('d:/copy-dashboard/Frontend/public/favicon.png');
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imgData.data;

    let semiTransparentCount = 0;
    let samplePixels = [];

    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            const i = (y * img.width + x) * 4;
            const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
            if (a > 0 && a < 255) {
                semiTransparentCount++;
                if (samplePixels.length < 10) {
                    samplePixels.push({x, y, rgba: `[${r},${g},${b},${a}]`});
                }
            }
        }
    }

    console.log(`Total semi-transparent pixels: ${semiTransparentCount}`);
    console.log("Sample edge pixels:", samplePixels);
}

analyze().catch(console.error);
