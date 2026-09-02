# Approach (200 words)

I built Brief as a single static web app with no backend, so the whole pipeline — upload, text extraction, OCR, and summarization — runs in the browser.

For extraction, I used pdf.js to pull text directly from PDFs that have a real text layer, and Tesseract.js for OCR on images. If a PDF turns out to be a scan with no embedded text, the app detects that and falls back to rendering each page to a canvas and running it through OCR automatically, so both document types are handled through one upload flow.

For summarization, I implemented an extractive algorithm: score every sentence by the combined frequency of its meaningful (non-stopword) terms, normalized by length, with small bonuses for early-document sentences and sentences containing specific numbers or facts. The top-scoring sentences for the chosen length (short/medium/long) are then reassembled in their original order. This avoids any dependency on a paid or rate-limited AI API, keeps latency low, and keeps every document entirely on the user's device — a deliberate privacy trade-off over calling a hosted LLM.

The UI focuses on states that matter in real use: drag-and-drop feedback, per-page progress during OCR (the slowest step), and clear error messages for unsupported files, oversized files, or unreadable scans.
