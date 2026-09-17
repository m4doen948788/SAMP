const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

function isChecker(r, g, b) {
    const isDark = (Math.abs(r - 51) <= 12 && Math.abs(g - 51) <= 12 && Math.abs(b - 51) <= 12);
    const isLight = (Math.abs(r - 87) <= 12 && Math.abs(g - 87) <= 12 && Math.abs(b - 87) <= 12);
    return isDark || isLight;
}

async function removeBackground(inputPath, outputPath) {
    const img = await loadImage(inputPath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imgData.data;
    const width = img.width;
    const height = img.height;

    const visited = new Uint8Array(width * height);
    const queue = [];

    // Start from corners
    const starts = [
        [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]
    ];

    for (let [sx, sy] of starts) {
        queue.push({x: sx, y: sy});
        visited[sy * width + sx] = 1;
    }

    let head = 0;
    while (head < queue.length) {
        const {x, y} = queue[head++];
        const i = (y * width + x) * 4;

        if (isChecker(data[i], data[i+1], data[i+2])) {
            data[i+3] = 0; // make transparent

            // Add neighbors
            const neighbors = [
                [x+1, y], [x-1, y], [x, y+1], [x, y-1]
            ];
            for (let [nx, ny] of neighbors) {
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    if (!visited[ny * width + nx]) {
                        visited[ny * width + nx] = 1;
                        queue.push({x: nx, y: ny});
                    }
                }
            }
        }
    }

    // Also do a simple edge smoothing (anti-aliasing)
    // Find pixels that have alpha=255 but are next to alpha=0 and are somewhat gray
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const i = (y * width + x) * 4;
            if (data[i+3] === 255) {
                let hasTransparentNeighbor = false;
                if (data[((y)*width + (x-1))*4 + 3] === 0) hasTransparentNeighbor = true;
                if (data[((y)*width + (x+1))*4 + 3] === 0) hasTransparentNeighbor = true;
                if (data[((y-1)*width + x)*4 + 3] === 0) hasTransparentNeighbor = true;
                if (data[((y+1)*width + x)*4 + 3] === 0) hasTransparentNeighbor = true;

                if (hasTransparentNeighbor) {
                    // if it's very close to checker color, make it transparent too
                    if (isChecker(data[i], data[i+1], data[i+2])) {
                        data[i+3] = 0;
                    } else if (Math.abs(data[i] - 68) < 30 && Math.abs(data[i+1] - 68) < 30 && Math.abs(data[i+2] - 68) < 30) {
                        // Blend edge
                        data[i+3] = 128;
                    }
                }
            }
        }
    }

    ctx.putImageData(imgData, 0, 0);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Saved transparent image to ${outputPath}`);
}

removeBackground('d:/copy-dashboard/Frontend/public/favicon.png', 'd:/copy-dashboard/Frontend/public/favicon.png').catch(console.error);
