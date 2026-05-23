/**
 * storage.js — localStorage management & record file generation
 *
 * Responsibilities:
 *  - Persist app settings (API key, words per batch, difficulty)
 *  - Track session state (batch index, used words, session date)
 *  - Build and download record Markdown files to .workspace/records/
 */

/* -------------------------------------------------------
   Keys
   ------------------------------------------------------- */
const STORAGE_KEYS = {
  API_KEY:           'vocab_api_key',
  WORDS_PER_BATCH:   'vocab_words_per_batch',
  DIFFICULTY:        'vocab_difficulty',
  SESSION_DATE:      'vocab_session_date',
  BATCH_INDEX:       'vocab_batch_index',
  USED_WORDS:        'vocab_used_words',
  FAMILIAR_WORDS:    'vocab_familiar_words',
  UNFAMILIAR_WORDS:  'vocab_unfamiliar_words',
  SOURCE_TYPE:       'vocab_source_type',
  FILE_WORDS:        'vocab_file_words',
  BUILTIN_VOCAB_ID:  'vocab_builtin_vocab_id',
  BUILTIN_VOCAB_USED:'vocab_builtin_used',
};

/* -------------------------------------------------------
   Settings
   ------------------------------------------------------- */
const Settings = {
  getApiKey()             { return localStorage.getItem(STORAGE_KEYS.API_KEY) || ''; },
  setApiKey(v)            { localStorage.setItem(STORAGE_KEYS.API_KEY, v); },

  getWordsPerBatch()      { return parseInt(localStorage.getItem(STORAGE_KEYS.WORDS_PER_BATCH) || '100', 10); },
  setWordsPerBatch(v)     { localStorage.setItem(STORAGE_KEYS.WORDS_PER_BATCH, String(v)); },

  getDifficulty()         { return localStorage.getItem(STORAGE_KEYS.DIFFICULTY) || 'intermediate'; },
  setDifficulty(v)        { localStorage.setItem(STORAGE_KEYS.DIFFICULTY, v); },

  getSourceType()         { return localStorage.getItem(STORAGE_KEYS.SOURCE_TYPE) || 'ai'; },
  setSourceType(v)        { localStorage.setItem(STORAGE_KEYS.SOURCE_TYPE, v); },

  getAutoPronounce()      { return localStorage.getItem('vocab_auto_pronounce') !== 'false'; },
  setAutoPronounce(v)     { localStorage.setItem('vocab_auto_pronounce', v ? 'true' : 'false'); },

  getShowShortcuts()      { return localStorage.getItem('vocab_show_shortcuts') !== 'false'; },

  getTheme()              { return localStorage.getItem('vocab_theme') || 'system'; },
  setTheme(v)             { localStorage.setItem('vocab_theme', v); },
  setShowShortcuts(v)     { localStorage.setItem('vocab_show_shortcuts', v ? 'true' : 'false'); },

  getAll() {
    return {
      apiKey:        this.getApiKey(),
      wordsPerBatch: this.getWordsPerBatch(),
      difficulty:    this.getDifficulty(),
      sourceType:    this.getSourceType(),
      autoPronounce: this.getAutoPronounce(),
      showShortcuts: this.getShowShortcuts(),
    };
  },

  saveAll({ apiKey, wordsPerBatch, difficulty, autoPronounce, showShortcuts }) {
    if (apiKey        !== undefined) this.setApiKey(apiKey);
    if (wordsPerBatch !== undefined) this.setWordsPerBatch(wordsPerBatch);
    if (difficulty    !== undefined) this.setDifficulty(difficulty);
    if (autoPronounce !== undefined) this.setAutoPronounce(autoPronounce);
    if (showShortcuts !== undefined) this.setShowShortcuts(showShortcuts);
  },

  getAllExtended() {
    return { ...this.getAll(), theme: this.getTheme() };
  },
};

/* -------------------------------------------------------
   Session State
   ------------------------------------------------------- */
const Session = {
  /** Today's date string YYYYMMDD */
  todayString() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  },

  /** Ensure session is for today; reset if it's a new day. */
  initSession() {
    const today = this.todayString();
    const stored = localStorage.getItem(STORAGE_KEYS.SESSION_DATE);
    if (stored !== today) {
      this.resetSession(today);
    }
    return today;
  },

  resetSession(dateStr) {
    const today = dateStr || this.todayString();
    localStorage.setItem(STORAGE_KEYS.SESSION_DATE,    today);
    localStorage.setItem(STORAGE_KEYS.BATCH_INDEX,     '1');
    localStorage.setItem(STORAGE_KEYS.USED_WORDS,      '[]');
    localStorage.setItem(STORAGE_KEYS.FAMILIAR_WORDS,  '[]');
    localStorage.setItem(STORAGE_KEYS.UNFAMILIAR_WORDS,'[]');
  },

  getBatchIndex() {
    return parseInt(localStorage.getItem(STORAGE_KEYS.BATCH_INDEX) || '1', 10);
  },
  incrementBatchIndex() {
    const next = this.getBatchIndex() + 1;
    localStorage.setItem(STORAGE_KEYS.BATCH_INDEX, String(next));
    return next;
  },

  getUsedWords() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.USED_WORDS) || '[]'); }
    catch (_) { return []; }
  },
  addUsedWords(words) {
    const existing = new Set(this.getUsedWords());
    words.forEach(w => existing.add(w));
    localStorage.setItem(STORAGE_KEYS.USED_WORDS, JSON.stringify([...existing]));
  },

  getFamiliarWords() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.FAMILIAR_WORDS) || '[]'); }
    catch (_) { return []; }
  },
  addFamiliarWords(words) {
    const existing = new Set(this.getFamiliarWords());
    words.forEach(w => existing.add(w));
    localStorage.setItem(STORAGE_KEYS.FAMILIAR_WORDS, JSON.stringify([...existing]));
  },

  getUnfamiliarWords() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.UNFAMILIAR_WORDS) || '[]'); }
    catch (_) { return []; }
  },
  addUnfamiliarWords(words) {
    const existing = new Set(this.getUnfamiliarWords());
    words.forEach(w => existing.add(w));
    localStorage.setItem(STORAGE_KEYS.UNFAMILIAR_WORDS, JSON.stringify([...existing]));
  },

  getSessionDate() {
    return localStorage.getItem(STORAGE_KEYS.SESSION_DATE) || this.todayString();
  },
};

/* -------------------------------------------------------
   Built-in vocabulary selection
   ------------------------------------------------------- */
const BuiltinVocab = {
  /**
   * Set the currently active built-in vocabulary ID (e.g. 'cet4')
   * @param {string} id
   */
  set(id) {
    localStorage.setItem(STORAGE_KEYS.BUILTIN_VOCAB_ID, id);
    // Reset used tracking when switching vocab
    localStorage.setItem(STORAGE_KEYS.BUILTIN_VOCAB_USED, '[]');
  },

  /**
   * Get the currently active built-in vocabulary ID
   * @returns {string|null}
   */
  get() {
    return localStorage.getItem(STORAGE_KEYS.BUILTIN_VOCAB_ID) || null;
  },

  /**
   * Clear the built-in vocabulary selection
   */
  clear() {
    localStorage.removeItem(STORAGE_KEYS.BUILTIN_VOCAB_ID);
    localStorage.removeItem(STORAGE_KEYS.BUILTIN_VOCAB_USED);
  },

  /**
   * Get the set of already-used words from the current built-in vocab
   * @returns {string[]}
   */
  getUsedWords() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.BUILTIN_VOCAB_USED) || '[]'); }
    catch (_) { return []; }
  },

  /**
   * Add words to the used set
   * @param {string[]} words
   */
  addUsedWords(words) {
    const existing = new Set(this.getUsedWords());
    words.forEach(w => existing.add(w));
    localStorage.setItem(STORAGE_KEYS.BUILTIN_VOCAB_USED, JSON.stringify([...existing]));
  },
};

/* -------------------------------------------------------
   File source word pool
   ------------------------------------------------------- */
const FileWords = {
  set(words) {
    localStorage.setItem(STORAGE_KEYS.FILE_WORDS, JSON.stringify(words));
  },
  get() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.FILE_WORDS) || '[]'); }
    catch (_) { return []; }
  },
  clear() {
    localStorage.removeItem(STORAGE_KEYS.FILE_WORDS);
  },
};

/* -------------------------------------------------------
   Record file generation
   Produces a Markdown file and triggers a browser download
   because browsers cannot write directly to the filesystem.
   The file is named record-YYYYMMDD.md.
   ------------------------------------------------------- */
const Records = {
  /**
   * Build the Markdown content for the daily record.
   * @param {string} dateStr  - YYYYMMDD
   * @param {string[]} familiarWords
   * @param {string[]} unfamiliarWords
   * @param {number} batchIndex - which batch we just finished
   */
  buildMarkdown(dateStr, familiarWords, unfamiliarWords, batchIndex) {
    const displayDate = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
    const now = new Date().toLocaleTimeString('en-US', { hour12: false });

    const familiarSection = familiarWords.length > 0
      ? familiarWords.map(w => `- ${w}`).join('\n')
      : '_No familiar words recorded yet._';

    const unfamiliarSection = unfamiliarWords.length > 0
      ? unfamiliarWords.map(w => `- ${w}`).join('\n')
      : '_No unfamiliar words recorded yet._';

    return `# Vocabulary Record — ${displayDate}

> Generated by VocabLearn at ${now} (after batch ${batchIndex})

## Summary

| Metric | Count |
|---|---|
| Familiar words | ${familiarWords.length} |
| Unfamiliar words | ${unfamiliarWords.length} |
| Total reviewed | ${familiarWords.length + unfamiliarWords.length} |
| Batches completed | ${batchIndex} |

---

## Familiar Words (✓ Known)

${familiarSection}

---

## Unfamiliar Words (✗ Needs Study)

${unfamiliarSection}
`;
  },

  /**
   * Trigger a browser download of the record file.
   * Returns the filename for display purposes.
   */
  download(dateStr, familiarWords, unfamiliarWords, batchIndex) {
    const content  = this.buildMarkdown(dateStr, familiarWords, unfamiliarWords, batchIndex);
    const filename = `record-${dateStr}.md`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return filename;
  },

  /**
   * Save the latest record data to localStorage so it
   * persists across page refreshes within the session.
   */
  saveToLocalStorage(dateStr, familiarWords, unfamiliarWords) {
    const key  = `vocab_record_${dateStr}`;
    const data = { dateStr, familiarWords, unfamiliarWords, savedAt: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(data));
  },

  loadFromLocalStorage(dateStr) {
    try {
      const raw = localStorage.getItem(`vocab_record_${dateStr}`);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  },
};

/* -------------------------------------------------------
   Parse a text file into a word list.
   Accepts one word per line, or comma/space-separated.
   ------------------------------------------------------- */
function parseWordFile(text) {
  return text
    .split(/[\n,]+/)
    .map(w => w.trim().toLowerCase().replace(/[^a-z'-]/g, ''))
    .filter(w => w.length > 1);
}

/**
 * Read multiple File objects and merge words.
 * Returns a Promise<string[]>.
 */
/* -------------------------------------------------------
   Daily Goal — 每日目标 (v6.0)
   ------------------------------------------------------- */
const DailyGoal = {
  /** 默认每日目标词汇数 */
  DEFAULT: 50,

  /** 可选快速目标值 */
  PRESETS: [10, 20, 50, 100, 200],

  /** 获取今日目标 */
  get() {
    const val = localStorage.getItem('vocab_daily_goal');
    if (val !== null) {
      const n = parseInt(val, 10);
      if (!isNaN(n) && n > 0) return n;
    }
    return this.DEFAULT;
  },

  /** 设置今日目标 */
  set(count) {
    localStorage.setItem('vocab_daily_goal', String(Math.max(1, count)));
  },

  /** 获取今日已学词数 */
  getTodayLearnedCount() {
    const familiar = Session.getFamiliarWords();
    const unfamiliar = Session.getUnfamiliarWords();
    return familiar.length + unfamiliar.length;
  },

  /** 获取今日进度百分比 (0-100) */
  getTodayProgress() {
    const learned = this.getTodayLearnedCount();
    const goal = this.get();
    return Math.min(100, Math.round((learned / Math.max(1, goal)) * 100));
  },

  /** 获取连续达标天数 */
  getStreak() {
    const records = collectHistoryRecordsGlobal();
    let streak = 0;
    const today = new Date();
    const todayStr = Session.todayString();

    // 检查今天
    const hasToday = records.some(r => r.dateStr === todayStr);
    if (!hasToday) {
      // 如果今天已经学到了目标，也算今天达标
      const ownTodayLearned = this.getTodayLearnedCount();
      if (ownTodayLearned >= this.get()) {
        // 今天在做学习中，算达标
      } else {
        // 检查昨天
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = `${yesterday.getFullYear()}${String(yesterday.getMonth()+1).padStart(2,'0')}${String(yesterday.getDate()).padStart(2,'0')}`;
        const hasYesterday = records.some(r => r.dateStr === yStr);
        if (!hasYesterday) return 0;
      }
    }

    // 向前计算连续天数
    for (let i = 0; ; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;

      const record = records.find(r => r.dateStr === ds);
      if (record) {
        const total = (record.familiarWords?.length || 0) + (record.unfamiliarWords?.length || 0);
        if (total >= DailyGoal.DEFAULT) {
          streak++;
          continue;
        }
      } else if (i === 0) {
        // 今天
        const ownToday = this.getTodayLearnedCount();
        if (ownToday >= this.get()) {
          streak++;
          continue;
        }
      }
      break;
    }

    return streak;
  },
};

/** 内部辅助：收集历史记录 */
function collectHistoryRecordsGlobal() {
  const records = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('vocab_record_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data && data.dateStr) records.push(data);
      } catch (_) {}
    }
  }
  records.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  return records;
}

/* -------------------------------------------------------
   Session Snapshot — mid-batch progress persistence
   ------------------------------------------------------- */
const SessionSnapshot = {
  /**
   * Save the current session snapshot
   * @param {object} state - State object with batchIndex, currentWords, markedIndices, sourceType
   */
  save(state) {
    const snapshot = {
      batchIndex: state.batchIndex,
      currentWords: state.currentWords,
      markedIndices: [...state.markedIndices],
      sourceType: state.sourceType,
      vocabId: BuiltinVocab.get() || '',
      timestamp: Date.now(),
    };
    localStorage.setItem('vocab_snapshot', JSON.stringify(snapshot));
  },

  /**
   * Load the saved snapshot
   * @returns {object|null}
   */
  load() {
    try {
      const raw = localStorage.getItem('vocab_snapshot');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  },

  /**
   * Clear the snapshot
   */
  clear() {
    localStorage.removeItem('vocab_snapshot');
  },

  /**
   * Check if a valid (non-expired) snapshot exists
   * 24h expiry
   * @returns {boolean}
   */
  hasValidSnapshot() {
    const s = this.load();
    if (!s) return false;
    return (Date.now() - s.timestamp) < 24 * 60 * 60 * 1000;
  },

  /**
   * Get the remaining time before expiry as a human-readable string
   * @returns {string}
   */
  getExpiryInfo() {
    const s = this.load();
    if (!s) return '';
    const elapsed = Date.now() - s.timestamp;
    const remaining = 24 * 60 * 60 * 1000 - elapsed;
    if (remaining <= 0) return '已过期';
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}小时${mins}分钟后过期`;
  },
};

function readWordFiles(fileList) {
  const readers = Array.from(fileList).map(file =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(parseWordFile(e.target.result));
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsText(file);
    })
  );
  return Promise.all(readers).then(arrays => {
    const all = arrays.flat();
    // Deduplicate
    return [...new Set(all)];
  });
}
