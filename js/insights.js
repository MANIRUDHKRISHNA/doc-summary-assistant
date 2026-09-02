/**
 * Improvement Suggestions
 * ------------------------
 * Requirement #4 from the brief: alongside the summary, offer a few concrete,
 * heuristic-based suggestions for making the *source document* clearer.
 * These are plain-English readability/structure checks — no AI call, so they
 * stay instant and free, and they're transparent about being heuristics
 * rather than claiming deep understanding of the content.
 */

function generateImprovementSuggestions(text, sentences) {
  const suggestions = [];
  const words = (text.match(/\S+/g) || []);
  const wordCount = words.length;

  // 1. Sentence length / readability
  if (sentences.length > 0) {
    const avgWordsPerSentence = wordCount / sentences.length;
    if (avgWordsPerSentence > 26) {
      suggestions.push(
        `Sentences average ${Math.round(avgWordsPerSentence)} words — well above the ~20-word range that's easiest to skim. Breaking long sentences in two would make the document faster to read.`
      );
    }
  }

  // 2. Structure — does the source text show any paragraph/section breaks?
  const paragraphBreaks = (text.match(/\n\s*\n/g) || []).length;
  if (wordCount > 400 && paragraphBreaks < 2) {
    suggestions.push(
      'The document reads as one long block with little paragraph or section separation. Adding headings or line breaks between topics would make it easier to scan.'
    );
  }

  // 3. Specificity — dates, numbers, named deadlines
  const hasDates = /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(text);
  if (!hasDates && wordCount > 150) {
    suggestions.push(
      'No dates or timeframes were detected. If this document involves deadlines, milestones, or scheduling, adding explicit dates would remove ambiguity for the reader.'
    );
  }

  // 4. Acronym / jargon density
  const acronymMatches = text.match(/\b[A-Z]{2,6}\b/g) || [];
  const uniqueAcronyms = [...new Set(acronymMatches)].filter(a => a.length <= 6);
  if (uniqueAcronyms.length >= 4) {
    suggestions.push(
      `Several acronyms appear (e.g. ${uniqueAcronyms.slice(0, 3).join(', ')}). Spelling each one out on first use would help readers unfamiliar with the domain.`
    );
  }

  // 5. Very short document
  if (wordCount < 120) {
    suggestions.push(
      'This is a short document — there may not be much to trim. If it\'s meant to stand alone (e.g. an email or notice), consider whether it states a clear next action for the reader.'
    );
  }

  // 6. Passive-voice-ish heuristic (rough, common auxiliary + past participle pattern)
  const passiveHits = (text.match(/\b(is|are|was|were|been|be)\s+\w+ed\b/gi) || []).length;
  if (sentences.length > 0 && passiveHits / sentences.length > 0.3) {
    suggestions.push(
      'A notable share of sentences use passive voice ("was reviewed", "is required"). Switching to active voice ("we reviewed", "you must") usually reads more directly.'
    );
  }

  if (suggestions.length === 0) {
    suggestions.push('No major clarity issues detected — sentence length, structure, and specificity all look reasonable.');
  }

  return suggestions.slice(0, 4);
}

window.generateImprovementSuggestions = generateImprovementSuggestions;
