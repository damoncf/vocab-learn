/**
 * reading.js — Reading Mode for VocabLearn
 *
 * Extracts English words from pasted articles, highlights unknown words,
 * and allows adding them to the review pool.
 *
 * Features:
 * - Word extraction via regex
 * - Stop word filtering (~200 common English stop words)
 * - Unknown word detection against built-in vocabulary
 * - DeepSeek API fallback for definitions (when API key available)
 */

/* =========================================================
   Stop Words List
   Common English words to exclude from extraction
   ========================================================= */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'can', 'could', 'shall', 'should', 'may', 'might', 'must',
  'not', 'no', 'nor', 'so', 'if', 'than', 'then', 'else', 'either',
  'neither', 'both', 'each', 'every', 'all', 'some', 'any', 'none',
  'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we',
  'us', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself',
  'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
  'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
  'themselves', 'what', 'which', 'who', 'whom', 'whose', 'when',
  'where', 'why', 'how', 'here', 'there', 'up', 'down', 'out',
  'over', 'under', 'above', 'below', 'between', 'into', 'through',
  'during', 'before', 'after', 'against', 'without', 'about', 'around',
  'across', 'along', 'among', 'behind', 'beyond', 'inside', 'outside',
  'near', 'off', 'toward', 'within', 'ago', 'ever', 'never', 'now',
  'still', 'just', 'very', 'too', 'also', 'quite', 'rather', 'already',
  'yet', 'once', 'twice', 'again', 'more', 'most', 'much', 'many',
  'few', 'little', 'less', 'least', 'enough', 'own', 'same', 'other',
  'such', 'only', 'even', 'well', 'back', 'because', 'since', 'until',
  'while', 'though', 'although', 'thereby', 'thereafter', 'therefore',
  'meanwhile', 'furthermore', 'moreover', 'nevertheless', 'nonetheless',
  'otherwise', 'thus', 'hence', 'indeed', 'indicate', 'like', 'thing',
  'things', 'make', 'made', 'get', 'got', 'take', 'took', 'taken',
  'see', 'saw', 'seen', 'say', 'said', 'go', 'went', 'gone', 'come',
  'came', 'know', 'knew', 'known', 'think', 'thought', 'give', 'gave',
  'given', 'find', 'found', 'tell', 'told', 'become', 'became', 'leave',
  'left', 'want', 'need', 'feel', 'felt', 'put', 'set', 'let', 'end',
  'start', 'keep', 'hold', 'bring', 'brought', 'brings', 'show', 'showed',
  'shown', 'hear', 'heard', 'watch', 'follow', 'call', 'turn', 'begin',
  'began', 'begun', 'seem', 'help', 'work', 'try', 'ask', 'need',
  'believe', 'change', 'lead', 'led', 'understand', 'include', 'continue',
]);

/* =========================================================
   Word Extraction
   ========================================================= */

/**
 * Extract unique English words from a text, filtering out stop words
 * @param {string} text - Input text (article)
 * @returns {string[]} Unique, lowercase, non-stop words
 */
function extractWordsFromText(text) {
  if (!text || !text.trim()) return [];

  // Extract all word-like tokens (2+ letters)
  const matches = text.toLowerCase().match(/\b[a-z]{2,}\b/g);
  if (!matches) return [];

  // Filter stop words and deduplicate
  const unique = new Set();
  matches.forEach(w => {
    if (!STOP_WORDS.has(w)) {
      unique.add(w);
    }
  });

  return [...unique];
}

/* =========================================================
   Vocabulary Matching
   ========================================================= */

/**
 * Build a fast lookup map from a built-in vocabulary array
 * @param {Array} vocabData - Vocabulary JSON array
 * @returns {Map<string, object>} word → detail map
 */
function buildVocabLookup(vocabData) {
  const map = new Map();
  if (!vocabData || !Array.isArray(vocabData)) return map;
  vocabData.forEach(entry => {
    if (entry && entry.word) {
      map.set(entry.word.toLowerCase(), entry);
    }
  });
  return map;
}

/**
 * Check which words from a list are unknown (not in the lookup map)
 * and also not mastered in the review pool
 * @param {string[]} words - Extracted word list
 * @param {Map} vocabLookup - Built-in vocabulary lookup
 * @param {Set} knownWords - Set of known/mastered word forms
 * @returns {{ unknown: string[], details: object[] }}
 */
function findUnknownWords(words, vocabLookup, knownWords = new Set()) {
  const unknown = [];
  const details = [];

  words.forEach(w => {
    const lower = w.toLowerCase();
    // Check if it's a known word
    if (knownWords.has(lower)) return;

    // Check if it's in the vocab lookup
    const entry = vocabLookup.get(lower);
    if (entry) {
      // It's known — skip
      return;
    }

    // Unknown word
    unknown.push(w);
    details.push({
      word: w,
      pronunciation: '',
      partOfSpeech: '',
      definition: '',
      chineseDef: '',
      example: '',
    });
  });

  return { unknown, details };
}

/* =========================================================
   DeepSeek API Fallback for Definitions
   ========================================================= */

/**
 * Fetch definitions for unknown words using DeepSeek API
 * @param {string} apiKey
 * @param {string[]} words
 * @returns {Promise<object[]>}
 */
async function fetchDefinitionsFromAPI(apiKey, words) {
  if (!apiKey || words.length === 0) return [];

  try {
    // Use the existing api.js function
    return await getWordDetailsBatched(apiKey, words, 15);
  } catch (err) {
    console.warn('Failed to fetch definitions:', err.message);
    return [];
  }
}

/* =========================================================
   Article Display Helpers
   ========================================================= */

/**
 * Render article text with unknown words highlighted
 * @param {string} text - Original article text
 * @param {Set} unknownWords - Set of unknown words (lowercase)
 * @returns {string} HTML with highlights
 */
function renderArticleWithHighlights(text, unknownWords) {
  // Split text into words and non-words
  const parts = text.split(/\b/);

  return parts.map(part => {
    const lower = part.toLowerCase();
    if (unknownWords.has(lower) && lower.length >= 2) {
      return `<span class="reading-unknown-word" data-word="${lower}">${escHtml(part)}</span>`;
    }
    return escHtml(part);
  }).join('');
}

/**
 * Highlight a word's definition popup HTML
 * @param {string} word
 * @param {object} detail - Word detail (may be empty)
 * @returns {string}
 */
function renderWordPopup(word, detail) {
  if (!detail || (!detail.definition && !detail.chineseDef)) {
    return `<div class="reading-popup">
      <strong>${escHtml(word)}</strong>
      <p class="reading-popup-missing">No definition available.</p>
      <button class="btn btn-sm btn-secondary reading-popup-add" data-word="${escHtml(word)}">+ Add to Review</button>
    </div>`;
  }

  return `<div class="reading-popup">
    <strong>${escHtml(word)}</strong>
    ${detail.pronunciation ? `<span class="reading-popup-phonetic">${escHtml(detail.pronunciation)}</span>` : ''}
    ${detail.partOfSpeech ? `<span class="reading-popup-pos">${escHtml(detail.partOfSpeech)}</span>` : ''}
    <p class="reading-popup-def">${escHtml(detail.definition || '')}</p>
    ${detail.chineseDef ? `<p class="reading-popup-chinese">${escHtml(detail.chineseDef)}</p>` : ''}
    ${detail.example ? `<p class="reading-popup-example">"${escHtml(detail.example)}"</p>` : ''}
    <button class="btn btn-sm btn-primary reading-popup-add" data-word="${escHtml(word)}">+ Add to Review</button>
  </div>`;
}
