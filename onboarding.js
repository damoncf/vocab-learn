/**
 * onboarding.js — 首次使用引导屏 (v6.0)
 *
 * 三屏引导：
 *   屏1: 产品定位 "你掌控的单词学习工具"
 *   屏2: 核心交互 "不认识的点一下，认识的不用管"
 *   屏3: 选词库
 *
 * 首次加载且无 localStorage 标记时展示，之后不再展示。
 * 设置中保留"重新引导"入口。
 */

const ONBOARDING_KEY = 'vocab_onboarding_done';

const Onboarding = {
  /** 是否已展示过引导 */
  isDone() {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  },

  /** 标记已完成 */
  markDone() {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  },

  /** 重置（允许重新引导） */
  reset() {
    localStorage.removeItem(ONBOARDING_KEY);
  },

  /** 当前屏序号 */
  _current: 0,

  /** DOM 缓存 */
  _el: null,
  _slides: null,
  _dots: null,
  _nextBtn: null,
  _skipBtn: null,

  /** 词库选择回调 */
  _onComplete: null,

  /**
   * 显示引导屏
   * @param {function} onComplete - 用户选完词库后的回调
   */
  show(onComplete) {
    if (this.isDone()) return;
    this._current = 0;
    this._onComplete = onComplete || null;

    const existing = document.getElementById('onboardingOverlay');
    if (existing) existing.remove();

    // Build overlay DOM
    const overlay = document.createElement('div');
    overlay.id = 'onboardingOverlay';
    overlay.className = 'onboarding-overlay';
    overlay.innerHTML = `
      <div class="onboarding-card" id="onboardingCard">
        <div class="onboarding-slides" id="onboardingSlides">
          <!-- 屏 1: 产品定位 -->
          <div class="onboarding-slide active" data-slide="0">
            <div class="onboarding-icon">📚</div>
            <h2>VocabLearn</h2>
            <p class="onboarding-subtitle">你掌控的单词学习工具</p>
            <div class="onboarding-features">
              <span>你选词</span>
              <span>你定速</span>
              <span>你标记</span>
            </div>
          </div>

          <!-- 屏 2: 核心交互教学 -->
          <div class="onboarding-slide" data-slide="1">
            <div class="onboarding-icon">👆</div>
            <h2>不认识？点一下</h2>
            <div class="onboarding-demo-grid">
              <div class="onboarding-demo-chip">ephemeral</div>
              <div class="onboarding-demo-chip onboarding-demo-marked">momentous</div>
              <div class="onboarding-demo-chip">eloquent</div>
              <div class="onboarding-demo-chip">benevolent</div>
            </div>
            <p class="onboarding-desc">点击单词标记为不熟悉，<br>认识的不用管，自动算熟悉</p>
          </div>

          <!-- 屏 3: 选词库 -->
          <div class="onboarding-slide" data-slide="2">
            <div class="onboarding-icon">🎯</div>
            <h2>选一个词库开始</h2>
            <div class="onboarding-vocab-list" id="onboardingVocabList">
              <div class="onboarding-loading">
                <div class="spinner spinner-sm"></div>
                <span>加载词库中...</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部 -->
        <div class="onboarding-footer">
          <div class="onboarding-dots" id="onboardingDots">
            <span class="onboarding-dot active" data-dot="0"></span>
            <span class="onboarding-dot" data-dot="1"></span>
            <span class="onboarding-dot" data-dot="2"></span>
          </div>
          <div class="onboarding-actions">
            <button class="btn btn-ghost" id="onboardingSkip">跳过</button>
            <button class="btn btn-primary" id="onboardingNext">继续</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this._el = overlay;
    this._slides = overlay.querySelectorAll('.onboarding-slide');
    this._dots = overlay.querySelectorAll('.onboarding-dot');
    this._nextBtn = overlay.querySelector('#onboardingNext');
    this._skipBtn = overlay.querySelector('#onboardingSkip');

    // 加载词库列表到第三屏
    this._loadVocabList();

    // Bind events
    this._nextBtn.addEventListener('click', () => this._next());
    this._skipBtn.addEventListener('click', () => this._skip());

    // 点击 backdrop 不能关
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) return;
    });

    // 键盘导航
    this._keyHandler = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._next();
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  },

  /**
   * 加载词库列表到第三屏
   */
  async _loadVocabList() {
    const listEl = document.getElementById('onboardingVocabList');
    if (!listEl) return;

    try {
      const resp = await fetch('vocabulary/index.json');
      if (!resp.ok) throw new Error('Failed to load');
      const data = await resp.json();

      if (!data.vocabularies || data.vocabularies.length === 0) {
        listEl.innerHTML = '<p class="form-hint">没有找到词库。</p>';
        return;
      }

      // 只展示前 8 个热门词库
      const topVocabs = data.vocabularies.slice(0, 8);
      const emojiMap = {
        'cet4': '📚', 'cet6': '🎯', 'ielts': '🌍', 'toefl': '🇺🇸',
        'gre': '🧠', 'gaokao': '🏫', 'k12': '🎒', 'business': '💼',
        'sat': '📋', 'phrasal-verbs': '🔗', 'collins': '📖'
      };

      let html = '<div class="onboarding-vocab-grid">';
      topVocabs.forEach(v => {
        const emoji = emojiMap[v.id] || '📖';
        html += `
          <label class="onboarding-vocab-item">
            <input type="radio" name="onboardingVocab" value="${v.id}" />
            <div class="onboarding-vocab-card">
              <span class="onboarding-vocab-emoji">${emoji}</span>
              <span class="onboarding-vocab-name">${this._escHtml(v.nameCn || v.name)}</span>
            </div>
          </label>
        `;
      });
      // 最后加一个"更多词库→"
      html += `
        <div class="onboarding-vocab-item onboarding-vocab-more" id="onboardingMoreVocab">
          <div class="onboarding-vocab-card">
            <span class="onboarding-vocab-emoji">📋</span>
            <span class="onboarding-vocab-name">更多词库 →</span>
          </div>
        </div>
      `;
      html += '</div>';
      listEl.innerHTML = html;

      // "更多词库"点击后执行 complete 并打开 source 面板
      const moreBtn = document.getElementById('onboardingMoreVocab');
      if (moreBtn) {
        moreBtn.addEventListener('click', () => {
          this.markDone();
          this._close();
          if (typeof openSource === 'function') openSource();
        });
      }

      // 默认选中第一个
      const firstRadio = listEl.querySelector('input[name="onboardingVocab"]');
      if (firstRadio) firstRadio.checked = true;

    } catch (err) {
      listEl.innerHTML = '<p class="form-hint" style="color:var(--color-danger)">加载失败: ' + err.message + '</p>';
    }
  },

  /**
   * 下一屏
   */
  _next() {
    if (this._current === 2) {
      // 第三屏：完成引导
      this._complete();
      return;
    }

    // 向前切换
    const nextIdx = this._current + 1;
    this._goTo(nextIdx);
  },

  /**
   * 跳转到指定屏
   */
  _goTo(idx) {
    if (idx < 0 || idx >= this._slides.length) return;

    // 更新 slides
    this._slides.forEach((s, i) => {
      s.classList.toggle('active', i === idx);
    });

    // 更新 dots
    this._dots.forEach((d, i) => {
      d.classList.toggle('active', i === idx);
    });

    // 更新按钮文字
    if (idx === 2) {
      this._nextBtn.textContent = '开始学习 →';
    } else {
      this._nextBtn.textContent = '继续';
    }

    this._current = idx;
  },

  /**
   * 跳过
   */
  _skip() {
    this.markDone();
    this._close();
  },

  /**
   * 完成引导
   */
  _complete() {
    this.markDone();

    // 读取用户是否选了词库
    const selected = this._el.querySelector('input[name="onboardingVocab"]:checked');
    const vocabId = selected ? selected.value : null;

    this._close();

    // 如果用户选了词库，自动设置 source 并开始学习
    if (vocabId && typeof State !== 'undefined' && typeof BuiltinVocab !== 'undefined') {
      State.sourceType = 'builtin';
      Settings.setSourceType('builtin');
      State.builtinVocabId = vocabId;
      BuiltinVocab.set(vocabId);
      // 加载词库数据
      if (typeof loadBuiltinVocabData === 'function') {
        loadBuiltinVocabData(vocabId).then(() => {
          if (typeof startSession === 'function') startSession();
        });
      }
    }

    // 调用回调
    if (typeof this._onComplete === 'function') {
      this._onComplete(vocabId);
    }
  },

  /**
   * 关闭 overlay
   */
  _close() {
    if (this._el) {
      this._el.classList.add('onboarding-out');
      setTimeout(() => {
        if (this._el) this._el.remove();
      }, 300);
    }
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }
  },

  /**
   * HTML 转义
   */
  _escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
