/**
 * generate-vocab.js — 使用 DeepSeek API 批量生成词库
 *
 * 用法：
 *   DEEPSEEK_API_KEY=sk-xxx node generate-vocab.js [vocab-id]
 *
 * 不指定 vocab-id 则生成所有缺失/需要扩充的词库。
 * 每次调用生成 200 词，分批次追加到对应 JSON 文件。
 *
 * 环境变量：
 *   DEEPSEEK_API_KEY — DeepSeek API 密钥
 *   BATCH_SIZE       — 每批生成数量（默认 200）
 */

const fs = require('fs');
const path = require('path');

const VOCAB_DIR = path.join(__dirname, '..', 'vocabulary');
const INDEX_FILE = path.join(VOCAB_DIR, 'index.json');
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = 'deepseek-chat';

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE, 10) || 200;
const API_KEY = process.env.DEEPSEEK_API_KEY;

if (!API_KEY) {
  console.error('ERROR: DEEPSEEK_API_KEY environment variable is required.');
  console.error('Usage: DEEPSEEK_API_KEY=sk-xxx node generate-vocab.js [vocab-id]');
  process.exit(1);
}

/**
 * 词库配置
 * 每个词库：{ id, file, targetCount, existingPath, description, level }
 */
const VOCAB_CONFIGS = {
  // === 新词库（从 0 开始） ===
  'gaokao': {
    id: 'gaokao', file: 'gaokao.json',
    targetCount: 3500, existingCount: 0,
    description: '高考英语核心词汇，高中英语课程标准要求词汇，按字母顺序从A到Z排列',
    level: '中级',
    nameCn: '高考英语',
  },
  'k12': {
    id: 'k12', file: 'k12.json',
    targetCount: 2000, existingCount: 0,
    description: '中考英语/初中英语核心词汇，初中英语课程标准词汇',
    level: '初级',
    nameCn: '中考英语',
  },
  'business': {
    id: 'business', file: 'business.json',
    targetCount: 2000, existingCount: 0,
    description: '商务英语核心词汇（BEC核心词汇），涵盖商务会议、谈判、邮件、金融等场景',
    level: '中高级',
    nameCn: '商务英语',
  },
  'sat': {
    id: 'sat', file: 'sat.json',
    targetCount: 3000, existingCount: 0,
    description: 'SAT核心词汇，美国高考词汇，含学术词汇',
    level: '高级',
    nameCn: 'SAT词汇',
  },
  'phrasal-verbs': {
    id: 'phrasal-verbs', file: 'phrasal-verbs.json',
    targetCount: 500, existingCount: 0,
    description: '高频英语动词短语，如 give up, look after, put off 等，word字段为短语本身',
    level: '中级',
    nameCn: '动词短语',
  },
  'collins': {
    id: 'collins', file: 'collins.json',
    targetCount: 3000, existingCount: 0,
    description: '柯林斯星级高频词，最常用的3000个英语单词',
    level: '初级-中级',
    nameCn: '柯林斯高频词',
  },

  // === 需扩充的词库 ===
  'cet4': {
    id: 'cet4', file: 'cet4.json',
    targetCount: 4500, existingCount: 0, // 实际加载时动态计算
    description: '大学英语四级核心词汇',
    level: '中级',
  },
  'cet6': {
    id: 'cet6', file: 'cet6.json',
    targetCount: 6000, existingCount: 0,
    description: '大学英语六级核心词汇',
    level: '中高级',
  },
  'ielts': {
    id: 'ielts', file: 'ielts.json',
    targetCount: 3500, existingCount: 0,
    description: '雅思核心词汇，含学术类和生活类高频词汇',
    level: '中高级',
  },
  'toefl': {
    id: 'toefl', file: 'toefl.json',
    targetCount: 4000, existingCount: 0,
    description: '托福核心词汇，含学术讲座和校园场景词汇',
    level: '中高级',
  },
  'gre': {
    id: 'gre', file: 'gre.json',
    targetCount: 5000, existingCount: 0,
    description: 'GRE核心词汇，含大量学术词汇和高级词汇',
    level: '高级',
  },
};

/**
 * 读取现有词库文件，返回已存在的词集合
 */
function loadExistingWords(filePath) {
  if (!fs.existsSync(filePath)) return { words: [], set: new Set(), count: 0 };
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return { words: [], set: new Set(), count: 0 };
    const words = data.map(e => e.word ? e.word.toLowerCase().trim() : '');
    return {
      words: data,
      set: new Set(words),
      count: data.length,
    };
  } catch (err) {
    console.error(`  Error reading ${filePath}: ${err.message}`);
    return { words: [], set: new Set(), count: 0 };
  }
}

/**
 * 计算 ED 调整值
 */
function computeEF(ef, quality) {
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  return Math.max(1.3, Math.min(2.5, ef + delta));
}

/**
 * 调用 DeepSeek API 生成一批词汇
 * 返回完整 word detail 数组
 */
async function generateBatch(apiKey, config, existingSet, batchSize, batchNum, totalBatches) {
  const { description, level, id } = config;
  const isPhrasal = id === 'phrasal-verbs';
  const isExpand = id === 'cet4' || id === 'cet6' || id === 'ielts' || id === 'toefl' || id === 'gre';

  const existingSample = existingSet.size > 0
    ? `\n已存在的词 (${existingSet.size} 个)，不要重复生成：${[...existingSet].slice(-100).join(', ')}`
    : '';

  const prompt = isPhrasal
    ? `Generate exactly ${batchSize} common English phrasal verbs (e.g., "give up", "look after", "put up with") for learning purposes. Batch ${batchNum}/${totalBatches}.`
    : `Generate exactly ${batchSize} ${isExpand ? 'more' : ''} unique English vocabulary words for "${description}" (${level}). Batch ${batchNum}/${totalBatches}.`;

  const systemPrompt = `You are a vocabulary data generator. Your output must be ONLY a valid JSON array with no additional text, no markdown fences. Each element:
{
  "word": "the word (string)${isPhrasal ? ' - phrasal verbs like "give up", "look after"' : ''}",
  "pronunciation": "IPA pronunciation in /slashes/ (string)",
  "partOfSpeech": "abbreviated part of speech like v., n., adj., adv., prep., phr. v. (string)",
  "definition": "clear definition in one sentence (string)",
  "chineseDef": "Chinese translation (string)",
  "example": "one natural example sentence (string)"
}

Rules:
- Words must be suitable for English learners at ${level} level
- Each entry must have all 6 fields
- Pronunciation must be valid IPA in /slashes/
- Chinese definition (chineseDef) must be accurate
- Example sentences must be natural and common
- NO proper nouns, NO obscure words
- ${isPhrasal ? 'Each entry is a phrasal verb (two or more words)' : 'Each entry is a single word, NO phrases'}
${existingSample}`;

  const userPrompt = `Generate exactly ${batchSize} vocabulary entries as a JSON array. Batch ${batchNum}/${totalBatches}.`;

  const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    let errMsg = `API error ${response.status}`;
    try {
      const errBody = await response.json();
      errMsg = errBody?.error?.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from API');

  // Parse JSON - handle markdown code fences
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenceMatch ? fenceMatch[1].trim() : content.trim();
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) throw new Error('API did not return an array');

  // Normalize and deduplicate within this batch
  const seen = new Set(existingSet);
  const result = [];
  for (const entry of parsed) {
    const word = (entry.word || '').toLowerCase().trim();
    if (!word || seen.has(word)) continue;
    seen.add(word);

    result.push({
      word: entry.word,
      pronunciation: entry.pronunciation || '',
      partOfSpeech: entry.partOfSpeech || entry.pos || '',
      definition: entry.definition || entry.meaning || '',
      chineseDef: entry.chineseDef || '',
      example: entry.example || entry.sentence || '',
    });
  }

  return result;
}

/**
 * 为指定词库生成词汇
 */
async function generateForVocab(vocabId) {
  const config = VOCAB_CONFIGS[vocabId];
  if (!config) {
    console.error(`Unknown vocab: ${vocabId}`);
    return;
  }

  const filePath = path.join(VOCAB_DIR, config.file);
  const existing = loadExistingWords(filePath);
  config.existingCount = existing.count;

  const need = config.targetCount - existing.count;
  if (need <= 0) {
    console.log(`✓ ${vocabId}: Already has ${existing.count} words (target: ${config.targetCount}), no generation needed.`);
    return;
  }

  const totalBatches = Math.ceil(need / BATCH_SIZE);
  console.log(`\n📚 ${vocabId}: ${existing.count} → ${config.targetCount} (need ${need} more, ${totalBatches} batches of ${BATCH_SIZE})`);

  const allNew = [];

  for (let i = 0; i < totalBatches; i++) {
    const batchSize = Math.min(BATCH_SIZE, need - allNew.length);
    if (batchSize <= 0) break;

    process.stdout.write(`  Batch ${i + 1}/${totalBatches} (${batchSize} words)... `);

    try {
      const batch = await generateBatch(API_KEY, config, existing.set, batchSize, i + 1, totalBatches);
      allNew.push(...batch);
      batch.forEach(w => existing.set.add(w.word.toLowerCase().trim()));
      process.stdout.write(`✓ got ${batch.length} new words\n`);

      // Write intermediate results after each batch
      const combined = [...existing.words, ...allNew];
      fs.writeFileSync(filePath, JSON.stringify(combined, null, 2), 'utf-8');
      console.log(`    Wrote ${combined.length} words to ${config.file}`);

      // Update index.json word counts
      updateIndexCount(vocabId, combined.length);
    } catch (err) {
      process.stdout.write(`✗ ${err.message}\n`);
      console.error(`  Failed at batch ${i + 1}. Saved ${allNew.length} generated words.`);
      break;
    }
  }

  console.log(`\n✅ ${vocabId}: Generated ${allNew.length} new words (total: ${existing.count + allNew.length})`);
}

/**
 * 更新 index.json 中的 wordCount
 */
function updateIndexCount(vocabId, count) {
  try {
    const indexPath = INDEX_FILE;
    const raw = fs.readFileSync(indexPath, 'utf-8');
    const index = JSON.parse(raw);
    const vocab = index.vocabularies.find(v => v.id === vocabId);
    if (vocab) {
      vocab.wordCount = count;
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error(`    Warning: failed to update index.json: ${err.message}`);
  }
}

async function main() {
  const targetVocab = process.argv[2];

  console.log('🔧 VocabLearn — Vocabulary Generator');
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log(`   DeepSeek model: ${DEEPSEEK_MODEL}`);
  console.log(`   Vocab dir: ${VOCAB_DIR}\n`);

  if (targetVocab) {
    await generateForVocab(targetVocab);
  } else {
    for (const vocabId of Object.keys(VOCAB_CONFIGS)) {
      await generateForVocab(vocabId);
    }
  }

  console.log('\n✨ Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
