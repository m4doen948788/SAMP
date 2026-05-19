const { createCanvas, loadImage } = require('canvas');

async function checkBackground(imagePath) {
    const img = await loadImage(imagePath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imgData.data;

    let pixels = [];
    for (let y = 0; y < 128; y+=8) {
        let row = [];
        for (let x = 0; x < 128; x+=8) {
            let i = (y * img.width + x) * 4;
            row.push(`[${data[i]},${data[i+1]},${data[i+2]}]`);
        }
        pixels.push(row.join(' '));
    }
    console.log("8x8 step pixels:");
    console.log(pixels.join('\n'));
}

checkBackground('d:/copy-dashboard/Frontend/public/favicon.png').catch(console.error);
