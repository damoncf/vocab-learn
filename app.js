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

  // v6.5: Set of words the user marked as familiar (indices into currentWords)
  familiarIndices: new Set(),

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

  // Built-in vocabulary data (loaded from JSON)
  builtinVocabData: null,
  builtinVocabId: null,

  // Reading mode state
  readingExtractedWords: [],
  readingUnknownWords: [],
  readingUnknownSet: new Set(),

  // Dictation state
  dictationState: null, // { questions, currentIndex, score, wrongWords }

  // Cloze state
  clozeState: null, // { questions, currentIndex, score, wrongWords }
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
  screenDictation: document.getElementById('screenDictation'),
  screenCloze:   document.getElementById('screenCloze'),
  screenPractice: document.getElementById('screenPractice'),

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

  // Dictation
  btnDictationBack: document.getElementById('btnDictationBack'),
  dictationContent: document.getElementById('dictationContent'),
  dictationScore:   document.getElementById('dictationScore'),

  // Cloze
  btnClozeBack:  document.getElementById('btnClozeBack'),
  clozeContent:  document.getElementById('clozeContent'),
  clozeScore:    document.getElementById('clozeScore'),

  // Anki Export
  btnExportAnki:       document.getElementById('btnExportAnki'),
  btnExportAnkiWelcome: document.getElementById('btnExportAnkiWelcome'),

  // Dictation / Cloze entry on done
  btnDictation: document.getElementById('btnDictation'),
  btnCloze:     document.getElementById('btnCloze'),

  // Sync
  btnSyncTest: document.getElementById('btnSyncTest'),
  btnSyncPush: document.getElementById('btnSyncPush'),
  btnSyncPull: document.getElementById('btnSyncPull'),
  inputSyncUrl: document.getElementById('inputSyncUrl'),
  inputSyncUser: document.getElementById('inputSyncUser'),
  inputSyncPass: document.getElementById('inputSyncPass'),
  toggleSyncPass: document.getElementById('toggleSyncPass'),
  inputAutoSync: document.getElementById('inputAutoSync'),
  syncStatus: document.getElementById('syncStatus'),

  // Settings modal
  btnSettings:     document.getElementById('btnSettings'),
  modalSettings:   document.getElementById('modalSettings'),
  closeSettings:   document.getElementById('closeSettings'),
  inputApiKey:        document.getElementById('inputApiKey'),
  toggleApiKey:       document.getElementById('toggleApiKey'),
  inputWordsPerBatch: document.getElementById('inputWordsPerBatch'),
  inputDifficulty:    document.getElementById('inputDifficulty'),
  btnSaveSettings:    document.getElementById('btnSaveSettings'),
  inputDailyGoal:     document.getElementById('inputDailyGoal'),
  inputAdaptiveBatch: document.getElementById('inputAdaptiveBatch'),

  // Source modal
  btnSource:        document.getElementById('btnSource'),
  modalSource:      document.getElementById('modalSource'),
  closeSource:      document.getElementById('closeSource'),
  fileSourcePanel:  document.getElementById('fileSourcePanel'),
  btnChooseFiles:   document.getElementById('btnChooseFiles'),
  fileInputSource:  document.getElementById('fileInputSource'),
  fileSourceStatus: document.getElementById('fileSourceStatus'),
  btnApplySource:   document.getElementById('btnApplySource'),
  builtinSourcePanel: document.getElementById('builtinSourcePanel'),
  builtinVocabList:   document.getElementById('builtinVocabList'),

  // Toast
  toast: document.getElementById('toast'),
  toastContainer: document.getElementById('toastContainer'),

  // v3.0 new elements
  btnSelectAll: document.getElementById('btnSelectAll'),
  btnDeselectAll: document.getElementById('btnDeselectAll'),
  gridProgressBar: document.getElementById('gridProgressBar'),
  gridProgressFill: document.getElementById('gridProgressFill'),
  mobileNav: document.getElementById('mobileNav'),
  mobileNavBtns: document.querySelectorAll('.mobile-nav-btn'),
  inputAutoPronounce: document.getElementById('inputAutoPronounce'),
  inputShowShortcuts: document.getElementById('inputShowShortcuts'),
  btnClearAllData: document.getElementById('btnClearAllData'),
  btnShortcutHelp: document.getElementById('btnShortcutHelp'),
  modalShortcuts: document.getElementById('modalShortcuts'),
  closeShortcuts: document.getElementById('closeShortcuts'),
  heatmapSection: document.getElementById('heatmapSection'),
  heatmapGrid: document.getElementById('heatmapGrid'),
  heatmapLegend: document.getElementById('heatmapLegend'),

  // v5.0 new DOM
  welcomeScroll: document.getElementById('screenWelcome')?.querySelector('.welcome-scroll'),
  dailyProgressFill: document.getElementById('dailyProgressFill'),
  dailyProgressLabel: document.getElementById('dailyProgressLabel'),
  dailyStreak: document.getElementById('dailyStreak'),
  dailyDueCount: document.getElementById('dailyDueCount'),
  dailyLastTime: document.getElementById('dailyLastTime'),
  dailyEmptyGuide: document.getElementById('dailyEmptyGuide'),
  btnQSC: document.getElementById('btnQSC'),
  btnQSReview: document.getElementById('btnQSReview'),
  btnQSSource: document.getElementById('btnQSSource'),
  btnQSGenerate: document.getElementById('btnQSGenerate'),
  btnQSFile: document.getElementById('btnQSFile'),
  btnQSBuiltin: document.getElementById('btnQSBuiltin'),
  qsContinueDesc: document.getElementById('qsContinueDesc'),
  qsReviewBadge: document.getElementById('qsReviewBadge'),
  qsSourceDesc: document.getElementById('qsSourceDesc'),
  qaCalendar: document.getElementById('qaCalendar'),
  qaDifficult: document.getElementById('qaDifficult'),
  qaExportAnki: document.getElementById('qaExportAnki'),
  qaSettings: document.getElementById('qaSettings'),
  inputTheme: document.getElementById('inputTheme'),

  // v6.5 — upgraded peek popup
  peekPopup: document.getElementById('peekPopup'),
  peekWord: document.getElementById('peekWord'),
  peekPron: document.getElementById('peekPron'),
  peekChinese: document.getElementById('peekChinese'),
  peekDef: document.getElementById('peekDef'),
  peekPos: document.getElementById('peekPos'),
  peekCollocation: document.getElementById('peekCollocation'),
  peekExample: document.getElementById('peekExample'),
  peekExampleEn: document.getElementById('peekExampleEn'),
  peekExampleCn: document.getElementById('peekExampleCn'),
  peekSpeak: document.getElementById('peekSpeak'),
  peekPopupClose: document.getElementById('peekPopupClose'),
  peekMarkFamiliar: document.getElementById('peekMarkFamiliar'),
  peekMarkUnfamiliar: document.getElementById('peekMarkUnfamiliar'),

  // v6.5 — Grid search, sort, batch, timer
  gridSearch: document.getElementById('gridSearch'),
  gridSort: document.getElementById('gridSort'),
  batchTimer: document.getElementById('batchTimer'),
  selectionHint: document.getElementById('selectionHint'),
  btnBatchActions: document.getElementById('btnBatchActions'),
  batchActionsDropdown: document.getElementById('batchActionsDropdown'),
  btnBatchSelectAll: document.getElementById('btnBatchSelectAll'),
  btnBatchDeselectAll: document.getElementById('btnBatchDeselectAll'),
  btnBatchMarkUnfamiliar: document.getElementById('btnBatchMarkUnfamiliar'),
  btnBatchMarkFamiliar: document.getElementById('btnBatchMarkFamiliar'),

  // v6.5 — Batch preview overlay
  batchPreview: document.getElementById('batchPreview'),
  batchPreviewTitle: document.getElementById('batchPreviewTitle'),
  batchPreviewCount: document.getElementById('batchPreviewCount'),
  batchPreviewSource: document.getElementById('batchPreviewSource'),
  batchPreviewWords: document.getElementById('batchPreviewWords'),
  batchPreviewTime: document.getElementById('batchPreviewTime'),
  batchPreviewClose: document.getElementById('batchPreviewClose'),
  btnStartBatch: document.getElementById('btnStartBatch'),
  batchPreviewCancel: document.getElementById('batchPreviewCancel'),

  // v6.5 — Review回顾 overlay
  reviewReviewBackdrop: document.getElementById('reviewReviewBackdrop'),
  reviewReviewClose: document.getElementById('reviewReviewClose'),
  reviewReviewBody: document.getElementById('reviewReviewBody'),
  reviewReviewCount: document.getElementById('reviewReviewCount'),
  reviewReviewRate: document.getElementById('reviewReviewRate'),
  reviewReviewWrong: document.getElementById('reviewReviewWrong'),
  reviewReviewWrongList: document.getElementById('reviewReviewWrongList'),
  reviewReviewNext: document.getElementById('reviewReviewNext'),
  reviewReviewDismiss: document.getElementById('reviewReviewDismiss'),

  // v6.5 — Memory health
  reviewMemoryHealth: document.getElementById('reviewMemoryHealth'),
  memoryHealthBars: document.getElementById('memoryHealthBars'),

  // v6.5 — Settings click behavior
  inputClickBehavior: document.getElementById('inputClickBehavior'),
  snapshotRestore: document.getElementById('snapshotRestore'),
  snapshotBatchNum: document.getElementById('snapshotBatchNum'),
  snapshotResume: document.getElementById('snapshotResume'),
  snapshotDiscard: document.getElementById('snapshotDiscard'),
  quickTestSection: document.getElementById('quickTestSection'),
  btnToggleQuickTest: document.getElementById('btnToggleQuickTest'),
  quickTestBody: document.getElementById('quickTestBody'),
  quickTestContent: document.getElementById('quickTestContent'),
  quickTestResult: document.getElementById('quickTestResult'),
  quickTestArrow: document.getElementById('quickTestArrow'),
  btnPracticeBack: document.getElementById('btnPracticeBack'),
};

/* =========================================================
   Screen Management — v5.0 with Transition Animations
   ========================================================= */

/**
 * Screen transition mapping: which animation class for each direction
 */
const TRANSITION_MAP = {
  'welcome->loading':   { out: 'fade-in',         outMs: 300,  in: 'fade-in',         inMs: 300  },
  'loading->grid':      { out: 'fade-in',         outMs: 200,  in: 'slide-up',        inMs: 400  },
  'grid->detail':       { out: 'fade-in',         outMs: 150,  in: 'slide-left',      inMs: 350  },
  'detail->grid':       { out: 'fade-in',         outMs: 150,  in: 'slide-right',     inMs: 350  },
  'detail->done':       { out: 'fade-in',         outMs: 150,  in: 'scale-in',        inMs: 500  },
  'done->grid':         { out: 'fade-in',         outMs: 150,  in: 'slide-up',        inMs: 300  },
  'any->welcome':       { out: 'fade-in',         outMs: 150,  in: 'fade-in',         inMs: 250  },
};

let _prevScreen = null;
let _screenTransitioning = false;

function showScreen(name, transition = 'auto') {
  const targetId = 'screen' + capitalize(name);
  const targetEl = document.getElementById(targetId);
  if (!targetEl) return;

  // If a transition is already running, skip
  if (_screenTransitioning) return;

  const prevEl = document.querySelector('.screen.active');
  const prevName = prevEl ? prevEl.id.replace('screen', '').toLowerCase() : null;

  // Determine transition animation
  let anim = null;
  if (transition === 'auto' && prevName) {
    const key1 = `${prevName}->${name}`;
    const key2 = `any->${name}`;
    anim = TRANSITION_MAP[key1] || TRANSITION_MAP[key2] || null;
  } else if (transition && transition !== 'auto' && transition !== 'none') {
    // Custom transition object with {out, outMs, in, inMs}
    anim = transition;
  }

  if (anim && prevEl && prevEl !== targetEl) {
    _screenTransitioning = true;

    // 1. Apply outgoing animation on old screen
    prevEl.classList.remove('slide-left', 'slide-right', 'slide-up', 'scale-in', 'transitioning');
    void prevEl.offsetWidth; // force reflow
    prevEl.classList.add('transitioning', anim.out);

    setTimeout(() => {
      // 2. Deactivate old screen
      prevEl.classList.remove('active', 'transitioning', anim.out);

      // 3. Prepare new screen (hidden with anim class)
      targetEl.classList.add(anim.in);
      targetEl.classList.remove('active', 'transitioning', 'slide-left', 'slide-right', 'slide-up', 'scale-in', 'fade-in');
      targetEl.classList.add('active');

      // 4. Trigger entrance animation
      void targetEl.offsetWidth;
      targetEl.classList.add('transitioning');

      setTimeout(() => {
        targetEl.classList.remove('transitioning', anim.in);
        _screenTransitioning = false;
      }, anim.inMs);

    }, anim.outMs);

  } else {
    // No transition: instant swap
    document.querySelectorAll('.screen').forEach(el => {
      el.classList.remove('active', 'slide-left', 'slide-right', 'slide-up', 'scale-in', 'fade-in', 'transitioning');
    });
    targetEl.classList.add('active');
  }

  _prevScreen = name;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* =========================================================
   Toast Notifications
   ========================================================= */
/**
 * Stacked toast — supports multiple simultaneous notifications
 */
function showToast(message, type = 'info', duration = 3500) {
  // Use the old simple toast for basic notifications
  if (!DOM.toastContainer) {
    const el = DOM.toast;
    if (!el) return;
    el.textContent = message;
    el.className = `toast ${type}`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, duration);
    return;
  }

  // Stacked toast
  const item = document.createElement('div');
  item.className = `toast-item ${type}`;
  item.textContent = message;
  DOM.toastContainer.appendChild(item);

  // Remove after duration
  setTimeout(() => {
    if (item.parentNode) {
      item.style.opacity = '0';
      item.style.transform = 'translateY(8px)';
      setTimeout(() => item.remove(), 300);
    }
  }, duration);
}

/* =========================================================
   Initialization
   ========================================================= */
function init() {
  // Init session (handles date rollover)
  State.sessionDate = Session.initSession();
  State.batchIndex  = Session.getBatchIndex();

  // Apply saved settings to form fields
  const s = Settings.getAllExtended();
  DOM.inputApiKey.value        = s.apiKey;
  DOM.inputWordsPerBatch.value = s.wordsPerBatch;
  DOM.inputDifficulty.value    = s.difficulty;
  DOM.inputAutoPronounce.checked = s.autoPronounce !== false;
  DOM.inputShowShortcuts.checked = s.showShortcuts !== false;
  DOM.inputTheme.value         = s.theme;
  DOM.inputClickBehavior.value = s.clickBehavior || 'peek';
  if (DOM.inputDailyGoal) DOM.inputDailyGoal.value = s.dailyGoal || 50;
  if (DOM.inputAdaptiveBatch) DOM.inputAdaptiveBatch.checked = s.adaptiveBatch;

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

  // v5.0: Apply theme
  applyTheme(s.theme);

  updateSessionInfo();
  updateReviewBadge();
  updateWelcomeDailyCard();
  showScreen('welcome');
  wireEvents();

  // Check for due reviews on first load
  checkDueReviews();

  // Show heatmap if there's history
  renderHeatmap();

  // v5.5: Check for session snapshot (mid-batch progress)
  checkSnapshotRestore();

  // Init WebDAV sync
  initSync();

  // Auto-pull on page load if configured
  setTimeout(() => {
    const syncCfg = SyncSettings.getAll();
    if (syncCfg.url && syncCfg.lastSyncTime > 0) {
      // Silent auto-pull in background
      SyncClient.configure(syncCfg.url, syncCfg.username, syncCfg.password);
      SyncClient.pull().then(result => {
        if (result.changed) {
          console.log('Auto-sync: data pulled from server');
        }
      }).catch(() => {});
    }
  }, 2000);

  // v6.0: Daily Goal 按钮事件
  const btnGoalEdit = document.getElementById('btnEditGoal');
  if (btnGoalEdit) btnGoalEdit.addEventListener('click', showGoalEditor);

  // v6.0: 徽章行点击打开详情
  const badgesRow = document.getElementById('badgesRow');
  if (badgesRow) badgesRow.addEventListener('click', showBadgeDetailModal);

  // v6.0: Show onboarding for first-time users
  if (!Onboarding.isDone()) {
    setTimeout(() => {
      Onboarding.show();
    }, 500);
  }

  // v6.0: Badge notification consumer
  _badgePollTimer = setInterval(() => {
    const notifs = BadgeManager.consumeNotifications();
    notifs.forEach(badge => {
      showBadgeUnlockToast(badge);
    });
  }, 500);

  // v6.0: Initial badges update
  updateBadgesSection();

  // v6.0: Initial challenge update
  updateChallengeCard();

  // v6.5: Initialize grid search, sort, batch actions
  setupGridSearch();
  setupGridSort();
  setupBatchActions();

  // v6.5: Update selection hint based on click behavior
  if (DOM.selectionHint) {
    const cb = Settings.getClickBehavior() || 'peek';
    DOM.selectionHint.textContent = cb === 'peek' ? '单击查看释义' : '单击直接标记';
  }

  // v6.5: Batch preview cancel/close
  if (DOM.batchPreviewClose) {
    DOM.batchPreviewClose.addEventListener('click', hideBatchPreview);
  }
  if (DOM.batchPreviewCancel) {
    DOM.batchPreviewCancel.addEventListener('click', hideBatchPreview);
  }
  if (DOM.batchPreview) {
    DOM.batchPreview.addEventListener('click', (e) => {
      if (e.target === DOM.batchPreview) hideBatchPreview();
    });
  }

  // v6.5: Review回顾 dismiss & close
  if (DOM.reviewReviewDismiss) {
    DOM.reviewReviewDismiss.addEventListener('click', hideReviewReview);
  }
  if (DOM.reviewReviewClose) {
    DOM.reviewReviewClose.addEventListener('click', hideReviewReview);
  }
  if (DOM.reviewReviewBackdrop) {
    DOM.reviewReviewBackdrop.addEventListener('click', (e) => {
      if (e.target === DOM.reviewReviewBackdrop) hideReviewReview();
    });
  }

  // v6.5: Peek popup close button
  if (DOM.peekPopupClose) {
    DOM.peekPopupClose.addEventListener('click', hidePeekPopup);
  }

  // v6.5: Peek popup speak button
  if (DOM.peekSpeak) {
    DOM.peekSpeak.addEventListener('click', () => {
      if (peekPopupWord) TTS.speakWord(peekPopupWord);
    });
  }

  // v6.5: Peek popup mark familiar/unfamiliar
  if (DOM.peekMarkFamiliar) {
    DOM.peekMarkFamiliar.addEventListener('click', () => {
      const word = peekPopupWord;
      if (!word) return;
      const idx = State.currentWords.findIndex(w => w.toLowerCase() === word.toLowerCase());
      const chip = idx >= 0 ? DOM.wordGrid.querySelector(`[data-index="${idx}"]`) : null;
      markFamiliar(word, chip);
      hidePeekPopup();
      showToast('✓ 已标记为认识', 'success', 2000);
    });
  }
  if (DOM.peekMarkUnfamiliar) {
    DOM.peekMarkUnfamiliar.addEventListener('click', () => {
      const word = peekPopupWord;
      if (!word) return;
      const idx = State.currentWords.findIndex(w => w.toLowerCase() === word.toLowerCase());
      const chip = idx >= 0 ? DOM.wordGrid.querySelector(`[data-index="${idx}"]`) : null;
      markUnfamiliar(word, chip);
      hidePeekPopup();
      showToast('✗ 已加入不熟悉列表', 'info', 2000);
    });
  }

  // v6.5: Escape closes peek popup
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && peekPopupVisible) {
      hidePeekPopup();
    }
  });

  // v6.5: Batch preview start button
  if (DOM.btnStartBatch) {
    DOM.btnStartBatch.addEventListener('click', () => {
      hideBatchPreview();
      if (typeof startSession === 'function') startSession();
    });
  }

  // Show keyboard shortcut hint on first visit
  if (s.showShortcuts !== false && !localStorage.getItem('vocab_shortcuts_hint_shown')) {
    setTimeout(() => {
      showToast('⌨ Press ? for keyboard shortcuts', 'info', 5000);
      localStorage.setItem('vocab_shortcuts_hint_shown', '1');
    }, 1000);
  }

  // v6.5: Update welcome daily card periodically
  setInterval(updateWelcomeDailyCard, 60000);
}

/* =========================================================
   v5.0 — Theme Management
   ========================================================= */
function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    // Listen for system changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      html.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    });
  } else {
    html.setAttribute('data-theme', theme);
  }
}

/**
 * v5.0 — Update the daily learning card on welcome screen
 */
function updateWelcomeDailyCard() {
  // 1. Today's progress
  const familiar = Session.getFamiliarWords();
  const unfamiliar = Session.getUnfamiliarWords();
  const todayTotal = familiar.length + unfamiliar.length;

  // 2. Continuous learning streak
  const streak = calcContinuousStreak();

  // 3. Due review count
  const dueCount = ReviewPool.getDueCount();

  // 4. Last learning time from localStorage
  let lastTimeStr = '--';
  const records = collectHistoryRecords();
  if (records.length > 0) {
    const last = records[0];
    if (last.savedAt) {
      const d = new Date(last.savedAt);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      lastTimeStr = `${d.getMonth()+1}/${d.getDate()} ${hh}:${mm}`;
    } else {
      const ds = last.dateStr || '';
      if (ds) {
        lastTimeStr = `${ds.slice(0,4)}/${ds.slice(4,6)}/${ds.slice(6,8)}`;
      }
    }
  } else {
    // Check if there's any session activity today
    if (todayTotal > 0) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      lastTimeStr = `今天 ${hh}:${mm}`;
    }
  }

  // v6.0: Use DailyGoal for progress
  const goal = DailyGoal.get();
  const goalPct = Math.min(100, Math.round((todayTotal / Math.max(1, goal)) * 100));

  if (DOM.dailyProgressFill) {
    DOM.dailyProgressFill.style.width = goalPct + '%';
  }
  if (DOM.dailyProgressLabel) {
    DOM.dailyProgressLabel.textContent = `${todayTotal} / ${goal} 词`;
  }

  // v6.0: Update goal area
  const goalValue = document.getElementById('dailyGoalValue');
  if (goalValue) {
    goalValue.textContent = `${goal} 词`;
  }

  // v6.0: Update challenge card
  updateChallengeCard();

  // v6.0: Goal feedback
  const goalFeedback = document.getElementById('dailyGoalFeedback');
  if (goalFeedback) {
    let showFeedback = false;
    if (todayTotal >= goal && todayTotal > 0) {
      if (todayTotal >= goal * 1.5) {
        goalFeedback.className = 'daily-goal-feedback overtop';
        goalFeedback.innerHTML = `🔥 超额完成！今日已学 ${todayTotal} / ${goal} 词`;
        showFeedback = true;
      } else if (todayTotal >= goal) {
        goalFeedback.className = 'daily-goal-feedback complete';
        goalFeedback.innerHTML = `🎉 今日目标达成！`;
        showFeedback = true;
        // 100% confetti
        if (typeof createConfetti === 'function') createConfetti();
      }
    } else if (todayTotal >= goal * 0.5 && todayTotal > 0) {
      goalFeedback.className = 'daily-goal-feedback halfway';
      goalFeedback.innerHTML = `💪 完成一半了！继续加油！`;
      showFeedback = true;
    }
    goalFeedback.style.display = showFeedback ? 'block' : 'none';
  }
  if (DOM.dailyStreak) {
    DOM.dailyStreak.textContent = `${streak} 天`;
  }
  if (DOM.dailyDueCount) {
    DOM.dailyDueCount.textContent = `${dueCount} 词`;
  }
  if (DOM.dailyLastTime) {
    DOM.dailyLastTime.textContent = lastTimeStr;
  }

  // Empty state guide
  if (DOM.dailyEmptyGuide) {
    if (todayTotal === 0) {
      DOM.dailyEmptyGuide.style.display = 'block';
    } else {
      DOM.dailyEmptyGuide.style.display = 'none';
    }
  }

  // Update QS cards
  updateQSCards();
}

/**
 * v5.0 — Calculate consecutive learning streak (days)
 */
function calcContinuousStreak() {
  const records = collectHistoryRecords();
  let streak = 0;
  const today = new Date();

  // Check today first
  const todayStr = State.sessionDate;
  const hasToday = records.some(r => r.dateStr === todayStr) ||
    (Session.getFamiliarWords().length + Session.getUnfamiliarWords().length > 0);

  if (!hasToday) {
    // Check if yesterday had activity
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}${String(yesterday.getMonth()+1).padStart(2,'0')}${String(yesterday.getDate()).padStart(2,'0')}`;
    const hasYesterday = records.some(r => r.dateStr === yStr);
    if (!hasYesterday) return 0;
  }

  // Walk backwards through days
  const dateSet = new Set(records.map(r => r.dateStr));
  if (todayTotal() > 0) dateSet.add(todayStr);

  for (let i = 0; ; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    if (dateSet.has(ds)) {
      streak++;
    } else if (i === 0) {
      // Today's not counted yet
    } else {
      break;
    }
  }

  return streak;
}

function todayTotal() {
  return Session.getFamiliarWords().length + Session.getUnfamiliarWords().length;
}

/**
 * v5.0 — Collect all history records from localStorage
 */
function collectHistoryRecords() {
  const records = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('vocab_record_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data && data.dateStr) records.push(data);
      } catch (_) {}
    }
  }
  records.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  return records;
}

/**
 * v5.5 — Check for mid-batch session snapshot and show restore hint
 */
function checkSnapshotRestore() {
  if (!DOM.snapshotRestore) return;
  if (!SessionSnapshot.hasValidSnapshot()) return;

  const snap = SessionSnapshot.load();
  if (!snap) return;

  if (DOM.snapshotBatchNum) {
    DOM.snapshotBatchNum.textContent = snap.batchIndex;
  }
  DOM.snapshotRestore.style.display = 'block';
}

/**
 * v5.0 — Update quick start cards
 */
function updateQSCards() {
  // Continue learning card
  if (DOM.qsContinueDesc) {
    const lastSession = { batch: State.batchIndex, source: State.sourceType };
    const sourceLabels = { ai: 'AI 生成', file: '文件导入', builtin: '内置词库' };
    const sl = sourceLabels[State.sourceType] || State.sourceType;
    DOM.qsContinueDesc.textContent = `词库: ${sl} · 进度: Batch ${State.batchIndex}`;
  }

  // Review badge
  if (DOM.qsReviewBadge) {
    const dueCount = ReviewPool.getDueCount();
    if (dueCount > 0) {
      DOM.qsReviewBadge.textContent = `${dueCount}`;
      DOM.qsReviewBadge.style.display = 'inline-block';
    } else {
      DOM.qsReviewBadge.style.display = 'none';
    }
  }

  // Source description
  if (DOM.qsSourceDesc) {
    const sourceLabels = { ai: 'AI / 内置 / 文件导入', file: '文件模式 · ' + (State.fileWordPool.length || 0) + ' 词', builtin: '内置词库 · ' + (State.builtinVocabId || '') };
    DOM.qsSourceDesc.textContent = sourceLabels[State.sourceType] || 'AI / 内置 / 文件导入';
  }
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

  // Legacy button (may not exist in new welcome page)
  if (btn) {
    if (dueCount > 0) {
      btn.style.display = 'inline-flex';
      badge.textContent = `${dueCount} due`;
    } else {
      btn.style.display = 'none';
    }
  }

  // Also update QS review badge (v5.0)
  if (DOM.qsReviewBadge) {
    if (dueCount > 0) {
      DOM.qsReviewBadge.textContent = `${dueCount}`;
      DOM.qsReviewBadge.style.display = 'inline-block';
    } else {
      DOM.qsReviewBadge.style.display = 'none';
    }
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
  // Welcome (legacy — replaced by QS cards; keep null-safe)
  if (DOM.btnStart) DOM.btnStart.addEventListener('click', startSession);
  if (DOM.btnLoadFile) DOM.btnLoadFile.addEventListener('click', () => DOM.fileInput.click());
  if (DOM.fileInput) DOM.fileInput.addEventListener('change', handleQuickFileLoad);
  if (DOM.linkSettings) DOM.linkSettings.addEventListener('click', e => { e.preventDefault(); openSettings(); });
  if (DOM.btnReview) DOM.btnReview.addEventListener('click', openReviewScreen);

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
  if (DOM.btnQuizBack) DOM.btnQuizBack.addEventListener('click', () => { showScreen('done'); });

  // Reading mode
  const btnReading = document.getElementById('btnReading');
  const btnReadingBack = document.getElementById('btnReadingBack');
  const btnExtractWords = document.getElementById('btnExtractWords');
  const btnAddAllToReview = document.getElementById('btnAddAllToReview');
  const btnReadingBackToInput = document.getElementById('btnReadingBackToInput');
  
  if (btnReading) btnReading.addEventListener('click', openReadingMode);
  if (btnReadingBack) btnReadingBack.addEventListener('click', () => showScreen('welcome'));
  if (btnExtractWords) btnExtractWords.addEventListener('click', handleExtractWords);
  if (btnAddAllToReview) btnAddAllToReview.addEventListener('click', handleReadingAddAll);
  if (btnReadingBackToInput) btnReadingBackToInput.addEventListener('click', () => {
    document.getElementById('readingInputArea').style.display = 'block';
    document.getElementById('readingArticleArea').style.display = 'none';
  });

  // Clear all data
  DOM.btnClearAllData.addEventListener('click', () => {
    if (confirm('⚠ Are you sure? This will erase ALL learning data, review pool, and settings. This cannot be undone!')) {
      if (confirm('Really? All your progress will be lost. Click OK to confirm.')) {
        localStorage.clear();
        showToast('All data cleared. Refreshing...', 'error', 3000);
        setTimeout(() => location.reload(), 2000);
      }
    }
  });

  // Shortcut help modal
  DOM.btnShortcutHelp.addEventListener('click', () => {
    DOM.modalShortcuts.style.display = 'flex';
  });
  DOM.closeShortcuts.addEventListener('click', () => {
    closeModal(DOM.modalShortcuts);
  });
  DOM.modalShortcuts.addEventListener('click', e => {
    if (e.target === DOM.modalShortcuts) closeModal(DOM.modalShortcuts);
  });

  // Mobile nav
  DOM.mobileNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (target === 'settings') {
        openSettings();
        return;
      }
      if (target === 'review') {
        openReviewScreen();
        return;
      }
      if (target === 'practice') {
        if (typeof Practice !== 'undefined' && Practice.showTab) {
          Practice.showTab('quiz');
        } else {
          openQuizScreen();
        }
        return;
      }
      if (target === 'welcome') {
        showScreen('welcome');
        updateReviewBadge();
        return;
      }
    });
  });

  // Select all / Deselect all on grid (with stagger animation)
  // v6.5: Select All / Deselect All replaced by batch dropdown
  // Legacy: make btnSelectAll/btnDeselectAll null-safe (may not exist in HTML)
  if (DOM.btnSelectAll) DOM.btnSelectAll.addEventListener('click', () => {
    if (DOM.btnBatchSelectAll) DOM.btnBatchSelectAll.click();
  });
  if (DOM.btnDeselectAll) DOM.btnDeselectAll.addEventListener('click', () => {
    if (DOM.btnBatchDeselectAll) DOM.btnBatchDeselectAll.click();
  });

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

  // Source radio toggles file/builtin panel
  document.querySelectorAll('input[name="source"]').forEach(radio => {
    radio.addEventListener('change', () => {
      DOM.fileSourcePanel.style.display = radio.value === 'file' ? 'flex' : 'none';
      DOM.builtinSourcePanel.style.display = radio.value === 'builtin' ? 'block' : 'none';
      if (radio.value === 'builtin') {
        loadBuiltinVocabList();
      }
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcut);

  // -------------------------------------------------------
  // v5.0: Welcome Page QS Cards & QA Buttons
  // -------------------------------------------------------
  if (DOM.btnQSC) {
    DOM.btnQSC.addEventListener('click', () => {
      // v6.0: Continue learning — check for snapshot first, then last vocab
      if (SessionSnapshot.hasValidSnapshot()) {
        const snap = SessionSnapshot.load();
        if (snap) {
          // Restore from snapshot
          State.batchIndex = snap.batchIndex;
          State.currentWords = snap.currentWords;
          State.markedIndices = new Set(snap.markedIndices);
          State.sourceType = snap.sourceType;
          if (snap.vocabId) {
            State.builtinVocabId = snap.vocabId;
            BuiltinVocab.set(snap.vocabId);
            if (!State.builtinVocabData) {
              loadBuiltinVocabData(snap.vocabId);
            }
          }
          renderWordGrid(State.currentWords);
          updateSessionInfo();
          showScreen('grid');
          showToast('批次已恢复', 'info', 2000);
          return;
        }
      }

      // No snapshot: start new batch from last used vocab
      if (State.sourceType === 'ai' && !Settings.getApiKey()) {
        showToast('请先在设置中添加 API Key。', 'info', 3000);
        openSettings();
        return;
      }
      if (State.sourceType === 'file' && State.fileWordPool.length === 0) {
        showToast('请先导入词库文件。', 'info');
        return;
      }
      if (State.sourceType === 'builtin' && !State.builtinVocabData) {
        showToast('请先选择内置词库。', 'info');
        openSource();
        return;
      }
      startSession();
    });
  }
  if (DOM.btnQSReview) {
    DOM.btnQSReview.addEventListener('click', () => {
      openReviewScreen();
    });
  }
  if (DOM.btnQSSource) {
    DOM.btnQSSource.addEventListener('click', openSource);
  }
  if (DOM.btnQSGenerate) {
    DOM.btnQSGenerate.addEventListener('click', () => {
      // Switch to AI source if not already, then start
      if (State.sourceType !== 'ai') {
        State.sourceType = 'ai';
        Settings.setSourceType('ai');
        document.querySelector('input[name="source"][value="ai"]').checked = true;
      }
      if (!Settings.getApiKey()) {
        showToast('请先在设置中添加 API Key。', 'info', 3000);
        openSettings();
        return;
      }
      startSession();
    });
  }
  if (DOM.btnQSFile) {
    DOM.btnQSFile.addEventListener('click', () => DOM.fileInput.click());
  }
  if (DOM.btnQSBuiltin) {
    DOM.btnQSBuiltin.addEventListener('click', () => {
      // Switch to builtin source
      State.sourceType = 'builtin';
      Settings.setSourceType('builtin');
      openSource();
      setTimeout(() => {
        document.querySelector('input[name="source"][value="builtin"]').click();
      }, 100);
    });
  }

  // QA Buttons
  if (DOM.qaCalendar) {
    DOM.qaCalendar.addEventListener('click', () => {
      if (DOM.heatmapSection) {
        const isHidden = DOM.heatmapSection.style.display === 'none';
        DOM.heatmapSection.style.display = isHidden ? 'block' : 'none';
        if (isHidden) renderHeatmap();
      }
    });
  }
  if (DOM.qaDifficult) {
    DOM.qaDifficult.addEventListener('click', () => {
      const difficultWords = getDifficultWords();
      if (difficultWords.length === 0) {
        showToast('暂无常错词记录。', 'info');
        return;
      }
      // Show in a modal-like overlay or navigate to review
      openReviewScreen();
    });
  }
  if (DOM.qaExportAnki) {
    DOM.qaExportAnki.addEventListener('click', () => showAnkiExportModal());
  }
  if (DOM.qaSettings) {
    DOM.qaSettings.addEventListener('click', openSettings);
  }

  // -------------------------------------------------------
  // Practice tab (v5.5)
  // -------------------------------------------------------
  if (DOM.btnPracticeBack) {
    DOM.btnPracticeBack.addEventListener('click', () => showScreen('welcome'));
  }
  if (typeof Practice !== 'undefined' && Practice.initTabs) {
    Practice.initTabs();
  }

  // -------------------------------------------------------
  // Close peek popup on click outside
  document.addEventListener('click', (e) => {
    const popup = DOM.peekPopup;
    if (popup && popup.style.display !== 'none' && !popup.contains(e.target)) {
      hidePeekPopup();
    }
  });

  // -------------------------------------------------------
  // Quick Test (v5.5)
  // -------------------------------------------------------
  if (DOM.btnToggleQuickTest) {
    DOM.btnToggleQuickTest.addEventListener('click', () => {
      const body = DOM.quickTestBody;
      if (!body) return;
      const isHidden = body.style.display === 'none';
      body.style.display = isHidden ? 'block' : 'none';
      if (DOM.quickTestArrow) {
        DOM.quickTestArrow.textContent = isHidden ? '▼' : '▶';
      }
      if (isHidden && !_quickTestStarted) {
        startQuickTest();
      }
    });
  }

  // -------------------------------------------------------
  // Session Snapshot restore (v5.5)
  // -------------------------------------------------------
  if (DOM.snapshotResume) {
    DOM.snapshotResume.addEventListener('click', () => {
      const snap = SessionSnapshot.load();
      if (!snap) return;
      // Restore state
      State.batchIndex = snap.batchIndex;
      State.currentWords = snap.currentWords;
      State.markedIndices = new Set(snap.markedIndices);
      State.familiarIndices = new Set(snap.familiarIndices || []);
      State.sourceType = snap.sourceType;
      if (snap.vocabId) {
        State.builtinVocabId = snap.vocabId;
        BuiltinVocab.set(snap.vocabId);
        // Load builtin vocab data if needed
        if (!State.builtinVocabData) {
          loadBuiltinVocabData(snap.vocabId);
        }
      }
      DOM.snapshotRestore.style.display = 'none';
      renderWordGrid(State.currentWords);
      updateSessionInfo();
      showScreen('grid');
      showToast('批次已恢复', 'info', 2000);
    });
  }
  if (DOM.snapshotDiscard) {
    DOM.snapshotDiscard.addEventListener('click', () => {
      SessionSnapshot.clear();
      DOM.snapshotRestore.style.display = 'none';
      showToast('已放弃恢复', 'info', 2000);
    });
  }

  // -------------------------------------------------------
  // Dictation
  // -------------------------------------------------------
  if (DOM.btnDictation) DOM.btnDictation.addEventListener('click', openDictationScreen);
  if (DOM.btnDictationBack) DOM.btnDictationBack.addEventListener('click', () => showScreen('welcome'));

  // -------------------------------------------------------
  // Cloze
  // -------------------------------------------------------
  if (DOM.btnCloze) DOM.btnCloze.addEventListener('click', openClozeScreen);
  if (DOM.btnClozeBack) DOM.btnClozeBack.addEventListener('click', () => showScreen('welcome'));

  // -------------------------------------------------------
  // Anki Export
  // -------------------------------------------------------
  if (DOM.btnExportAnki) DOM.btnExportAnki.addEventListener('click', () => showAnkiExportModal());
  if (DOM.btnExportAnkiWelcome) DOM.btnExportAnkiWelcome.addEventListener('click', () => showAnkiExportModal());
  const btnSettingsExportAnki = document.getElementById('btnSettingsExportAnki');
  if (btnSettingsExportAnki) btnSettingsExportAnki.addEventListener('click', () => showAnkiExportModal());

  // -------------------------------------------------------
  // Sync
  // -------------------------------------------------------
  DOM.btnSyncTest.addEventListener('click', handleSyncTest);
  DOM.btnSyncPush.addEventListener('click', handleSyncPush);
  DOM.btnSyncPull.addEventListener('click', handleSyncPull);
  DOM.toggleSyncPass.addEventListener('click', () => {
    const isHidden = DOM.inputSyncPass.type === 'password';
    DOM.inputSyncPass.type = isHidden ? 'text' : 'password';
    DOM.toggleSyncPass.textContent = isHidden ? 'Hide' : 'Show';
  });
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
      // Space: Start learning / next batch / play pronunciation in review
      e.preventDefault();
      if (activeId === 'screenWelcome') {
        if (DOM.btnQSC) DOM.btnQSC.click();
        else DOM.btnStart.click();
      } else if (activeId === 'screenDone') {
        DOM.btnNextBatch.click();
      }
      break;

    case 'Enter':
      // Enter: Confirm and continue / go next
      e.preventDefault();
      if (activeId === 'screenDetail') {
        DOM.btnConfirm.click();
      } else if (activeId === 'screenGrid') {
        DOM.btnNext.click();
      } else if (activeId === 'screenPractice') {
        // Submit quiz/dictation/cloze answer
        const submitBtn = document.querySelector('#quizSpellingSubmit, #dictationSubmit');
        if (submitBtn) submitBtn.click();
      }
      break;

    case 'Escape':
      // Escape: Close modals / go back
      e.preventDefault();
      closeModal(DOM.modalSettings);
      closeModal(DOM.modalSource);
      const historyBackdrop = document.querySelector('.history-backdrop');
      if (historyBackdrop) historyBackdrop.remove();
      hidePeekPopup();
      if (activeId === 'screenReview') {
        DOM.btnReviewBack.click();
      } else if (activeId === 'screenPractice') {
        if (DOM.btnPracticeBack) DOM.btnPracticeBack.click();
      } else if (activeId === 'screenDetail') {
        DOM.btnBackToGrid.click();
      }
      break;

    case 'r':
    case 'R':
      // R: Open review screen
      if (activeId === 'screenWelcome') {
        e.preventDefault();
        DOM.btnQSReview.click();
      }
      break;

    case 'd':
    case 'D':
      // D: Open dictation practice tab
      if (activeId === 'screenDone') {
        e.preventDefault();
        DOM.btnDictation.click();
      }
      if (activeId === 'screenWelcome') {
        e.preventDefault();
        if (typeof Practice !== 'undefined' && Practice.showTab) {
          Practice.showTab('dictation');
        }
      }
      break;

    case 'c':
    case 'C':
      // C: Open cloze practice tab
      if (activeId === 'screenDone') {
        e.preventDefault();
        DOM.btnCloze.click();
      }
      if (activeId === 'screenWelcome') {
        e.preventDefault();
        if (typeof Practice !== 'undefined' && Practice.showTab) {
          Practice.showTab('cloze');
        }
      }
      break;

    case 'm':
    case 'M':
      // M: Mark all as unfamiliar (Grid screen)
      if (activeId === 'screenGrid') {
        e.preventDefault();
        if (DOM.btnBatchMarkUnfamiliar) DOM.btnBatchMarkUnfamiliar.click();
      }
      break;

    case '/':
      // /: Focus search (if applicable — currently no search bar)
      if (activeId === 'screenGrid') {
        e.preventDefault();
        // No search bar yet, but reserved
      }
      break;

    case 'ArrowLeft':
      // Left arrow: navigate back
      if (activeId === 'screenDetail') {
        e.preventDefault();
        DOM.btnBackToGrid.click();
      } else if (activeId === 'screenReview') {
        // Previous word not directly supported
      } else if (activeId === 'screenPractice') {
        if (DOM.btnPracticeBack) DOM.btnPracticeBack.click();
      }
      break;

    case 'ArrowRight':
      // Right arrow: navigate forward
      if (activeId === 'screenDetail') {
        // Scroll to next card
        const nextCard = DOM.detailGrid.querySelector('.detail-card:not(.skeleton)');
        if (nextCard) nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      break;

    // Review: 1/2/3/4 for Again/Hard/Good/Easy
    case '1':
      if (activeId === 'screenReview') {
        e.preventDefault();
        const btn = document.querySelector('.review-detail-actions .btn-sm2-again');
        if (btn) btn.click();
      }
      break;
    case '2':
      if (activeId === 'screenReview') {
        e.preventDefault();
        const btn = document.querySelector('.review-detail-actions .btn-sm2-hard');
        if (btn) btn.click();
      }
      break;
    case '3':
      if (activeId === 'screenReview') {
        e.preventDefault();
        const btn = document.querySelector('.review-detail-actions .btn-sm2-good');
        if (btn) btn.click();
      }
      break;
    case '4':
      if (activeId === 'screenReview') {
        e.preventDefault();
        const btn = document.querySelector('.review-detail-actions .btn-sm2-easy');
        if (btn) btn.click();
      }
      break;
  }
}

/* =========================================================
   Modals
   ========================================================= */
function openSettings() {
  DOM.modalSettings.style.display = 'flex';
  updateSettingsDataSummary();
  // Show last sync time
  const syncCfg = SyncSettings.getAll();
  const lastSyncEl = document.getElementById('syncLastTime');
  if (lastSyncEl && syncCfg) {
    const lastSync = syncCfg.lastSyncTime;
    if (lastSync && lastSync > 0) {
      const d = new Date(lastSync);
      lastSyncEl.textContent = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    } else {
      lastSyncEl.textContent = '--';
    }
  }
}

/**
 * v7.6 — Update settings data summary card
 */
function updateSettingsDataSummary() {
  const familiar = Session.getFamiliarWords();
  const unfamiliar = Session.getUnfamiliarWords();
  const learnedCount = familiar.length + unfamiliar.length;
  const masteredCount = ReviewPool.getMasteredWords().length;
  const streak = calcContinuousStreak();
  const dueCount = ReviewPool.getDueCount();

  const items = document.querySelectorAll('#settingsDataSummary .data-value');
  if (items.length >= 4) {
    items[0].textContent = learnedCount;
    items[1].textContent = masteredCount;
    items[2].textContent = streak;
    items[3].textContent = dueCount;
  }
}
function openSource()   { DOM.modalSource.style.display   = 'flex'; }
function closeModal(el) { el.style.display = 'none'; }

function saveSettings() {
  const apiKey        = DOM.inputApiKey.value.trim();
  const wordsPerBatch = parseInt(DOM.inputWordsPerBatch.value, 10) || 100;
  const difficulty    = DOM.inputDifficulty.value;
  const autoPronounce = DOM.inputAutoPronounce.checked;
  const showShortcuts = DOM.inputShowShortcuts.checked;
  const theme         = DOM.inputTheme.value;
  const clickBehavior = DOM.inputClickBehavior.value;
  const dailyGoal     = parseInt(DOM.inputDailyGoal?.value, 10) || 50;
  const adaptiveBatch = DOM.inputAdaptiveBatch?.checked || false;

  Settings.saveAll({ apiKey, wordsPerBatch, difficulty, autoPronounce, showShortcuts, clickBehavior, dailyGoal, adaptiveBatch });
  Settings.setTheme(theme);
  applyTheme(theme);

  // Save sync settings too
  const syncUrl = DOM.inputSyncUrl.value.trim();
  const syncUser = DOM.inputSyncUser.value.trim();
  const syncPass = DOM.inputSyncPass.value;
  const syncAuto = DOM.inputAutoSync.checked;
  SyncSettings.saveAll({ url: syncUrl, username: syncUser, password: syncPass, autoSync: syncAuto });
  if (syncUrl) {
    SyncClient.configure(syncUrl, syncUser, syncPass);
  }

  closeModal(DOM.modalSettings);

  // Update welcome daily card with new goal
  updateWelcomeDailyCard();

  // v6.5: Update selection hint based on click behavior
  if (DOM.selectionHint) {
    DOM.selectionHint.textContent = clickBehavior === 'peek' ? '单击查看释义' : '单击直接标记';
  }

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
  if (val === 'builtin') {
    const selectedId = document.querySelector('input[name="builtinVocab"]:checked')?.value;
    if (!selectedId) {
      showToast('Please select a vocabulary list first.', 'error');
      return;
    }
    State.builtinVocabId = selectedId;
    BuiltinVocab.set(selectedId);
    loadBuiltinVocabData(selectedId);
  }
  State.sourceType = val;
  Settings.setSourceType(val);
  closeModal(DOM.modalSource);
  const label = val === 'ai' ? 'AI Generated' : val === 'file' ? 'Text File' : 'Built-in: ' + (State.builtinVocabId || '');
  showToast(`Source set to ${label}.`, 'success');
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

  if (State.sourceType === 'builtin' && !State.builtinVocabData) {
    showToast('Please select a built-in vocabulary list first.', 'error');
    openSource();
    setTimeout(() => {
      document.querySelector('input[name="source"][value="builtin"]').click();
    }, 100);
    return;
  }

  // v5.5: Skip loading screen — show grid with skeleton immediately
  showScreen('grid');
  renderGridSkeleton();
  DOM.batchLabel.textContent = `Batch ${State.batchIndex}`;
  DOM.wordCountLabel.textContent = '加载中...';
  updateSessionInfo();

  try {
    const words = await fetchWordBatch(apiKey, wordsPerBatch);

    // Remove skeletons
    document.querySelectorAll('.grid-skeleton').forEach(el => el.remove());
    if (words.length === 0) throw new Error('No words returned. Check your settings and try again.');

    State.currentWords   = words;
    State.markedIndices  = new Set();
    State.familiarIndices = new Set();

    // v6.5: Show batch preview before grid
    const sourceLabel = State.sourceType === 'ai' ? 'AI 生成' :
      State.sourceType === 'builtin' ? (State.builtinVocabId || '内置词库') :
      '文件导入';
    showBatchPreview(words, State.batchIndex, sourceLabel);

    // Wire up "开始" button to proceed to grid
    DOM.btnStartBatch.onclick = () => {
      hideBatchPreview();
      // Clear skeleton
      document.querySelectorAll('.grid-skeleton').forEach(el => el.remove());
      renderWordGrid(State.currentWords);
      DOM.historySection.style.display = 'none';
      updateSessionInfo();
      // Start batch timer
      startBatchTimer();
      // Preload next batch
      _preloadNextBatch();
    };
    // Auto-trigger if user already on grid screen (legacy path)
    // No — user must click "开始" first
  } catch (err) {
    document.querySelectorAll('.grid-skeleton').forEach(el => el.remove());
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

  if (State.sourceType === 'builtin') {
    if (!State.builtinVocabData || !Array.isArray(State.builtinVocabData)) {
      throw new Error('Built-in vocabulary not loaded. Please select a word list.');
    }
    const usedWords = new Set(BuiltinVocab.getUsedWords());
    const available = State.builtinVocabData.filter(entry => !usedWords.has(entry.word));
    if (available.length === 0) {
      showToast('All words in this vocabulary have been reviewed! Restarting.', 'info', 4000);
      BuiltinVocab.clear();
      return State.builtinVocabData.slice(0, count).map(e => e.word);
    }
    return available.slice(0, count).map(e => e.word);
  }

  // AI source with caching
  const usedWords  = Session.getUsedWords();
  const difficulty = Settings.getDifficulty();
  return generateWordList(apiKey, count, difficulty, usedWords);
}

/* =========================================================
   Word Grid
   ========================================================= */
/* =========================================================
   v6.5 — Word Grid (click→peek, long-press→direct mark)
   ========================================================= */

/** Current search query */
let _gridSearchQuery = '';
/** Current sort mode */
let _gridSortMode = 'random';
/** Batch timer state */
let _batchTimerInterval = null;
let _batchTimerSeconds = 0;

/** Cache the currently displayed words (after filtering/sorting) */
let _filteredWordIndices = [];

function renderWordGrid(words) {
  DOM.wordGrid.innerHTML = '';
  DOM.batchLabel.textContent    = `Batch ${State.batchIndex}`;
  DOM.wordCountLabel.textContent = `${words.length} words`;
  updateMarkedCount();

  // Build filtered index list
  _filteredWordIndices = words.map((_, i) => i);

  // Apply search filter
  const query = (_gridSearchQuery || '').toLowerCase().trim();
  if (query) {
    _filteredWordIndices = _filteredWordIndices.filter(i => {
      const w = words[i].toLowerCase();
      // Check built-in vocab for chineseDef
      let cn = '';
      if (State.builtinVocabData && Array.isArray(State.builtinVocabData)) {
        const entry = State.builtinVocabData.find(d => d.word && d.word.toLowerCase() === w);
        if (entry && entry.chineseDef) cn = entry.chineseDef.toLowerCase();
      }
      return w.includes(query) || cn.includes(query);
    });
  }

  // Apply sort
  if (_gridSortMode === 'alpha') {
    _filteredWordIndices.sort((a, b) => words[a].localeCompare(words[b]));
  } else if (_gridSortMode === 'difficulty') {
    // Sort by EF value in review pool (lower EF = harder = first)
    const pool = ReviewPool.getAll();
    const efMap = {};
    pool.forEach(e => { efMap[e.word.toLowerCase()] = e.ef || 2.5; });
    _filteredWordIndices.sort((a, b) => {
      const ea = efMap[words[a].toLowerCase()] || 2.5;
      const eb = efMap[words[b].toLowerCase()] || 2.5;
      return ea - eb;
    });
  } else {
    // random — shuffle
    for (let i = _filteredWordIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [_filteredWordIndices[i], _filteredWordIndices[j]] = [_filteredWordIndices[j], _filteredWordIndices[i]];
    }
  }

  // Render chips
  const clickBehavior = Settings.getClickBehavior() || 'peek';

  _filteredWordIndices.forEach((origIdx) => {
    const word = words[origIdx];
    const chip = document.createElement('button');
    chip.className   = 'word-chip';
    chip.textContent = word;
    chip.dataset.index = origIdx;

    // Apply existing mark state
    if (State.markedIndices.has(origIdx)) {
      chip.classList.add('marked');
    }
    if (State.familiarIndices && State.familiarIndices.has(origIdx)) {
      chip.classList.add('familiar');
    }

    // v7.5: Use pointer events (unified desktop+mobile) with distance-based tap detection
    chip.addEventListener('pointerdown', (e) => {
      chip.dataset.tapX = e.clientX;
      chip.dataset.tapY = e.clientY;
      chip.dataset.tapCancelled = 'false';
    });
    chip.addEventListener('pointermove', (e) => {
      if (chip.dataset.tapCancelled === 'false') {
        const dx = Math.abs(e.clientX - parseFloat(chip.dataset.tapX));
        const dy = Math.abs(e.clientY - parseFloat(chip.dataset.tapY));
        if (dx > 10 || dy > 10) {
          chip.dataset.tapCancelled = 'true';
        }
      }
    });
    chip.addEventListener('pointerup', (e) => {
      if (chip.dataset.tapCancelled !== 'true') {
        if (clickBehavior === 'peek') {
          hidePeekPopup();
          showPeekPopup(e, word);
        } else {
          toggleMark(chip, origIdx);
        }
      }
      chip.dataset.tapCancelled = 'true';
    });

    // v6.5: Long-press (400ms) → direct mark unfamiliar (no popup)
    addLongPressListener(chip, word);

    DOM.wordGrid.appendChild(chip);
  });

  // v6.0: Preload detail data in background
  _preloadCurrentBatchDetails();
}

/**
 * Legacy direct toggle for old 'mark' click behavior
 */
function toggleMark(chip, index) {
  chip.classList.add('press');
  setTimeout(() => chip.classList.remove('press'), 150);

  // Remove familiar state if present
  chip.classList.remove('familiar');
  if (State.familiarIndices) State.familiarIndices.delete(index);

  if (State.markedIndices.has(index)) {
    State.markedIndices.delete(index);
    chip.classList.remove('marked');
    chip.classList.add('unmark-anim');
  } else {
    State.markedIndices.add(index);
    chip.classList.add('marked');
    chip.classList.add('mark-anim');
    setTimeout(() => chip.classList.remove('mark-anim'), 400);
    ReviewPool.addWord(State.currentWords[index]);
  }
  updateMarkedCount();
  SessionSnapshot.save(State);
}

/**
 * v6.5: Mark a word as familiar (green, no review pool addition)
 */
function markFamiliar(word, chip) {
  const idx = State.currentWords.findIndex(w => w.toLowerCase() === word.toLowerCase());
  if (idx >= 0) {
    // Remove from marked/unfamiliar if present
    State.markedIndices.delete(idx);
    chip.classList.remove('marked');

    // Add to familiar set
    if (!State.familiarIndices) State.familiarIndices = new Set();
    State.familiarIndices.add(idx);
    chip.classList.add('familiar', 'mark-anim');
    setTimeout(() => chip.classList.remove('mark-anim'), 400);

    updateMarkedCount();
    SessionSnapshot.save(State);
  }
}

/**
 * v6.5: Mark a word as unfamiliar (yellow, add to review pool)
 */
function markUnfamiliar(word, chip) {
  const idx = State.currentWords.findIndex(w => w.toLowerCase() === word.toLowerCase());
  if (idx >= 0) {
    // Remove from familiar if present
    if (State.familiarIndices) State.familiarIndices.delete(idx);
    chip.classList.remove('familiar');

    State.markedIndices.add(idx);
    chip.classList.add('marked', 'mark-anim');
    setTimeout(() => chip.classList.remove('mark-anim'), 400);

    ReviewPool.addWord(word);
    updateMarkedCount();
    SessionSnapshot.save(State);
  }
}

function updateMarkedCount() {
  const n = State.markedIndices.size;
  DOM.markedCount.textContent = n === 0
    ? 'No words marked — click unfamiliar words to mark them'
    : `${n} word${n === 1 ? '' : 's'} marked as unfamiliar`;
  DOM.markedCount.style.color = n > 0
    ? 'var(--color-accent)'
    : 'var(--color-text-muted)';
  updateGridProgress();
}

function updateGridProgress() {
  if (!DOM.gridProgressFill) return;
  const total = State.currentWords.length;
  const marked = State.markedIndices.size;
  const pct = total > 0 ? (marked / total) * 100 : 0;
  DOM.gridProgressFill.style.width = pct + '%';
}

/**
 * v6.5: Long press (400ms) → direct mark unfamiliar, no popup
 */
function addLongPressListener(chip, word) {
  let _lpStartX = 0, _lpStartY = 0;

  chip.addEventListener('pointerdown', (e) => {
    _lpStartX = e.clientX;
    _lpStartY = e.clientY;
    chip._longPressTimer = setTimeout(() => {
      chip._longPressTimer = null;
      markUnfamiliar(word, chip);
      showToast(`✗ 已标记 "${word}" 为不熟悉`, 'info', 1500);
    }, 400);
  });

  chip.addEventListener('pointermove', (e) => {
    if (chip._longPressTimer) {
      const dx = Math.abs(e.clientX - _lpStartX);
      const dy = Math.abs(e.clientY - _lpStartY);
      if (dx > 5 || dy > 5) {
        clearTimeout(chip._longPressTimer);
        chip._longPressTimer = null;
      }
    }
  });

  chip.addEventListener('pointerup', () => {
    if (chip._longPressTimer) {
      clearTimeout(chip._longPressTimer);
      chip._longPressTimer = null;
    }
  });

  chip.addEventListener('pointerleave', () => {
    if (chip._longPressTimer) {
      clearTimeout(chip._longPressTimer);
      chip._longPressTimer = null;
    }
  });
}

/* =========================================================
   v6.5 — Grid Search, Sort & Batch Operations
   ========================================================= */

function setupGridSearch() {
  if (!DOM.gridSearch) return;
  let debounceTimer = null;
  DOM.gridSearch.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      _gridSearchQuery = DOM.gridSearch.value;
      renderWordGrid(State.currentWords);
    }, 300);
  });
}

function setupGridSort() {
  if (!DOM.gridSort) return;
  DOM.gridSort.addEventListener('change', () => {
    _gridSortMode = DOM.gridSort.value;
    renderWordGrid(State.currentWords);
  });
}

function setupBatchActions() {
  if (!DOM.btnBatchActions) return;
  DOM.btnBatchActions.addEventListener('click', () => {
    const dd = DOM.batchActionsDropdown;
    dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  });
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (DOM.btnBatchActions && DOM.batchActionsDropdown &&
        !DOM.btnBatchActions.contains(e.target) &&
        !DOM.batchActionsDropdown.contains(e.target)) {
      DOM.batchActionsDropdown.style.display = 'none';
    }
  });

  // Select all → mark all as unfamiliar
  if (DOM.btnBatchSelectAll) {
    DOM.btnBatchSelectAll.addEventListener('click', () => {
      State.currentWords.forEach((_, i) => {
        if (State.familiarIndices) State.familiarIndices.delete(i);
        State.markedIndices.add(i);
        ReviewPool.addWord(State.currentWords[i]);
        const chip = DOM.wordGrid.querySelector(`[data-index="${i}"]`);
        if (chip) {
          chip.classList.remove('familiar');
          chip.classList.add('marked', 'mark-anim');
          setTimeout(() => chip.classList.remove('mark-anim'), 400);
        }
      });
      DOM.batchActionsDropdown.style.display = 'none';
      updateMarkedCount();
      SessionSnapshot.save(State);
    });
  }

  // Deselect all
  if (DOM.btnBatchDeselectAll) {
    DOM.btnBatchDeselectAll.addEventListener('click', () => {
      State.markedIndices.clear();
      if (State.familiarIndices) State.familiarIndices.clear();
      DOM.wordGrid.querySelectorAll('.word-chip').forEach(chip => {
        chip.classList.remove('marked', 'familiar');
      });
      DOM.batchActionsDropdown.style.display = 'none';
      updateMarkedCount();
      SessionSnapshot.save(State);
    });
  }

  // Batch mark unfamiliar
  if (DOM.btnBatchMarkUnfamiliar) {
    DOM.btnBatchMarkUnfamiliar.addEventListener('click', () => {
      const allChips = DOM.wordGrid.querySelectorAll('.word-chip:not(.marked)');
      allChips.forEach(chip => {
        const idx = parseInt(chip.dataset.index);
        if (State.familiarIndices) State.familiarIndices.delete(idx);
        State.markedIndices.add(idx);
        ReviewPool.addWord(State.currentWords[idx]);
        chip.classList.remove('familiar');
        chip.classList.add('marked', 'mark-anim');
        setTimeout(() => chip.classList.remove('mark-anim'), 400);
      });
      DOM.batchActionsDropdown.style.display = 'none';
      showToast(`已将 ${allChips.length} 词标记为陌生`, 'info', 2000);
      updateMarkedCount();
      SessionSnapshot.save(State);
    });
  }

  // Batch mark familiar
  if (DOM.btnBatchMarkFamiliar) {
    DOM.btnBatchMarkFamiliar.addEventListener('click', () => {
      const allChips = DOM.wordGrid.querySelectorAll('.word-chip.marked');
      allChips.forEach(chip => {
        const idx = parseInt(chip.dataset.index);
        State.markedIndices.delete(idx);
        if (!State.familiarIndices) State.familiarIndices = new Set();
        State.familiarIndices.add(idx);
        chip.classList.remove('marked');
        chip.classList.add('familiar', 'mark-anim');
        setTimeout(() => chip.classList.remove('mark-anim'), 400);
      });
      DOM.batchActionsDropdown.style.display = 'none';
      showToast(`已将 ${allChips.length} 词标记为认识`, 'success', 2000);
      updateMarkedCount();
      SessionSnapshot.save(State);
    });
  }
}

/* =========================================================
   v6.5 — Batch Timer
   ========================================================= */
function startBatchTimer() {
  _batchTimerSeconds = 0;
  if (DOM.batchTimer) {
    DOM.batchTimer.style.display = 'inline-block';
    DOM.batchTimer.textContent = '⏱ 0:00';
  }
  clearInterval(_batchTimerInterval);
  _batchTimerInterval = setInterval(() => {
    _batchTimerSeconds++;
    const mins = Math.floor(_batchTimerSeconds / 60);
    const secs = _batchTimerSeconds % 60;
    if (DOM.batchTimer) {
      DOM.batchTimer.textContent = `⏱ ${mins}:${String(secs).padStart(2, '0')}`;
    }
  }, 1000);
}

function stopBatchTimer() {
  clearInterval(_batchTimerInterval);
  _batchTimerInterval = null;
  if (DOM.batchTimer) {
    DOM.batchTimer.style.display = 'none';
  }
  return _batchTimerSeconds;
}

/* =========================================================
   v6.5 — Batch Preview
   ========================================================= */
function showBatchPreview(words, batchIndex, sourceLabel) {
  if (!DOM.batchPreview) return;

  DOM.batchPreviewTitle.textContent = `Batch ${batchIndex} — ${sourceLabel}`;
  DOM.batchPreviewCount.innerHTML = `<strong>${words.length}</strong> 个新词`;
  DOM.batchPreviewSource.textContent = `词库：${sourceLabel}`;

  // Show first 8 words as preview
  const previewWords = words.slice(0, 8);
  const restCount = words.length - previewWords.length;
  let previewText = previewWords.join(', ');
  if (restCount > 0) previewText += `, ... +${restCount}`;
  DOM.batchPreviewWords.textContent = previewText;

  // Estimate time: ~3 sec per word average
  const estMins = Math.ceil(words.length * 3 / 60);
  DOM.batchPreviewTime.textContent = `预计用时：${Math.max(1, estMins)}-${estMins + 3} 分钟`;

  DOM.batchPreview.style.display = 'flex';
}

function hideBatchPreview() {
  if (DOM.batchPreview) DOM.batchPreview.style.display = 'none';
}

/* =========================================================
   Next → Detail or Done
   ========================================================= */
async function handleNext() {
  // Stop timer
  const elapsed = stopBatchTimer();

  const marked = [...State.markedIndices].map(i => State.currentWords[i]);

  if (marked.length > 0) {
    showScreen('detail');
    renderDetailSkeletons(marked.length);
    DOM.loadingDetail.style.display = 'flex';
    DOM.btnConfirm.disabled = true;

    // Try to get details from built-in vocab data first
    if (State.builtinVocabData && Array.isArray(State.builtinVocabData)) {
      const builtinMap = new Map();
      State.builtinVocabData.forEach(entry => {
        if (entry && entry.word) builtinMap.set(entry.word.toLowerCase(), entry);
      });

      const details = marked.map(w => {
        const found = builtinMap.get(w.toLowerCase());
        if (found) {
          return found;
        }
        return { word: w, pronunciation: '', partOfSpeech: '', definition: '', example: '' };
      });

      State.wordDetails = details;
      DOM.loadingDetail.style.display = 'none';
      DOM.btnConfirm.disabled = false;
      renderDetailCards(details);
    } else {
      // Fall back to API
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
        State.wordDetails = marked.map(w => ({ word: w, pronunciation: '', partOfSpeech: '', definition: 'Details unavailable.', example: '' }));
        renderDetailCards(State.wordDetails);
      } finally {
        DOM.loadingDetail.style.display = 'none';
        DOM.btnConfirm.disabled = false;
      }
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
  let touchStartX = 0;
  let touchStartY = 0;

  details.forEach((d, idx) => {
    const card = document.createElement('div');
    card.className = 'detail-card stagger-in';
    card.style.animationDelay = (idx * 80) + 'ms';
    card.dataset.index = idx;
    card.innerHTML = `
      <div class="detail-card-header">
        <span class="detail-word enter-anim" style="animation-delay:${(idx * 80 + 150)}ms">${escHtml(d.word)}</span>
        <button class="detail-speak-btn" data-word="${escHtml(d.word)}">🔊</button>
        ${d.pronunciation ? `<span class="detail-pronunciation">${escHtml(d.pronunciation)}</span>` : ''}
      </div>
      ${d.partOfSpeech ? `<span class="detail-pos">${escHtml(d.partOfSpeech)}</span>` : ''}
      <p class="detail-definition">${escHtml(d.definition)}</p>
      ${d.chineseDef ? `<p class="detail-chinese">${escHtml(d.chineseDef)}</p>` : ''}
      ${d.example ? `<p class="detail-example">${escHtml(d.example)}
        <button class="detail-speak-btn" data-sentence="${escHtml(d.example)}">🔊</button>
      </p>` : ''}
      ${d.chineseDef && d.example ? `<p class="detail-example-cn">${escHtml(d.chineseDef)}</p>` : ''}
      ${d.collocation ? `<p class="detail-collocation"><strong>常搭配：</strong>${escHtml(d.collocation)}</p>` : ''}
      <div class="detail-card-actions" style="margin-top:12px;display:flex;gap:8px;justify-content:center">
        <button class="btn btn-ghost detail-unmark-btn" data-word="${escHtml(d.word)}">↩ 这不是陌生词</button>
      </div>
    `;
    DOM.detailGrid.appendChild(card);

    // v7.5: Touch swipe support — angle detection to prevent vertical scroll conflicts
    card.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    card.addEventListener('touchmove', e => {
      if (!touchStartX) return;
      const moveX = e.touches[0].clientX;
      const moveY = e.touches[0].clientY;
      const dx = Math.abs(moveX - touchStartX);
      const dy = Math.abs(moveY - touchStartY);
      // If vertical movement clearly dominates, cancel swipe tracking
      if (dy > dx * 1.5 && dy > 10) {
        touchStartX = 0;
        touchStartY = 0;
      }
    }, { passive: true });

    card.addEventListener('touchend', e => {
      if (!touchStartX) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - touchStartX;
      const diffY = endY - touchStartY;

      // Only horizontal swipes where |dx| > |dy| * 1.5, ignore vertical scrolling
      if (Math.abs(diffX) > Math.abs(diffY) * 1.5 && Math.abs(diffX) > 50) {
        e.preventDefault();
        const currentIdx = parseInt(card.dataset.index);
        if (diffX < 0 && currentIdx < details.length - 1) {
          // Swipe left → next
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Actually scroll to the next card
          const nextCard = DOM.detailGrid.children[currentIdx + 1];
          if (nextCard) nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (diffX > 0 && currentIdx > 0) {
          // Swipe right → previous
          const prevCard = DOM.detailGrid.children[currentIdx - 1];
          if (prevCard) prevCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      touchStartX = 0;
      touchStartY = 0;
    }, { passive: false });
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

  // v6.5: Wire up unmark buttons
  DOM.detailGrid.querySelectorAll('.detail-unmark-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const word = btn.dataset.word;
      const idx = State.currentWords.findIndex(w => w.toLowerCase() === word.toLowerCase());
      if (idx >= 0 && State.markedIndices.has(idx)) {
        State.markedIndices.delete(idx);
        if (State.familiarIndices) State.familiarIndices.delete(idx);
        const chip = DOM.wordGrid.querySelector(`[data-index="${idx}"]`);
        if (chip) {
          chip.classList.remove('marked', 'familiar');
          chip.classList.add('unmark-anim');
        }
        updateMarkedCount();
        SessionSnapshot.save(State);
        showToast(`已取消标记 "${word}"`, 'info', 2000);
        // Remove this card
        const card = btn.closest('.detail-card');
        if (card) card.style.opacity = '0.3';
      }
    });
  });

  // Auto-pronounce first word if setting enabled
  const s = Settings.getAll();
  if (s.autoPronounce !== false && details.length > 0) {
    const firstWord = details[0].word;
    setTimeout(() => TTS.speakWord(firstWord), 500);
  }
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

  // v5.5: Clear snapshot on completion
  SessionSnapshot.clear();

  finalizeAndDone(unfamiliarWords);
}

function finalizeAndDone(unfamiliarWords) {
  const familiarWords = State.currentWords.filter((_, i) => !State.markedIndices.has(i));

  // Persist to session storage
  Session.addUsedWords(State.currentWords);
  Session.addFamiliarWords(familiarWords);
  Session.addUnfamiliarWords(unfamiliarWords);

  // Track used words for built-in vocabulary
  if (State.sourceType === 'builtin' && State.builtinVocabId) {
    BuiltinVocab.addUsedWords(State.currentWords);
  }

  const allFamiliar   = Session.getFamiliarWords();
  const allUnfamiliar = Session.getUnfamiliarWords();

  // Save record snapshot
  Records.saveToLocalStorage(State.sessionDate, allFamiliar, allUnfamiliar);

  // Render done screen with animated counting (v5.0)
  const targets = [
    { el: 'stat-familiar', val: familiarWords.length, cls: 'green' },
    { el: 'stat-unfamiliar', val: unfamiliarWords.length, cls: 'yellow' },
    { el: 'stat-batchsize', val: State.currentWords.length, cls: '' },
    { el: 'stat-batchnum', val: State.batchIndex, cls: '' },
  ];
  DOM.doneStats.innerHTML = `
    <div class="stat-pill">
      <span class="stat-value green" id="stat-familiar">0</span>
      <span class="stat-label">Familiar</span>
    </div>
    <div class="stat-pill">
      <span class="stat-value yellow" id="stat-unfamiliar">0</span>
      <span class="stat-label">Unfamiliar</span>
    </div>
    <div class="stat-pill">
      <span class="stat-value" id="stat-batchsize">0</span>
      <span class="stat-label">This batch</span>
    </div>
    <div class="stat-pill">
      <span class="stat-value" id="stat-batchnum">0</span>
      <span class="stat-label">Batch #</span>
    </div>
  `;

  // Animate counting
  animateCountUp('stat-familiar', familiarWords.length, 200);
  setTimeout(() => animateCountUp('stat-unfamiliar', unfamiliarWords.length, 200), 250);
  setTimeout(() => animateCountUp('stat-batchsize', State.currentWords.length, 200), 500);
  setTimeout(() => animateCountUp('stat-batchnum', State.batchIndex, 200), 750);

  // Check if there are quiz-able words (familiar + unfamiliar)
  const quizWords = [...new Set([...allFamiliar, ...allUnfamiliar])];
  DOM.doneNote.innerHTML = `
    Session totals: <strong>${allFamiliar.length}</strong> familiar,
    <strong>${allUnfamiliar.length}</strong> unfamiliar words today.
    ${quizWords.length >= 4 ? '<br>Ready to test yourself? Click "Start Quiz".' : ''}
  `;

  // Show history link
  DOM.historySection.style.display = 'block';

  // v5.5: Show quick test section (if enough words)
  if (DOM.quickTestSection && State.currentWords.length >= 2) {
    DOM.quickTestSection.style.display = 'block';
    // Reset quick test state
    _quickTestStarted = false;
    _quickTestState = null;
    DOM.quickTestBody.style.display = 'none';
    DOM.quickTestResult.style.display = 'none';
    if (DOM.quickTestArrow) DOM.quickTestArrow.textContent = '▶';
  }

  showScreen('done');

  // v6.0: Track used modes for toolbox badge
  _trackUsedMode('batch');

  // v6.0: Preload next batch data
  _preloadNextBatch();

  // v6.0: Check badges
  checkBadges({ action: 'batch' });
  checkBadges({ action: 'daily_update' });
  setTimeout(updateBadgesSection, 500);

  // Auto-sync after batch completion
  autoSyncIfEnabled();
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
  // v6.0: Use preloaded next batch if available
  if (_preloadedNextBatch && _preloadedNextBatch.length > 0) {
    State.batchIndex = Session.incrementBatchIndex();
    updateSessionInfo();
    State.currentWords = _preloadedNextBatch;
    State.markedIndices = new Set();
    State.familiarIndices = new Set();
    _preloadedNextBatch = null;
    renderWordGrid(State.currentWords);
    DOM.historySection.style.display = 'none';
    updateSessionInfo();
    showScreen('grid');
    // v6.5: Start batch timer
    startBatchTimer();
    // Preload next batch and details
    _preloadCurrentBatchDetails();
    _preloadNextBatch();
    return;
  }

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

  // v6.5: Render memory health bars
  renderMemoryHealth();

  // v6.0: Badge check for review
  _trackUsedMode('review');
  checkBadges({ action: 'review' });

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
  const consecutive = ReviewPool.getConsecutiveCorrect();
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

  // Show consecutive correct streak
  if (consecutive > 0) {
    progressEl.innerHTML = `${words.length} word${words.length > 1 ? 's' : ''} to review · 🔥 ${consecutive} streak`;
  } else {
    progressEl.textContent = `${words.length} word${words.length > 1 ? 's' : ''} to review`;
  }

  // Add difficult words ranking
  const difficultWords = getDifficultWords();
  if (difficultWords.length > 0) {
    const diffSection = document.createElement('div');
    diffSection.className = 'difficult-words-section';
    diffSection.innerHTML = `<h4>😰 常错词 TOP ${Math.min(10, difficultWords.length)}</h4>
      ${difficultWords.slice(0, 10).map(w =>
        `<div class="difficult-word-item"><span class="word">${escHtml(w.word)}</span><span class="error-count">错${w.errorCount}次</span></div>`
      ).join('')}
    `;
    statsEl.appendChild(diffSection);
  }

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

  // Build a detail card with SM-2 difficulty buttons
  const detailEl = document.createElement('div');
  detailEl.className = 'review-detail';

  let defText = escapeForReview(word);
  const detail = State.wordDetails.find(d => d.word?.toLowerCase() === entry.word.toLowerCase());
  if (detail && detail.definition) {
    defText = escHtml(detail.definition);
  }

  const pronDisplay = detail?.pronunciation 
    ? `${escHtml(detail.pronunciation)} · ` 
    : '';

  detailEl.innerHTML = `
    <span class="review-detail-word">
      ${escHtml(entry.word)}
      <button class="review-detail-speak" data-word="${escHtml(entry.word)}">🔊</button>
    </span>
    <span class="review-detail-pronunciation">${pronDisplay}EF: ${entry.ef ? entry.ef.toFixed(2) : '2.50'} | Rep: ${entry.repetition || 0} | Interval: ${entry.interval || 1}d</span>
    <p class="review-detail-def">${defText}</p>
    <div class="review-detail-actions">
      <button class="btn btn-sm2-again" data-quality="0">Again</button>
      <button class="btn btn-sm2-hard" data-quality="2">Hard</button>
      <button class="btn btn-sm2-good" data-quality="4">Good</button>
      <button class="btn btn-sm2-easy" data-quality="5">Easy</button>
    </div>
  `;

  DOM.reviewList.appendChild(detailEl);

  // Wire up speak button
  detailEl.querySelector('.review-detail-speak')?.addEventListener('click', () => {
    TTS.speakWord(entry.word);
  });

  // Wire up SM-2 difficulty buttons
  detailEl.querySelectorAll('.review-detail-actions .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const quality = parseInt(btn.dataset.quality, 10);
      ReviewPool.review(entry.word, quality);

      const qualityLabels = { 0: 'Again', 2: 'Hard', 4: 'Good', 5: 'Easy' };
      showToast(`Marked as \"${qualityLabels[quality]}\" — next review scheduled.`, 'success');

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
  // v5.5: Route through Practice screen
  if (typeof Practice !== 'undefined' && Practice.showTab) {
    Practice.showTab('quiz');
  } else {
    showScreen('quiz');
  }
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
        <button class="btn btn-primary" onclick="showScreen('welcome')">← Back</button>
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

  _trackUsedMode('quiz');
  // v6.0: Check quiz badges
  checkBadges({ action: 'quiz', score: qs.score, total: qs.questions.length });

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
   v5.0 — Animated Count Up
   ========================================================= */
function animateCountUp(elementId, target, delayMs = 200) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const start = 0;
  const duration = Math.min(1200, target * delayMs);
  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * eased);
    el.textContent = current;
    if (current !== target) {
      // Pulse effect on change
      el.classList.add('counting');
      setTimeout(() => el.classList.remove('counting'), 300);
    }
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = target;
    }
  }

  requestAnimationFrame(step);
}

/* =========================================================
   v5.0 — Streak Bounce Animation
   ========================================================= */
function animateStreakBounce(element) {
  if (!element) return;
  element.classList.remove('streak-bounce');
  void element.offsetWidth;
  element.classList.add('streak-bounce');
}

/* =========================================================
   v6.0 — Badges UI
   ========================================================= */
let _badgePollTimer = null;

/**
 * 更新欢迎页徽章区域
 */
function updateBadgesSection() {
  const rowEl = document.getElementById('badgesRow');
  const countEl = document.getElementById('badgesCount');
  if (!rowEl) return;

  const unlocked = BadgeManager.getUnlocked();
  const allBadges = BadgeManager.getAll();
  const unlockedIds = new Set(Object.keys(unlocked));

  if (countEl) {
    countEl.textContent = `${unlockedIds.size}/${allBadges.length}`;
  }

  const unlockedBadges = allBadges.filter(b => unlockedIds.has(b.id));
  if (unlockedBadges.length === 0) {
    rowEl.innerHTML = '<div class="badges-placeholder">还没有解锁徽章，快去学习吧！</div>';
    return;
  }

  // 展示最近解锁的 6 个徽章
  const sorted = unlockedBadges.sort((a, b) => (unlocked[b.id] || 0) - (unlocked[a.id] || 0));
  const recent = sorted.slice(0, 6);
  rowEl.innerHTML = recent.map(b => `
    <div class="badge-chip unlocked">
      <span class="badge-chip-icon">${b.icon}</span>
      <span class="badge-chip-name">${b.name}</span>
    </div>
  `).join('');
}

/**
 * 徽章解锁 toast 通知
 */
function showBadgeUnlockToast(badge) {
  const toast = document.createElement('div');
  toast.className = 'badge-unlock-toast';
  toast.innerHTML = `
    <span class="badge-unlock-icon">${badge.icon}</span>
    <span class="badge-unlock-text">🏅 解锁成就：<span class="badge-unlock-name">${escHtml(badge.name)}</span></span>
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);

  // 同时更新欢迎页
  setTimeout(updateBadgesSection, 100);
}

/**
 * 徽章详情弹窗
 */
function showBadgeDetailModal() {
  // 移除已有弹窗
  const existing = document.querySelector('.badge-detail-backdrop');
  if (existing) return;

  const unlocked = BadgeManager.getUnlocked();
  const allBadges = BadgeManager.getAll();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop badge-detail-backdrop';
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  backdrop.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>🏆 成就列表 (${Object.keys(unlocked).length}/${allBadges.length})</h3>
        <button class="modal-close" id="closeBadgeDetail">✕</button>
      </div>
      <div class="modal-body">
        ${allBadges.map(b => {
          const isUnlocked = !!unlocked[b.id];
          return `
            <div class="badge-detail-item ${isUnlocked ? 'unlocked' : 'locked'}">
              <span class="badge-detail-icon">${b.icon}</span>
              <div class="badge-detail-info">
                <div class="badge-detail-name">${escHtml(b.name)}</div>
                <div class="badge-detail-desc">${escHtml(b.desc)}</div>
              </div>
              ${isUnlocked ? `<span class="badge-detail-time">${formatTime(unlocked[b.id])}</span>` : '<span class="badge-detail-time" style="color:var(--color-text-muted)">🔒</span>'}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  backdrop.querySelector('#closeBadgeDetail').addEventListener('click', () => backdrop.remove());
}

/* =========================================================
   v6.0 — Daily Challenge UI
   ========================================================= */

/**
 * 更新每日挑战卡片
 */
function updateChallengeCard() {
  const bodyEl = document.getElementById('challengeBody');
  const streakEl = document.getElementById('challengeStreak');
  if (!bodyEl || !streakEl) return;

  const challenge = Challenge.getTodaysChallenge();
  if (!challenge) {
    bodyEl.innerHTML = '<div class="challenge-loading">词库数据不足，无法生成挑战</div>';
    streakEl.textContent = '';
    return;
  }

  // 更新连续答对
  const streak = Challenge.getStreak();
  streakEl.textContent = streak > 0 ? `🔥 连续 ${streak} 天` : '';

  if (challenge.answered) {
    // 已答状态
    const resultClass = challenge.correct ? 'challenge-result-correct' : 'challenge-result-wrong';
    const resultIcon = challenge.correct ? '🎉' : '😅';
    const resultText = challenge.correct ? '答对了！' : '答错了，下次加油！';
    const detail = challenge.detail || {};

    bodyEl.innerHTML = `
      <div class="challenge-answered">
        <div class="challenge-result-icon">${resultIcon}</div>
        <div class="challenge-result-text ${resultClass}">${resultText}</div>
        <div class="challenge-result-detail">
          <strong>${escHtml(challenge.word)}</strong>
          ${detail.pronunciation ? `<span style="color:var(--color-text-muted);font-family:var(--font-mono);font-size:0.8rem">${escHtml(detail.pronunciation)}</span>` : ''}
          <br>
          <span>${escHtml(detail.chineseDef || detail.definition || challenge.correctAnswer)}</span>
          ${detail.example ? `<br><span style="font-style:italic;color:var(--color-text-muted)">"${escHtml(detail.example)}"</span>` : ''}
        </div>
        <div class="challenge-result-streak">🌅 明天的挑战会在 0 点刷新</div>
      </div>
    `;
  } else {
    // 未答状态
    bodyEl.innerHTML = `
      <div class="challenge-unanswered">
        <span class="challenge-word">${escHtml(challenge.word)}</span>
        <div class="challenge-prompt">选择正确的中文释义</div>
        <div class="challenge-options" id="challengeOptions">
          ${challenge.options.map((opt, i) => `
            <button class="challenge-option" data-index="${i}" data-value="${escHtml(opt)}">${escHtml(opt)}</button>
          `).join('')}
        </div>
      </div>
    `;

    // Wire up option clicks
    bodyEl.querySelectorAll('.challenge-option').forEach(btn => {
      btn.addEventListener('click', () => {
        handleChallengeAnswer(challenge, btn.dataset.value);
      });
    });
  }
}

/**
 * 处理挑战答案提交
 */
function handleChallengeAnswer(challenge, answer) {
  const result = Challenge.submitAnswer(answer);
  const options = document.querySelectorAll('.challenge-option');

  options.forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.value === challenge.correctAnswer) {
      btn.classList.add('correct');
    } else if (btn.dataset.value === answer && !result.correct) {
      btn.classList.add('wrong');
    }
  });

  // 延迟刷新
  setTimeout(() => {
    updateChallengeCard();
  }, 1200);
}

/* =========================================================
   v6.0 — Daily Goal Editor
   ========================================================= */
function showGoalEditor() {
  // 移除已有弹窗
  const existing = document.querySelector('.goal-edit-popup');
  if (existing) existing.remove();

  const currentGoal = DailyGoal.get();

  const popup = document.createElement('div');
  popup.className = 'goal-edit-popup';
  popup.innerHTML = `
    <div class="goal-edit-card">
      <h3>🎯 设置每日目标</h3>
      <div class="goal-presets" id="goalPresets">
        ${DailyGoal.PRESETS.map(p => `
          <button class="goal-preset-btn ${p === currentGoal ? 'active' : ''}" data-value="${p}">${p} 词</button>
        `).join('')}
      </div>
      <div class="goal-custom-wrap">
        <input type="number" id="goalCustomInput" min="1" max="1000" placeholder="自定义..." />
        <button class="btn btn-primary" id="goalCustomApply">确定</button>
      </div>
      <div class="goal-edit-actions">
        <button class="btn btn-ghost" id="goalEditorClose">取消</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  function setGoal(n) {
    DailyGoal.set(n);
    popup.remove();
    updateWelcomeDailyCard();
    showToast(`每日目标已设为 ${n} 词`, 'success', 2000);
  }

  // Preset buttons
  popup.querySelectorAll('.goal-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setGoal(parseInt(btn.dataset.value, 10));
    });
  });

  // Custom input
  const customInput = popup.querySelector('#goalCustomInput');
  const customApply = popup.querySelector('#goalCustomApply');
  customApply.addEventListener('click', () => {
    const val = parseInt(customInput.value, 10);
    if (val > 0 && val <= 1000) {
      setGoal(val);
    } else {
      showToast('请输入 1-1000 之间的数字', 'error');
    }
  });
  customInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') customApply.click();
  });
  customInput.focus();

  // Close
  popup.querySelector('#goalEditorClose').addEventListener('click', () => popup.remove());
  popup.addEventListener('click', (e) => {
    if (e.target === popup) popup.remove();
  });
}

/* =========================================================
   v6.0 — Preloading (核心流程极致优化)
   ========================================================= */

/** 缓存的下一批词数据 */
let _preloadedNextBatch = null;

/**
 * 预加载下一批词数据
 */
function _preloadNextBatch() {
  _preloadedNextBatch = null;

  const apiKey = Settings.getApiKey();
  const wordsPerBatch = Settings.getWordsPerBatch();

  setTimeout(async () => {
    try {
      if (State.sourceType === 'builtin' && State.builtinVocabData) {
        const usedWords = new Set(BuiltinVocab.getUsedWords());
        const available = State.builtinVocabData.filter(entry => !usedWords.has(entry.word));
        if (available.length > 0) {
          _preloadedNextBatch = available.slice(0, wordsPerBatch).map(e => e.word);
        }
      } else if (State.sourceType === 'file' && State.fileWordPool.length > 0) {
        const usedSet = new Set(Session.getUsedWords());
        const pool = State.fileWordPool.filter(w => !usedSet.has(w));
        if (pool.length > 0) {
          _preloadedNextBatch = pool.slice(0, wordsPerBatch);
        }
      }
    } catch (_) {}
  }, 100);
}

/**
 * 预加载当前批次所有词的详情数据
 */
function _preloadCurrentBatchDetails() {
  if (!State.currentWords || State.currentWords.length === 0) return;

  // 如果是内置词库，直接建立映射
  if (State.builtinVocabData && Array.isArray(State.builtinVocabData)) {
    const builtinMap = new Map();
    State.builtinVocabData.forEach(entry => {
      if (entry && entry.word) builtinMap.set(entry.word.toLowerCase(), entry);
    });
    const missing = State.currentWords.filter(w => !builtinMap.has(w.toLowerCase()));
    if (missing.length === 0) {
      // 全部有详情，不用加载
      return;
    }
  }

  // 有 API Key 时后台加载详情
  const apiKey = Settings.getApiKey();
  if (apiKey) {
    setTimeout(async () => {
      try {
        const details = await getWordDetailsBatched(apiKey, State.currentWords, 15);
        // 合并到 wordDetails
        const existingWords = new Set((State.wordDetails || []).map(d => d.word?.toLowerCase()));
        details.forEach(d => {
          if (!existingWords.has(d.word?.toLowerCase())) {
            State.wordDetails.push(d);
          }
        });
      } catch (_) {}
    }, 500);
  }
}

/**
 * 使用预加载下一批数据
 */
async function _startNextBatchWithPreload() {
  State.batchIndex = Session.incrementBatchIndex();
  updateSessionInfo();

  if (_preloadedNextBatch && _preloadedNextBatch.length > 0) {
    State.currentWords = _preloadedNextBatch;
    State.markedIndices = new Set();
    _preloadedNextBatch = null;
    renderWordGrid(State.currentWords);
    DOM.historySection.style.display = 'none';
    updateSessionInfo();
    showScreen('grid');
    // Preload details
    _preloadCurrentBatchDetails();
    _preloadNextBatch();
    return;
  }

  // Fallback: normal start
  await startSession();
}

/* =========================================================
   v6.0 — Toolbox tracking
   ========================================================= */
const USED_MODES_KEY = 'vocab_used_modes';

function _trackUsedMode(mode) {
  let modes;
  try {
    modes = JSON.parse(localStorage.getItem(USED_MODES_KEY) || '[]');
  } catch (_) { modes = []; }
  if (!modes.includes(mode)) {
    modes.push(mode);
    localStorage.setItem(USED_MODES_KEY, JSON.stringify(modes));
  }
  checkBadges({ action: 'toolbox_check', usedModes: modes });
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
   HEATMAP — Learning Calendar (v3.0)
   ========================================================= */
function renderHeatmap() {
  const gridEl = DOM.heatmapGrid;
  const sectionEl = DOM.heatmapSection;
  const legendEl = DOM.heatmapLegend;
  if (!gridEl || !sectionEl) return;

  // Collect last 60 days of data
  const dayData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('vocab_record_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        const dateStr = key.replace('vocab_record_', '');
        const total = (data.familiarWords?.length || 0) + (data.unfamiliarWords?.length || 0);
        dayData[dateStr] = total;
      } catch(_) {}
    }
  }

  // Also check today's session
  const today = State.sessionDate;
  const todayFamiliar = Session.getFamiliarWords().length;
  const todayUnfamiliar = Session.getUnfamiliarWords().length;
  if (todayFamiliar + todayUnfamiliar > 0) {
    dayData[today] = todayFamiliar + todayUnfamiliar;
  }

  if (Object.keys(dayData).length === 0) {
    sectionEl.style.display = 'none';
    return;
  }

  sectionEl.style.display = 'block';

  // Build 60-day grid (rows of 7)
  const todayDate = new Date();
  const cells = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${yyyy}${mm}${dd}`;
    const count = dayData[key] || 0;
    let level = 0;
    if (count > 0) level = 1;
    if (count > 10) level = 2;
    if (count > 30) level = 3;
    if (count > 50) level = 4;
    cells.push({ date: key, count, level });
  }

  let html = '';
  // Day headers
  ['Mon','','Wed','','Fri','','Sun'].forEach(d => {
    html += `<div style="font-size:0.6rem;color:var(--color-text-muted);text-align:center">${d}</div>`;
  });
  cells.forEach(c => {
    html += `<div class="heatmap-cell level-${c.level}" title="${c.date.slice(0,4)}-${c.date.slice(4,6)}-${c.date.slice(6,8)}: ${c.count} words"></div>`;
  });
  gridEl.innerHTML = html;

  // Legend
  legendEl.innerHTML = `
    <span>Less</span>
    <span class="legend-swatch"></span>
    <span class="legend-swatch s1"></span>
    <span class="legend-swatch s2"></span>
    <span class="legend-swatch s3"></span>
    <span class="legend-swatch s4"></span>
    <span>More</span>
  `;
}

/* =========================================================
   CELEBRATION ANIMATIONS (v3.0)
   ========================================================= */
function triggerCelebration(level) {
  if (level === 'star') {
    showToast('⭐ 5 in a row! Keep it up!', 'success');
  } else if (level === 'medium') {
    showToast('🌟 10 in a row! You\'re on fire!', 'success');
    // Simple pulse animation on the review content
    const content = DOM.reviewContent;
    if (content) {
      content.classList.remove('celebration-pulse');
      void content.offsetWidth;
      content.classList.add('celebration-pulse');
    }
  } else if (level === 'large') {
    showToast('🎉 20 in a row! Amazing!', 'success');
    // Confetti effect
    createConfetti();
  }
}

function createConfetti() {
  const container = document.createElement('div');
  container.className = 'celebration-confetti';
  container.style.left = '50%';
  container.style.top = '50%';
  const colors = ['#f56565', '#f0c040', '#3ecf8e', '#5b6ef5', '#a78bfa', '#ff6b6b'];
  for (let i = 0; i < 30; i++) {
    const piece = document.createElement('div');
    piece.className = 'celebration-confetti-piece';
    piece.style.background = colors[i % colors.length];
    piece.style.left = (Math.random() * 200 - 100) + 'px';
    piece.style.top = (Math.random() * 200 - 100) + 'px';
    piece.style.animationDelay = (Math.random() * 0.5) + 's';
    piece.style.width = (6 + Math.random() * 6) + 'px';
    piece.style.height = (6 + Math.random() * 6) + 'px';
    container.appendChild(piece);
  }
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 2500);
}

/* =========================================================
   Built-in Vocabulary — Loading & Selection
   ========================================================= */

/**
 * Load the vocabulary index and populate the list in the source modal
 */
/**
 * v6.0: 内置词库加载（含路径模式和自由模式切换）
 * 也缓存 index 供 VocabMastery 使用
 */
let _vocabIndexCache = null;
let _vocabDataCache = {};

async function loadBuiltinVocabList() {
  const listEl = DOM.builtinVocabList;
  if (!listEl) return;

  // Show loading
  listEl.innerHTML = '<div class="builtin-loading-panel"><div class="spinner spinner-sm"></div><span>Loading word lists...</span></div>';

  try {
    const resp = await fetch('vocabulary/index.json');
    if (!resp.ok) throw new Error('Failed to load vocabulary index');
    const data = await resp.json();
    _vocabIndexCache = data;

    if (!data.vocabularies || data.vocabularies.length === 0) {
      listEl.innerHTML = '<p class="form-hint">No built-in vocabulary found.</p>';
      return;
    }

    // v6.0: 预加载所有词库数据（用于掌握率计算）
    await preloadAllVocabData(data.vocabularies);

    const currentId = State.builtinVocabId || BuiltinVocab.get();

    // v6.0: 添加路径/自由模式切换
    let html = '';
    if (data.paths) {
      html += '<div class="builtin-view-toggle" id="builtinViewToggle">';
      html += '<button class="builtin-view-btn active" data-view="path">📋 学习路径</button>';
      html += '<button class="builtin-view-btn" data-view="free">🎯 自由模式</button>';
      html += '</div>';
    }
    html += '<div id="builtinPathView" class="builtin-path-view">';

    // v6.0: 路径模式
    if (data.paths) {
      Object.keys(data.paths).forEach(pathId => {
        if (pathId === 'free') return;
        const path = data.paths[pathId];
        const vocabsInPath = data.vocabularies
          .filter(v => v.path === pathId)
          .sort((a, b) => (a.order || 999) - (b.order || 999));

        if (vocabsInPath.length === 0) return;

        html += `<div class="builtin-path-group">`;
        html += `<div class="builtin-path-header">${escHtml(path.name)}</div>`;
        html += `<div class="builtin-path-desc">${escHtml(path.description)}</div>`;

        vocabsInPath.forEach(v => {
          const mastery = _vocabDataCache[v.id]
            ? VocabMastery.getMastery(v.id, _vocabDataCache[v.id])
            : { mastered: 0, total: v.wordCount || 0, pct: 0 };
          const unlock = VocabMastery.isUnlocked(v, data.vocabularies, _vocabDataCache);

          if (unlock.unlocked) {
            const checked = v.id === currentId ? 'checked' : '';
            html += `
              <label class="builtin-vocab-item">
                <input type="radio" name="builtinVocab" value="${v.id}" ${checked} />
                <div class="builtin-vocab-card">
                  <div class="builtin-vocab-card-row">
                    <div class="builtin-vocab-name">${escHtml(v.nameCn || v.name)}</div>
                  </div>
                  <div class="builtin-vocab-meta">
                    <span class="builtin-vocab-level">${escHtml(v.name)}</span>
                    <span class="builtin-vocab-desc">${escHtml(v.description)}</span>
                  </div>
                  <div class="builtin-vocab-progress-bar">
                    <div class="builtin-vocab-progress-fill" style="width:${mastery.pct}%"></div>
                  </div>
                  <div class="builtin-vocab-progress-label">${mastery.mastered}/${mastery.total}·${mastery.pct}%</div>
                </div>
              </label>
            `;
          } else {
            // 未解锁
            html += `
              <div class="builtin-vocab-item builtin-vocab-locked">
                <div class="builtin-vocab-card">
                  <div class="builtin-vocab-card-row">
                    <span class="builtin-vocab-lock-icon">🔒</span>
                    <span class="builtin-vocab-name">${escHtml(v.nameCn || v.name)}</span>
                    <span class="builtin-vocab-level">${escHtml(v.name)}</span>
                  </div>
                  <div class="builtin-vocab-lock-reason">${escHtml(unlock.reason)}</div>
                </div>
              </div>
            `;
          }
        });

        html += '</div>';
      });
    }

    html += '</div>'; // builtinPathView

    // v6.0: 自由模式视图
    html += '<div id="builtinFreeView" class="builtin-free-view" style="display:none">';
    data.vocabularies.forEach(v => {
      const mastery = _vocabDataCache[v.id]
        ? VocabMastery.getMastery(v.id, _vocabDataCache[v.id])
        : { mastered: 0, total: v.wordCount || 0, pct: 0 };
      const checked = v.id === currentId ? 'checked' : '';
      html += `
        <label class="builtin-vocab-item">
          <input type="radio" name="builtinVocab" value="${v.id}" ${checked} />
          <div class="builtin-vocab-card">
            <div class="builtin-vocab-name">${escHtml(v.nameCn || v.name)}</div>
            <div class="builtin-vocab-meta">
              <span class="builtin-vocab-level">${escHtml(v.name)}</span>
              <span class="builtin-vocab-desc">${escHtml(v.description)}</span>
            </div>
            <div class="builtin-vocab-progress-bar">
              <div class="builtin-vocab-progress-fill" style="width:${mastery.pct}%"></div>
            </div>
            <div class="builtin-vocab-progress-label">掌握 ${mastery.mastered}/${mastery.total}·${mastery.pct}%</div>
          </div>
        </label>
      `;
    });
    html += '</div>'; // builtinFreeView

    listEl.innerHTML = html;

    // 绑定视图切换
    const toggleBtns = document.getElementById('builtinViewToggle');
    if (toggleBtns) {
      toggleBtns.querySelectorAll('.builtin-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          toggleBtns.querySelectorAll('.builtin-view-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const view = btn.dataset.view;
          const pathView = document.getElementById('builtinPathView');
          const freeView = document.getElementById('builtinFreeView');
          if (pathView) pathView.style.display = view === 'path' ? '' : 'none';
          if (freeView) freeView.style.display = view === 'free' ? '' : 'none';
        });
      });
    }

  } catch (err) {
    listEl.innerHTML = `<p class="form-hint" style="color:var(--color-danger)">Failed to load: ${escHtml(err.message)}</p>`;
  }
}

/**
 * v6.0: 预加载所有词库数据
 */
async function preloadAllVocabData(vocabularies) {
  const promises = vocabularies.map(async (v) => {
    if (_vocabDataCache[v.id]) return;
    try {
      const resp = await fetch(`vocabulary/${v.id}.json`);
      if (resp.ok) {
        _vocabDataCache[v.id] = await resp.json();
      }
    } catch (_) {}
  });
  await Promise.all(promises);
}

/**
 * Load vocabulary data for a given vocab ID
 * @param {string} vocabId - e.g. 'cet4'
 */
async function loadBuiltinVocabData(vocabId) {
  try {
    const resp = await fetch(`vocabulary/${vocabId}.json`);
    if (!resp.ok) throw new Error(`Failed to load ${vocabId}.json`);
    const data = await resp.json();
    State.builtinVocabData = data;
    State.builtinVocabId = vocabId;
    console.log(`Loaded ${data.length} words from ${vocabId}`);
  } catch (err) {
    console.error('Failed to load built-in vocab:', err);
    showToast('Failed to load vocabulary data: ' + err.message, 'error');
  }
}

/* =========================================================
   DIFFICULT WORDS — From SM-2 quality history (v3.0)
   ========================================================= */
function getDifficultWords() {
  const pool = ReviewPool.getAll();
  const wordErrors = [];
  pool.forEach(entry => {
    if (entry.qualityHistory && entry.qualityHistory.length > 0) {
      const errors = entry.qualityHistory.filter(q => q < 3).length;
      if (errors > 0) {
        wordErrors.push({ word: entry.word, errorCount: errors });
      }
    }
  });
  wordErrors.sort((a, b) => b.errorCount - a.errorCount);
  return wordErrors;
}

/* =========================================================
   Review — SM-2 Difficulty Buttons (override)
   ========================================================= */

/**
 * Enhanced review detail with SM-2 difficulty buttons
 */
function showSM2ReviewDetail(word) {
  const entry = ReviewPool.getWord(word);
  if (!entry) return;

  DOM.reviewList.innerHTML = '';

  const detailEl = document.createElement('div');
  detailEl.className = 'review-detail';

  // Get definition from cache
  let defText = '';
  const detail = State.wordDetails.find(d => d.word?.toLowerCase() === word.toLowerCase());
  if (detail && detail.definition) {
    defText = escHtml(detail.definition);
    if (detail.pronunciation) defText = `<span class="review-detail-pronunciation">${escHtml(detail.pronunciation)}</span><br>` + defText;
  } else {
    defText = 'Click a difficulty button to record your progress.';
  }

  detailEl.innerHTML = `
    <span class="review-detail-word">
      ${escHtml(entry.word)}
      <button class="review-detail-speak" data-word="${escHtml(entry.word)}">🔊</button>
    </span>
    <span class="review-detail-pronunciation">EF: ${entry.ef.toFixed(2)} | Rep: ${entry.repetition} | Interval: ${entry.interval}d</span>
    <p class="review-detail-def">${defText}</p>
    <div class="review-detail-actions">
      <button class="btn btn-sm2-again" data-quality="0">Again</button>
      <button class="btn btn-sm2-hard" data-quality="2">Hard</button>
      <button class="btn btn-sm2-good" data-quality="4">Good</button>
      <button class="btn btn-sm2-easy" data-quality="5">Easy</button>
    </div>
  `;

  DOM.reviewList.appendChild(detailEl);

  // Wire up speak
  detailEl.querySelector('.review-detail-speak')?.addEventListener('click', () => {
    TTS.speakWord(entry.word);
  });

  // Wire up difficulty buttons
  detailEl.querySelectorAll('.review-detail-actions .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const quality = parseInt(btn.dataset.quality, 10);
      ReviewPool.review(entry.word, quality);

      const qualityLabels = { 0: 'Again', 2: 'Hard', 4: 'Good', 5: 'Easy' };
      showToast(`Marked as "${qualityLabels[quality]}" — next review scheduled.`, 'success');

      // Refresh the review list
      openReviewScreen();
    });
  });
}

/* =========================================================
   Reading Mode
   ========================================================= */

function openReadingMode() {
  State.readingExtractedWords = [];
  State.readingUnknownWords = [];
  State.readingUnknownSet = new Set();
  DOM.readingInputArea.style.display = 'block';
  DOM.readingArticleArea.style.display = 'none';
  DOM.readingTextarea.value = '';
  DOM.readingWordCount.textContent = '';
  // v5.5: Route through Practice screen
  if (typeof Practice !== 'undefined' && Practice.showTab) {
    Practice.showTab('reading');
  } else {
    showScreen('reading');
  }
}

async function handleExtractWords() {
  const text = DOM.readingTextarea.value.trim();
  if (!text) {
    showToast('Please paste an article first.', 'error');
    return;
  }

  // Extract words
  const allWords = extractWordsFromText(text);
  State.readingExtractedWords = allWords;

  if (allWords.length === 0) {
    showToast('No English words found in the text.', 'info');
    return;
  }

  // Build vocab lookup from built-in data
  let vocabLookup = new Map();
  if (State.builtinVocabData && Array.isArray(State.builtinVocabData)) {
    vocabLookup = buildVocabLookup(State.builtinVocabData);
  }

  // Build known word set from review pool
  const knownWords = new Set();
  const masteredWords = ReviewPool.getMasteredWords();
  masteredWords.forEach(e => knownWords.add(e.word));

  // Find unknown words
  const { unknown, details } = findUnknownWords(allWords, vocabLookup, knownWords);
  State.readingUnknownWords = unknown;
  State.readingUnknownSet = new Set(unknown.map(w => w.toLowerCase()));

  // Try to fetch definitions from API or from vocab data
  const wordDetails = [];
  unknown.forEach(w => {
    const lower = w.toLowerCase();
    // Check built-in vocab first
    const fromBuiltin = vocabLookup.get(lower);
    if (fromBuiltin) {
      wordDetails.push(fromBuiltin);
    } else {
      wordDetails.push({ word: w, pronunciation: '', partOfSpeech: '', definition: '', chineseDef: '', example: '' });
    }
  });

  // Try API fallback if key available
  const apiKey = Settings.getApiKey();
  if (apiKey) {
    const missingDefs = unknown.filter((w, i) => !wordDetails[i]?.definition);
    if (missingDefs.length > 0) {
      try {
        const apiDefs = await fetchDefinitionsFromAPI(apiKey, missingDefs);
        apiDefs.forEach(def => {
          const idx = unknown.findIndex(w => w.toLowerCase() === def.word?.toLowerCase());
          if (idx >= 0) wordDetails[idx] = def;
        });
      } catch (_) {}
    }
  }

  // Render article with highlights
  const articleHTML = renderArticleWithHighlights(text, State.readingUnknownSet);
  DOM.readingArticle.innerHTML = articleHTML;

  // Render word list
  renderReadingWordList(unknown, wordDetails);

  // Show counts
  DOM.readingWordCount.textContent = `${allWords.length} words extracted`;
  DOM.readingExtractedCount.textContent = `${unknown.length} new`;

  // v6.0: Badge check for reading
  _trackUsedMode('reading');
  checkBadges({ action: 'reading' });

  // Switch to article view
  DOM.readingInputArea.style.display = 'none';
  DOM.readingArticleArea.style.display = 'block';

  // Wire up click handlers for unknown words
  DOM.readingArticle.querySelectorAll('.reading-unknown-word').forEach(el => {
    el.addEventListener('click', (e) => {
      const word = el.dataset.word;
      const idx = unknown.findIndex(w => w.toLowerCase() === word);
      const detail = idx >= 0 ? wordDetails[idx] : null;
      showReadingPopup(e, word, detail);
    });
  });
}

function renderReadingWordList(unknownWords, wordDetails) {
  const listEl = DOM.readingWords;
  listEl.innerHTML = unknownWords.map((w, i) => {
    const d = wordDetails[i] || {};
    const def = d.chineseDef || d.definition || '';
    return `<div class="reading-word-item" data-word="${escHtml(w)}">
      <span class="reading-word-text">${escHtml(w)}</span>
      ${d.pronunciation ? `<span class="reading-word-phonetic">${escHtml(d.pronunciation)}</span>` : ''}
      <span class="reading-word-def">${escHtml(def)}</span>
      <button class="btn btn-sm btn-ghost reading-word-add" data-word="${escHtml(w)}">+</button>
    </div>`;
  }).join('');

  // Wire up add buttons
  listEl.querySelectorAll('.reading-word-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const word = btn.dataset.word;
      ReviewPool.addWord(word);
      btn.textContent = '✓';
      btn.style.color = 'var(--color-success)';
      showToast(`Added "${word}" to review pool.`, 'success');
    });
  });
}

function showReadingPopup(event, word, detail) {
  // Remove any existing popup
  document.querySelectorAll('.reading-popup').forEach(p => p.remove());

  const popup = document.createElement('div');
  popup.className = 'reading-popup';
  popup.innerHTML = renderWordPopup(word, detail);

  // Position near the clicked word
  const rect = event.target.getBoundingClientRect();
  popup.style.position = 'fixed';
  popup.style.left = Math.min(rect.left, window.innerWidth - 320) + 'px';
  popup.style.top = (rect.bottom + 8) + 'px';

  document.body.appendChild(popup);

  // Wire up add button
  popup.querySelector('.reading-popup-add')?.addEventListener('click', () => {
    const w = popup.querySelector('.reading-popup-add').dataset.word;
    ReviewPool.addWord(w);
    showToast(`Added "${w}" to review pool.`, 'success');
    popup.remove();
  });

  // Close on click outside
  setTimeout(() => {
    document.addEventListener('click', function closePopup(e) {
      if (!popup.contains(e.target)) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    });
  }, 10);
}

function handleReadingAddAll() {
  if (State.readingUnknownWords.length === 0) {
    showToast('No unknown words to add.', 'info');
    return;
  }
  ReviewPool.addWords(State.readingUnknownWords);
  showToast(`Added ${State.readingUnknownWords.length} words to review pool.`, 'success');

  // Update button states
  DOM.readingWords.querySelectorAll('.reading-word-add').forEach(btn => {
    btn.textContent = '✓';
    btn.style.color = 'var(--color-success)';
  });
}

/* =========================================================
   听写模式 — Dictation
   ========================================================= */

/**
 * 打开听写模式
 */
function openDictationScreen() {
  State.dictationState = null;
  // v5.5: Route through Practice screen
  if (typeof Practice !== 'undefined' && Practice.showTab) {
    Practice.showTab('dictation');
  } else {
    showScreen('dictation');
  }
  renderDictationModeSelect();
}

/**
 * 渲染听写模式选择（从哪些词出题）
 */
function renderDictationModeSelect() {
  const content = DOM.dictationContent;
  DOM.dictationScore.textContent = '0 / 10';

  const familiar = Session.getFamiliarWords();
  const unfamiliar = Session.getUnfamiliarWords();
  const allSessionWords = [...new Set([...familiar, ...unfamiliar])];

  // 加入当前批次词
  State.currentWords.forEach(w => {
    if (!allSessionWords.includes(w)) allSessionWords.push(w);
  });

  if (allSessionWords.length < 4) {
    content.innerHTML = `
      <div class="review-empty">
        <div class="review-empty-icon">🎧</div>
        <p>Not enough words yet!</p>
        <p>Complete a batch first to build up your word pool.</p>
        <button class="btn btn-primary" onclick="showScreen('welcome')">← Back</button>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="quiz-mode-select">
      <h3>Dictation Practice</h3>
      <p>Listen to the word, then type what you hear.</p>
      <div class="quiz-mode-options">
        <button class="quiz-mode-btn" data-source="all">
          <span class="mode-icon">📚</span>
          <span class="mode-info">
            <strong>All Session Words</strong>
            <span>${allSessionWords.length} words from today's sessions</span>
          </span>
        </button>
        <button class="quiz-mode-btn" data-source="unfamiliar">
          <span class="mode-icon">✗</span>
          <span class="mode-info">
            <strong>Unfamiliar Words Only</strong>
            <span>${unfamiliar.length} words you marked as unknown</span>
          </span>
        </button>
        <button class="quiz-mode-btn" data-source="review">
          <span class="mode-icon">🔄</span>
          <span class="mode-info">
            <strong>Review Pool</strong>
            <span>${ReviewPool.getTotalCount()} words in your review pool</span>
          </span>
        </button>
      </div>
    </div>
  `;

  content.querySelectorAll('.quiz-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => startDictation(btn.dataset.source));
  });
}

/**
 * 开始听写
 * @param {string} source - 'all' | 'unfamiliar' | 'review'
 */
function startDictation(source) {
  let words = [];
  switch (source) {
    case 'all':
      words = [...new Set([...Session.getFamiliarWords(), ...Session.getUnfamiliarWords()])];
      State.currentWords.forEach(w => { if (!words.includes(w)) words.push(w); });
      break;
    case 'unfamiliar':
      words = Session.getUnfamiliarWords();
      break;
    case 'review':
      words = ReviewPool.getAll().map(e => e.word);
      break;
    default:
      words = [...new Set([...Session.getFamiliarWords(), ...Session.getUnfamiliarWords()])];
  }

  const detailData = buildDictationDetailData();
  const questions = generateDictation(words, detailData, 10);

  if (questions.length === 0) {
    showToast('No words available for dictation.', 'error');
    return;
  }

  State.dictationState = {
    questions,
    currentIndex: 0,
    score: 0,
    wrongWords: [],
  };

  renderDictationQuestion(0);
}

/**
 * 构建听写用的 detail 数据
 */
function buildDictationDetailData() {
  // 从 State 和缓存获取
  const data = [];
  if (State.wordDetails && Array.isArray(State.wordDetails)) {
    State.wordDetails.forEach(d => data.push(d));
  }
  try {
    const cached = JSON.parse(localStorage.getItem('vocab_detail_cache') || 'null');
    if (cached && Array.isArray(cached.data)) {
      const existingWords = new Set(data.map(d => d.word?.toLowerCase()));
      cached.data.forEach(d => {
        if (d.word && !existingWords.has(d.word.toLowerCase())) {
          data.push(d);
          existingWords.add(d.word.toLowerCase());
        }
      });
    }
  } catch (_) {}
  return data;
}

/**
 * 渲染当前听写题目
 */
function renderDictationQuestion(index) {
  const ds = State.dictationState;
  if (!ds || index >= ds.questions.length) {
    renderDictationResult();
    return;
  }

  ds.currentIndex = index;
  const question = ds.questions[index];
  const total = ds.questions.length;

  DOM.dictationScore.textContent = `${ds.score} / ${total}`;

  // Progress bar
  let progressHTML = '';
  for (let i = 0; i < total; i++) {
    let cls = 'quiz-progress-dot';
    if (i < index) cls += ' done';
    else if (i === index) cls += ' current';
    progressHTML += `<span class="${cls}"></span>`;
  }

  DOM.dictationContent.innerHTML = `
    <div class="quiz-progress-bar">${progressHTML}</div>
    <div class="dictation-question">
      <div class="dictation-prompt">
        <p class="dictation-hint">Listen to the word, then type it below:</p>
        <button class="btn btn-primary dictation-speak-btn" id="dictationPlayBtn">🔊 Play Word</button>
      </div>
      <div class="quiz-spelling-input">
        <input type="text" id="dictationInput" placeholder="Type the word you heard..." autocomplete="off" autofocus />
        <button class="btn btn-primary" id="dictationSubmit">Submit</button>
      </div>
      <div id="dictationFeedback"></div>
    </div>
  `;

  // Auto-play the word
  const autoPlay = setTimeout(() => {
    TTS.speakWord(question.word);
  }, 400);

  // Wire up play button
  DOM.dictationContent.querySelector('#dictationPlayBtn').addEventListener('click', () => {
    TTS.speakWord(question.word);
  });

  // Wire up input
  const input = DOM.dictationContent.querySelector('#dictationInput');
  input.focus();

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleDictationAnswer();
    }
  });

  DOM.dictationContent.querySelector('#dictationSubmit').addEventListener('click', handleDictationAnswer);
}

/**
 * 处理听写答案
 */
function handleDictationAnswer() {
  const ds = State.dictationState;
  if (!ds) return;

  const question = ds.questions[ds.currentIndex];
  const input = DOM.dictationContent.querySelector('#dictationInput');
  const userAnswer = input ? input.value : '';

  const isCorrect = checkDictationAnswer(userAnswer, question.word);
  const feedbackEl = DOM.dictationContent.querySelector('#dictationFeedback');

  if (isCorrect) {
    ds.score++;
    feedbackEl.innerHTML = `<div class="quiz-feedback correct">✓ Correct! <strong>${escHtml(question.word)}</strong></div>`;
  } else {
    ds.wrongWords.push(question.word);
    let feedback = `<div class="quiz-feedback wrong">✗ Incorrect. The word was: <strong>${escHtml(question.word)}</strong>`;

    // Check if close match
    if (isCloseMatch(userAnswer, question.word)) {
      feedback += `<br><span style="font-size:0.85rem">Close! You wrote: ${escHtml(userAnswer)}</span>`;
    }
    feedback += '</div>';
    feedbackEl.innerHTML = feedback;
  }

  // Add definition/pronunciation info
  if (question.pronunciation || question.definition) {
    feedbackEl.innerHTML += `
      <div style="margin-top:8px;padding:8px 12px;background:var(--color-surface-2);border-radius:6px;font-size:0.85rem">
        ${question.pronunciation ? `<span style="color:var(--color-text-muted)">${escHtml(question.pronunciation)}</span><br>` : ''}
        ${question.definition ? `<span>${escHtml(question.definition)}</span>` : ''}
        ${question.chineseDef ? `<br><span style="color:var(--color-text-muted)">${escHtml(question.chineseDef)}</span>` : ''}
      </div>
    `;
  }

  // Disable input
  if (input) input.disabled = true;
  DOM.dictationContent.querySelector('#dictationSubmit').disabled = true;
  DOM.dictationContent.querySelector('#dictationPlayBtn')?.remove();

  const total = ds.questions.length;
  DOM.dictationScore.textContent = `${ds.score} / ${total}`;

  // Update progress dots
  const dots = DOM.dictationContent.querySelectorAll('.quiz-progress-dot');
  if (dots[ds.currentIndex]) {
    dots[ds.currentIndex].classList.remove('current');
    dots[ds.currentIndex].classList.add(isCorrect ? 'correct' : 'wrong');
  }

  // Auto-advance after brief delay
  const speakBtn = document.createElement('button');
  setTimeout(() => {
    renderDictationQuestion(ds.currentIndex + 1);
  }, 1500);
}

/**
 * 渲染听写结果
 */
function renderDictationResult() {
  const ds = State.dictationState;
  if (!ds) return;

  const total = ds.questions.length;
  const pct = total > 0 ? Math.round((ds.score / total) * 100) : 0;

  // Add wrong words to review pool
  if (ds.wrongWords.length > 0) {
    ReviewPool.addWords(ds.wrongWords);
  }

  let wrongListHTML = '';
  if (ds.wrongWords.length > 0) {
    wrongListHTML = `
      <div class="quiz-wrong-list">
        <h4>✗ Missed Words (${ds.wrongWords.length})</h4>
        ${ds.wrongWords.map(w => `
          <div class="quiz-wrong-word">
            <span class="wrong-word">${escHtml(w)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  DOM.dictationContent.innerHTML = `
    <div class="quiz-result">
      <span class="quiz-result-score">${ds.score}/${total}</span>
      <span class="quiz-result-label">${pct >= 80 ? '🌟 Great listening skills!' : pct >= 50 ? '👍 Keep practicing!' : '💪 More practice needed!'}</span>
      <div class="quiz-result-actions">
        <button class="btn btn-primary" id="dictationRetry">Try Again</button>
        <button class="btn btn-secondary" id="dictationBack">Back</button>
      </div>
      ${wrongListHTML}
      ${ds.wrongWords.length > 0 ? '<p style="color: var(--color-text-muted); font-size: 0.82rem; margin-top: 12px;">Missed words have been added to your review pool.</p>' : ''}
    </div>
  `;

  DOM.dictationScore.textContent = `${ds.score} / ${total}`;

  _trackUsedMode('dictation');
  // v6.0: Badge check
  checkBadges({ action: 'quiz', score: ds.score, total: ds.questions.length });

  document.getElementById('dictationRetry')?.addEventListener('click', openDictationScreen);
  document.getElementById('dictationBack')?.addEventListener('click', () => showScreen('done'));
}

/* =========================================================
   完形填空模式 — Cloze
   ========================================================= */

/**
 * 打开完形填空模式
 */
function openClozeScreen() {
  State.clozeState = null;
  // v5.5: Route through Practice screen
  if (typeof Practice !== 'undefined' && Practice.showTab) {
    Practice.showTab('cloze');
  } else {
    showScreen('cloze');
  }
  renderClozeModeSelect();
}

/**
 * 渲染完形填空模式选择
 */
function renderClozeModeSelect() {
  const content = DOM.clozeContent;
  DOM.clozeScore.textContent = '0 / 10';

  const familiar = Session.getFamiliarWords();
  const unfamiliar = Session.getUnfamiliarWords();
  const allSessionWords = [...new Set([...familiar, ...unfamiliar])];

  State.currentWords.forEach(w => {
    if (!allSessionWords.includes(w)) allSessionWords.push(w);
  });

  if (allSessionWords.length < 4) {
    content.innerHTML = `
      <div class="review-empty">
        <div class="review-empty-icon">📝</div>
        <p>Not enough words yet!</p>
        <p>Complete a batch first to build up your word pool.</p>
        <button class="btn btn-primary" onclick="showScreen('welcome')">← Back</button>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="quiz-mode-select">
      <h3>Cloze (Fill-in-the-Blank)</h3>
      <p>Complete the sentence by choosing the correct word.</p>
      <div class="quiz-mode-options">
        <button class="quiz-mode-btn" data-source="all">
          <span class="mode-icon">📚</span>
          <span class="mode-info">
            <strong>All Session Words</strong>
            <span>${allSessionWords.length} words from today's sessions</span>
          </span>
        </button>
        <button class="quiz-mode-btn" data-source="unfamiliar">
          <span class="mode-icon">✗</span>
          <span class="mode-info">
            <strong>Unfamiliar Words Only</strong>
            <span>${unfamiliar.length} words you marked as unknown</span>
          </span>
        </button>
        <button class="quiz-mode-btn" data-source="review">
          <span class="mode-icon">🔄</span>
          <span class="mode-info">
            <strong>Review Pool</strong>
            <span>${ReviewPool.getTotalCount()} words in your review pool</span>
          </span>
        </button>
      </div>
    </div>
  `;

  content.querySelectorAll('.quiz-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => startCloze(btn.dataset.source));
  });
}

/**
 * 开始完形填空
 * @param {string} source
 */
function startCloze(source) {
  let words = [];
  switch (source) {
    case 'all':
      words = [...new Set([...Session.getFamiliarWords(), ...Session.getUnfamiliarWords()])];
      State.currentWords.forEach(w => { if (!words.includes(w)) words.push(w); });
      break;
    case 'unfamiliar':
      words = Session.getUnfamiliarWords();
      break;
    case 'review':
      words = ReviewPool.getAll().map(e => e.word);
      break;
    default:
      words = [...new Set([...Session.getFamiliarWords(), ...Session.getUnfamiliarWords()])];
  }

  const detailData = buildDictationDetailData();
  const questions = generateCloze(words, detailData, 10);

  if (questions.length === 0) {
    showToast('Not enough words with example sentences for cloze exercises.', 'error');
    return;
  }

  State.clozeState = {
    questions,
    currentIndex: 0,
    score: 0,
    wrongWords: [],
  };

  renderClozeQuestion(0);
}

/**
 * 渲染当前完形填空题目
 */
function renderClozeQuestion(index) {
  const cs = State.clozeState;
  if (!cs || index >= cs.questions.length) {
    renderClozeResult();
    return;
  }

  cs.currentIndex = index;
  const question = cs.questions[index];
  const total = cs.questions.length;

  DOM.clozeScore.textContent = `${cs.score} / ${total}`;

  // Progress bar
  let progressHTML = '';
  for (let i = 0; i < total; i++) {
    let cls = 'quiz-progress-dot';
    if (i < index) cls += ' done';
    else if (i === index) cls += ' current';
    progressHTML += `<span class="${cls}"></span>`;
  }

  DOM.clozeContent.innerHTML = `
    <div class="quiz-progress-bar">${progressHTML}</div>
    <div class="cloze-question">
      <div class="cloze-sentence">${escHtml(question.sentence)}</div>
      <div class="cloze-definition">${escHtml(question.definition)}${question.chineseDef ? '<br><span style="color:var(--color-text-muted);font-size:0.85rem">' + escHtml(question.chineseDef) + '</span>' : ''}</div>
      <div class="cloze-options" id="clozeOptions">
        ${question.options.map((opt, i) => `
          <button class="quiz-option cloze-option" data-index="${i}" data-value="${escHtml(opt)}">
            ${String.fromCharCode(65 + i)}. ${escHtml(opt)}
          </button>
        `).join('')}
      </div>
      <div id="clozeFeedback"></div>
    </div>
  `;

  // Wire up option buttons
  const optionsContainer = document.getElementById('clozeOptions');
  if (optionsContainer) {
    optionsContainer.querySelectorAll('.cloze-option').forEach(btn => {
      btn.addEventListener('click', () => handleClozeAnswer(index, parseInt(btn.dataset.index), question));
    });
  }
}

/**
 * 处理完形填空答案
 */
function handleClozeAnswer(index, selectedIdx, question) {
  const cs = State.clozeState;
  if (!cs || index !== cs.currentIndex) return;

  const isCorrect = selectedIdx === question.correctIndex;
  const feedbackEl = document.getElementById('clozeFeedback');
  const options = document.querySelectorAll('.cloze-option');

  if (isCorrect) {
    cs.score++;
    feedbackEl.innerHTML = `<div class="quiz-feedback correct">✓ Correct!</div>`;
  } else {
    cs.wrongWords.push(question.blankWord);
    feedbackEl.innerHTML = `<div class="quiz-feedback wrong">✗ Incorrect. The correct answer was: <strong>${escHtml(question.blankWord)}</strong></div>`;
  }

  // Show correct/wrong on options
  options.forEach(btn => {
    const idx = parseInt(btn.dataset.index);
    if (idx === question.correctIndex) {
      btn.classList.add('correct');
    } else if (idx === selectedIdx && !isCorrect) {
      btn.classList.add('wrong');
    }
    btn.disabled = true;
  });

  // Update progress dots
  const dots = DOM.clozeContent.querySelectorAll('.quiz-progress-dot');
  if (dots[index]) {
    dots[index].classList.remove('current');
    dots[index].classList.add(isCorrect ? 'correct' : 'wrong');
  }

  DOM.clozeScore.textContent = `${cs.score} / ${cs.questions.length}`;

  // Show original example sentence if available
  if (question.example && !isCorrect) {
    feedbackEl.innerHTML += `
      <div style="margin-top:8px;padding:8px 12px;background:var(--color-surface-2);border-radius:6px;font-size:0.85rem;color:var(--color-text-muted);font-style:italic">
        Original: "${escHtml(question.example)}"
      </div>
    `;
  }

  setTimeout(() => {
    renderClozeQuestion(index + 1);
  }, 1200);
}

/**
 * 渲染完形填空结果
 */
function renderClozeResult() {
  const cs = State.clozeState;
  if (!cs) return;

  const total = cs.questions.length;
  const pct = total > 0 ? Math.round((cs.score / total) * 100) : 0;

  // Add wrong words to review pool
  if (cs.wrongWords.length > 0) {
    ReviewPool.addWords(cs.wrongWords);
  }

  let wrongListHTML = '';
  if (cs.wrongWords.length > 0) {
    wrongListHTML = `
      <div class="quiz-wrong-list">
        <h4>✗ Missed Words (${cs.wrongWords.length})</h4>
        ${cs.wrongWords.map(w => `
          <div class="quiz-wrong-word">
            <span class="wrong-word">${escHtml(w)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  DOM.clozeContent.innerHTML = `
    <div class="quiz-result">
      <span class="quiz-result-score">${cs.score}/${total}</span>
      <span class="quiz-result-label">${pct >= 80 ? '🌟 Great reading comprehension!' : pct >= 50 ? '👍 Keep practicing!' : '💪 More practice needed!'}</span>
      <div class="quiz-result-actions">
        <button class="btn btn-primary" id="clozeRetry">Try Again</button>
        <button class="btn btn-secondary" id="clozeBack">Back</button>
      </div>
      ${wrongListHTML}
      ${cs.wrongWords.length > 0 ? '<p style="color: var(--color-text-muted); font-size: 0.82rem; margin-top: 12px;">Missed words have been added to your review pool.</p>' : ''}
    </div>
  `;

  DOM.clozeScore.textContent = `${cs.score} / ${total}`;

  _trackUsedMode('cloze');
  // v6.0: Badge check
  checkBadges({ action: 'quiz', score: cs.score, total: cs.questions.length });

  document.getElementById('clozeRetry')?.addEventListener('click', openClozeScreen);
  document.getElementById('clozeBack')?.addEventListener('click', () => showScreen('done'));
}

/* =========================================================
   Anki Export — UI Modal
   ========================================================= */

/**
 * 显示 Anki 导出选择 Modal
 */
function showAnkiExportModal() {
  // Create modal dynamically
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) backdrop.remove();
  });

  const familiarCount = Session.getFamiliarWords().length;
  const unfamiliarCount = Session.getUnfamiliarWords().length;
  const reviewCount = ReviewPool.getTotalCount();
  const batchCount = State.currentWords ? State.currentWords.length : 0;

  backdrop.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>📤 Export to Anki</h3>
        <button class="modal-close" id="closeAnkiExport">✕</button>
      </div>
      <div class="modal-body">
        <p style="margin-bottom:16px;color:var(--color-text-muted);font-size:0.85rem">
          Export vocabulary as a CSV file compatible with Anki.
          Import via <strong>File → Import</strong> in Anki desktop.
        </p>
        <div class="form-group">
          <label>Export Range</label>
          <div class="anki-export-options">
            <button class="btn anki-export-btn" data-range="unfamiliar" ${unfamiliarCount === 0 ? 'disabled' : ''}>
              ✗ Unfamiliar Words (${unfamiliarCount})
            </button>
            <button class="btn anki-export-btn" data-range="familiar" ${familiarCount === 0 ? 'disabled' : ''}>
              ✓ Familiar Words (${familiarCount})
            </button>
            <button class="btn anki-export-btn" data-range="sessionAll">
              📅 Today's Session (${familiarCount + unfamiliarCount})
            </button>
            <button class="btn anki-export-btn" data-range="reviewPool" ${reviewCount === 0 ? 'disabled' : ''}>
              🗂 Review Pool (${reviewCount})
            </button>
            <button class="btn anki-export-btn" data-range="batch" ${batchCount === 0 ? 'disabled' : ''}>
              📄 Current Batch (${batchCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  document.getElementById('closeAnkiExport')?.addEventListener('click', () => backdrop.remove());

  backdrop.querySelectorAll('.anki-export-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const range = btn.dataset.range;
      exportToAnki({ range });
      backdrop.remove();
    });
  });
}

/* =========================================================
   WebDAV Sync — Event Handlers
   ========================================================= */

/**
 * 初始化同步配置（从本地存储加载）
 */
function initSync() {
  const syncCfg = SyncSettings.getAll();
  DOM.inputSyncUrl.value = syncCfg.url;
  DOM.inputSyncUser.value = syncCfg.username;
  DOM.inputSyncPass.value = syncCfg.password;
  DOM.inputAutoSync.checked = syncCfg.autoSync;

  if (syncCfg.url) {
    SyncClient.configure(syncCfg.url, syncCfg.username, syncCfg.password);
    DOM.syncStatus.textContent = SyncSettings.getFormattedLastSync();
    if (syncCfg.lastSyncStatus === 'error') {
      DOM.syncStatus.style.color = 'var(--color-danger)';
    } else {
      DOM.syncStatus.style.color = '';
    }
  }
}

/**
 * 保存同步设置
 */
function saveSyncSettings() {
  const url = DOM.inputSyncUrl.value.trim();
  const username = DOM.inputSyncUser.value.trim();
  const password = DOM.inputSyncPass.value;
  const autoSync = DOM.inputAutoSync.checked;

  SyncSettings.saveAll({ url, username, password, autoSync });

  if (url) {
    SyncClient.configure(url, username, password);
  }
}

/**
 * 测试 WebDAV 连接
 */
async function handleSyncTest() {
  saveSyncSettings();

  if (!DOM.inputSyncUrl.value.trim()) {
    showToast('Please enter a WebDAV server URL first.', 'error');
    return;
  }

  DOM.syncStatus.textContent = 'Testing connection...';
  DOM.syncStatus.style.color = 'var(--color-text-muted)';

  const result = await SyncClient.testConnection();

  if (result.ok) {
    DOM.syncStatus.textContent = '✅ ' + result.message;
    DOM.syncStatus.style.color = 'var(--color-success)';
    showToast('WebDAV connection successful!', 'success');
    // v6.0: Badge for sync
    checkBadges({ action: 'sync' });
    setTimeout(updateBadgesSection, 1000);
  } else {
    DOM.syncStatus.textContent = '❌ ' + result.message;
    DOM.syncStatus.style.color = 'var(--color-danger)';
    showToast('WebDAV connection failed: ' + result.message, 'error');
  }
}

/**
 * 上传数据到 WebDAV
 */
async function handleSyncPush() {
  saveSyncSettings();

  if (!DOM.inputSyncUrl.value.trim()) {
    showToast('Please configure WebDAV settings first.', 'error');
    return;
  }

  DOM.syncStatus.textContent = 'Uploading data...';
  DOM.syncStatus.style.color = 'var(--color-text-muted)';

  const result = await SyncClient.push();

  if (result.ok) {
    DOM.syncStatus.textContent = '✅ ' + result.message;
    DOM.syncStatus.style.color = 'var(--color-success)';
    showToast('Data pushed to WebDAV server.', 'success');
  } else {
    DOM.syncStatus.textContent = '❌ ' + result.message;
    DOM.syncStatus.style.color = 'var(--color-danger)';
    showToast('Push failed: ' + result.message, 'error');
  }
}

/**
 * 从 WebDAV 拉取数据
 */
async function handleSyncPull() {
  saveSyncSettings();

  if (!DOM.inputSyncUrl.value.trim()) {
    showToast('Please configure WebDAV settings first.', 'error');
    return;
  }

  DOM.syncStatus.textContent = 'Downloading data...';
  DOM.syncStatus.style.color = 'var(--color-text-muted)';

  const result = await SyncClient.pull();

  if (result.ok) {
    DOM.syncStatus.textContent = '✅ ' + result.message;
    DOM.syncStatus.style.color = 'var(--color-success)';
    if (result.changed) {
      showToast('Data synced from server. Refreshing...', 'success');
      setTimeout(() => location.reload(), 1500);
    } else {
      showToast('No new data to sync.', 'info');
    }
  } else {
    DOM.syncStatus.textContent = '❌ ' + result.message;
    DOM.syncStatus.style.color = 'var(--color-danger)';
    showToast('Pull failed: ' + result.message, 'error');
  }
}

/**
 * 自动同步（在完成批次后调用）
 */
async function autoSyncIfEnabled() {
  if (!SyncSettings.getAutoSync()) return;
  const cfg = SyncSettings.getAll();
  if (!cfg.url) return;

  SyncClient.configure(cfg.url, cfg.username, cfg.password);

  try {
    await SyncClient.push();
    console.log('Auto-sync completed.');
  } catch (err) {
    console.warn('Auto-sync failed:', err);
  }
}

/* =========================================================
   v5.5 — Grid Skeleton
   ========================================================= */
function renderGridSkeleton() {
  DOM.wordGrid.innerHTML = '';
  const skeleton = document.createElement('div');
  skeleton.className = 'grid-skeleton';
  for (let i = 0; i < 20; i++) {
    const item = document.createElement('div');
    item.className = 'grid-skeleton-item';
    skeleton.appendChild(item);
  }
  DOM.wordGrid.appendChild(skeleton);
}

/* =========================================================
   v6.5 — Peek Popup (click→view, with full detail)
   ========================================================= */
let peekPopupWord = null;
let peekPopupVisible = false;

/**
 * v6.5: Show peek popup with complete word detail
 */
function showPeekPopup(e, word) {
  const popup = DOM.peekPopup;
  if (!popup) return;
  peekPopupWord = word;
  peekPopupVisible = true;

  // v7.5: Mobile bottom-sheet overlay
  const isMobile = window.innerWidth < 480;
  if (isMobile && !document.querySelector('.peek-bottom-sheet-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'peek-bottom-sheet-overlay';
    overlay.addEventListener('click', hidePeekPopup);
    document.body.appendChild(overlay);
  }

  const lower = word.toLowerCase();
  let detail = null;

  // Lookup detail from various sources
  if (State.builtinVocabData && Array.isArray(State.builtinVocabData)) {
    detail = State.builtinVocabData.find(d => d.word && d.word.toLowerCase() === lower);
  }
  if (!detail && State.wordDetails && Array.isArray(State.wordDetails)) {
    detail = State.wordDetails.find(d => d.word && d.word.toLowerCase() === lower);
  }
  if (!detail) {
    try {
      const cached = JSON.parse(localStorage.getItem('vocab_detail_cache') || '[]');
      detail = cached.find(d => d.word && d.word.toLowerCase() === lower);
    } catch (_) {}
  }

  // Populate fields
  if (DOM.peekWord) DOM.peekWord.textContent = word;
  if (DOM.peekPron) DOM.peekPron.textContent = (detail && detail.pronunciation) ? detail.pronunciation : '';
  if (DOM.peekPos) {
    DOM.peekPos.textContent = (detail && detail.partOfSpeech) ? detail.partOfSpeech : '';
    DOM.peekPos.style.display = (detail && detail.partOfSpeech) ? 'inline-block' : 'none';
  }
  if (DOM.peekDef) DOM.peekDef.textContent = (detail && detail.definition) ? detail.definition : '加载中...';
  if (DOM.peekChinese) DOM.peekChinese.textContent = (detail && detail.chineseDef) ? detail.chineseDef : '';

  // Collocation
  if (DOM.peekCollocation) {
    const coll = (detail && detail.collocation) || '';
    if (coll) {
      DOM.peekCollocation.textContent = coll;
      DOM.peekCollocation.style.display = 'block';
    } else {
      DOM.peekCollocation.style.display = 'none';
    }
  }

  // Example sentence with Chinese translation
  if (DOM.peekExample) {
    const ex = (detail && detail.example) || '';
    const exCn = (detail && detail.chineseDef) || '';
    if (ex) {
      DOM.peekExample.style.display = 'block';
      if (DOM.peekExampleEn) DOM.peekExampleEn.textContent = `"${ex}"`;
      if (DOM.peekExampleCn) DOM.peekExampleCn.textContent = exCn;
    } else {
      DOM.peekExample.style.display = 'none';
    }
  }

  // Position near click event
  let clientX, clientY;
  if (e.changedTouches) {
    clientX = e.changedTouches[0].clientX;
    clientY = e.changedTouches[0].clientY;
  } else {
    clientX = e.clientX || e.pageX || 0;
    clientY = e.clientY || e.pageY || 0;
  }

  popup.style.display = 'block';

  requestAnimationFrame(() => {
    const popupRect = popup.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = clientX - popupRect.width / 2;
    let top = clientY - popupRect.height - 16;

    if (left < 8) left = 8;
    if (left + popupRect.width > vw - 8) left = vw - popupRect.width - 8;
    if (top < 8) top = clientY + 16;
    if (top + popupRect.height > vh - 8) top = vh - popupRect.height - 8;

    popup.style.left = left + 'px';
    popup.style.top = top + 'px';

    // Position arrow
    const arrow = popup.querySelector('.peek-popup-arrow');
    if (arrow) {
      arrow.style.left = (clientX - left - 6) + 'px';
      arrow.style.top = (clientY > top + popupRect.height / 2) ? '-6px' : (popupRect.height - 6) + 'px';
    }
  });

  // No auto-hide — user closes by clicking close/outside/pressing buttons
}

function hidePeekPopup() {
  const popup = DOM.peekPopup;
  if (!popup) return;
  popup.style.display = 'none';
  peekPopupWord = null;
  peekPopupVisible = false;
  // v7.5: Remove bottom-sheet overlay
  const overlay = document.querySelector('.peek-bottom-sheet-overlay');
  if (overlay) overlay.remove();
}

/* =========================================================
   v6.5 — Memory Health Visualization
   ========================================================= */

/**
 * Render memory health bars for review words
 */
function renderMemoryHealth() {
  if (!DOM.reviewMemoryHealth || !DOM.memoryHealthBars) return;

  const pool = ReviewPool.getAll();
  const unmastered = pool.filter(e => e.status !== 'mastered');

  if (unmastered.length === 0) {
    DOM.reviewMemoryHealth.style.display = 'none';
    return;
  }

  DOM.reviewMemoryHealth.style.display = 'block';

  // Show health bars for up to the first 15 unmastered words
  const shown = unmastered.slice(0, 15);

  let html = '';
  shown.forEach(entry => {
    // Estimate retention rate using SM-2 formula
    // R = e^(-interval / (EF * 2))
    const ef = entry.ef || 2.5;
    const interval = entry.interval || 1;
    const retention = Math.exp(-interval / (ef * 2));
    const pct = Math.round(Math.min(100, Math.max(5, retention * 100)));

    let healthClass = 'high';
    if (pct < 40) healthClass = 'low';
    else if (pct < 65) healthClass = 'medium';

    html += `
      <div class="memory-health-bar-row">
        <span class="memory-health-bar-label">${escHtml(entry.word)}</span>
        <div class="memory-health-bar-track">
          <div class="memory-health-bar-fill ${healthClass}" style="width:${pct}%"></div>
        </div>
        <span class="memory-health-bar-pct">${pct}%</span>
      </div>
    `;
  });

  DOM.memoryHealthBars.innerHTML = html;
}

/* =========================================================
   v6.5 — Review 回顾 Panel
   ========================================================= */

/**
 * Show review回顾 after completing a review session
 * @param {object} stats - { total: number, correct: number, wrongWords: string[], nextDue: number }
 */
function showReviewReview(stats) {
  if (!DOM.reviewReviewBackdrop) return;

  const rate = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  DOM.reviewReviewCount.textContent = `本次复习：${stats.total} 词`;
  DOM.reviewReviewRate.textContent = `答对率：${rate}%`;

  if (stats.wrongWords && stats.wrongWords.length > 0) {
    DOM.reviewReviewWrong.style.display = 'block';
    DOM.reviewReviewWrongList.innerHTML = stats.wrongWords.map(w =>
      `<span class="review-review-wrong-item" data-word="${escHtml(w)}">${escHtml(w)}</span>`
    ).join('');

    // Click on wrong word shows detail
    DOM.reviewReviewWrongList.querySelectorAll('.review-review-wrong-item').forEach(el => {
      el.addEventListener('click', () => {
        DOM.reviewReviewBackdrop.style.display = 'none';
        showReviewDetail(el.dataset.word);
      });
    });
  } else {
    DOM.reviewReviewWrong.style.display = 'none';
  }

  DOM.reviewReviewNext.textContent = `下次复习：明天有 ${stats.nextDue || 0} 词到期`;

  DOM.reviewReviewBackdrop.style.display = 'flex';
}

function hideReviewReview() {
  if (DOM.reviewReviewBackdrop) DOM.reviewReviewBackdrop.style.display = 'none';
}

/* =========================================================
   v5.5 — Quick Test in Done Screen
   ========================================================= */
let _quickTestStarted = false;
let _quickTestState = null;

function startQuickTest() {
  if (!DOM.quickTestContent) return;

  const words = State.currentWords;
  if (words.length < 2) {
    DOM.quickTestContent.innerHTML = '<p style="color:var(--color-text-muted)">批次词太少，无法生成测验。</p>';
    return;
  }

  _quickTestStarted = true;

  let details = [];
  if (State.builtinVocabData && Array.isArray(State.builtinVocabData)) {
    details = State.builtinVocabData;
  }
  if (State.wordDetails && State.wordDetails.length > 0) {
    details = [...details, ...State.wordDetails];
  }

  const shuffled = shuffleArray(words);
  const selected = shuffled.slice(0, Math.min(5, shuffled.length));

  const detailMap = {};
  details.forEach(d => {
    if (d && d.word) detailMap[d.word.toLowerCase()] = d;
  });

  const questions = selected.map(word => {
    const detail = detailMap[word.toLowerCase()];
    const correctDef = detail ? (detail.definition || detail.chineseDef || word) : word;
    const distractors = [];
    const others = shuffleArray(words.filter(w => w.toLowerCase() !== word.toLowerCase()));
    for (const w of others) {
      if (distractors.length >= 3) break;
      const d = detailMap[w.toLowerCase()];
      const def = d ? (d.definition || d.chineseDef || w) : w;
      if (def !== correctDef && !distractors.includes(def)) {
        distractors.push(def);
      }
    }
    while (distractors.length < 3) {
      distractors.push('—');
    }
    const options = shuffleArray([correctDef, ...distractors]);
    return { word, correctAnswer: correctDef, options };
  });

  _quickTestState = {
    questions,
    currentIndex: 0,
    score: 0,
    wrongWords: [],
  };

  renderQuickTestQuestion();
}

function renderQuickTestQuestion() {
  const qs = _quickTestState;
  if (!qs || !DOM.quickTestContent) return;

  if (qs.currentIndex >= qs.questions.length) {
    renderQuickTestResult();
    return;
  }

  const q = qs.questions[qs.currentIndex];
  DOM.quickTestContent.innerHTML = `
    <div class="quick-test-question">
      <p class="quick-test-word">${escHtml(q.word)}</p>
      <p class="quick-test-prompt">选择正确的中文释义</p>
      <div class="quick-test-options">
        ${q.options.map((opt, i) => `
          <button class="quiz-option" data-value="${escHtml(opt)}">${escHtml(opt)}</button>
        `).join('')}
      </div>
      <div class="quick-test-feedback" id="quickTestFeedback"></div>
      <p class="quick-test-progress">${qs.currentIndex + 1} / ${qs.questions.length}</p>
    </div>
  `;

  DOM.quickTestContent.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => {
      handleQuickTestAnswer(q, btn.dataset.value);
    });
  });
}

function handleQuickTestAnswer(question, answer) {
  const qs = _quickTestState;
  if (!qs) return;

  const isCorrect = answer === question.correctAnswer;
  const feedbackEl = document.getElementById('quickTestFeedback');
  const options = DOM.quickTestContent.querySelectorAll('.quiz-option');

  if (isCorrect) {
    qs.score++;
    if (feedbackEl) feedbackEl.innerHTML = '<div class="quiz-feedback correct">✓ 正确！</div>';
  } else {
    qs.wrongWords.push(question.word);
    if (feedbackEl) {
      feedbackEl.innerHTML = `<div class="quiz-feedback wrong">✗ 错误。正确答案：${escHtml(question.correctAnswer)}</div>`;
    }
  }

  options.forEach(btn => {
    if (btn.dataset.value === question.correctAnswer) {
      btn.classList.add('correct');
    } else if (btn.dataset.value === answer && !isCorrect) {
      btn.classList.add('wrong');
    }
    btn.disabled = true;
  });

  setTimeout(() => {
    qs.currentIndex++;
    renderQuickTestQuestion();
  }, 1200);
}

function renderQuickTestResult() {
  const qs = _quickTestState;
  if (!qs || !DOM.quickTestContent || !DOM.quickTestResult) return;

  if (qs.wrongWords.length > 0) {
    ReviewPool.addWords(qs.wrongWords);
  }

  DOM.quickTestContent.innerHTML = '';
  DOM.quickTestResult.style.display = 'block';
  DOM.quickTestResult.innerHTML = `
    <p class="quick-test-score">得分：<strong>${qs.score}</strong> / ${qs.questions.length}</p>
    ${qs.wrongWords.length > 0
      ? `<p class="quick-test-missed">错词（${qs.wrongWords.length}）已加入复习池</p>`
      : '<p class="quick-test-missed" style="color:var(--color-success)">全部答对！🎉</p>'
    }
  `;
}

/* =========================================================
   Bootstrap
   ========================================================= */
document.addEventListener('DOMContentLoaded', init);
