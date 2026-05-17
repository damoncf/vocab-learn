/**
 * review.js — SRS (Spaced Repetition System) 复习引擎
 *
 * 职责：
 *  - 陌生词池管理（unfamiliar / reviewing / mastered 状态）
 *  - 简单 SRS 调度算法（1天 → 2天 → 4天 → mastered）
 *  - 数据结构持久化到 localStorage
 *
 * SRS 词条数据结构：
 * {
 *   word: "ephemeral",
 *   status: "reviewing",        // "unfamiliar" | "reviewing" | "mastered"
 *   interval: 1,                // 当前间隔天数
 *   nextReview: "2026-05-18",   // 下次复习日期（YYYY-MM-DD）
 *   correctCount: 0,            // 连续答对次数
 *   lastReviewed: "2026-05-17"  // 上次复习日期（YYYY-MM-DD）
 * }
 */

const REVIEW_STORE_KEY = 'vocab_review_pool';

/* =========================================================
   SRS 调度算法
   ========================================================= */
const SRS = {
  /**
   * 根据当前 interval 和答对/答错，计算新的 interval
   * 简单 3 段增长：1 → 2 → 4 → mastered
   * @param {number} interval - 当前间隔天数
   * @param {boolean} correct - 是否答对
   * @returns {{ interval: number, status: string, mastered: boolean }}
   */
  computeNextState(interval, correct) {
    if (!correct) {
      // 答错 → 重置到第 1 天
      return { interval: 1, status: 'reviewing', mastered: false };
    }

    const nextInterval = interval * 2;
    if (nextInterval >= 4) {
      // 达到或超过 4 天 → 标记为已掌握
      return { interval: nextInterval, status: 'mastered', mastered: true };
    }
    return { interval: nextInterval, status: 'reviewing', mastered: false };
  },

  /**
   * 计算下次复习日期（YYYY-MM-DD）
   * @param {number} intervalDays
   * @returns {string}
   */
  calcNextReviewDate(intervalDays) {
    const d = new Date();
    d.setDate(d.getDate() + intervalDays);
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  /**
   * 获取今天的日期字符串（YYYY-MM-DD）
   */
  today() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  /**
   * 获取今天的日期字符串（YYYYMMDD 格式，兼容 storage.js）
   */
  todayCompact() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  },
};

/* =========================================================
   ReviewPool — 复习池管理
   ========================================================= */
const ReviewPool = {
  /**
   * 获取完整的复习池
   * @returns {Array} SRS 词条数组
   */
  getAll() {
    try {
      return JSON.parse(localStorage.getItem(REVIEW_STORE_KEY) || '[]');
    } catch (_) {
      return [];
    }
  },

  /**
   * 保存完整的复习池
   * @param {Array} pool
   */
  _save(pool) {
    localStorage.setItem(REVIEW_STORE_KEY, JSON.stringify(pool));
  },

  /**
   * 添加一个词到复习池（如果已存在则不重复添加）
   * @param {string} word
   */
  addWord(word) {
    const pool = this.getAll();
    const existing = pool.find(item => item.word === word);
    if (existing) return; // 已存在，不重复添加
    pool.push({
      word: word.toLowerCase(),
      status: 'unfamiliar',
      interval: 1,
      nextReview: SRS.today(), // 今天开始可复习
      correctCount: 0,
      lastReviewed: SRS.today(),
    });
    this._save(pool);
  },

  /**
   * 批量添加多个词到复习池
   * @param {string[]} words
   */
  addWords(words) {
    words.forEach(w => this.addWord(w));
  },

  /**
   * 获取某词在池中的索引
   * @param {string} word
   * @returns {number}
   */
  _findIndex(word) {
    const pool = this.getAll();
    return pool.findIndex(item => item.word === word.toLowerCase());
  },

  /**
   * 获取某词在池中的条目
   * @param {string} word
   * @returns {object|null}
   */
  getWord(word) {
    const pool = this.getAll();
    return pool.find(item => item.word === word.toLowerCase()) || null;
  },

  /**
   * 标记为"记住了"（答对）
   * @param {string} word
   */
  markCorrect(word) {
    const pool = this.getAll();
    const idx  = this._findIndex(word);
    if (idx === -1) return;

    const entry = pool[idx];
    entry.correctCount++;
    const result = SRS.computeNextState(entry.interval, true);
    entry.interval    = result.interval;
    entry.status      = result.status;
    entry.lastReviewed = SRS.today();
    entry.nextReview  = SRS.calcNextReviewDate(entry.interval);

    this._save(pool);
    return entry;
  },

  /**
   * 标记为"没记住"（答错）
   * @param {string} word
   */
  markIncorrect(word) {
    const pool = this.getAll();
    const idx  = this._findIndex(word);
    if (idx === -1) return;

    const entry = pool[idx];
    entry.correctCount = Math.max(0, entry.correctCount - 1); // 答错减分
    const result = SRS.computeNextState(entry.interval, false);
    entry.interval    = result.interval;
    entry.status      = 'reviewing';
    entry.lastReviewed = SRS.today();
    entry.nextReview  = SRS.calcNextReviewDate(entry.interval);

    this._save(pool);
    return entry;
  },

  /**
   * 获取今天待复习的词（status !== mastered 且 nextReview <= today）
   * @returns {Array}
   */
  getDueWords() {
    const pool   = this.getAll();
    const today  = SRS.today();
    return pool.filter(entry => {
      if (entry.status === 'mastered') return false;
      // "unfamiliar" 状态下 nextReview 可能在今天或之前
      // "reviewing" 状态下 nextReview <= today
      return entry.nextReview <= today;
    });
  },

  /**
   * 获取待复习词的数量（用于在 UI 上显示）
   * @returns {number}
   */
  getDueCount() {
    return this.getDueWords().length;
  },

  /**
   * 获取所有未掌握的词（unfamiliar + reviewing）
   * @returns {Array}
   */
  getUnmasteredWords() {
    const pool = this.getAll();
    return pool.filter(entry => entry.status !== 'mastered');
  },

  /**
   * 获取所有已掌握的词
   * @returns {Array}
   */
  getMasteredWords() {
    const pool = this.getAll();
    return pool.filter(entry => entry.status === 'mastered');
  },

  /**
   * 获取所有陌生词（unfamiliar 状态）
   * @returns {Array}
   */
  getUnfamiliarWords() {
    const pool = this.getAll();
    return pool.filter(entry => entry.status === 'unfamiliar');
  },

  /**
   * 获取所有复习中的词（reviewing 状态）
   * @returns {Array}
   */
  getReviewingWords() {
    const pool = this.getAll();
    return pool.filter(entry => entry.status === 'reviewing');
  },

  /**
   * 获取复习池总大小
   * @returns {number}
   */
  getTotalCount() {
    return this.getAll().length;
  },

  /**
   * 清空复习池
   */
  clear() {
    localStorage.removeItem(REVIEW_STORE_KEY);
  },
};
