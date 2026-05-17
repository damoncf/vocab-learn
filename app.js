/**
 * app.js — Main application logic for VocabLearn
 *
 * State machine with screens:
 *   welcome → loading → grid → detail → done → (next batch loop)
 *   welcome → review → back
 *   done → quiz → back
 *
 * All DOM interactions, event wiring, and screen transitions live here.
 * API calls are delegated to api.js; storage to storage.js;
 * review to review.js; quiz to quiz.js; TTS to tts.js.
 */

/* =========================================================
   Application State
   ========================================================= */
const State = {
  // Current batch's word list
  currentWords: [],

  // Set of words the user marked as unfamiliar (indices into currentWords)
  markedIndices: new Set(),

  // Detailed info for marked words (from API)
  wordDetails: [],

  // Source type: 'ai' | 'file'
  sourceType: 'ai',

  // Pool of words when using file source
  fileWordPool: [],

  // Session counters (mirrored from Session storage for easy access)
  batchIndex: 1,
  sessionDate: '',

  // Quiz state
  quizState: null, // { questions, currentIndex, score, wrongWords, mode }

  // Review state
  reviewState: null, // current review word being shown
};

/* =========================================================
   DOM References
   ========================================================= */
const DOM = {
  // Screens
  screenWelcome: document.getElementById('screenWelcome'),
  screenLoading: document.getElementById('screenLoading'),
  screenGrid:    document.getElementById('screenGrid'),
  screenDetail:  document.getElementById('screenDetail'),
  screenDone:    document.getElementById('screenDone'),
  screenReview:  document.getElementById('screenReview'),
  screenQuiz:    document.getElementById('screenQuiz'),

  // Header
  sessionInfo:   document.getElementById('sessionInfo'),

  // Welcome
  btnStart:      document.getElementById('btnStart'),
  btnLoadFile:   document.getElementById('btnLoadFile'),
  fileInput:     document.getElementById('fileInput'),
  linkSettings:  document.getElementById('linkSettings'),
  btnReview:     document.getElementById('btnReview'),
  reviewBadge:   document.getElementById('reviewBadge'),
  reviewDueHint: document.getElementById('reviewDueHint'),
  welcomeHint:   document.getElementById('welcomeHint'),

  // Loading
  loadingMsg:    document.getElementById('loadingMsg'),

  // Grid
  batchLabel:    document.getElementById('batchLabel'),
  wordCountLabel:document.getElementById('wordCountLabel'),
  wordGrid:      document.getElementById('wordGrid'),
  markedCount:   document.getElementById('markedCount'),
  btnNext:       document.getElementById('btnNext'),

  // Detail
  btnBackToGrid: document.getElementById('btnBackToGrid'),
  btnConfirm:    document.getElementById('btnConfirm'),
  detailGrid:    document.getElementById('detailGrid'),
  loadingDetail: document.getElementById('loadingDetail'),

  // Done
  doneStats:       document.getElementById('doneStats'),
  doneNote:        document.getElementById('doneNote'),
  btnNextBatch:    document.getElementById('btnNextBatch'),
  btnRestart:      document.getElementById('btnRestart'),
  btnStartQuiz:    document.getElementById('btnStartQuiz'),
  btnDownloadRecord: document.getElementById('btnDownloadRecord'),
  linkShowHistory: document.getElementById('linkShowHistory'),
  historySection:  document.getElementById('historySection'),

  // Review
  btnReviewBack:   document.getElementById('btnReviewBack'),
  reviewContent:   document.getElementById('reviewContent'),
  reviewList:      document.getElementById('reviewList'),
  reviewStats:     document.getElementById('reviewStats'),
  reviewProgress:  document.getElementById('reviewProgress'),

  // Quiz
  btnQuizBack:    document.getElementById('btnQuizBack'),
  quizContent:    document.getElementById('quizContent'),
  quizScore:      document.getElementById('quizScore'),

  // Settings modal
  btnSettings:     document.getElementById('btnSettings'),
  modalSettings:   document.getElementById('modalSettings'),
  closeSettings:   document.getElementById('closeSettings'),
  inputApiKey:     document.getElementById('inputApiKey'),
  toggleApiKey:    document.getElementById('toggleApiKey'),
  inputWordsPerBatch: document.getElementById('inputWordsPerBatch'),
  inputDifficulty:  document.getElementById('inputDifficulty'),
  btnSaveSettings:  document.getElementById('btnSaveSettings'),

  // Source modal
  btnSource:        document.getElementById('btnSource'),
  modalSource:      document.getElementById('modalSource'),
  closeSource:      document.getElementById('closeSource'),
  fileSourcePanel:  document.getElementById('fileSourcePanel'),
  btnChooseFiles:   document.getElementById('btnChooseFiles'),
  fileInputSource:  document.getElementById('fileInputSource'),
  fileSourceStatus: document.getElementById('fileSourceStatus'),
  btnApplySource:   document.getElementById('btnApplySource'),

  // Toast
  toast: document.getElementById('toast'),
};

/* =========================================================
   Screen Management
   ========================================================= */
function showScreen(name) {
  ['screenWelcome','screenLoading','screenGrid','screenDetail','screenDone','screenReview','screenQuiz'].forEach(id => {
    document.getElementById(id).classList.remove('active');
  });
  document.getElementById('screen' + capitalize(name)).classList.add('active');
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* =========================================================
   Toast Notifications
   ========================================================= */
let toastTimeout = null;
function showToast(message, type = 'info', duration = 3500) {
  const el = DOM.toast;
  el.textContent = message;
  el.className = `toast ${type}`;
  el.style.display = 'block';
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { el.style.display = 'none'; }, duration);
}

/* =========================================================
   Initialization
   ========================================================= */
function init() {
  // Init session (handles date rollover)
  State.sessionDate = Session.initSession();
  State.batchIndex  = Session.getBatchIndex();

  // Apply saved settings to form fields
  const s = Settings.getAll();
  DOM.inputApiKey.value        = s.apiKey;
  DOM.inputWordsPerBatch.value = s.wordsPerBatch;
  DOM.inputDifficulty.value    = s.difficulty;

  State.sourceType = s.sourceType || 'ai';
  State.fileWordPool = FileWords.get();

  // Set source radio
  const radioAI   = document.querySelector('input[name="source"][value="ai"]');
  const radioFile = document.querySelector('input[name="source"][value="file"]');
  if (State.sourceType === 'file') {
    radioFile.checked = true;
    DOM.fileSourcePanel.style.display = 'flex';
    if (State.fileWordPool.length > 0) {
      DOM.fileSourceStatus.textContent = `${State.fileWordPool.length} words loaded`;
    }
  } else {
    radioAI.checked = true;
  }

  updateSessionInfo();
  updateReviewBadge();
  showScreen('welcome');
  wireEvents();

  // Check for due reviews on first load
  checkDueReviews();
}

function updateSessionInfo() {
  const d = State.sessionDate;
  const display = `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
  DOM.sessionInfo.textContent = `${display} · Batch ${State.batchIndex}`;
}

/**
 * Update the review badge on the welcome page
 */
function updateReviewBadge() {
  const dueCount = ReviewPool.getDueCount();
  const badge = DOM.reviewBadge;
  const btn = DOM.btnReview;

  if (dueCount > 0) {
    btn.style.display = 'inline-flex';
    badge.textContent = `${dueCount} due`;
  } else {
    btn.style.display = 'none';
  }
}

/**
 * Check if there are due reviews and show a hint on the welcome page
 */
function checkDueReviews() {
  const dueCount = ReviewPool.getDueCount();
  if (dueCount > 0) {
    const hintEl = DOM.reviewDueHint;
    hintEl.style.display = 'block';
    hintEl.textContent = `📚 You have ${dueCount} word${dueCount > 1 ? 's' : ''} waiting to be reviewed. Click "Review" above.`;
  }
}

/* =========================================================
   Event Wiring
   ========================================================= */
function wireEvents() {
  // Welcome
  DOM.btnStart.addEventListener('click', startSession);
  DOM.btnLoadFile.addEventListener('click', () => DOM.fileInput.click());
  DOM.fileInput.addEventListener('change', handleQuickFileLoad);
  DOM.linkSettings.addEventListener('click', e => { e.preventDefault(); openSettings(); });
  DOM.btnReview.addEventListener('click', openReviewScreen);

  // Grid
  DOM.btnNext.addEventListener('click', handleNext);

  // Detail
  DOM.btnBackToGrid.addEventListener('click', () => showScreen('grid'));
  DOM.btnConfirm.addEventListener('click', handleConfirm);

  // Done
  DOM.btnNextBatch.addEventListener('click', handleNextBatch);
  DOM.btnRestart.addEventListener('click', handleRestart);
  DOM.btnStartQuiz.addEventListener('click', openQuizScreen);
  DOM.btnDownloadRecord.addEventListener('click', handleManualDownload);
  DOM.linkShowHistory.addEventListener('click', e => { e.preventDefault(); openHistoryPanel(); });

  // Review
  DOM.btnReviewBack.addEventListener('click', () => { showScreen('welcome'); updateReviewBadge(); });

  // Quiz
  DOM.btnQuizBack.addEventListener('click', () => { showScreen('done'); });

  // Settings modal
  DOM.btnSettings.addEventListener('click', openSettings);
  DOM.closeSettings.addEventListener('click', closeModal.bind(null, DOM.modalSettings));
  DOM.modalSettings.addEventListener('click', e => { if (e.target === DOM.modalSettings) closeModal(DOM.modalSettings); });
  DOM.btnSaveSettings.addEventListener('click', saveSettings);
  DOM.toggleApiKey.addEventListener('click', () => {
    const isHidden = DOM.inputApiKey.type === 'password';
    DOM.inputApiKey.type = isHidden ? 'text' : 'password';
    DOM.toggleApiKey.textContent = isHidden ? 'Hide' : 'Show';
  });

  // Source modal
  DOM.btnSource.addEventListener('click', openSource);
  DOM.closeSource.addEventListener('click', closeModal.bind(null, DOM.modalSource));
  DOM.modalSource.addEventListener('click', e => { if (e.target === DOM.modalSource) closeModal(DOM.modalSource); });
  DOM.btnApplySource.addEventListener('click', applySource);
  DOM.btnChooseFiles.addEventListener('click', () => DOM.fileInputSource.click());
  DOM.fileInputSource.addEventListener('change', handleSourceFileSelect);

  // Source radio toggles file panel
  document.querySelectorAll('input[name="source"]').forEach(radio => {
    radio.addEventListener('change', () => {
      DOM.fileSourcePanel.style.display = radio.value === 'file' ? 'flex' : 'none';
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcut);
}

/* =========================================================
   Keyboard Shortcuts
   ========================================================= */
function handleKeyboardShortcut(e) {
  // Don't trigger shortcuts when typing in inputs
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  const activeScreen = document.querySelector('.screen.active');
  const activeId = activeScreen ? activeScreen.id : '';

  switch (e.key) {
    case ' ':
      // Space: Start learning / next batch
      e.preventDefault();
      if (activeId === 'screenWelcome') {
        DOM.btnStart.click();
      } else if (activeId === 'screenDone') {
        DOM.btnNextBatch.click();
      }
      break;

    case 'Enter':
      // Enter: Confirm and continue (detail screen) or go next (grid)
      e.preventDefault();
      if (activeId === 'screenDetail') {
        DOM.btnConfirm.click();
      } else if (activeId === 'screenGrid') {
        DOM.btnNext.click();
      }
      break;

    case 'Escape':
      // Escape: Close modals / go back
      e.preventDefault();
      closeModal(DOM.modalSettings);
      closeModal(DOM.modalSource);
      const historyBackdrop = document.querySelector('.history-backdrop');
      if (historyBackdrop) historyBackdrop.remove();
      if (activeId === 'screenReview') {
        DOM.btnReviewBack.click();
      } else if (activeId === 'screenQuiz') {
        // Only go back if on mode select, not mid-quiz
        if (!State.quizState || State.quizState.currentIndex < 0) {
          DOM.btnQuizBack.click();
        }
      } else if (activeId === 'screenDetail') {
        DOM.btnBackToGrid.click();
      }
      break;

    case 'r':
    case 'R':
      // R: Open review screen (welcome only)
      if (activeId === 'screenWelcome') {
        e.preventDefault();
        DOM.btnReview.click();
      }
      break;
  }
}

/* =========================================================
   Modals
   ========================================================= */
function openSettings() { DOM.modalSettings.style.display = 'flex'; }
function openSource()   { DOM.modalSource.style.display   = 'flex'; }
function closeModal(el) { el.style.display = 'none'; }

function saveSettings() {
  const apiKey        = DOM.inputApiKey.value.trim();
  const wordsPerBatch = parseInt(DOM.inputWordsPerBatch.value, 10) || 100;
  const difficulty    = DOM.inputDifficulty.value;

  Settings.saveAll({ apiKey, wordsPerBatch, difficulty });
  closeModal(DOM.modalSettings);
  showToast('Settings saved.', 'success');
}

async function handleSourceFileSelect() {
  const files = DOM.fileInputSource.files;
  if (!files || files.length === 0) return;
  try {
    const words = await readWordFiles(files);
    State.fileWordPool = words;
    FileWords.set(words);
    DOM.fileSourceStatus.textContent = `${words.length} words loaded from ${files.length} file(s)`;
    showToast(`Loaded ${words.length} words.`, 'success');
  } catch (err) {
    showToast('Failed to read files: ' + err.message, 'error');
  }
}

function applySource() {
  const val = document.querySelector('input[name="source"]:checked')?.value || 'ai';
  if (val === 'file' && State.fileWordPool.length === 0) {
    showToast('Please choose at least one .txt file first.', 'error');
    return;
  }
  State.sourceType = val;
  Settings.setSourceType(val);
  closeModal(DOM.modalSource);
  showToast(`Source set to ${val === 'ai' ? 'AI Generated' : 'Text File'}.`, 'success');
}

/* =========================================================
   File Quick-Load (from Welcome screen)
   ========================================================= */
async function handleQuickFileLoad() {
  const files = DOM.fileInput.files;
  if (!files || files.length === 0) return;
  try {
    const words = await readWordFiles(files);
    if (words.length === 0) { showToast('No valid words found in file(s).', 'error'); return; }
    State.fileWordPool = words;
    State.sourceType   = 'file';
    FileWords.set(words);
    Settings.setSourceType('file');
    showToast(`Loaded ${words.length} words. Starting session...`, 'success');
    setTimeout(startSession, 600);
  } catch (err) {
    showToast('Failed to read files: ' + err.message, 'error');
  }
}

/* =========================================================
   Session Start
   ========================================================= */
async function startSession() {
  const apiKey = Settings.getApiKey();
  const wordsPerBatch = Settings.getWordsPerBatch();

  if (State.sourceType === 'ai' && !apiKey) {
    showToast('Please add your DeepSeek API key in Settings first.', 'error', 4000);
    openSettings();
    return;
  }

  if (State.sourceType === 'file' && State.fileWordPool.length === 0) {
    showToast('Please load a word file first.', 'error');
    return;
  }

  showScreen('loading');
  DOM.loadingMsg.textContent = State.sourceType === 'ai'
    ? 'Generating vocabulary list...'
    : 'Loading words from file...';

  try {
    const words = await fetchWordBatch(apiKey, wordsPerBatch);
    if (words.length === 0) throw new Error('No words returned. Check your settings and try again.');

    State.currentWords   = words;
    State.markedIndices  = new Set();
    renderWordGrid(words);
    showScreen('grid');
    updateSessionInfo();
    DOM.historySection.style.display = 'none';
  } catch (err) {
    showScreen('welcome');
    showToast(err.message, 'error', 6000);
  }
}

/* =========================================================
   Fetch Word Batch (AI or File)
   ========================================================= */
async function fetchWordBatch(apiKey, count) {
  if (State.sourceType === 'file') {
    const usedSet  = new Set(Session.getUsedWords());
    const pool     = State.fileWordPool.filter(w => !usedSet.has(w));
    if (pool.length === 0) {
      showToast('All file words have been reviewed! Restarting from the beginning.', 'info', 4000);
      Session.resetSession();
      return State.fileWordPool.slice(0, count);
    }
    return pool.slice(0, count);
  }

  // AI source with caching
  const usedWords  = Session.getUsedWords();
  const difficulty = Settings.getDifficulty();
  return generateWordList(apiKey, count, difficulty, usedWords);
}

/* =========================================================
   Word Grid
   ========================================================= */
function renderWordGrid(words) {
  DOM.wordGrid.innerHTML = '';
  DOM.batchLabel.textContent    = `Batch ${State.batchIndex}`;
  DOM.wordCountLabel.textContent = `${words.length} words`;
  updateMarkedCount();

  words.forEach((word, index) => {
    const chip = document.createElement('button');
    chip.className   = 'word-chip';
    chip.textContent = word;
    chip.dataset.index = index;
    chip.addEventListener('click', () => toggleMark(chip, index));
    DOM.wordGrid.appendChild(chip);
  });
}

function toggleMark(chip, index) {
  if (State.markedIndices.has(index)) {
    State.markedIndices.delete(index);
    chip.classList.remove('marked');
  } else {
    State.markedIndices.add(index);
    chip.classList.add('marked');
  }
  updateMarkedCount();
}

function updateMarkedCount() {
  const n = State.markedIndices.size;
  DOM.markedCount.textContent = n === 0
    ? 'No words marked — click unfamiliar words to mark them'
    : `${n} word${n === 1 ? '' : 's'} marked as unfamiliar`;
  DOM.markedCount.style.color = n > 0
    ? 'var(--color-accent)'
    : 'var(--color-text-muted)';
}

/* =========================================================
   Next → Detail or Done
   ========================================================= */
async function handleNext() {
  const marked = [...State.markedIndices].map(i => State.currentWords[i]);

  if (marked.length > 0) {
    // Show detail screen with skeleton cards first
    showScreen('detail');
    renderDetailSkeletons(marked.length);
    DOM.loadingDetail.style.display = 'flex';
    DOM.loadingDetail.querySelector('span').textContent = 'Loading word details...';
    DOM.btnConfirm.disabled = true;

    const apiKey = Settings.getApiKey();
    try {
      const details = await getWordDetailsBatched(
        apiKey,
        marked,
        15,
        (done, total) => {
          DOM.loadingDetail.querySelector('span').textContent =
            `Loading word details... ${done}/${total}`;
        }
      );
      State.wordDetails = details;
      renderDetailCards(details);
    } catch (err) {
      showToast('Failed to load word details: ' + err.message, 'error', 6000);
      // Still show the words even without details
      State.wordDetails = marked.map(w => ({ word: w, pronunciation: '', partOfSpeech: '', definition: 'Details unavailable.', example: '' }));
      renderDetailCards(State.wordDetails);
    } finally {
      DOM.loadingDetail.style.display = 'none';
      DOM.btnConfirm.disabled = false;
    }
  } else {
    // No unfamiliar words — go directly to done
    finalizeAndDone([]);
  }
}

/* =========================================================
   Detail Screen
   ========================================================= */
function renderDetailSkeletons(count) {
  DOM.detailGrid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'detail-card skeleton';
    card.innerHTML = `
      <div class="detail-card-header">
        <span class="detail-word">████████</span>
        <span class="detail-pronunciation">███████</span>
      </div>
      <span class="detail-pos">___</span>
      <p class="detail-definition">████████████████████████████████</p>
      <p class="detail-example">████████████████████████████████████████</p>
    `;
    DOM.detailGrid.appendChild(card);
  }
}

function renderDetailCards(details) {
  DOM.detailGrid.innerHTML = '';
  details.forEach(d => {
    const card = document.createElement('div');
    card.className = 'detail-card';
    card.innerHTML = `
      <div class="detail-card-header">
        <span class="detail-word">${escHtml(d.word)}</span>
        <button class="detail-speak-btn" data-word="${escHtml(d.word)}">🔊</button>
        ${d.pronunciation ? `<span class="detail-pronunciation">${escHtml(d.pronunciation)}</span>` : ''}
      </div>
      ${d.partOfSpeech ? `<span class="detail-pos">${escHtml(d.partOfSpeech)}</span>` : ''}
      <p class="detail-definition">${escHtml(d.definition)}</p>
      ${d.example ? `<p class="detail-example">${escHtml(d.example)}
        <button class="detail-speak-btn" data-sentence="${escHtml(d.example)}">🔊</button>
      </p>` : ''}
    `;
    DOM.detailGrid.appendChild(card);
  });

  // Wire up pronunciation buttons
  DOM.detailGrid.querySelectorAll('.detail-speak-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const word = btn.dataset.word;
      const sentence = btn.dataset.sentence;
      if (word) TTS.speakWord(word);
      if (sentence) TTS.speakSentence(sentence);
    });
  });
}

/* =========================================================
   Confirm & Done
   ========================================================= */
function handleConfirm() {
  const unfamiliarWords = [...State.markedIndices].map(i => State.currentWords[i]);

  // Add unfamiliar words to SRS review pool
  if (unfamiliarWords.length > 0) {
    ReviewPool.addWords(unfamiliarWords);
  }

  finalizeAndDone(unfamiliarWords);
}

function finalizeAndDone(unfamiliarWords) {
  const familiarWords = State.currentWords.filter((_, i) => !State.markedIndices.has(i));

  // Persist to session storage
  Session.addUsedWords(State.currentWords);
  Session.addFamiliarWords(familiarWords);
  Session.addUnfamiliarWords(unfamiliarWords);

  const allFamiliar   = Session.getFamiliarWords();
  const allUnfamiliar = Session.getUnfamiliarWords();

  // Save record snapshot
  Records.saveToLocalStorage(State.sessionDate, allFamiliar, allUnfamiliar);

  // Render done screen (no auto-download)
  DOM.doneStats.innerHTML = `
    <div class="stat-pill">
      <span class="stat-value green">${familiarWords.length}</span>
      <span class="stat-label">Familiar</span>
    </div>
    <div class="stat-pill">
      <span class="stat-value yellow">${unfamiliarWords.length}</span>
      <span class="stat-label">Unfamiliar</span>
    </div>
    <div class="stat-pill">
      <span class="stat-value">${State.currentWords.length}</span>
      <span class="stat-label">This batch</span>
    </div>
    <div class="stat-pill">
      <span class="stat-value">${State.batchIndex}</span>
      <span class="stat-label">Batch #</span>
    </div>
  `;

  // Check if there are quiz-able words (familiar + unfamiliar)
  const quizWords = [...new Set([...allFamiliar, ...allUnfamiliar])];
  DOM.doneNote.innerHTML = `
    Session totals: <strong>${allFamiliar.length}</strong> familiar,
    <strong>${allUnfamiliar.length}</strong> unfamiliar words today.
    ${quizWords.length >= 4 ? '<br>Ready to test yourself? Click "Start Quiz".' : ''}
  `;

  // Show history link
  DOM.historySection.style.display = 'block';

  showScreen('done');
}

/* =========================================================
   Manual Download
   ========================================================= */
function handleManualDownload() {
  const allFamiliar   = Session.getFamiliarWords();
  const allUnfamiliar = Session.getUnfamiliarWords();
  const filename = Records.download(
    State.sessionDate,
    allFamiliar,
    allUnfamiliar,
    State.batchIndex
  );
  showToast(`Downloaded ${filename}`, 'success');
}

/* =========================================================
   Next Batch / Restart
   ========================================================= */
async function handleNextBatch() {
  State.batchIndex = Session.incrementBatchIndex();
  updateSessionInfo();
  await startSession();
}

function handleRestart() {
  Session.resetSession();
  State.batchIndex = 1;
  State.currentWords  = [];
  State.markedIndices = new Set();
  State.wordDetails   = [];
  updateSessionInfo();
  showScreen('welcome');
  updateReviewBadge();
}

/* =========================================================
   REVIEW SCREEN
   ========================================================= */
function openReviewScreen() {
  const dueWords = ReviewPool.getDueWords();

  if (dueWords.length === 0) {
    // Show all reviewing words if none due today
    const allUnmastered = ReviewPool.getUnmasteredWords();
    if (allUnmastered.length === 0) {
      showToast('No words in review pool yet.', 'info');
      return;
    }
    renderReviewList(allUnmastered, false);
  } else {
    renderReviewList(dueWords, true);
  }

  showScreen('review');
}

function renderReviewList(words, isDue) {
  const listEl = DOM.reviewList;
  const statsEl = DOM.reviewStats;
  const progressEl = DOM.reviewProgress;

  // Stats
  const total = ReviewPool.getTotalCount();
  const mastered = ReviewPool.getMasteredWords().length;
  const unmastered = total - mastered;
  statsEl.innerHTML = `
    <div class="stat-pill">
      <span class="stat-value">${words.length}</span>
      <span class="stat-label">${isDue ? 'Due Now' : 'In Progress'}</span>
    </div>
    <div class="stat-pill">
      <span class="stat-value yellow">${unmastered}</span>
      <span class="stat-label">Learning</span>
    </div>
    <div class="stat-pill">
      <span class="stat-value green">${mastered}</span>
      <span class="stat-label">Mastered</span>
    </div>
    <div class="stat-pill">
      <span class="stat-value">${total}</span>
      <span class="stat-label">Total</span>
    </div>
  `;

  progressEl.textContent = `${words.length} word${words.length > 1 ? 's' : ''} to review`;

  // List
  listEl.innerHTML = '';
  words.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'review-item';
    item.innerHTML = `
      <span class="review-item-word">${escHtml(entry.word)}</span>
      <span class="review-item-status">${getStatusLabel(entry.status)}</span>
    `;
    item.addEventListener('click', () => showReviewDetail(entry.word));
    listEl.appendChild(item);
  });

  if (words.length === 0) {
    listEl.innerHTML = `
      <div class="review-empty">
        <div class="review-empty-icon">🎉</div>
        <p>All caught up!</p>
        <p>No words to review right now.</p>
      </div>
    `;
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'unfamiliar': return 'New';
    case 'reviewing':  return 'Reviewing';
    case 'mastered':   return 'Mastered';
    default: return status;
  }
}

function showReviewDetail(word) {
  const entry = ReviewPool.getWord(word);
  if (!entry) return;

  // Clear the review list and show detail
  DOM.reviewList.innerHTML = '';

  // Build a detail card with pronunciation, definition, actions
  const detailEl = document.createElement('div');
  detailEl.className = 'review-detail';
  detailEl.innerHTML = `
    <span class="review-detail-word">
      ${escHtml(entry.word)}
      <button class="review-detail-speak" data-word="${escHtml(entry.word)}">🔊</button>
    </span>
    <span class="review-detail-pronunciation">Status: ${getStatusLabel(entry.status)} | Interval: ${entry.interval} day${entry.interval > 1 ? 's' : ''}</span>
    <p class="review-detail-def">${escapeForReview(entry.word)}</p>
    <div class="review-detail-actions">
      <button class="btn btn-remember" data-action="remember">✓ Remembered</button>
      <button class="btn btn-forget" data-action="forget">✗ Not Yet</button>
    </div>
  `;

  // Try to show definition from existing details if available
  const detail = State.wordDetails.find(d => d.word.toLowerCase() === entry.word.toLowerCase());
  if (detail && detail.definition) {
    detailEl.querySelector('.review-detail-def').textContent = detail.definition;
    if (detail.pronunciation) {
      detailEl.querySelector('.review-detail-pronunciation').textContent =
        `${detail.pronunciation} · ${getStatusLabel(entry.status)} · ${entry.interval}d interval`;
    }
  }

  DOM.reviewList.appendChild(detailEl);

  // Wire up speak button
  detailEl.querySelector('.review-detail-speak')?.addEventListener('click', () => {
    TTS.speakWord(entry.word);
  });

  // Wire up action buttons
  detailEl.querySelectorAll('.review-detail-actions .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'remember') {
        ReviewPool.markCorrect(entry.word);
        showToast('✓ Marked as remembered! Next review scheduled.', 'success');
      } else {
        ReviewPool.markIncorrect(entry.word);
        showToast('✗ Will show this word again sooner.', 'info');
      }
      // Refresh the review list
      openReviewScreen();
    });
  });
}

function escapeForReview(word) {
  // Try to get detail from the most recent detail fetch
  const detail = State.wordDetails.find(d => d.word.toLowerCase() === word.toLowerCase());
  if (detail && detail.definition) return escHtml(detail.definition);

  // Try localStorage cache
  try {
    const key = `vocab_detail_cache`;
    const all = JSON.parse(localStorage.getItem(key) || '[]');
    const found = all.find(d => d.word?.toLowerCase() === word.toLowerCase());
    if (found && found.definition) return escHtml(found.definition);
  } catch (_) {}

  return 'Click "Remembered" or "Not Yet" to record your progress.';
}

/* =========================================================
   QUIZ SCREEN
   ========================================================= */
function openQuizScreen() {
  // Reset quiz state
  State.quizState = null;
  showScreen('quiz');
  renderQuizModeSelect();
}

function renderQuizModeSelect() {
  const content = DOM.quizContent;
  DOM.quizScore.textContent = '0 / 10';

  // Get all words from session for quiz
  const familiar = Session.getFamiliarWords();
  const unfamiliar = Session.getUnfamiliarWords();
  const allWords = [...new Set([...familiar, ...unfamiliar])];

  // Also include current batch words
  State.currentWords.forEach(w => {
    if (!allWords.includes(w)) allWords.push(w);
  });

  if (allWords.length < 4) {
    content.innerHTML = `
      <div class="review-empty">
        <div class="review-empty-icon">📝</div>
        <p>Not enough words yet!</p>
        <p>Complete a batch first to build up your word pool.</p>
        <button class="btn btn-primary" onclick="document.getElementById('btnQuizBack').click()">← Back</button>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="quiz-mode-select">
      <h3>Choose a Quiz Mode</h3>
      <p>Test your knowledge with ${Math.min(10, allWords.length)} questions</p>
      <div class="quiz-mode-options">
        <button class="quiz-mode-btn" data-mode="word2def">
          <span class="mode-icon">🔤</span>
          <span class="mode-info">
            <strong>See Word, Pick Definition</strong>
            <span>Show an English word, choose the correct Chinese meaning</span>
          </span>
        </button>
        <button class="quiz-mode-btn" data-mode="def2word">
          <span class="mode-icon">💡</span>
          <span class="mode-info">
            <strong>See Definition, Pick Word</strong>
            <span>Show a meaning, choose the correct English word</span>
          </span>
        </button>
        <button class="quiz-mode-btn" data-mode="spelling">
          <span class="mode-icon">✍️</span>
          <span class="mode-info">
            <strong>Spelling Practice</strong>
            <span>See the definition, type the correct English word</span>
          </span>
        </button>
      </div>
    </div>
  `;

  content.querySelectorAll('.quiz-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => startQuiz(btn.dataset.mode));
  });
}

function startQuiz(mode) {
  const familiar = Session.getFamiliarWords();
  const unfamiliar = Session.getUnfamiliarWords();
  const allWords = [...new Set([...familiar, ...unfamiliar])];
  State.currentWords.forEach(w => {
    if (!allWords.includes(w)) allWords.push(w);
  });

  // Build detail map from all available details
  let details = State.wordDetails.slice();
  // Also try to fetch from detail cache
  try {
    const cached = JSON.parse(localStorage.getItem('vocab_detail_cache') || '[]');
    if (cached.length > 0) {
      // Merge - prefer existing details
      const existingWords = new Set(details.map(d => d.word?.toLowerCase()));
      cached.forEach(d => {
        if (!existingWords.has(d.word?.toLowerCase())) {
          details.push(d);
        }
      });
    }
  } catch (_) {}

  const questions = generateQuiz(allWords, details, mode, 10);
  if (questions.length === 0) {
    showToast('Not enough words with definitions for this quiz mode.', 'error');
    return;
  }

  State.quizState = {
    questions,
    currentIndex: 0,
    score: 0,
    wrongWords: [],
    mode,
  };

  renderQuizQuestion(0);
}

function renderQuizQuestion(index) {
  const qs = State.quizState;
  if (!qs || index >= qs.questions.length) {
    renderQuizResult();
    return;
  }

  qs.currentIndex = index;
  const question = qs.questions[index];
  const total = qs.questions.length;

  DOM.quizScore.textContent = `${qs.score} / ${total}`;

  // Progress bar
  let progressHTML = '';
  for (let i = 0; i < total; i++) {
    let cls = 'quiz-progress-dot';
    if (i < index) cls += ' done';
    else if (i === index) cls += ' current';
    progressHTML += `<span class="${cls}"></span>`;
  }

  let html = `<div class="quiz-progress-bar">${progressHTML}</div>`;

  if (question.mode === 'word2def') {
    html += `
      <div class="quiz-question">
        <span class="quiz-question-word">
          ${escHtml(question.word)}
          <button class="quiz-question-speak" data-word="${escHtml(question.word)}">🔊</button>
        </span>
        <span class="quiz-question-prompt">Select the correct definition</span>
        <div class="quiz-options" id="quizOptions">
          ${question.options.map((opt, i) => `
            <button class="quiz-option" data-index="${i}" data-value="${escHtml(opt)}">
              ${escHtml(opt)}
            </button>
          `).join('')}
        </div>
        <div id="quizFeedback"></div>
      </div>
    `;
  } else if (question.mode === 'def2word') {
    html += `
      <div class="quiz-question">
        <span class="quiz-question-prompt">${escHtml(question.prompt)}</span>
        <div class="quiz-options" id="quizOptions">
          ${question.options.map((opt, i) => `
            <button class="quiz-option" data-index="${i}" data-value="${escHtml(opt)}">
              ${escHtml(opt)}
            </button>
          `).join('')}
        </div>
        <div id="quizFeedback"></div>
      </div>
    `;
  } else if (question.mode === 'spelling') {
    html += `
      <div class="quiz-question">
        <span class="quiz-question-word">
          <button class="quiz-question-speak" data-sentence="${escHtml(question.prompt)}">🔊</button>
        </span>
        <span class="quiz-question-prompt">${escHtml(question.prompt)}</span>
        <div class="quiz-spelling-input">
          <input type="text" id="quizSpellingInput" placeholder="Type the word..." autocomplete="off" autofocus />
          <button class="btn btn-primary" id="quizSpellingSubmit">Submit</button>
        </div>
        <div id="quizFeedback"></div>
      </div>
    `;
  }

  DOM.quizContent.innerHTML = html;

  // Wire up events
  const optionsContainer = document.getElementById('quizOptions');
  if (optionsContainer) {
    optionsContainer.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => handleQuizAnswer(index, btn.dataset.value, question));
    });
  }

  const spellingInput = document.getElementById('quizSpellingInput');
  if (spellingInput) {
    spellingInput.focus();
    spellingInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleQuizAnswer(index, spellingInput.value, question);
      }
    });
    document.getElementById('quizSpellingSubmit').addEventListener('click', () => {
      handleQuizAnswer(index, spellingInput.value, question);
    });
  }

  // Wire up speak buttons
  DOM.quizContent.querySelectorAll('.quiz-question-speak').forEach(btn => {
    btn.addEventListener('click', () => {
      const word = btn.dataset.word;
      const sentence = btn.dataset.sentence;
      if (word) TTS.speakWord(word);
      if (sentence) TTS.speakSentence(sentence);
    });
  });
}

function handleQuizAnswer(index, answer, question) {
  const qs = State.quizState;
  if (!qs) return;
  if (index !== qs.currentIndex) return; // Already answered

  const isCorrect = checkAnswer(question, answer);

  // Show feedback
  const feedbackEl = document.getElementById('quizFeedback');
  const options = document.querySelectorAll('.quiz-option');

  if (isCorrect) {
    qs.score++;
    if (feedbackEl) {
      feedbackEl.innerHTML = `<div class="quiz-feedback correct">✓ Correct!</div>`;
    }
    // Highlight correct option
    options.forEach(btn => {
      if (btn.dataset.value === question.correctAnswer) {
        btn.classList.add('correct');
      }
      btn.disabled = true;
    });
  } else {
    qs.wrongWords.push({
      word: question.word,
      correctAnswer: question.correctAnswer,
      userAnswer: answer,
    });
    if (feedbackEl) {
      feedbackEl.innerHTML = `<div class="quiz-feedback wrong">✗ Incorrect. The correct answer was: ${escHtml(question.correctAnswer)}</div>`;
    }
    // Show correct and wrong
    options.forEach(btn => {
      if (btn.dataset.value === question.correctAnswer) {
        btn.classList.add('correct');
      } else if (btn.dataset.value === answer) {
        btn.classList.add('wrong');
      }
      btn.disabled = true;
    });
  }

  // Update progress dots
  const dots = DOM.quizContent.querySelectorAll('.quiz-progress-dot');
  if (dots[index]) {
    dots[index].classList.remove('current');
    dots[index].classList.add(isCorrect ? 'correct' : 'wrong');
  }

  DOM.quizScore.textContent = `${qs.score} / ${qs.questions.length}`;

  // Auto-advance after brief delay
  setTimeout(() => {
    renderQuizQuestion(index + 1);
  }, 1200);
}

function renderQuizResult() {
  const qs = State.quizState;
  if (!qs) return;

  const total = qs.questions.length;
  const pct = total > 0 ? Math.round((qs.score / total) * 100) : 0;

  // Add wrong words to review pool
  if (qs.wrongWords.length > 0) {
    ReviewPool.addWords(qs.wrongWords.map(w => w.word));
  }

  let wrongListHTML = '';
  if (qs.wrongWords.length > 0) {
    wrongListHTML = `
      <div class="quiz-wrong-list">
        <h4>✗ Missed Words (${qs.wrongWords.length})</h4>
        ${qs.wrongWords.map(w => `
          <div class="quiz-wrong-word">
            <span class="wrong-word">${escHtml(w.word)}</span>
            <span class="wrong-correct">→ ${escHtml(w.correctAnswer)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  DOM.quizContent.innerHTML = `
    <div class="quiz-result">
      <span class="quiz-result-score">${qs.score}/${total}</span>
      <span class="quiz-result-label">${pct >= 80 ? '🌟 Great job!' : pct >= 50 ? '👍 Keep practicing!' : '💪 More practice needed!'}</span>
      <div class="quiz-result-actions">
        <button class="btn btn-primary" id="quizRetry">Try Again</button>
        <button class="btn btn-secondary" id="quizBackToDone">Back</button>
      </div>
      ${wrongListHTML}
      ${qs.wrongWords.length > 0 ? '<p style="color: var(--color-text-muted); font-size: 0.82rem; margin-top: 12px;">Missed words have been added to your review pool.</p>' : ''}
    </div>
  `;

  DOM.quizScore.textContent = `${qs.score} / ${total}`;

  document.getElementById('quizRetry')?.addEventListener('click', openQuizScreen);
  document.getElementById('quizBackToDone')?.addEventListener('click', () => showScreen('done'));
}

/* =========================================================
   HISTORY PANEL
   ========================================================= */
function openHistoryPanel() {
  // Collect all history records from localStorage
  const historyRecords = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('vocab_record_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data && data.dateStr) historyRecords.push(data);
      } catch (_) {}
    }
  }

  // Sort by date descending
  historyRecords.sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  // Build history panel
  const backdrop = document.createElement('div');
  backdrop.className = 'history-backdrop';
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) backdrop.remove();
  });

  let bodyHTML = '';
  if (historyRecords.length === 0) {
    bodyHTML = '<div class="history-empty">No learning history yet. Complete a batch to start building your history.</div>';
  } else {
    bodyHTML = historyRecords.map(rec => {
      const displayDate = `${rec.dateStr.slice(0,4)}-${rec.dateStr.slice(4,6)}-${rec.dateStr.slice(6,8)}`;
      const familiar = rec.familiarWords || [];
      const unfamiliar = rec.unfamiliarWords || [];
      const total = familiar.length + unfamiliar.length;
      return `
        <div class="history-day">
          <div class="history-day-header">
            <span>${displayDate}</span>
            <span>${familiar.length} familiar · ${unfamiliar.length} unfamiliar · ${total} total</span>
          </div>
          <div class="history-day-body" style="display:none">
            <p><strong>Familiar:</strong></p>
            <p>${familiar.length > 0 ? familiar.slice(0, 20).map(w => `<span class="history-day-word">${escHtml(w)}</span>`).join('') : 'None'}</p>
            ${familiar.length > 20 ? `<p style="color:var(--color-text-muted);font-size:0.8rem">... and ${familiar.length - 20} more</p>` : ''}
            <p style="margin-top:8px"><strong>Unfamiliar:</strong></p>
            <p>${unfamiliar.length > 0 ? unfamiliar.slice(0, 20).map(w => `<span class="history-day-word">${escHtml(w)}</span>`).join('') : 'None'}</p>
            ${unfamiliar.length > 20 ? `<p style="color:var(--color-text-muted);font-size:0.8rem">... and ${unfamiliar.length - 20} more</p>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  backdrop.innerHTML = `
    <div class="history-panel">
      <div class="history-header">
        <h3>Learning History</h3>
        <button class="modal-close" id="closeHistory">✕</button>
      </div>
      <div class="history-body">
        ${bodyHTML}
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  backdrop.querySelector('#closeHistory').addEventListener('click', () => backdrop.remove());

  // Toggle day details
  backdrop.querySelectorAll('.history-day-header').forEach(header => {
    header.addEventListener('click', () => {
      const body = header.nextElementSibling;
      if (body) {
        body.style.display = body.style.display === 'none' ? 'block' : 'none';
      }
    });
  });
}

/* =========================================================
   Utilities
   ========================================================= */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* =========================================================
   Bootstrap
   ========================================================= */
document.addEventListener('DOMContentLoaded', init);
