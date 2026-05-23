/**
 * practice.js — Practice mode tab router
 *
 * Handles tab switching for: Quiz | Dictation | Cloze | Reading
 * All four modes share the same screen (screenPractice) and switch
 * via tab buttons.
 */

const Practice = {
  /** Currently active tab name */
  currentTab: 'quiz',

  /** Map of tab name → init function (called once on first switch) */
  _initialized: {},

  /**
   * Initialize practice tabs
   * Call once on app init
   */
  initTabs() {
    const tabs = document.querySelectorAll('.practice-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.tab;
        this.switchTab(mode);
      });
    });
  },

  /**
   * Switch to a practice tab
   * @param {string} mode - 'quiz' | 'dictation' | 'cloze' | 'reading'
   */
  switchTab(mode) {
    if (mode === this.currentTab) return;

    // Update tab buttons
    document.querySelectorAll('.practice-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === mode);
    });

    // Update panes
    document.querySelectorAll('.practice-pane').forEach(pane => {
      pane.style.display = pane.dataset.tab === mode ? '' : 'none';
    });

    this.currentTab = mode;

    // Init mode-specific content on first switch
    if (!this._initialized[mode]) {
      this._initialized[mode] = true;
      switch (mode) {
        case 'quiz':
          openQuizScreen();
          break;
        case 'dictation':
          openDictationScreen();
          break;
        case 'cloze':
          openClozeScreen();
          break;
        case 'reading':
          openReadingMode();
          break;
      }
    }
  },

  /**
   * Show practice screen with a specific tab active
   * @param {string} mode - tab name
   */
  showTab(mode) {
    // De-init so content refreshes
    this._initialized = {};
    this.currentTab = mode;

    // Show the practice screen
    showScreen('practice');

    // Activate the right tab
    document.querySelectorAll('.practice-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === mode);
    });

    document.querySelectorAll('.practice-pane').forEach(pane => {
      pane.style.display = pane.dataset.tab === mode ? '' : 'none';
    });

    // Call init
    this._initialized[mode] = true;
    switch (mode) {
      case 'quiz':
        openQuizScreen();
        break;
      case 'dictation':
        openDictationScreen();
        break;
      case 'cloze':
        openClozeScreen();
        break;
      case 'reading':
        openReadingMode();
        break;
    }
  },
};
