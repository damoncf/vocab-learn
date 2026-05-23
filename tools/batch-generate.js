#!/usr/bin/env node

/**
 * batch-generate.js — 词库批量扩充工具
 *
 * 使用 DeepSeek API 批量生成词汇，支持断点续传。
 * 每次调用生成 100 词（含完整 6 字段），自动去重后追加到对应 JSON 文件，
 * 每轮生成完自动跑一次 validate 校验。
 *
 * 用法：
 *   DEEPSEEK_API_KEY=sk-xxx node tools/batch-generate.js --vocab=cet4 --target=4500
 *
 * 参数：
 *   --vocab=<id>    词库 ID（必填，如 cet4, cet6, ielts, toefl, gre 等）
 *   --target=<num>  目标词数（可选，默认使用 VOCAB_CONFIGS 中的 targetCount）
 *   --batch=<num>   每批生成数量（可选，默认 100）
 *
 * 环境变量：
 *   DEEPSEEK_API_KEY — DeepSeek API 密钥（必填）
 */

const fs = require('fs');
const path = require('path');

const VOCAB_DIR = path.join(__dirname, '..', 'vocabulary');
const INDEX_FILE = path.join(VOCAB_DIR, 'index.json');
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = 'deepseek-chat';

/* -------------------------------------------------------
   词库配置
   ------------------------------------------------------- */
const VOCAB_CONFIGS = {
  cet4: {
    id: 'cet4', file: 'cet4.json', targetCount: 4500,
    nameCn: '大学英语四级', difficulty: 'intermediate',
    description: '大学英语四级核心词汇，约4500个单词',
  },
  cet6: {
    id: 'cet6', file: 'cet6.json', targetCount: 6000,
    nameCn: '大学英语六级', difficulty: 'advanced',
    description: '大学英语六级核心词汇，约6000个单词',
  },
  ielts: {
    id: 'ielts', file: 'ielts.json', targetCount: 3500,
    nameCn: '雅思核心词汇', difficulty: 'advanced',
    description: '雅思核心词汇，含学术类和生活类高频词汇，约3500个单词',
  },
  toefl: {
    id: 'toefl', file: 'toefl.json', targetCount: 4000,
    nameCn: '托福核心词汇', difficulty: 'advanced',
    description: '托福核心词汇，含学术讲座和校园场景词汇，约4000个单词',
  },
  gre: {
    id: 'gre', file: 'gre.json', targetCount: 5000,
    nameCn: 'GRE词汇', difficulty: 'advanced',
    description: 'GRE核心词汇，含大量学术词汇和高级词汇，约5000个单词',
  },
  gaokao: {
    id: 'gaokao', file: 'gaokao.json', targetCount: 3500,
    nameCn: '高考英语', difficulty: 'intermediate',
    description: '高中英语课标词汇，覆盖高考核心词汇，约3500个单词',
  },
  k12: {
    id: 'k12', file: 'k12.json', targetCount: 2000,
    nameCn: '中考英语', difficulty: 'beginner',
    description: '初中英语课标词汇，适合中考备考，约2000个单词',
  },
  business: {
    id: 'business', file: 'business.json', targetCount: 2000,
    nameCn: '商务英语', difficulty: 'advanced',
    description: 'BEC核心词汇，涵盖商务会议、谈判、邮件、金融等场景',
  },
  sat: {
    id: 'sat', file: 'sat.json', targetCount: 3000,
    nameCn: 'SAT词汇', difficulty: 'advanced',
    description: '美国高考核心学术词汇，约3000个单词',
  },
  phrasalVerbs: {
    id: 'phrasal-verbs', file: 'phrasal-verbs.json', targetCount: 500,
    nameCn: '动词短语', difficulty: 'intermediate',
    description: '高频英语动词短语，如 give up, look after, put off 等',
    isPhrasal: true,
  },
  collins: {
    id: 'collins', file: 'collins.json', targetCount: 3000,
    nameCn: '柯林斯高频词', difficulty: 'beginner',
    description: '柯林斯星级标记高频单词，最常用的3000个英语单词',
  },
};

/* -------------------------------------------------------
   Helper: 解析命令行参数
   ------------------------------------------------------- */
function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) {
      args[match[1]] = match[2];
    }
  });
  return args;
}

/* -------------------------------------------------------
   Helper: 读取现有词库
   ------------------------------------------------------- */
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
    console.error(`  ⚠ Error reading ${filePath}: ${err.message}`);
    return { words: [], set: new Set(), count: 0 };
  }
}

/* -------------------------------------------------------
   Helper: 更新 index.json 中的 wordCount
   ------------------------------------------------------- */
function updateIndexCount(vocabId, count) {
  try {
    const raw = fs.readFileSync(INDEX_FILE, 'utf-8');
    const index = JSON.parse(raw);
    const vocab = index.vocabularies.find((v) => v.id === vocabId);
    if (vocab) {
      vocab.wordCount = count;
      fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error(`    ⚠ Warning: failed to update index.json: ${err.message}`);
  }
}

/* -------------------------------------------------------
   Helper: 运行 validate-vocab.js 校验
   ------------------------------------------------------- */
function runValidate(vocabId) {
  return new Promise((resolve) => {
    const { execSync } = require('child_process');
    try {
      const validateScript = path.join(__dirname, 'validate-vocab.js');
      execSync(`node "${validateScript}" ${vocabId}`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
      resolve(true);
    } catch (err) {
      console.error(`    ✗ Validate failed for ${vocabId}`);
      resolve(false);
    }
  });
}

/* -------------------------------------------------------
   Helper: 调用 DeepSeek API 生成一批词汇
   ------------------------------------------------------- */
async function generateBatch(apiKey, config, existingSet, batchSize, batchNum, totalBatches) {
  const { description, difficulty, id, isPhrasal } = config;

  const existingSample =
    existingSet.size > 0
      ? `\n\nAlready have ${existingSet.size} words, DO NOT repeat any of them. Here are some to avoid: ${[...existingSet].slice(-200).join(', ')}`
      : '';

  const phrasalNote = isPhrasal
    ? 'Each entry is a phrasal verb (two or more words, like "give up", "look after", "put up with")'
    : 'Each entry is a single word, NO phrases';

  const systemPrompt =
    `You are a vocabulary data generator. Your output must be ONLY a valid JSON array with no additional text, no markdown fences. Each element:

{
  "word": "the word (string)",
  "pronunciation": "IPA pronunciation in /slashes/ (string)",
  "partOfSpeech": "abbreviated part of speech like v., n., adj., adv., prep., phr. v. (string)",
  "definition": "clear definition in one sentence (string)",
  "chineseDef": "Chinese translation (string)",
  "example": "one natural example sentence (string)"
}

Rules:
- Words must be suitable for English learners at ${difficulty} level
- Each entry must have all 6 fields
- Pronunciation must be valid IPA in /slashes/
- Chinese definition (chineseDef) must be accurate
- Example sentences must be natural and common
- NO proper nouns, NO obscure words
- ${phrasalNote}`;

  const userPrompt =
    `Generate exactly ${batchSize} vocabulary entries for "${description}" (${difficulty} level). Batch ${batchNum}/${totalBatches}.${existingSample}`;

  const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
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

  // Parse JSON — strip markdown code fences
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenceMatch ? fenceMatch[1].trim() : content.trim();
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) throw new Error('API did not return an array');

  // Normalize and deduplicate
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

/* -------------------------------------------------------
   主函数：为指定词库生成词汇
   ------------------------------------------------------- */
async function generateForVocab(vocabId, targetOverride, batchSizeOverride) {
  const config = { ...VOCAB_CONFIGS[vocabId] };
  if (!config) {
    console.error(`✗ Unknown vocab ID: "${vocabId}"`);
    console.error(`  Available: ${Object.keys(VOCAB_CONFIGS).join(', ')}`);
    return false;
  }

  const filePath = path.join(VOCAB_DIR, config.file);
  const existing = loadExistingWords(filePath);
  config.existingCount = existing.count;

  const target = targetOverride || config.targetCount;
  const batchSize = batchSizeOverride || 100;
  const need = target - existing.count;

  if (need <= 0) {
    console.log(`✓ ${vocabId}: Already has ${existing.count} words (target: ${target}), no generation needed.`);
    return true;
  }

  const totalBatches = Math.ceil(need / batchSize);
  console.log(`\n📚 ${vocabId}: ${existing.count} → ${target} (need ${need} more, ${totalBatches} batches of ${batchSize})`);

  const allNew = [];

  for (let i = 0; i < totalBatches; i++) {
    const currentBatchSize = Math.min(batchSize, need - allNew.length);
    if (currentBatchSize <= 0) break;

    process.stdout.write(`  Batch ${i + 1}/${totalBatches} (${currentBatchSize} words)... `);

    try {
      const batch = await generateBatch(process.env.DEEPSEEK_API_KEY, config, existing.set, currentBatchSize, i + 1, totalBatches);
      allNew.push(...batch);
      batch.forEach((w) => existing.set.add(w.word.toLowerCase().trim()));
      process.stdout.write(`✓ got ${batch.length} new words\n`);

      // Write intermediate results
      const combined = [...existing.words, ...allNew];
      fs.writeFileSync(filePath, JSON.stringify(combined, null, 2), 'utf-8');
      console.log(`    Wrote ${combined.length} words to ${config.file}`);

      // Update index.json
      updateIndexCount(vocabId, combined.length);

      // Run validate on this vocab
      const valid = await runValidate(vocabId);
      if (!valid) {
        console.error(`    ✗ Validate failed after batch ${i + 1}. Check the file.`);
      }
    } catch (err) {
      process.stdout.write(`✗ ${err.message}\n`);
      console.error(`  Failed at batch ${i + 1}. Saved ${allNew.length} generated words.`);
      return false;
    }
  }

  console.log(`\n✅ ${vocabId}: Generated ${allNew.length} new words (total: ${existing.count + allNew.length})`);
  return true;
}

/* -------------------------------------------------------
   入口
   ------------------------------------------------------- */
async function main() {
  const args = parseArgs();
  const vocabId = args.vocab;
  const targetOverride = args.target ? parseInt(args.target, 10) : null;
  const batchSizeOverride = args.batch ? parseInt(args.batch, 10) : null;
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.error('✗ DEEPSEEK_API_KEY environment variable is required.');
    console.error('  Usage: DEEPSEEK_API_KEY=sk-xxx node tools/batch-generate.js --vocab=cet4 --target=4500');
    process.exit(1);
  }

  if (!vocabId) {
    console.error('✗ --vocab parameter is required.');
    console.error('  Usage: DEEPSEEK_API_KEY=sk-xxx node tools/batch-generate.js --vocab=cet4 --target=4500');
    console.error(`  Available vocabs: ${Object.keys(VOCAB_CONFIGS).join(', ')}`);
    process.exit(1);
  }

  console.log('🔧 VocabLearn — Batch Vocabulary Generator');
  console.log(`   Model: ${DEEPSEEK_MODEL}`);
  console.log(`   Batch size: ${batchSizeOverride || 100}`);
  console.log(`   Vocab dir: ${VOCAB_DIR}\n`);

  const success = await generateForVocab(vocabId, targetOverride, batchSizeOverride);

  if (success) {
    console.log('\n✨ All done!');
  } else {
    console.log('\n⚠ Completed with issues.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
