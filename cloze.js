/**
 * cloze.js — 完形填空模式
 *
 * 流程：
 *   1. 从当前单词列表/词汇细节中选取有 example 句子的词
 *   2. 在 example 句子中将目标词替换为 _____
 *   3. 从当前池中取 3 个干扰词作为选项
 *   4. 用户 4 选 1
 *   5. 10 题一轮，出分
 */

/* =========================================================
   完形填空题目生成
   ========================================================= */

/**
 * 从单词列表中生成完形填空题目
 * @param {string[]} words - 候选单词列表
 * @param {Array} details - 单词详细信息（必须含 example）
 * @param {number} count - 题目数量
 * @returns {Array} 题目数组 [{ sentence, blankWord, options, correctIndex }]
 */
function generateCloze(words, details, count = 10) {
  if (!words || words.length === 0) return [];

  // 构建 word → detail 映射
  const detailMap = {};
  (details || []).forEach(d => {
    if (d && d.word) detailMap[d.word.toLowerCase()] = d;
  });

  // 过滤出有 example 句子的词
  const eligible = [];
  const seen = new Set();

  words.forEach(w => {
    const lower = w.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);

    const detail = detailMap[lower];
    if (detail && detail.example && detail.example.trim()) {
      // 确保 example 句子中包含目标词（忽略大小写）
      const sentence = detail.example;
      const wordVariants = [w, lower];
      const hasWord = wordVariants.some(v => {
        const pattern = new RegExp('\\b' + escapeRegex(v) + '\\b', 'i');
        return pattern.test(sentence);
      });
      if (hasWord) {
        eligible.push({ word: w, detail });
      }
    }
  });

  // 如果可用的题目不够，从全部 words 中补充（用 word 本身做题干）
  if (eligible.length < count) {
    words.forEach(w => {
      const lower = w.toLowerCase();
      if (seen.has(lower)) return;
      seen.add(lower);
      // 造一个简单句子
      const detail = detailMap[lower];
      eligible.push({
        word: w,
        detail: detail || {},
        synthetic: true,
      });
    });
  }

  // 随机选取 count 个
  const selected = shuffleArray(eligible).slice(0, count);

  // 所有词的集合（用于取干扰项）
  const allWords = [...new Set(words.map(w => w.toLowerCase()))];
  // 细节映射也用于干扰项（排除无 example 的词）
  const allWordsWithDetails = allWords.filter(w => {
    const d = detailMap[w];
    return d && d.example && d.example.trim();
  });

  return selected.map(item => {
    const w = item.word;
    const detail = item.detail;
    const lower = w.toLowerCase();

    // 生成题干
    let sentence;
    let blankWord;

    if (item.synthetic || !detail.example) {
      // 人造题干
      sentence = `The word _____ is related to "${detail.definition || w}".`;
      blankWord = w;
    } else {
      // 真实例句
      sentence = detail.example;
      blankWord = w;

      // 找到句子中的目标词并替换为 _____
      const pattern = new RegExp('\\b' + escapeRegex(w) + '\\b', 'i');
      const match = sentence.match(pattern);
      if (match) {
        sentence = sentence.replace(pattern, '_____');
      } else {
        // 如果没找到精确匹配，尝试部分匹配
        const firstWord = sentence.split(/\s+/)[0];
        sentence = '_____ ' + sentence;
        blankWord = w;
      }
    }

    // 重新检查是否有多余空格
    sentence = sentence.replace(/\s+/g, ' ').trim();

    // 生成选项
    const distractors = getClozeDistractors(blankWord, allWordsWithDetails, detailMap, 3);
    const options = shuffleArray([blankWord, ...distractors]);
    const correctIndex = options.indexOf(blankWord);

    return {
      sentence,
      blankWord,
      options,
      correctIndex,
      definition: detail.definition || '',
      chineseDef: detail.chineseDef || '',
      pronunciation: detail.pronunciation || '',
      partOfSpeech: detail.partOfSpeech || '',
      example: detail.example || '',
    };
  });
}

/* =========================================================
   干扰词生成
   ========================================================= */

/**
 * 从候选词中选取干扰选项
 * @param {string} correctWord - 正确答案
 * @param {string[]} allWords - 所有候选词
 * @param {object} detailMap - 细节映射
 * @param {number} count - 需要数量
 * @returns {string[]}
 */
function getClozeDistractors(correctWord, allWords, detailMap, count) {
  const lower = correctWord.toLowerCase();
  const others = allWords.filter(w => w !== lower);
  const shuffled = shuffleArray(others);
  const distractors = [];

  for (const w of shuffled) {
    if (distractors.length >= count) break;
    // 选项尽量不同长度/不同词性，避免一眼看出
    if (!distractors.includes(w)) {
      distractors.push(w);
    }
  }

  // 不够就随便补
  while (distractors.length < count) {
    distractors.push('______');
  }

  return distractors;
}

/* =========================================================
   正则转义
   ========================================================= */
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* =========================================================
   工具函数
   ========================================================= */
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
