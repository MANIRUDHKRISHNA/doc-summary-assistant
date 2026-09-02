/**
 * OCR extraction using Tesseract.js.
 * Used directly for image uploads, and as a fallback for PDFs that turn out
 * to be scanned images with no embedded text layer (rendered page-by-page
 * to a canvas, then OCR'd).
 */

/**
 * @param {File|HTMLCanvasElement} source
 * @param {(status: string, pct: number) => void} onProgress
 * @returns {Promise<string>}
 */
async function extractTextFromImage(source, onProgress) {
  const { data } = await Tesseract.recognize(source, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress?.('Reading text from image…', 20 + m.progress * 70);
      } else if (m.status) {
        onProgress?.(capitalize(m.status) + '…', 15);
      }
    }
  });
  return data.text.trim();
}

/**
 * Renders up to `maxPages` pages of a scanned PDF to canvases and OCRs each.
 * @param {*} pdf - a pdf.js document proxy
 * @param {(status: string, pct: number) => void} onProgress
 * @param {number} maxPages
 */
async function ocrScannedPDF(pdf, onProgress, maxPages = 8) {
  const pageCount = Math.min(pdf.numPages, maxPages);
  let text = '';

  for (let i = 1; i <= pageCount; i++) {
    onProgress?.(`OCR on page ${i} of ${pageCount}…`, 10 + (i / pageCount) * 80);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    const pageText = await extractTextFromImage(canvas, () => {});
    text += pageText + '\n\n';
  }

  if (pdf.numPages > maxPages) {
    text += `\n[Note: only the first ${maxPages} of ${pdf.numPages} pages were OCR'd for speed.]`;
  }

  return text.trim();
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
