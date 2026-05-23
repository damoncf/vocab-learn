/**
 * anki.js — Anki CSV 导出模块
 *
 * 将词汇数据导出为 Anki 兼容的 CSV 格式。
 * 字段映射（导入时由用户设置）：
 *   第1列 → 正面 (Front) = word
 *   第2列 → 背面 (Back) 模板使用 {pronunciation}<br>{partOfSpeech} {definition}<br>{chineseDef}<br><i>{example}</i>
 *
 * 字段：word, pronunciation, partOfSpeech, definition, chineseDef, example
 * 导出时按 CSV 规范处理逗号、引号、换行等特殊字符。
 */

/* =========================================================
   CSV 字段编码
   ========================================================= */

/**
 * 将单个字段编码为 CSV 安全字符串。
 * 如果字段包含逗号、双引号或换行符，用双引号包裹。
 * 字段内的双引号转义为两个双引号。
 * @param {string} value
 * @returns {string}
 */
function csvEscape(value) {
  if (value == null) return '';
  const str = String(value);
  // 需要转义的情况：包含逗号、双引号、换行
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * 将一行 CSV 记录编码为字符串
 * @param {string[]} fields
 * @returns {string}
 */
function csvRow(fields) {
  return fields.map(csvEscape).join(',');
}

/* =========================================================
   CSV 表头
   ========================================================= */
const ANKI_HEADER = csvRow(['word', 'pronunciation', 'partOfSpeech', 'definition', 'chineseDef', 'example']);

/* =========================================================
   数据源：从复习池或词数组中提取
   ========================================================= */

/**
 * 从复习池中获取所有词条
 * @returns {Array<{word: string, ...}>}
 */
function getWordsFromReviewPool() {
  return ReviewPool.getAll() || [];
}

/**
 * 将 word 数组转换为详情的 CSV 行。
 * 优先从 State.wordDetails / detail 缓存中获取详细数据。
 * @param {string[]} words - 单词数组
 * @param {Array} detailData - 可选，额外的细节数据源（会合并到细节缓存中）
 * @returns {string[]} CSV 行数组
 */
function wordsToCsvRows(words, detailData) {
  // 构建细节映射
  const detailCache = buildDetailMap(words.length > 0 ? words : []);

  // 如果有额外细节数据，也合并进去
  if (detailData && Array.isArray(detailData)) {
    detailData.forEach(d => {
      if (d && d.word) {
        const key = d.word.toLowerCase();
        if (!detailCache.has(key)) {
          detailCache.set(key, d);
        }
      }
    });
  }

  const rows = [ANKI_HEADER];
  words.forEach(w => {
    const lower = w.toLowerCase();
    const detail = detailCache.get(lower) || {};
    rows.push(csvRow([
      w,
      detail.pronunciation || '',
      detail.partOfSpeech || '',
      detail.definition || '',
      detail.chineseDef || '',
      detail.example || '',
    ]));
  });

  return rows;
}

/**
 * 从复习池词条数组中提取 CSV 行。
 * @param {Array} reviewEntries - ReviewPool 条目（含 word 字段）
 * @param {Array} detailData - 可选详情数据
 * @returns {string[]}
 */
function reviewEntriesToCsvRows(reviewEntries, detailData) {
  const words = reviewEntries.map(e => e.word);
  return wordsToCsvRows(words, detailData);
}

/* =========================================================
   细节缓存构建
   ========================================================= */
function buildDetailMap(words) {
  const map = new Map();

  // 1. 从 State.wordDetails 获取（当前 batch 的最新详情）
  if (State.wordDetails && Array.isArray(State.wordDetails)) {
    State.wordDetails.forEach(d => {
      if (d && d.word) {
        map.set(d.word.toLowerCase(), d);
      }
    });
  }

  // 2. 从 localStorage 细节缓存补充
  try {
    const cache = JSON.parse(localStorage.getItem('vocab_detail_cache') || 'null');
    if (cache && Array.isArray(cache.data)) {
      cache.data.forEach(d => {
        if (d && d.word) {
          const key = d.word.toLowerCase();
          if (!map.has(key)) {
            map.set(key, d);
          }
        }
      });
    }
  } catch (_) {}

  return map;
}

/* =========================================================
   CSV 字符串生成
   ========================================================= */

/**
 * 根据词数组生成完整 CSV 字符串（含表头）
 * @param {string[]} words
 * @param {Array} detailData - 可选
 * @returns {string}
 */
function buildCsvFromWords(words, detailData) {
  const rows = wordsToCsvRows(words, detailData);
  return rows.join('\n');
}

/**
 * 从复习池条目生成 CSV 字符串
 * @param {Array} reviewEntries
 * @param {Array} detailData - 可选
 * @returns {string}
 */
function buildCsvFromReviewEntries(reviewEntries, detailData) {
  const rows = reviewEntriesToCsvRows(reviewEntries, detailData);
  return rows.join('\n');
}

/* =========================================================
   导出触发（浏览器下载）
   ========================================================= */

/**
 * 触发浏览器下载 CSV 文件
 * @param {string} csvContent - CSV 字符串
 * @param {string} filename - 文件名，默认 "vocab-anki-export.csv"
 */
function downloadCsv(csvContent, filename) {
  const BOM = '\uFEFF'; // UTF-8 BOM 确保 Excel 正确识别中文
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'vocab-anki-export.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 主入口：将指定范围的词汇导出为 Anki CSV 并下载。
 *
 * @param {object} options
 * @param {'familiar'|'unfamiliar'|'batch'|'reviewPool'|'sessionAll'} options.range - 导出范围
 * @param {string} [options.filename] - 可选文件名
 */
function exportToAnki(options = {}) {
  const range = options.range || 'unfamiliar';
  const filename = options.filename || `vocab-anki-${range}-${getDateString()}.csv`;

  let csvContent = '';
  const detailData = State.wordDetails;

  switch (range) {
    case 'familiar': {
      const words = Session.getFamiliarWords();
      csvContent = buildCsvFromWords(words, detailData);
      break;
    }
    case 'unfamiliar': {
      const words = Session.getUnfamiliarWords();
      csvContent = buildCsvFromWords(words, detailData);
      break;
    }
    case 'batch': {
      const words = State.currentWords || [];
      csvContent = buildCsvFromWords(words, detailData);
      break;
    }
    case 'reviewPool': {
      const entries = ReviewPool.getAll();
      csvContent = buildCsvFromReviewEntries(entries, detailData);
      break;
    }
    case 'sessionAll': {
      const familiar = Session.getFamiliarWords();
      const unfamiliar = Session.getUnfamiliarWords();
      const words = [...new Set([...familiar, ...unfamiliar])];
      csvContent = buildCsvFromWords(words, detailData);
      break;
    }
    default:
      showToast('Unknown export range: ' + range, 'error');
      return;
  }

  if (!csvContent || csvContent === ANKI_HEADER + '\n' || csvContent === ANKI_HEADER) {
    showToast('No words to export for the selected range.', 'info');
    return;
  }

  downloadCsv(csvContent, filename);
  showToast(`Exported ${countLines(csvContent) - 1} words to ${filename}`, 'success');
}

/**
 * 获取今天的日期字符串用于文件名
 * @returns {string} YYYYMMDD
 */
function getDateString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * 计算字符串的行数
 */
function countLines(str) {
  if (!str) return 0;
  return str.split('\n').length;
}
