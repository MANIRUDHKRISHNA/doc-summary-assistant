# Brief — Document Summary Assistant

Upload a PDF or a scanned image, get a smart, adjustable-length summary — entirely in your browser. No backend, no API key, no document ever leaves your device.

**Live demo:** _add your deployed URL here_

## Features

- **Upload:** drag-and-drop or file picker, PDF/PNG/JPG/WEBP
- **Text extraction:**
  - Native PDF text layer parsed with [pdf.js](https://mozilla.github.io/pdf.js/)
  - Scanned images (and scanned PDFs with no text layer) OCR'd with [Tesseract.js](https://tesseract.projectnaptha.com/)
- **Summarization:** extractive, frequency-weighted sentence scoring (see "How summarization works" below) with short / medium / long controls
- **Improvement suggestions:** heuristic checks on the source document itself (sentence length, structure, missing dates, acronym density, passive voice) surfaced as plain-English tips — see `js/insights.js`
- **UX:** drag states, per-page progress, graceful error states, mobile-responsive layout
- **Privacy by construction:** every step — parsing, OCR, and summarization — runs client-side. There's no server in this project at all.

## Running locally

No build step or dependencies to install. Any static file server works:

```bash
cd document-summary-assistant
python3 -m http.server 8080
# then open http://localhost:8080
```

(`npx serve .` works just as well if you'd rather use Node.)

## Deploying

Because it's a static site, drag-and-drop deploys work as-is:

- **Netlify:** drag the `document-summary-assistant` folder onto [app.netlify.com/drop](https://app.netlify.com/drop)
- **Vercel:** `vercel --prod` from inside the folder, or connect the GitHub repo in the dashboard
- **GitHub Pages:** push this folder to a repo and enable Pages on the `main` branch

## How summarization works

`js/summarizer.js` implements an **extractive** summarizer:

1. Split the extracted text into sentences.
2. Build a word-frequency table, excluding common stopwords.
3. Score each sentence by the combined frequency of its meaningful words (normalized by sentence length), with a small bonus for sentences near the top of the document and for sentences containing numbers/specifics.
4. Take the top N scoring sentences for the requested length (short/medium/long), then re-sort them back into their original order so the summary still reads coherently.

This is deliberately the same family of idea as classic **TextRank** — simplified to pure frequency scoring rather than building a full sentence-similarity graph, so it stays dependency-free and fast enough to run instantly in the browser on documents of a few thousand words. It also means the project has **zero reliance on a paid or rate-limited AI API** — a plus for a take-home project that needs to keep working after a free tier runs out.

**If a more abstractive summary is wanted** (i.e. a generated paraphrase, not just re-selected sentences), the extraction pipeline already produces clean text — swapping in a call to any hosted LLM API would be a small, isolated change in `app.js`, without touching the extraction code at all.

## Project structure

```
document-summary-assistant/
├── index.html          # markup for the three-step flow (upload → processing → results)
├── css/style.css        # styling
├── js/
│   ├── pdfExtractor.js   # pdf.js wrapper for native-text PDFs
│   ├── ocrExtractor.js   # Tesseract.js wrapper for images + scanned-PDF fallback
│   ├── summarizer.js     # extractive summarization engine
│   ├── insights.js       # heuristic "improvement suggestions" for the source doc
│   └── app.js            # UI state machine wiring it all together
└── README.md
```

## Known limitations

- OCR accuracy depends on scan quality; heavily skewed or low-resolution scans will summarize worse.
- Very long documents (100+ pages) will be slow to OCR in-browser if they're scans; the app caps scanned-PDF OCR at the first 8 pages to keep things responsive, and notes this in the output.
- The summarizer is extractive (it selects real sentences from the document), not generative — it won't produce a paraphrase in new words.
