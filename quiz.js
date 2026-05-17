/**
 * quiz.js — 测验模式引擎
 *
 * 三种测验模式：
 *  1. "word2def" — 看词选义：展示单词，4 个中文选项选正确释义
 *  2. "def2word" — 看义选词：展示中文释义，4 个英文选项选对应单词
 *  3. "spelling" — 拼写测验：展示中文释义，用户输入英文拼写
 *
 * 核心函数：
 *  - generateQuiz(words, details, mode, count = 10)  → 生成测验题目
 *  - checkAnswer(question, selected)                  → 验证答案
 */

/* =========================================================
   题目生成
   ========================================================= */

/**
 * 从单词列表中生成测验题目
 * @param {string[]} words - 单词列表
 * @param {Array} details - 单词详细信息（用于取释义）
 * @param {string} mode - 模式：'word2def' | 'def2word' | 'spelling'
 * @param {number} count - 题目数量（默认 10）
 * @returns {Array} 题目数组
 */
function generateQuiz(words, details, mode, count = 10) {
  // 构建 word → detail 的映射
  const detailMap = {};
  (details || []).forEach(d => {
    if (d && d.word) detailMap[d.word.toLowerCase()] = d;
  });

  // 过滤出有释义的单词（拼写模式只需要有中文释义即可）
  let eligible = words.filter(w => {
    const detail = detailMap[w.toLowerCase()];
    if (mode === 'spelling') {
      return detail && detail.definition && detail.definition.trim();
    }
    return detail && detail.definition && detail.definition.trim();
  });

  // 如果可用的词少于 count，则从全部词中补充（用词本身兜底）
  if (eligible.length < count) {
    eligible = words.slice();
  }

  // 随机选取 count 个词
  const selected = shuffleArray(eligible).slice(0, count);

  // 按模式生成题目
  switch (mode) {
    case 'word2def': return generateWord2Def(selected, detailMap, words);
    case 'def2word': return generateDef2Word(selected, detailMap, words);
    case 'spelling': return generateSpelling(selected, detailMap);
    default: return generateWord2Def(selected, detailMap, words);
  }
}

/* -------------------------------------------------------
   模式 1: 看词选义
   ------------------------------------------------------- */
function generateWord2Def(words, detailMap, allWords) {
  return words.map(word => {
    const detail = detailMap[word.toLowerCase()];
    const correctDef = detail ? detail.definition : word;
    // 从其他词中选 3 个干扰项
    const distractors = getDistractors(word, allWords, detailMap, 3);
    const options = shuffleArray([correctDef, ...distractors]);
    return {
      word,
      correctAnswer: correctDef,
      options,
      mode: 'word2def',
    };
  });
}

/* -------------------------------------------------------
   模式 2: 看义选词
   ------------------------------------------------------- */
function generateDef2Word(words, detailMap, allWords) {
  return words.map(word => {
    const detail = detailMap[word.toLowerCase()];
    const correctWord = word;
    // 从其他词中选 3 个干扰项
    const distractors = getDistractors(word, allWords, detailMap, 3);
    const options = shuffleArray([correctWord, ...distractors]);
    return {
      word: correctWord,
      // 题目展示的是中文释义
      prompt: detail ? detail.definition : word,
      correctAnswer: correctWord,
      options,
      mode: 'def2word',
    };
  });
}

/* -------------------------------------------------------
   模式 3: 拼写测验
   ------------------------------------------------------- */
function generateSpelling(words, detailMap) {
  return words.map(word => {
    const detail = detailMap[word.toLowerCase()];
    return {
      word,
      prompt: detail ? detail.definition : word,
      correctAnswer: word.toLowerCase(),
      mode: 'spelling',
    };
  });
}

/* -------------------------------------------------------
   干扰项生成
   ------------------------------------------------------- */
function getDistractors(correctWord, allWords, detailMap, count) {
  const others = allWords.filter(w => w.toLowerCase() !== correctWord.toLowerCase());
  const shuffled = shuffleArray(others);
  const distractors = [];

  for (const w of shuffled) {
    if (distractors.length >= count) break;
    const detail = detailMap[w.toLowerCase()];
    const def = detail ? detail.definition : w;
    if (def && def.trim() && !distractors.includes(def)) {
      distractors.push(def);
    }
  }

  // 如果干扰项不够，用更多词补
  while (distractors.length < count) {
    distractors.push('—');
  }

  return distractors;
}

/* -------------------------------------------------------
   答案检查
   ------------------------------------------------------- */

/**
 * 检查答案是否正确
 * @param {object} question - 题目对象
 * @param {string} answer - 用户选择的答案（spelling 模式为用户输入的词）
 * @returns {boolean}
 */
function checkAnswer(question, answer) {
  if (!question || answer == null) return false;

  switch (question.mode) {
    case 'word2def':
    case 'def2word':
      return answer === question.correctAnswer;
    case 'spelling': {
      const userAnswer = String(answer).trim().toLowerCase();
      const correct = question.correctAnswer.toLowerCase();
      // 模糊匹配：标点符号容错
      const normalize = s => s.replace(/[^\w\s'-]/g, '').trim();
      return normalize(userAnswer) === normalize(correct);
    }
    default:
      return false;
  }
}

/* -------------------------------------------------------
   工具函数
   ------------------------------------------------------- */

/**
 * Fisher-Yates 洗牌
 */
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
