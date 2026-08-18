import * as mupdf from "mupdf";
import fs from "node:fs";
import path from "node:path";

// Heuristic "slide header": the largest-font line of text on the page, since a title is
// almost always the biggest text on a slide. No OCR — this only works on PDFs with a real
// text layer (i.e. exported from Slides/PowerPoint/Keynote, not scanned images), and simply
// yields no title otherwise so the UI falls back to "Slide N".
function extractHeuristicTitle(page) {
  try {
    const structuredText = page.toStructuredText();
    const data = JSON.parse(structuredText.asJSON());
    let best = null;
    for (const block of data.blocks || []) {
      if (block.type !== "text") continue;
      for (const line of block.lines || []) {
        const text = (line.text || "").trim();
        if (!text) continue;
        const size = line.font?.size || 0;
        if (!best || size > best.size) best = { text, size };
      }
    }
    if (!best) return null;
    return best.text.length > 120 ? `${best.text.slice(0, 117)}…` : best.text;
  } catch {
    return null;
  }
}

// Renders every page of a PDF (given as a Buffer) into PNG files under outDir.
// Returns an array of { orderIndex, fileName, title } in page order.
export function renderPdfToImages(pdfBuffer, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const doc = mupdf.Document.openDocument(pdfBuffer, "application/pdf");
  const pageCount = doc.countPages();
  const zoom = 144 / 72; // ~144 DPI, decent legibility without huge files
  const matrix = mupdf.Matrix.scale(zoom, zoom);

  const slides = [];
  for (let i = 0; i < pageCount; i++) {
    const page = doc.loadPage(i);
    const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
    const png = pixmap.asPNG();
    const fileName = `slide-${String(i + 1).padStart(3, "0")}.png`;
    fs.writeFileSync(path.join(outDir, fileName), Buffer.from(png));
    slides.push({ orderIndex: i, fileName, title: extractHeuristicTitle(page) });
  }
  return slides;
}
