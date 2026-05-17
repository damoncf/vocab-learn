/**
 * review.js — SM-2 Spaced Repetition System (SuperMemo 2)
 *
 * 数据结构：
 * {
 *   word: "ephemeral",
 *   status: "reviewing",         // "unfamiliar" | "reviewing" | "mastered"
 *   ef: 2.5,                     // easiness factor (1.3-2.5)
 *   interval: 1,                 // 当前间隔天数
 *   repetition: 0,               // 连续答对次数
 *   nextReview: "2026-05-18",    // 下次复习日期 (YYYY-MM-DD)
 *   lastReviewed: "2026-05-17",  // 上次复习日期 (YYYY-MM-DD)
 *   qualityHistory: []           // 历史自评分数 [3, 4, 5, ...]
 * }
 *
 * SM-2 公式（quality ∈ {0,2,4,5}）：
 * - 答错 (quality 0): repetition=0, interval=1
 * - 答对且 repetition==0: interval=1
 * - 答对且 repetition==1: interval=6
 * - 答对且 repetition>=2: interval = Math.round(interval * EF)
 * - EF 调整: EF' = EF + (0.1 - (5-quality)*(0.08+(5-quality)*0.02))
 * - EF 范围: [1.3, 2.5]
 */

const REVIEW_STORE_KEY = 'vocab_review_pool';

/* =========================================================
   SM-2 算法核心
   ========================================================= */
const SRS = {
  /**
   * 计算 SM-2 的 EF 调整值
   * @param {number} ef - 当前 easiness factor
   * @param {number} quality - 自评质量 (0, 2, 4, 5)
   * @returns {number} 新的 EF，范围 [1.3, 2.5]
   */
  computeEF(ef, quality) {
    const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    return Math.max(1.3, Math.min(2.5, ef + delta));
  },

  /**
   * SM-2 下一次复习调度
   * @param {object} entry - 当前词条 (ef, interval, repetition)
   * @param {number} quality - 自评质量 (0=Again, 2=Hard, 4=Good, 5=Easy)
   * @returns {object} 更新后的 { ef, interval, repetition, status, mastered }
   */
  computeNextState(entry, quality) {
    let { ef, interval, repetition } = entry;

    if (quality === 0) {
      // Again — 完全忘记，重置
      return {
        ef: this.computeEF(ef, quality),
        interval: 1,
        repetition: 0,
        status: 'reviewing',
        mastered: false,
      };
    }

    // 答对了 (quality >= 2)
    const newEF = this.computeEF(ef, quality);

    let newInterval;
    if (repetition === 0) {
      newInterval = 1;
    } else if (repetition === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * ef);
    }

    const newRepetition = repetition + 1;
    const mastered = newInterval >= 180; // 180+ days interval = mastered
    const status = mastered ? 'mastered' : 'reviewing';

    return {
      ef: newEF,
      interval: newInterval,
      repetition: newRepetition,
      status,
      mastered,
    };
  },

  /**
   * 获取今天的日期字符串 (YYYY-MM-DD)
   */
  today() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  /**
   * 计算下次复习日期
   * @param {number} intervalDays
   * @returns {string} YYYY-MM-DD
   */
  calcNextReviewDate(intervalDays) {
    const d = new Date();
    d.setDate(d.getDate() + intervalDays);
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },
};

/* =========================================================
   ReviewPool — 复习池管理 (SM-2)
   ========================================================= */
const ReviewPool = {
  /**
   * 获取完整的复习池
   * @returns {Array}
   */
  getAll() {
    try {
      return JSON.parse(localStorage.getItem(REVIEW_STORE_KEY) || '[]');
    } catch (_) {
      return [];
    }
  },

  /**
   * 保存复习池
   * @param {Array} pool
   */
  _save(pool) {
    localStorage.setItem(REVIEW_STORE_KEY, JSON.stringify(pool));
  },

  /**
   * 检测是否为旧格式（v1.x 简化版 SRS）
   * @param {Array} pool
   * @returns {boolean}
   */
  _isOldFormat(pool) {
    return pool.length > 0 && pool[0].ef === undefined;
  },

  /**
   * 迁移旧数据到 SM-2 格式
   * @param {Array} pool
   * @returns {Array} 迁移后的数据
   */
  _migrateOldFormat(pool) {
    return pool.map(entry => ({
      word: entry.word,
      status: entry.status || 'reviewing',
      ef: 2.5,
      interval: entry.interval || 1,
      repetition: entry.correctCount || 0,
      nextReview: entry.nextReview || SRS.today(),
      lastReviewed: entry.lastReviewed || SRS.today(),
      qualityHistory: [],
    }));
  },

  /**
   * 添加一个词到复习池
   * @param {string} word
   */
  addWord(word) {
    const pool = this.getAll();

    // Auto-migrate old format if detected
    if (this._isOldFormat(pool)) {
      const migrated = this._migrateOldFormat(pool);
      this._save(migrated);
      return this.addWord(word); // Retry
    }

    const existing = pool.find(item => item.word === word);
    if (existing) return;

    pool.push({
      word: word.toLowerCase(),
      status: 'unfamiliar',
      ef: 2.5,
      interval: 1,
      repetition: 0,
      nextReview: SRS.today(),
      lastReviewed: SRS.today(),
      qualityHistory: [],
    });
    this._save(pool);
  },

  /**
   * 批量添加单词
   * @param {string[]} words
   */
  addWords(words) {
    words.forEach(w => this.addWord(w));
  },

  /**
   * 查找词在池中的索引
   */
  _findIndex(word) {
    const pool = this.getAll();
    if (this._isOldFormat(pool)) {
      const migrated = this._migrateOldFormat(pool);
      this._save(migrated);
      return this._findIndex(word);
    }
    return pool.findIndex(item => item.word === word.toLowerCase());
  },

  /**
   * 获取某词的条目
   */
  getWord(word) {
    const pool = this.getAll();
    if (this._isOldFormat(pool)) {
      const migrated = this._migrateOldFormat(pool);
      this._save(migrated);
      return this.getWord(word);
    }
    return pool.find(item => item.word === word.toLowerCase()) || null;
  },

  /**
   * 记录一次复习（SM-2 算法）
   * @param {string} word
   * @param {number} quality - 自评质量 0|2|4|5
   */
  review(word, quality) {
    const pool = this.getAll();
    if (this._isOldFormat(pool)) {
      const migrated = this._migrateOldFormat(pool);
      this._save(migrated);
      return this.review(word, quality);
    }

    const idx = this._findIndex(word);
    if (idx === -1) return null;

    const entry = pool[idx];
    const result = SRS.computeNextState(entry, quality);

    entry.ef = result.ef;
    entry.interval = result.interval;
    entry.repetition = result.repetition;
    entry.status = result.status;
    entry.lastReviewed = SRS.today();
    entry.nextReview = SRS.calcNextReviewDate(entry.interval);
    entry.qualityHistory.push(quality);

    this._save(pool);
    return entry;
  },

  /**
   * 兼容旧接口：标记为"记住了"（quality=4）
   * @param {string} word
   */
  markCorrect(word) {
    return this.review(word, 4);
  },

  /**
   * 兼容旧接口：标记为"没记住"（quality=0）
   * @param {string} word
   */
  markIncorrect(word) {
    return this.review(word, 0);
  },

  /**
   * 获取今天待复习的词
   * @returns {Array}
   */
  getDueWords() {
    const pool = this.getAll();
    if (this._isOldFormat(pool)) {
      const migrated = this._migrateOldFormat(pool);
      this._save(migrated);
      return this.getDueWords();
    }
    const today = SRS.today();
    return pool.filter(entry => {
      if (entry.status === 'mastered') return false;
      return entry.nextReview <= today;
    });
  },

  /**
   * 获取待复习词的数量
   * @returns {number}
   */
  getDueCount() {
    return this.getDueWords().length;
  },

  /**
   * 获取所有未掌握的词
   * @returns {Array}
   */
  getUnmasteredWords() {
    const pool = this.getAll();
    if (this._isOldFormat(pool)) {
      const migrated = this._migrateOldFormat(pool);
      this._save(migrated);
      return this.getUnmasteredWords();
    }
    return pool.filter(entry => entry.status !== 'mastered');
  },

  /**
   * 获取所有已掌握的词
   * @returns {Array}
   */
  getMasteredWords() {
    const pool = this.getAll();
    if (this._isOldFormat(pool)) {
      const migrated = this._migrateOldFormat(pool);
      this._save(migrated);
      return this.getMasteredWords();
    }
    return pool.filter(entry => entry.status === 'mastered');
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
