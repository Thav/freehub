import { chromium } from "playwright";
import { readFile } from "node:fs/promises";

const [leftPath, rightPath] = process.argv.slice(2);
if (!leftPath || !rightPath) throw new Error("usage: pixel-diff.mjs LEFT.png RIGHT.png");
const [left, right] = await Promise.all([readFile(leftPath), readFile(rightPath)]);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async ({ left, right }) => {
    async function pixels(base64) {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext("2d").drawImage(image, 0, 0);
      return { width: image.width, height: image.height, data: canvas.getContext("2d").getImageData(0, 0, image.width, image.height).data };
    }
    const a = await pixels(left);
    const b = await pixels(right);
    if (a.width !== b.width || a.height !== b.height) return { left: [a.width, a.height], right: [b.width, b.height] };
    let count = 0;
    let minX = a.width;
    let minY = a.height;
    let maxX = -1;
    let maxY = -1;
    for (let offset = 0; offset < a.data.length; offset += 4) {
      if (a.data[offset] === b.data[offset] && a.data[offset + 1] === b.data[offset + 1] && a.data[offset + 2] === b.data[offset + 2] && a.data[offset + 3] === b.data[offset + 3]) continue;
      const pixel = offset / 4;
      const x = pixel % a.width;
      const y = Math.floor(pixel / a.width);
      count += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    return { width: a.width, height: a.height, differentPixels: count, bounds: count ? { minX, minY, maxX, maxY } : null };
  }, { left: left.toString("base64"), right: right.toString("base64") });
  process.stdout.write(`${JSON.stringify(result)}\n`);
} finally {
  await browser.close();
}
