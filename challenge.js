/**
 * challenge.js — 每日挑战 (v6.0)
 *
 * 每天出一道不同的看词选义题。
 * 来源：从未在复习池中出现过的词中随机选。
 * 数据存储在 localStorage 中。
 *
 * 数据结构：
 * {
 *   lastChallengeDate: "20260523",
 *   challengeAnswered: true/false,
 *   challengeCorrect: true/false,
 *   challengeData: { word, options, correctIndex, detail },
 *   challengeStreak: 3,
 * }
 */

const CHALLENGE_KEY = 'vocab_challenge';

const Challenge = {
  /**
   * 获取今日挑战状态
   */
  getState() {
    try {
      return JSON.parse(localStorage.getItem(CHALLENGE_KEY)) || {};
    } catch (_) {
      return {};
    }
  },

  /**
   * 保存状态
   */
  _save(state) {
    localStorage.setItem(CHALLENGE_KEY, JSON.stringify(state));
  },

  /**
   * 获取今天的日期字符串 YYYYMMDD
   */
  _today() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  },

  /**
   * 重置挑战（跨天）
   */
  _resetIfNewDay() {
    const state = this.getState();
    const today = this._today();
    if (state.lastChallengeDate !== today) {
      state.lastChallengeDate = today;
      state.challengeAnswered = false;
      state.challengeCorrect = false;
      state.challengeData = null;
      this._save(state);
      return true; // 新的一天
    }
    return false;
  },

  /**
   * 获取今天的挑战题目
   * 如果已答过，返回已保存的数据
   * 如果未答，生成新题
   * @returns {{ word: string, options: string[], correctAnswer: string, answered: boolean, correct: boolean, detail: object|null }}
   */
  getTodaysChallenge() {
    this._resetIfNewDay();
    const state = this.getState();

    // 如果已生成过今天的题目，直接返回
    if (state.challengeData) {
      return {
        word: state.challengeData.word,
        options: state.challengeData.options,
        correctAnswer: state.challengeData.correctAnswer,
        answered: state.challengeAnswered || false,
        correct: state.challengeCorrect || false,
        detail: state.challengeData.detail || null,
      };
    }

    // 生成新题
    const challenge = this._generateChallenge();
    if (!challenge) return null;

    state.challengeData = challenge;
    this._save(state);

    return {
      word: challenge.word,
      options: challenge.options,
      correctAnswer: challenge.correctAnswer,
      answered: false,
      correct: false,
      detail: challenge.detail,
    };
  },

  /**
   * 提交答案
   * @param {string} answer - 用户选择的答案
   * @returns {{ correct: boolean, streak: number }}
   */
  submitAnswer(answer) {
    const state = this.getState();
    if (!state.challengeData) return { correct: false, streak: 0 };
    if (state.challengeAnswered) {
      // 已经答过了
      return {
        correct: state.challengeCorrect,
        streak: parseInt(localStorage.getItem('vocab_challenge_streak') || '0', 10),
      };
    }

    const isCorrect = answer === state.challengeData.correctAnswer;

    state.challengeAnswered = true;
    state.challengeCorrect = isCorrect;
    this._save(state);

    // 更新连续答对次数
    let streak = parseInt(localStorage.getItem('vocab_challenge_streak') || '0', 10);
    if (isCorrect) {
      streak++;
      localStorage.setItem('vocab_challenge_streak', String(streak));
    } else {
      localStorage.setItem('vocab_challenge_streak', '0');
    }

    return { correct: isCorrect, streak };
  },

  /**
   * 获取连续答对天数
   */
  getStreak() {
    return parseInt(localStorage.getItem('vocab_challenge_streak') || '0', 10);
  },

  /**
   * 生成一道挑战题
   * 从复习池中未出现过的词中选
   */
  _generateChallenge() {
    // 收集内置词库数据
    let allVocabData = [];
    if (typeof _vocabDataCache !== 'undefined') {
      Object.values(_vocabDataCache).forEach(data => {
        if (Array.isArray(data)) allVocabData = allVocabData.concat(data);
      });
    }

    // 也考虑 State.builtinVocabData
    if (typeof State !== 'undefined' && State.builtinVocabData) {
      allVocabData = allVocabData.concat(State.builtinVocabData);
    }

    // 去重
    const seen = new Set();
    const unique = [];
    allVocabData.forEach(item => {
      if (item && item.word && !seen.has(item.word.toLowerCase())) {
        seen.add(item.word.toLowerCase());
        unique.push(item);
      }
    });

    if (unique.length < 4) return null;

    // 获取已在复习池中的词
    let reviewWords = new Set();
    if (typeof ReviewPool !== 'undefined') {
      const pool = ReviewPool.getAll();
      pool.forEach(e => reviewWords.add(e.word.toLowerCase()));
    }

    // 从未出现在复习池中的词里选
    const freshWords = unique.filter(item => !reviewWords.has(item.word.toLowerCase()));
    const pool = freshWords.length >= 4 ? freshWords : unique;

    // 随机选一个
    const correct = pool[Math.floor(Math.random() * pool.length)];
    const correctDef = correct.chineseDef || correct.definition || correct.word;

    // 选 3 个干扰项
    const others = unique
      .filter(item => item.word.toLowerCase() !== correct.word.toLowerCase())
      .map(item => item.chineseDef || item.definition || item.word);

    // 洗牌取 3 个
    const shuffled = shuffleArray(others);
    const distractors = shuffled.slice(0, 3);
    while (distractors.length < 3) {
      distractors.push('———');
    }

    // 合并选项并洗牌
    const options = shuffleArray([correctDef, ...distractors]);

    return {
      word: correct.word,
      options,
      correctAnswer: correctDef,
      detail: {
        pronunciation: correct.pronunciation || '',
        partOfSpeech: correct.partOfSpeech || '',
        definition: correct.definition || '',
        chineseDef: correct.chineseDef || '',
        example: correct.example || '',
      },
    };
  },
};
