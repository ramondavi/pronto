import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const width = 1200;
const height = 300;
const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="1200" height="300" fill="#dce8f4"/>
  <g fill="none" stroke="#1a3b70" stroke-width="2" opacity=".11">
    <circle cx="1044" cy="-38" r="172"/>
    <circle cx="1044" cy="-38" r="125"/>
    <circle cx="1044" cy="-38" r="78"/>
    <path d="M728 300 961 67M811 300l267-267M915 300l216-216"/>
    <rect x="970" y="150" width="178" height="178" rx="16" transform="rotate(24 1059 239)"/>
  </g>
  <g fill="#1a3b70" opacity=".075">
    <rect x="768" y="54" width="28" height="28" rx="5"/>
    <rect x="811" y="54" width="14" height="14" rx="3"/>
    <rect x="846" y="54" width="8" height="8" rx="2"/>
    <circle cx="1096" cy="190" r="18"/>
  </g>
  <rect y="294" width="1200" height="6" fill="#1a3b70"/>
</svg>`);

const logo = await sharp(path.join(root, "public", "logo-pronto-v9-complete-light.png"))
  .resize({ width: 430 })
  .png()
  .toBuffer();
const { height: logoHeight } = await sharp(logo).metadata();

await sharp(background)
  .composite([{ input: logo, left: 41, top: height - 34 - logoHeight }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, "public", "email-header-pronto.png"));
