export const instagramFormats = {
  portrait: { width: 1080, height: 1350, label: "4:5" },
  portraitTall: { width: 1080, height: 1440, label: "3:4" },
  square: { width: 1080, height: 1080, label: "1:1" },
  story: { width: 1080, height: 1920, label: "9:16" },
} as const;

export type InstagramFormat = keyof typeof instagramFormats;

export const instagramPalettes = {
  institutional: { background: "#F3F3F1", ink: "#0A0A0A", accent: "#1A3B70" },
  ocean: { background: "#EAF2F7", ink: "#17364A", accent: "#246A85" },
  clay: { background: "#F8F1E9", ink: "#49352D", accent: "#9B5B43" },
  graphite: { background: "#263C3C", ink: "#F7F8F2", accent: "#9ED3C4" },
  midnight: { background: "#101B35", ink: "#F9FAFF", accent: "#FFE36E" },
  coral: { background: "#FFF0E6", ink: "#27130E", accent: "#9A281B" },
  cobalt: { background: "#18399B", ink: "#FFFFFF", accent: "#FFE27A" },
  lime: { background: "#EBF7BE", ink: "#192A14", accent: "#3A5F20" },
} as const;

export type InstagramPalette = keyof typeof instagramPalettes;

export const instagramFonts = {
  inter: { family: "Inter Variable", fallback: "sans-serif", label: "Inter", weight: 700 },
  spaceGrotesk: { family: "Space Grotesk Variable", fallback: "sans-serif", label: "Space Grotesk", weight: 700 },
  oswald: { family: "Oswald Variable", fallback: "sans-serif", label: "Oswald", weight: 700 },
  playfair: { family: "Playfair Display Variable", fallback: "serif", label: "Playfair Display", weight: 700 },
  fraunces: { family: "Fraunces Variable", fallback: "serif", label: "Fraunces", weight: 700 },
  plexMono: { family: "IBM Plex Mono", fallback: "monospace", label: "IBM Plex Mono", weight: 700 },
  caveat: { family: "Caveat Variable", fallback: "cursive", label: "Caveat", weight: 700 },
  unbounded: { family: "Unbounded Variable", fallback: "sans-serif", label: "Unbounded", weight: 700 },
} as const;

export type InstagramFont = keyof typeof instagramFonts;

function wrapText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of value.trim().split(/\s+/u)) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width <= maxWidth) { line = next; continue; }
    if (line) lines.push(line);
    line = word;
    while (context.measureText(line).width > maxWidth && line.length > 1) {
      let cut = line.length - 1;
      while (cut > 1 && context.measureText(line.slice(0, cut)).width > maxWidth) cut--;
      lines.push(line.slice(0, cut));
      line = line.slice(cut);
    }
  }
  if (line) lines.push(line);
  return lines;
}

function loadImage(path: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Image unavailable: ${path}`));
    image.src = path;
  });
}

function drawProntoPattern(context: CanvasRenderingContext2D, width: number, height: number, color: string) {
  context.save();
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineWidth = 2;
  const spacing = 150;
  for (let row = 0; row <= Math.ceil(height / spacing); row++) {
    for (let column = 0; column <= Math.ceil(width / spacing); column++) {
      const variant = (row * 7 + column * 11) % 9;
      if (variant === 0 || variant === 5) continue;
      const size = [12, 22, 16, 30, 14, 24, 18, 28, 20][variant];
      const x = column * spacing + ((row * 37 + column * 19) % 56) - 24;
      const y = row * spacing + ((row * 23 + column * 41) % 58) - 22;
      context.globalAlpha = variant % 3 === 0 ? .055 : .035;
      context.beginPath();
      context.roundRect(x, y, size, size, 2);
      if (variant % 3 === 0) context.fill();
      else context.stroke();
    }
  }
  context.restore();
}

function drawProntoPixels(context: CanvasRenderingContext2D, x: number, y: number, height: number, color: string) {
  context.save();
  context.fillStyle = color;
  const scale = height / 296;
  for (const [left, top, width, squareHeight, radius] of [[492, 43, 53, 55, 3], [386, 96, 33, 33, 2], [459, 114, 32, 32, 2], [409, 161, 51, 51, 3], [495, 171, 36, 38, 2], [460, 224, 31, 31, 2], [386, 225, 28, 27, 2], [426, 259, 21, 21, 1], [487, 272, 48, 49, 3]]) {
    context.beginPath();
    context.roundRect(x + (left - 376) * scale, y + (top - 34) * scale, width * scale, squareHeight * scale, radius * scale);
    context.fill();
  }
  context.restore();
}

function luminance(hex: string) {
  const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [red, green, blue] = rgb.map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * red + .7152 * green + .0722 * blue;
}

function markColor(ink: string, background: string) {
  const light = Math.max(luminance(ink), luminance(background));
  const dark = Math.min(luminance(ink), luminance(background));
  if ((light + .05) / (dark + .05) >= 7) return ink;
  return luminance(background) > .5 ? "#0A0A0A" : "#FFFFFF";
}

function drawMonochromeImage(context: CanvasRenderingContext2D, image: HTMLImageElement, crop: { x: number; y: number; width: number; height: number }, box: { x: number; y: number; width: number; height: number }, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(box.width);
  canvas.height = Math.round(box.height);
  const mask = canvas.getContext("2d");
  if (!mask) return;
  mask.imageSmoothingQuality = "high";
  const scale = Math.min(canvas.width / crop.width, canvas.height / crop.height);
  const width = crop.width * scale;
  const height = crop.height * scale;
  mask.drawImage(image, crop.x, crop.y, crop.width, crop.height, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  mask.globalCompositeOperation = "source-in";
  mask.fillStyle = color;
  mask.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(canvas, box.x, box.y);
}

function filePart(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}

export async function createInstagramImage(title: string, subtitle: string | null, author: string | null, workNature: string, programName: string | null, format: InstagramFormat, paletteKey: InstagramPalette, fontKey: InstagramFont, authorEntry: string | null, depositYear: string | null) {
  const { width, height } = instagramFormats[format];
  const palette = instagramPalettes[paletteKey];
  const typography = instagramFonts[fontKey];
  await Promise.all([
    document.fonts.load(`${typography.weight} 70px "${typography.family}"`, title),
    document.fonts.load(`500 30px "${typography.family}"`, `${workNature} ${programName || ""} ${author || ""}`),
    subtitle ? document.fonts.load(`400 38px "${typography.family}"`, subtitle) : Promise.resolve(),
  ]);
  const fontFamily = `"${typography.family}", ${typography.fallback}`;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");

  context.fillStyle = palette.background;
  context.fillRect(0, 0, width, height);
  drawProntoPattern(context, width, height, palette.accent);
  context.fillStyle = palette.accent;
  context.font = `${typography.weight} 28px ${fontFamily}`;
  context.textBaseline = "alphabetic";
  const headerY = format === "story" ? 185 : 139;
  context.fillText(workNature.toLocaleUpperCase(), 88, headerY, width - 176);
  if (programName) {
    context.font = `500 23px ${fontFamily}`;
    wrapText(context, programName, width - 176).forEach((line, index) => context.fillText(line, 88, headerY + 43 + index * 32));
  }

  const maxTitleHeight = Math.min(subtitle ? 390 : 520, height * (subtitle ? .33 : .43));
  let titleSize = format === "story" ? 78 : 70;
  let lines: string[] = [];
  do {
    context.font = `${typography.weight} ${titleSize}px ${fontFamily}`;
    lines = wrapText(context, title, width - 176);
    if (lines.length * titleSize * 1.18 <= maxTitleHeight || titleSize <= 37) break;
    titleSize -= 2;
  } while (true);
  const lineHeight = titleSize * 1.18;
  const visibleLines = lines.slice(0, Math.max(1, Math.floor(maxTitleHeight / lineHeight)));
  if (lines.length > visibleLines.length) {
    let last = visibleLines[visibleLines.length - 1];
    while (context.measureText(`${last}…`).width > width - 176 && last.length > 1) last = last.slice(0, -1);
    visibleLines[visibleLines.length - 1] = `${last}…`;
  }
  let subtitleSize = Math.min(38, Math.max(30, titleSize * .56));
  let allSubtitleLines: string[] = [];
  if (subtitle) {
    do {
      context.font = `400 ${subtitleSize}px ${fontFamily}`;
      allSubtitleLines = wrapText(context, subtitle, width - 176);
      if (allSubtitleLines.length <= 3 || subtitleSize <= 24) break;
      subtitleSize -= 2;
    } while (true);
  }
  const subtitleLineHeight = subtitleSize * 1.23;
  const subtitleLines = allSubtitleLines.slice(0, 3);
  if (allSubtitleLines.length > subtitleLines.length) {
    let last = subtitleLines[subtitleLines.length - 1];
    while (context.measureText(`${last}…`).width > width - 176 && last.length > 1) last = last.slice(0, -1);
    subtitleLines[subtitleLines.length - 1] = `${last}…`;
  }
  const titleHeight = visibleLines.length * lineHeight;
  const subtitleHeight = subtitleLines.length * subtitleLineHeight;
  const subtitleGap = subtitleLines.length ? 17 : 0;
  const blockHeight = titleHeight + subtitleGap + subtitleHeight;
  const blockTop = height * .48 - blockHeight / 2;
  context.textBaseline = "middle";
  context.fillStyle = palette.ink;
  context.font = `${typography.weight} ${titleSize}px ${fontFamily}`;
  visibleLines.forEach((line, index) => context.fillText(line, 88, blockTop + lineHeight * (index + .5)));
  if (subtitleLines.length) {
    context.font = `400 ${subtitleSize}px ${fontFamily}`;
    subtitleLines.forEach((line, index) => context.fillText(line, 88, blockTop + titleHeight + subtitleGap + subtitleLineHeight * (index + .5)));
  }

  if (author) {
    context.fillStyle = palette.accent;
    context.font = `500 30px ${fontFamily}`;
    const authorY = blockTop + blockHeight + 58;
    wrapText(context, author, width - 176).slice(0, 2).forEach((line, index) => context.fillText(line, 88, authorY + index * 40));
  }

  const separatorY = height - 154;
  context.globalAlpha = .25;
  context.strokeStyle = markColor(palette.ink, palette.background);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(88, separatorY);
  context.lineTo(width - 88, separatorY);
  context.stroke();
  context.globalAlpha = .84;
  const monochrome = markColor(palette.ink, palette.background);
  drawProntoPixels(context, 99, height - 125, 56, monochrome);
  const [ufba, sibi, faufba] = await Promise.all([
    loadImage("/brasao-ufba.png"),
    loadImage("/logo-sibi.png"),
    loadImage("/logo-faufba.png"),
  ]);
  drawMonochromeImage(context, ufba, { x: 0, y: 0, width: ufba.naturalWidth, height: ufba.naturalHeight }, { x: width - 294, y: height - 129, width: 64, height: 64 }, monochrome);
  drawMonochromeImage(context, sibi, { x: 0, y: 0, width: 1130, height: 850 }, { x: width - 214, y: height - 129, width: 64, height: 64 }, monochrome);
  drawMonochromeImage(context, faufba, { x: 0, y: 0, width: faufba.naturalWidth, height: faufba.naturalHeight }, { x: width - 134, y: height - 129, width: 64, height: 64 }, monochrome);
  context.globalAlpha = 1;

  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("PNG unavailable")), "image/png"));
  const firstName = author?.trim().split(/\s+/u)[0] || "autor";
  const entry = authorEntry || author?.trim().split(/\s+/u).at(-1) || "autor";
  const filename = [entry, firstName, depositYear || "sem-ano", workNature, "insta", format, paletteKey, fontKey].map(filePart).join("-");
  return new File([blob], `${filename}.png`, { type: "image/png" });
}
