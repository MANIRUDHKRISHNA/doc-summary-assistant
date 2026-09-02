(function () {
  const trays = {
    upload: document.getElementById('uploadTray'),
    processing: document.getElementById('processingTray'),
    result: document.getElementById('resultTray'),
    error: document.getElementById('errorTray'),
  };

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const cancelBtn = document.getElementById('cancelBtn');
  const docName = document.getElementById('docName');
  const docStatus = document.getElementById('docStatus');
  const docThumb = document.getElementById('docThumb');
  const progressFill = document.getElementById('progressFill');

  const resultDocName = document.getElementById('resultDocName');
  const resultStats = document.getElementById('resultStats');
  const summaryOutput = document.getElementById('summaryOutput');
  const rawText = document.getElementById('rawText');
  const suggestionsList = document.getElementById('suggestionsList');
  const lengthOpts = document.querySelectorAll('.length-opt');
  const copyBtn = document.getElementById('copyBtn');
  const newDocBtn = document.getElementById('newDocBtn');

  const errorMsg = document.getElementById('errorMsg');
  const errorRetryBtn = document.getElementById('errorRetryBtn');

  let currentText = '';
  let currentKeywords = [];
  let currentLength = 'medium';
  const MAX_FILE_MB = 20;

  function showTray(name) {
    Object.values(trays).forEach(t => t.classList.add('hidden'));
    trays[name].classList.remove('hidden');
  }

  function setProgress(status, pct) {
    docStatus.textContent = status;
    progressFill.style.width = Math.min(100, Math.max(4, pct)) + '%';
  }

  function showError(message) {
    errorMsg.textContent = message;
    showTray('error');
  }

  // ---- Upload interactions ----
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('is-dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-dragover');
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files?.[0]) handleFile(fileInput.files[0]);
  });

  cancelBtn.addEventListener('click', resetToUpload);
  newDocBtn.addEventListener('click', resetToUpload);
  errorRetryBtn.addEventListener('click', resetToUpload);

  function resetToUpload() {
    currentText = '';
    fileInput.value = '';
    docThumb.style.backgroundImage = '';
    showTray('upload');
  }

  // ---- File handling ----
  async function handleFile(file) {
    const isPDF = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const isImage = file.type.startsWith('image/');

    if (!isPDF && !isImage) {
      showError('That file type isn\'t supported yet. Please upload a PDF or an image (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      showError(`That file is larger than ${MAX_FILE_MB}MB. Try a smaller file — very large scans can take a long time to OCR in the browser.`);
      return;
    }

    docName.textContent = file.name;
    setProgress('Starting up…', 5);
    showTray('processing');

    if (isImage) {
      const url = URL.createObjectURL(file);
      docThumb.style.backgroundImage = `url(${url})`;
    }

    try {
      let text = '';
      if (isPDF) {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const { text: parsedText, hasRealText } = await extractPdfFromDoc(pdf, (s, p) => setProgress(s, p));

        if (hasRealText && parsedText.replace(/\s+/g, '').length > 40) {
          text = parsedText;
        } else {
          // Likely a scanned PDF with no embedded text layer — fall back to OCR.
          setProgress('No embedded text found — running OCR instead…', 10);
          text = await ocrScannedPDF(pdf, (s, p) => setProgress(s, p));
        }
      } else {
        setProgress('Reading image with OCR…', 10);
        text = await extractTextFromImage(file, (s, p) => setProgress(s, p));
      }

      if (!text || text.replace(/\s+/g, '').length < 20) {
        showError('Couldn\'t find readable text in that document. Try a clearer scan or a text-based PDF.');
        return;
      }

      currentText = text;
      currentKeywords = window.DocSummarizer.topKeywords(text, 6);
      renderResults(file.name);
    } catch (err) {
      console.error(err);
      showError('Something went wrong while reading that file. Please try again, or try a different file.');
    }
  }

  // Helper to reuse an already-opened pdf.js document (avoids parsing twice)
  async function extractPdfFromDoc(pdf, onProgress) {
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
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 4) pageText += '\n';
        pageText += item.str + (item.hasEOL ? '\n' : ' ');
        lastY = item.transform[5];
      }
      fullText += pageText + '\n\n';
    }
    return { text: fullText.trim(), hasRealText };
  }

  // ---- Results rendering ----
  function renderResults(name) {
    resultDocName.textContent = name;
    rawText.textContent = currentText;
    renderSummary();
    renderSuggestions();
    showTray('result');
  }

  function renderSuggestions() {
    const sentences = window.DocSummarizer.splitSentences(currentText);
    const suggestions = window.generateImprovementSuggestions(currentText, sentences);
    suggestionsList.innerHTML = suggestions.map(s => `<li>${escapeHTML(s)}</li>`).join('');
  }

  function renderSummary() {
    setProgress('', 0);
    const { summary, totalSentences, wordCount } = window.DocSummarizer.summarize(currentText, currentLength);
    resultStats.textContent = `${wordCount.toLocaleString()} words extracted · condensed from ${totalSentences} sentences`;

    if (summary.length === 0) {
      summaryOutput.innerHTML = '<p>Not enough sentence structure to summarize — showing extracted text instead. Check "View extracted text" below.</p>';
      return;
    }

    summaryOutput.innerHTML = summary.map(s => `<p>${highlightKeywords(escapeHTML(s))}</p>`).join('');
  }

  function highlightKeywords(sentence) {
    let out = sentence;
    for (const kw of currentKeywords) {
      const re = new RegExp(`\\b(${escapeRegExp(kw)})\\b`, 'ig');
      out = out.replace(re, '<mark>$1</mark>');
    }
    return out;
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  lengthOpts.forEach(btn => {
    btn.addEventListener('click', () => {
      lengthOpts.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      currentLength = btn.dataset.length;
      renderSummary();
    });
  });

  copyBtn.addEventListener('click', async () => {
    const text = summaryOutput.innerText;
    try {
      await navigator.clipboard.writeText(text);
      const original = copyBtn.textContent;
      copyBtn.textContent = 'Copied ✓';
      setTimeout(() => (copyBtn.textContent = original), 1500);
    } catch {
      showError('Couldn\'t copy to clipboard — your browser may be blocking it. Try selecting the text manually.');
    }
  });
})();
