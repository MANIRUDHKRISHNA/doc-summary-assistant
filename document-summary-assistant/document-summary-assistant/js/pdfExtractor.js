/**
 * PDF text extraction using pdf.js.
 * Walks every page, pulls text items, and rejoins them with paragraph-aware
 * spacing so the summarizer sees roughly natural sentences rather than a
 * wall of disconnected tokens.
 */

if (window['pdfjsLib']) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/**
 * @param {File} file
 * @param {(status: string, pct: number) => void} onProgress
 * @returns {Promise<{ text: string, pageCount: number }>}
 */
async function extractTextFromPDF(file, onProgress) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageCount = pdf.numPages;
  let fullText = '';
  let hasRealText = false;

  for (let i = 1; i <= pageCount; i++) {
    onProgress?.(`Reading page ${i} of ${pageCount}…`, (i / pageCount) * 70);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    let lastY = null;
    let pageText = '';
    for (const item of content.items) {
      if (item.str.trim()) hasRealText = true;
      // Insert a line break when the vertical position jumps — a cheap proxy for a new line/paragraph.
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 4) {
        pageText += '\n';
      }
      pageText += item.str + (item.hasEOL ? '\n' : ' ');
      lastY = item.transform[5];
    }
    fullText += pageText + '\n\n';
  }

  return { text: fullText.trim(), pageCount, hasRealText };
}
