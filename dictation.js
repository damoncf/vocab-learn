/**
 * dictation.js — 听写模式
 *
 * 流程：
 *   1. 从当前单词列表/复习池/词汇细节中选取单词
 *   2. 自动调用 tts.js 朗读单词
 *   3. 用户输入听到的拼写
 *   4. 模糊匹配判断对错（忽略大小写、标点符号）
 *   5. 10 词一轮，出分
 *   6. 错词自动加入复习池
 */

/* =========================================================
   听写题目生成
   ========================================================= */

/**
 * 从单词列表中生成听写题目
 * @param {string[]} words - 单词列表
 * @param {Array} details - 单词详细信息（用于显示释义反馈）
 * @param {number} count - 题目数量（默认 10）
 * @returns {Array} 题目数组 [{ word, pronunciation, definition, hint }]
 */
function generateDictation(words, details, count = 10) {
  if (!words || words.length === 0) return [];

  // 构建 detail 映射
  const detailMap = {};
  (details || []).forEach(d => {
    if (d && d.word) detailMap[d.word.toLowerCase()] = d;
  });

  // 随机选取 count 个词
  const selected = shuffleArray(words).slice(0, count);

  return selected.map(word => {
    const detail = detailMap[word.toLowerCase()] || {};
    return {
      word: word,
      pronunciation: detail.pronunciation || '',
      partOfSpeech: detail.partOfSpeech || '',
      definition: detail.definition || '',
      chineseDef: detail.chineseDef || '',
      example: detail.example || '',
    };
  });
}

/* =========================================================
   答案检查（模糊匹配）
   ========================================================= */

/**
 * 判断拼写是否正确（模糊匹配）
 * - 忽略大小写
 * - 忽略标点符号
 * - 允许前后空格
 * @param {string} userInput
 * @param {string} correctWord
 * @returns {boolean}
 */
function checkDictationAnswer(userInput, correctWord) {
  if (!userInput || !correctWord) return false;

  const normalize = s => String(s)
    .trim()
    .toLowerCase()
    .replace(/[^\w\s'-]/g, '')  // 移除非字母数字、空格、撇号、连字符
    .trim();

  return normalize(userInput) === normalize(correctWord);
}

/* =========================================================
   模糊相似度（可选进阶匹配）
   ========================================================= */

/**
 * Levenshtein 编辑距离（用于提示"接近正确"）
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

/**
 * 检查拼写是否"接近正确"（编辑距离 <= 2）
 * @param {string} userInput
 * @param {string} correctWord
 * @returns {boolean}
 */
function isCloseMatch(userInput, correctWord) {
  if (!userInput || !correctWord) return false;
  const a = String(userInput).trim().toLowerCase();
  const b = String(correctWord).trim().toLowerCase();
  if (a === b) return false; // 完全正确，不需要"接近"提示
  const dist = levenshteinDistance(a, b);
  return dist <= 2 && dist > 0;
}
