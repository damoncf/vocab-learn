/**
 * badges.js — 成就/徽章系统 (v6.0)
 *
 * 19 个徽章，分 5 类：
 *   🎯 学习 (5): 初次学习、七日行、半月谈、满月、百日功
 *   🧠 词汇 (4): 百词斩、千词户、词霸、词库毕业
 *   📚 词库 (3): 四级通过、六级通过、GRE通关
 *   🧪 测验 (2): 全对、百分先生
 *   🔄 复习 (2): 第一次复习、复习达人
 *   🏆 特殊 (3): 元学习、数据自由、工具箱
 *
 * 数据存储在 localStorage: vocab_badges = { unlocked: { badgeId: timestamp }, ... }
 */

const BADGES_KEY = 'vocab_badges';

const BADGES = [
  // 🎯 学习
  { id: 'first_batch', category: '🎯', name: '初次学习', desc: '完成第一个 Batch', icon: '🎯' },
  { id: 'seven_days', category: '🎯', name: '七日行', desc: '连续学习 7 天', icon: '📅' },
  { id: 'fifteen_days', category: '🎯', name: '半月谈', desc: '连续学习 15 天', icon: '📅' },
  { id: 'month', category: '🎯', name: '满月', desc: '连续学习 30 天', icon: '🌙' },
  { id: 'hundred_days', category: '🎯', name: '百日功', desc: '连续学习 100 天', icon: '💯' },

  // 🧠 词汇
  { id: 'hundred_words', category: '🧠', name: '百词斩', desc: '累计掌握 100 词', icon: '📖' },
  { id: 'thousand_words', category: '🧠', name: '千词户', desc: '累计掌握 1000 词', icon: '📚' },
  { id: 'word_master', category: '🧠', name: '词霸', desc: '累计掌握 5000 词', icon: '👑' },
  { id: 'vocab_graduate', category: '🧠', name: '词库毕业', desc: '完成一个词库（掌握率 > 80%）', icon: '🎓' },

  // 📚 词库
  { id: 'cet4_pass', category: '📚', name: '四级通过', desc: 'CET-4 掌握率 > 80%', icon: '📘' },
  { id: 'cet6_pass', category: '📚', name: '六级通过', desc: 'CET-6 掌握率 > 80%', icon: '📕' },
  { id: 'gre_pass', category: '📚', name: 'GRE 通关', desc: 'GRE 掌握率 > 80%', icon: '🧠' },

  // 🧪 测验
  { id: 'perfect_quiz', category: '🧪', name: '全对', desc: '一次测验 10/10', icon: '⭐' },
  { id: 'perfect_streak', category: '🧪', name: '百分先生', desc: '连续 3 次测验全对', icon: '🌟' },

  // 🔄 复习
  { id: 'first_review', category: '🔄', name: '第一次复习', desc: '完成第一次 SM-2 复习', icon: '🔄' },
  { id: 'review_master', category: '🔄', name: '复习达人', desc: '累计完成 100 次复习', icon: '💪' },

  // 🏆 特殊
  { id: 'meta_learn', category: '🏆', name: '元学习', desc: '使用阅读模式完成第一次学习', icon: '📖' },
  { id: 'data_freedom', category: '🏆', name: '数据自由', desc: '配置 WebDAV 同步', icon: '☁️' },
  { id: 'toolbox', category: '🏆', name: '工具箱', desc: '使用过全部学习模式', icon: '🧰' },
];

const BadgeManager = {
  /**
   * 获取所有解锁的徽章
   * @returns {{ [badgeId]: number }} badgeId → unlockTimestamp
   */
  getUnlocked() {
    try {
      return JSON.parse(localStorage.getItem(BADGES_KEY)) || {};
    } catch (_) {
      return {};
    }
  },

  /**
   * 解锁徽章
   * @param {string} badgeId
   * @param {boolean} silent - 是否静默解锁（不触发 toast）
   */
  unlock(badgeId, silent) {
    const unlocked = this.getUnlocked();
    if (unlocked[badgeId]) return false; // 已经解锁过

    unlocked[badgeId] = Date.now();
    localStorage.setItem(BADGES_KEY, JSON.stringify(unlocked));

    const badge = BADGES.find(b => b.id === badgeId);
    if (badge && !silent) {
      // 触发解锁通知（添加通知队列）
      this._notifyUnlock(badge);
    }
    return true;
  },

  /**
   * 检查是否已解锁某个徽章
   * @param {string} badgeId
   * @returns {boolean}
   */
  isUnlocked(badgeId) {
    const unlocked = this.getUnlocked();
    return !!unlocked[badgeId];
  },

  /**
   * 获取解锁数量
   * @returns {number}
   */
  getUnlockedCount() {
    return Object.keys(this.getUnlocked()).length;
  },

  /**
   * 获取全部徽章定义
   * @returns {Array}
   */
  getAll() {
    return BADGES;
  },

  /**
   * 获取总徽章数
   * @returns {number}
   */
  getTotalCount() {
    return BADGES.length;
  },

  /**
   * 通知队列（用于 toast 展示）
   */
  _notifyQueue: [],

  _notifyUnlock(badge) {
    // 加入队列
    this._notifyQueue.push(badge);
  },

  /**
   * 消费通知队列（由 app.js 定期调用）
   * @returns {Array} [{ id, name, icon }]
   */
  consumeNotifications() {
    const items = this._notifyQueue.slice();
    this._notifyQueue = [];
    return items;
  },

  /**
   * 重置所有徽章
   */
  reset() {
    localStorage.removeItem(BADGES_KEY);
    this._notifyQueue = [];
  },
};

/**
 * 检查所有徽章条件——由 app.js 在适当时机调用
 * @param {object} context - 上下文 { action: 'batch'|'review'|'quiz'|'dictation'|'cloze'|'reading'|'sync', ... }
 */
function checkBadges(context) {
  if (!context) context = { action: 'unknown' };

  // 🎯 初次学习：完成第一个 Batch
  if (context.action === 'batch') {
    BadgeManager.unlock('first_batch');
  }

  // 🎯 连续学习天数检测（由每日卡片更新触发）
  if (context.action === 'daily_update') {
    const streak = typeof calcContinuousStreak === 'function' ? calcContinuousStreak() : 0;
    if (streak >= 7) BadgeManager.unlock('seven_days');
    if (streak >= 15) BadgeManager.unlock('fifteen_days');
    if (streak >= 30) BadgeManager.unlock('month');
    if (streak >= 100) BadgeManager.unlock('hundred_days');
  }

  // 🧠 累计掌握词数
  if (context.action === 'batch' || context.action === 'daily_update') {
    const masteredWords = typeof ReviewPool !== 'undefined'
      ? ReviewPool.getMasteredWords()
      : [];
    const count = masteredWords.length;
    if (count >= 100) BadgeManager.unlock('hundred_words');
    if (count >= 1000) BadgeManager.unlock('thousand_words');
    if (count >= 5000) BadgeManager.unlock('word_master');
  }

  // 🧠 词库毕业
  if (context.action === 'batch' || context.action === 'daily_update') {
    const vocabId = typeof BuiltinVocab !== 'undefined' ? BuiltinVocab.get() : null;
    if (vocabId && typeof _vocabDataCache !== 'undefined' && _vocabDataCache[vocabId]) {
      const mastery = typeof VocabMastery !== 'undefined'
        ? VocabMastery.getMastery(vocabId, _vocabDataCache[vocabId])
        : null;
      if (mastery && mastery.pct >= 80) {
        BadgeManager.unlock('vocab_graduate');
      }
    }
  }

  // 📚 词库
  if (context.action === 'daily_update') {
    const checkVocabGraduate = (vocabId, badgeId) => {
      if (typeof _vocabDataCache !== 'undefined' && _vocabDataCache[vocabId]) {
        const mastery = typeof VocabMastery !== 'undefined'
          ? VocabMastery.getMastery(vocabId, _vocabDataCache[vocabId])
          : null;
        if (mastery && mastery.pct >= 80) {
          BadgeManager.unlock(badgeId);
        }
      }
    };
    checkVocabGraduate('cet4', 'cet4_pass');
    checkVocabGraduate('cet6', 'cet6_pass');
    checkVocabGraduate('gre', 'gre_pass');
  }

  // 🧪 全对（测验）
  if (context.action === 'quiz' && context.score !== undefined && context.total !== undefined) {
    if (context.score === context.total && context.total >= 10) {
      BadgeManager.unlock('perfect_quiz');
    }
  }

  // 🧪 百分先生（连续 3 次全对）
  if (context.action === 'quiz' && context.score !== undefined && context.total !== undefined) {
    if (context.score === context.total && context.total >= 10) {
      const streakKey = 'vocab_quiz_perfect_streak';
      let streak = parseInt(localStorage.getItem(streakKey) || '0', 10);
      streak++;
      localStorage.setItem(streakKey, String(streak));
      if (streak >= 3) {
        BadgeManager.unlock('perfect_streak');
      }
    } else {
      localStorage.setItem('vocab_quiz_perfect_streak', '0');
    }
  }

  // 🔄 第一次复习
  if (context.action === 'review') {
    BadgeManager.unlock('first_review');
  }

  // 🔄 复习达人（累计 100 次复习）
  if (context.action === 'review_total') {
    if (context.totalReviews >= 100) {
      BadgeManager.unlock('review_master');
    }
  }

  // 🏆 元学习（使用阅读模式）
  if (context.action === 'reading') {
    BadgeManager.unlock('meta_learn');
  }

  // 🏆 数据自由（配置 WebDAV）
  if (context.action === 'sync') {
    BadgeManager.unlock('data_freedom');
  }

  // 🏆 工具箱（使用过全部学习模式）
  if (context.action === 'toolbox_check') {
    const usedModes = context.usedModes || [];
    const allModes = ['batch', 'review', 'quiz', 'dictation', 'cloze', 'reading'];
    const hasAll = allModes.every(m => usedModes.includes(m));
    if (hasAll) {
      BadgeManager.unlock('toolbox');
    }
  }
}
