/**
 * api.js — DeepSeek API integration (OpenAI-compatible) + API caching
 *
 * Responsibilities:
 *  - generateWordList(count, difficulty, usedWords) → string[]
 *  - getWordDetails(words)                          → WordDetail[]
 *  - API result caching in localStorage (24h TTL)
 *
 * The API is called via fetch to the OpenAI-compatible endpoint.
 * Errors are surfaced as thrown Error objects for the caller to handle.
 */

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL    = 'deepseek-chat';

/* -------------------------------------------------------
   Cache keys
   ------------------------------------------------------- */
const CACHE_KEYS = {
  WORD_LIST: 'vocab_cached_words',
  DETAIL:    'vocab_detail_cache',
};

/**
 * Check if a cache entry is still valid (within 24 hours)
 */
function isCacheFresh(cacheKey) {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return false;
    const entry = JSON.parse(raw);
    if (!entry || !entry.timestamp) return false;
    const age = Date.now() - entry.timestamp;
    // 24 hours = 86400000 ms
    return age < 86400000;
  } catch (_) {
    return false;
  }
}

/* -------------------------------------------------------
   Core fetch wrapper
   ------------------------------------------------------- */
async function deepseekChat(apiKey, messages, opts = {}) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('No API key configured. Please add your DeepSeek API key in Settings.');
  }

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 2048,
      ...( opts.response_format ? { response_format: opts.response_format } : {} ),
    }),
  });

  if (!response.ok) {
    let errMsg = `API error ${response.status}`;
    try {
      const errBody = await response.json();
      errMsg = errBody?.error?.message || errMsg;
    } catch (_) { /* ignore parse errors */ }
    throw new Error(errMsg);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from API');
  return content;
}

/* -------------------------------------------------------
   Parse JSON safely from a model response that may be
   wrapped in markdown code fences.
   ------------------------------------------------------- */
function parseJSONFromResponse(text) {
  // Strip ```json … ``` or ``` … ``` fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenceMatch ? fenceMatch[1].trim() : text.trim();
  return JSON.parse(raw);
}

/* -------------------------------------------------------
   generateWordList
   Returns an array of `count` unique English words at the
   given difficulty level that don't repeat `usedWords`.

   Results are cached in localStorage for 24 hours.
   ------------------------------------------------------- */
async function generateWordList(apiKey, count = 100, difficulty = 'intermediate', usedWords = []) {
  // Check cache
  const cacheKey = `${CACHE_KEYS.WORD_LIST}_${difficulty}_${count}`;
  if (isCacheFresh(cacheKey)) {
    try {
      const raw = localStorage.getItem(cacheKey);
      const entry = JSON.parse(raw);
      if (entry && Array.isArray(entry.data)) {
        // Filter out already-used words from cache
        const usedSet = new Set(usedWords || []);
        const available = entry.data.filter(w => !usedSet.has(w));
        if (available.length >= count) {
          return available.slice(0, count);
        }
        // If cache doesn't have enough fresh words, fall through to API
      }
    } catch (_) {}
  }

  const levelDescriptions = {
    beginner:     'A1–A2 level, everyday common English words',
    intermediate: 'B1–B2 level, useful general English vocabulary',
    advanced:     'C1–C2 level, sophisticated and nuanced vocabulary',
    academic:     'academic / GRE-level formal and scholarly words',
    business:     'business English, professional and corporate vocabulary',
  };
  const levelDesc = levelDescriptions[difficulty] || levelDescriptions.intermediate;

  const exclusion = usedWords.length > 0
    ? `Do NOT include any of these already-used words: ${usedWords.slice(-300).join(', ')}.`
    : '';

  const systemPrompt = `You are a vocabulary curriculum designer. When asked for a word list, respond ONLY with a valid JSON array of strings. No explanations, no markdown, no extra text—just the raw JSON array.`;

  const userPrompt = `Generate exactly ${count} unique English words at ${levelDesc}.
${exclusion}
Rules:
- Each entry must be a single English word (no phrases)
- No proper nouns, no duplicates
- Return ONLY a JSON array, e.g. ["word1","word2","word3"]`;

  const raw = await deepseekChat(apiKey, [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: userPrompt },
  ], { temperature: 0.8, max_tokens: 1600 });

  let words;
  try {
    words = parseJSONFromResponse(raw);
  } catch (e) {
    // Fallback: try extracting array-like content
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Failed to parse word list from API response.');
    words = JSON.parse(match[0]);
  }

  if (!Array.isArray(words)) throw new Error('API did not return an array of words.');

  // Sanitize: keep non-empty strings, lowercase, trim, limit count
  const sanitized = words
    .filter(w => typeof w === 'string' && w.trim().length > 0)
    .map(w => w.trim().toLowerCase())
    .slice(0, count);

  // Cache the result
  try {
    const entry = { timestamp: Date.now(), data: sanitized, difficulty, count };
    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (_) {
    // localStorage may be full; just skip caching
  }

  return sanitized;
}

/* -------------------------------------------------------
   getWordDetails
   Returns an array of WordDetail objects for the given words.

   WordDetail = {
     word:          string,
     pronunciation: string,   // IPA or /phonetic/
     partOfSpeech:  string,
     definition:    string,
     example:       string,
   }
   Results are cached in localStorage for 24 hours.
   ------------------------------------------------------- */
async function getWordDetails(apiKey, words) {
  if (!words || words.length === 0) return [];

  // Check detail cache first
  const cachedDetails = loadDetailCache(words);
  const uncached = words.filter(w => {
    return !cachedDetails.some(d => d.word && d.word.toLowerCase() === w.toLowerCase());
  });

  // If all words are cached, return immediately
  if (uncached.length === 0) {
    return cachedDetails.filter(d => words.some(w => w.toLowerCase() === d.word?.toLowerCase()));
  }

  const systemPrompt = `You are a dictionary API. Respond ONLY with a valid JSON array. No markdown fences, no explanations.`;

  const userPrompt = `For each of the following English words, return a JSON array where each element has these fields:
- "word": the word (string)
- "pronunciation": IPA pronunciation in /slashes/ (string)
- "partOfSpeech": part of speech abbreviated (n., v., adj., adv., etc.) (string)
- "definition": clear, concise definition in one sentence (string)
- "example": one natural example sentence using the word (string)

Words: ${uncached.join(', ')}

Return ONLY the JSON array with no extra text.`;

  const raw = await deepseekChat(apiKey, [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: userPrompt },
  ], { temperature: 0.3, max_tokens: 4000 });

  let details;
  try {
    details = parseJSONFromResponse(raw);
  } catch (e) {
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Failed to parse word details from API response.');
    details = JSON.parse(match[0]);
  }

  if (!Array.isArray(details)) throw new Error('API did not return an array of word details.');

  // Normalize and fill in any missing fields
  const normalized = details.map((d, i) => ({
    word:          d.word          || words[i] || '—',
    pronunciation: d.pronunciation || '',
    partOfSpeech:  d.partOfSpeech  || d.pos || '',
    definition:    d.definition    || d.meaning || '',
    example:       d.example       || d.sentence || '',
  }));

  // Cache the new details
  saveDetailCache(normalized);

  // Merge cached + new results in the original word order
  const merged = [];
  for (const w of words) {
    const found = cachedDetails.find(d => d.word?.toLowerCase() === w.toLowerCase())
               || normalized.find(d => d.word?.toLowerCase() === w.toLowerCase());
    if (found) merged.push(found);
  }

  return merged;
}

/* -------------------------------------------------------
   Detail cache helpers
   ------------------------------------------------------- */
function loadDetailCache(words) {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.DETAIL);
    if (!raw) return [];
    const entry = JSON.parse(raw);
    if (!entry || !entry.timestamp || !Array.isArray(entry.data)) return [];
    // Check freshness (24h)
    if (Date.now() - entry.timestamp > 86400000) return [];
    return entry.data;
  } catch (_) {
    return [];
  }
}

function saveDetailCache(newDetails) {
  try {
    // Merge with existing cache
    const existing = loadDetailCache([]);
    const existingWords = new Set(existing.map(d => d.word?.toLowerCase()));
    newDetails.forEach(d => {
      const key = d.word?.toLowerCase();
      if (key && !existingWords.has(key)) {
        existing.push(d);
        existingWords.add(key);
      }
    });
    const entry = { timestamp: Date.now(), data: existing };
    localStorage.setItem(CACHE_KEYS.DETAIL, JSON.stringify(entry));
  } catch (_) {
    // localStorage may be full; skip caching
  }
}

/* -------------------------------------------------------
   Batch word details (split into chunks to stay within
   token limits for large unfamiliar-word sets)
   ------------------------------------------------------- */
async function getWordDetailsBatched(apiKey, words, chunkSize = 20, onProgress = null) {
  const results = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize);
    const chunkDetails = await getWordDetails(apiKey, chunk);
    results.push(...chunkDetails);
    if (onProgress) onProgress(Math.min(i + chunkSize, words.length), words.length);
  }
  return results;
}
