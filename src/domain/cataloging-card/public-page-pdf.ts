export async function downloadPublicPagePdf(title: string) {
  const content = document.querySelector<HTMLElement>(".card-publication-page__inner");
  if (!content) throw new Error("Public page unavailable");

  const [{ toPng }, { PDFDocument, PageSizes }] = await Promise.all([
    import("html-to-image"),
    import("pdf-lib"),
  ]);
  await document.fonts.ready;
  const backgroundColor = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() || "#ffffff";
  const exportNode = content.cloneNode(true) as HTMLElement;
  exportNode.classList.add("card-publication-page__inner--pdf");
  exportNode.setAttribute("aria-hidden", "true");
  const exportHost = document.createElement("div");
  exportHost.style.position = "fixed";
  exportHost.style.left = "-10000px";
  exportHost.style.top = "0";
  exportHost.append(exportNode);
  document.body.append(exportHost);
  let imageUrl: string;
  try {
    imageUrl = await toPng(exportNode, {
      pixelRatio: 2,
      width: exportNode.scrollWidth,
      height: exportNode.scrollHeight,
      backgroundColor,
      filter: (node) => !(node instanceof Element && (node.classList.contains("card-publication-page__share") || node.classList.contains("card-publication-share"))),
    });
  } finally {
    exportHost.remove();
  }
  const imageBytes = await fetch(imageUrl).then((response) => response.arrayBuffer());
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(imageBytes);
  const margin = 28;
  const [pageWidth, pageHeight] = PageSizes.A4;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;
  const scale = availableWidth / image.width;
  const width = image.width * scale;
  const height = image.height * scale;
  const pageCount = Math.max(1, Math.ceil(height / availableHeight));
  for (let index = 0; index < pageCount; index++) {
    const page = pdf.addPage(PageSizes.A4);
    page.drawImage(image, { x: (pageWidth - width) / 2, y: pageHeight - margin - height + index * availableHeight, width, height });
  }

  const bytes = await pdf.save();
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  const objectUrl = URL.createObjectURL(new Blob([buffer], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${title.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").replace(/[^a-zA-Z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 72) || "trabalho"}-pronto.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}
