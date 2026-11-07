import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../public/maps/", import.meta.url);
const names = ["south-america", "brazil", "northeast", "bahia", "salvador"];

function ringsFromSvg(name) {
  const svg = readFileSync(new URL(`${name}.svg`, root), "utf8");
  const path = svg.match(/<path\b[^>]*\bd="([^"]+)"/)?.[1];
  if (!path) throw new Error(`Contorno ausente: ${name}`);
  const scale = svg.includes('transform="scale(0.0001,-0.0001)"') ? 0.0001 : 1;
  const tokens = path.match(/[MLlhZmlHVhv]|[-+]?(?:\d*\.\d+|\d+\.?\d*)/g) ?? [];
  const rings = [];
  let ring = [];
  let x = 0;
  let y = 0;
  let command = "";
  let i = 0;
  const point = () => [Number((x * scale).toFixed(5)), Number((y * (scale === 1 ? -1 : scale)).toFixed(5))];
  const finish = () => {
    if (ring.length > 2) {
      const first = ring[0];
      const last = ring.at(-1);
      if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
      rings.push(ring);
    }
    ring = [];
  };
  while (i < tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[i])) command = tokens[i++];
    if (command === "Z" || command === "z") { finish(); command = ""; continue; }
    if (!command) continue;
    if (command === "M" || command === "m" || command === "L" || command === "l") {
      const a = Number(tokens[i++]);
      const b = Number(tokens[i++]);
      if (command === "M") { finish(); x = a; y = b; command = "L"; }
      else if (command === "m") { finish(); x += a; y += b; command = "l"; }
      else if (command === "L") { x = a; y = b; }
      else { x += a; y += b; }
    } else if (command === "h") x += Number(tokens[i++]);
    else if (command === "H") x = Number(tokens[i++]);
    else if (command === "v") y += Number(tokens[i++]);
    else if (command === "V") y = Number(tokens[i++]);
    else throw new Error(`Comando SVG desconhecido: ${command}`);
    ring.push(point());
  }
  finish();
  return rings;
}

const outlines = Object.fromEntries(names.map((name) => [name, ringsFromSvg(name)]));
writeFileSync(new URL("authority-scale-outlines.json", root), JSON.stringify(outlines));
