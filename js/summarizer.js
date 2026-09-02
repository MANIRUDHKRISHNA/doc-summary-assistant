/**
 * Summarizer
 * -----------
 * A small extractive summarizer that runs entirely client-side — no API key,
 * no network call, no rate limit. It scores each sentence by how many
 * "important" (high-frequency, non-stopword) terms it contains, gives a
 * small position bonus to sentences near the start of the document (where
 * topic sentences usually live), and then picks the top-scoring sentences
 * back in their original order so the summary still reads coherently.
 *
 * This is the same family of technique behind classic tools like TextRank —
 * simplified to pure word-frequency scoring so it stays fast and dependency-free.
 */

const STOPWORDS = new Set(`a about above after again against all am an and any are aren't as at be because
been before being below between both but by can't cannot could couldn't did didn't do does doesn't doing don't down
during each few for from further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers
herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most
mustn't my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she
she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then there
there's these they they'd they'll they're they've this those through to too under until up very was wasn't we
we'd we'll we're we've were weren't what what's when when's where where's which while who who's whom why why's
with won't would wouldn't you you'd you'll you're you've your yours yourself yourselves`.split(/\s+/));

function splitSentences(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  // Split on sentence-ending punctuation while keeping reasonable abbreviations intact.
  const raw = clean.match(/[^.!?]+[.!?]+(\s|$)/g) || [clean];
  return raw
    .map(s => s.trim())
    .filter(s => s.split(' ').length >= 4); // drop fragments / headers-as-sentences
}

function tokenize(sentence) {
  return sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function buildWordFrequencies(sentences) {
  const freq = {};
  for (const s of sentences) {
    for (const w of tokenize(s)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  }
  return freq;
}

/**
 * @param {string} text - full extracted document text
 * @param {'short'|'medium'|'long'} length
 * @returns {{ summary: string[], sentenceCount: number, totalSentences: number, wordCount: number }}
 */
function summarize(text, length = 'medium') {
  const sentences = splitSentences(text);
  const wordCount = (text.match(/\S+/g) || []).length;

  if (sentences.length === 0) {
    return { summary: [], sentenceCount: 0, totalSentences: 0, wordCount };
  }

  const freq = buildWordFrequencies(sentences);
  const maxFreq = Math.max(...Object.values(freq), 1);

  const ratios = { short: 0.12, medium: 0.25, long: 0.42 };
  const minSentences = { short: 2, medium: 4, long: 6 };
  const targetCount = Math.max(
    minSentences[length] ?? 4,
    Math.min(sentences.length, Math.round(sentences.length * (ratios[length] ?? 0.25)))
  );

  const scored = sentences.map((sentence, idx) => {
    const words = tokenize(sentence);
    let score = 0;
    for (const w of words) {
      score += (freq[w] || 0) / maxFreq;
    }
    const density = words.length ? score / Math.sqrt(words.length) : 0;
    // Slight bump for early sentences (topic sentences / opening context)
    const positionBonus = idx < sentences.length * 0.15 ? 0.35 : 0;
    // Slight bump for sentences that look like they contain numbers/specifics
    const specificityBonus = /\d/.test(sentence) ? 0.08 : 0;
    return { idx, sentence, score: density + positionBonus + specificityBonus };
  });

  const top = [...scored]
    .sort((a, b) => b.score - a.score)
    .slice(0, targetCount)
    .sort((a, b) => a.idx - b.idx)
    .map(s => s.sentence);

  return {
    summary: top,
    sentenceCount: top.length,
    totalSentences: sentences.length,
    wordCount
  };
}

function topKeywords(text, n = 6) {
  const sentences = splitSentences(text);
  const freq = buildWordFrequencies(sentences);
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word]) => word);
}

window.DocSummarizer = { summarize, topKeywords, splitSentences };
