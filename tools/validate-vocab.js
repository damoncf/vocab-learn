/**
 * validate-vocab.js — 词库数据质量校验脚本
 *
 * 检查：
 * - 每条数据是否 6 字段完备（word, pronunciation, partOfSpeech, definition, chineseDef, example）
 * - pronunciation 是否是有效的 IPA 格式（以 /.../ 包裹）
 * - word 字段非空
 * - 无重复 word
 * - 输出详细报告
 *
 * 用法：node validate-vocab.js [vocab-id]
 * 不传参数则校验所有词库
 */

const fs = require('fs');
const path = require('path');

const VOCAB_DIR = path.join(__dirname, '..', 'vocabulary');
const INDEX_FILE = path.join(VOCAB_DIR, 'index.json');

const REQUIRED_FIELDS = ['word', 'pronunciation', 'partOfSpeech', 'definition', 'chineseDef', 'example'];
const IPA_REGEX = /^\/.+\/$/;

function loadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { error: err.message };
  }
}

function validateVocab(vocabId, data) {
  const errors = [];
  const warnings = [];
  const seenWords = new Set();
  const duplicates = [];

  if (!Array.isArray(data)) {
    return {
      vocabId,
      total: 0,
      errors: [{ type: 'format', message: 'Data is not an array' }],
      warnings: [],
      duplicates: [],
      fieldsMissing: {},
      ipaInvalid: 0,
      emptyWords: 0,
      valid: false,
    };
  }

  const fieldsMissing = {};
  REQUIRED_FIELDS.forEach(f => fieldsMissing[f] = 0);
  let ipaInvalid = 0;
  let emptyWords = 0;

  data.forEach((entry, idx) => {
    // Check required fields
    REQUIRED_FIELDS.forEach(field => {
      if (!entry[field] || (typeof entry[field] === 'string' && entry[field].trim() === '')) {
        fieldsMissing[field]++;
        errors.push({ type: 'missing_field', field, index: idx, word: entry.word || `#${idx}` });
      }
    });

    // Check word non-empty
    if (!entry.word || entry.word.trim() === '') {
      emptyWords++;
    }

    // Check IPA format
    if (entry.pronunciation && !IPA_REGEX.test(entry.pronunciation)) {
      ipaInvalid++;
      warnings.push({ type: 'ipa_format', word: entry.word, pronunciation: entry.pronunciation });
    }

    // Check duplicates
    if (entry.word) {
      const lower = entry.word.toLowerCase().trim();
      if (seenWords.has(lower)) {
        duplicates.push(entry.word);
        errors.push({ type: 'duplicate', word: entry.word });
      }
      seenWords.add(lower);
    }
  });

  return {
    vocabId,
    total: data.length,
    errors,
    warnings,
    duplicates: [...new Set(duplicates)],
    fieldsMissing,
    ipaInvalid,
    emptyWords,
    valid: errors.length === 0,
    uniqueWords: seenWords.size,
  };
}

function printReport(reports) {
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalDuplicates = 0;

  reports.forEach(r => {
    const status = r.valid ? '✓ PASS' : '✗ FAIL';
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${status}  ${r.vocabId} (${r.total} words, ${r.uniqueWords} unique)`);
    console.log(`${'='.repeat(60)}`);

    if (r.errors.length > 0) {
      console.log(`\n  Errors (${r.errors.length}):`);
      const summary = {};
      r.errors.forEach(e => {
        if (e.type === 'missing_field') {
          summary[e.type] = summary[e.type] || {};
          summary[e.type][e.field] = (summary[e.type][e.field] || 0) + 1;
        } else {
          summary[e.type] = (summary[e.type] || 0) + 1;
        }
      });
      Object.entries(summary).forEach(([type, countOrFields]) => {
        if (typeof countOrFields === 'object') {
          Object.entries(countOrFields).forEach(([field, count]) => {
            console.log(`    - ${field}: ${count} entries missing`);
          });
        } else {
          console.log(`    - ${type}: ${countOrFields}`);
        }
      });
    }

    if (r.warnings.length > 0) {
      console.log(`\n  Warnings (${r.warnings.length}):`);
      r.warnings.slice(0, 10).forEach(w => {
        console.log(`    - ${w.word}: IPA "${w.pronunciation}" doesn't match /.../ format`);
      });
      if (r.warnings.length > 10) {
        console.log(`    ... and ${r.warnings.length - 10} more`);
      }
    }

    if (r.duplicates.length > 0) {
      console.log(`\n  Duplicates (${r.duplicates.length}):`);
      r.duplicates.slice(0, 20).forEach(w => console.log(`    - ${w}`));
      if (r.duplicates.length > 20) {
        console.log(`    ... and ${r.duplicates.length - 20} more`);
      }
    }

    totalErrors += r.errors.length;
    totalWarnings += r.warnings.length;
    totalDuplicates += r.duplicates.length;
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`SUMMARY: ${reports.length} vocab(s) checked`);
  console.log(`  Total errors:   ${totalErrors}`);
  console.log(`  Total warnings: ${totalWarnings}`);
  console.log(`  Total dups:     ${totalDuplicates}`);
  console.log(`  Valid files:    ${reports.filter(r => r.valid).length}/${reports.length}`);
  console.log(`${'='.repeat(60)}\n`);
}

function main() {
  const targetVocab = process.argv[2];

  // Load index
  const index = loadJson(INDEX_FILE);
  if (index.error) {
    console.error(`Failed to load index: ${index.error}`);
    process.exit(1);
  }

  const vocabularies = index.vocabularies || [];
  const reports = [];

  vocabularies.forEach(v => {
    if (targetVocab && v.id !== targetVocab) return;

    const filePath = path.join(VOCAB_DIR, v.file);
    if (!fs.existsSync(filePath)) {
      console.log(`\n⚠  MISSING: ${v.id} — file ${v.file} not found`);
      return;
    }

    const data = loadJson(filePath);
    if (data.error) {
      console.log(`\n⚠  ERROR loading ${v.id}: ${data.error}`);
      return;
    }

    const report = validateVocab(v.id, data);
    reports.push(report);
  });

  printReport(reports);

  // Exit with code
  const hasErrors = reports.some(r => !r.valid);
  process.exit(hasErrors ? 1 : 0);
}

main();
