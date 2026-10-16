import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const squares = [[492, 43, 53, 55], [386, 96, 33, 33], [459, 114, 32, 32], [409, 161, 51, 51], [495, 171, 36, 38], [460, 224, 31, 31], [386, 225, 28, 27], [426, 259, 21, 21], [487, 272, 48, 49]];
const blank = () => sharp({ create: { width: 1570, height: 368, channels: 4, background: "#00000000" } });

for (const variant of ["light", "dark"]) {
  const source = sharp(path.join(root, "public", "logo-pronto-v3-light.png"));
  const original = await source.png().toBuffer();
  const region = async (left, top, width, height) => sharp(original).extract({ left, top, width, height }).png().toBuffer();
  const leftPart = await sharp(original).extract({ left: 627, top: 0, width: 265, height: 296 }).raw().toBuffer({ resolveWithObject: true });
  for (let y = 181; y < 296; y++) {
    const maxX = y <= 190 ? Math.round(890 - (y - 180) * 2.9)
      : y <= 200 ? Math.round(861 - (y - 190))
      : y <= 210 ? Math.round(851 - (y - 200) * .5)
      : y <= 225 ? Math.round(846 - (y - 210) * .2) : 843;
    for (let x = maxX + 1; x < 892; x++) {
      leftPart.data[(y * leftPart.info.width + x - 627) * leftPart.info.channels + 3] = 0;
    }
  }
  const wordmarkBase = await blank().composite([
    { input: await sharp(leftPart.data, { raw: leftPart.info }).png().toBuffer(), left: 312, top: 0 },
    { input: await region(1044, 0, 526, 296), left: 729, top: 0 },
    { input: await region(892, 296, 678, 66), left: 577, top: 300 },
    { input: await region(1276, 132, 148, 160), left: 580, top: 132 },
  ]).png().toBuffer();
  let wordmark = wordmarkBase;
  if (variant === "dark") {
    const { data, info } = await sharp(wordmarkBase).raw().toBuffer({ resolveWithObject: true });
    for (let index = 0; index < data.length; index += info.channels) {
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
    }
    wordmark = await sharp(data, { raw: info }).png().toBuffer();
  }
  await sharp(wordmark).toFile(path.join(root, "public", `logo-pronto-v9-${variant}.png`));
  const fill = variant === "light" ? "#050505" : "#ffffff";
  const pixels = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1570" height="368"><g fill="${fill}">${squares.map(([x, y, w, h]) => `<rect x="${x - 300}" y="${y + 6}" width="${w}" height="${h}" rx="${Math.min(w, h) * .06}"/>`).join("")}</g></svg>`);
  await sharp(wordmark).composite([{ input: pixels }]).png().toFile(path.join(root, "public", `logo-pronto-v9-complete-${variant}.png`));
}

const favicon = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 64 64"><g fill="#080808" transform="translate(16 4) scale(.19) translate(-376 -34)">${squares.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) * .06}"/>`).join("")}</g></svg>`);
await sharp(favicon).png().toFile(path.join(root, "src", "app", "apple-icon.png"));
