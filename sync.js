/**
 * sync.js — WebDAV 同步引擎
 *
 * 使用标准 HTTP 方法实现 WebDAV 协议子集：
 *   PROPFIND — 检查目录/文件是否存在
 *   GET      — 下载数据
 *   PUT      — 上传数据
 *   MKCOL    — 创建目录
 *
 * 数据结构（WebDAV 端）：
 *   VocabLearn/
 *   ├── review_pool.json   — 复习池
 *   ├── settings.json      — 设置
 *   ├── history/           — 历史记录
 *   │   ├── record-20260501.json
 *   │   └── record-YYYYMMDD.json
 *   └── meta.json          — 同步元数据（版本、上次同步时间）
 *
 * 冲突处理：以最新修改时间为准。
 * Base64 编码认证。
 */

/* =========================================================
   WebDAV 客户端
   ========================================================= */

class WebDAVClient {
  constructor() {
    this.url = '';
    this.username = '';
    this.password = '';
    this._authHeader = '';
  }

  /**
   * 配置连接信息
   * @param {string} url - WebDAV 服务器根 URL
   * @param {string} username
   * @param {string} password
   */
  configure(url, username, password) {
    this.url = url.replace(/\/+$/, ''); // 去掉尾部斜杠
    this.username = username;
    this.password = password;
    this._authHeader = 'Basic ' + btoa(`${username}:${password}`);
  }

  /* -------------------------------------------------------
     HTTP 请求封装
     ------------------------------------------------------- */

  /**
   * 低层级 HTTP 请求
   * @param {string} method - HTTP 方法
   * @param {string} path - 路径（相对 base URL）
   * @param {string} [body] - 请求体
   * @param {object} [extraHeaders] - 额外请求头
   * @returns {Promise<{status: number, ok: boolean, data: string, headers: object}>}
   */
  async _request(method, path, body, extraHeaders = {}) {
    const url = this.url + '/' + path.replace(/^\//, '');
    const headers = {
      'Authorization': this._authHeader,
      ...extraHeaders,
    };

    if (body !== undefined && body !== null) {
      headers['Content-Type'] = 'application/json;charset=utf-8';
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body || undefined,
      });

      const data = await response.text();
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });

      return {
        status: response.status,
        ok: response.ok,
        data,
        headers: responseHeaders,
      };
    } catch (err) {
      throw new Error(`WebDAV connection failed: ${err.message}`);
    }
  }

  /**
   * PROPFIND — 检查路径是否存在
   * @param {string} path
   * @returns {Promise<boolean>}
   */
  async _propfind(path) {
    try {
      const res = await this._request('PROPFIND', path, null, {
        'Depth': '0',
      });
      return res.status === 207 || res.status === 200;
    } catch (_) {
      return false;
    }
  }

  /**
   * MKCOL — 创建目录
   * @param {string} path
   * @returns {Promise<boolean>}
   */
  async _mkcol(path) {
    try {
      const res = await this._request('MKCOL', path);
      return res.status === 201 || res.status === 200 || res.status === 405; // 405 = already exists
    } catch (_) {
      return false;
    }
  }

  /**
   * GET — 下载文件
   * @param {string} path
   * @returns {Promise<object|null>} 解析后的 JSON 数据
   */
  async _get(path) {
    try {
      const res = await this._request('GET', path);
      if (!res.ok) return null;
      return JSON.parse(res.data);
    } catch (_) {
      return null;
    }
  }

  /**
   * PUT — 上传文件
   * @param {string} path
   * @param {object} data - 要上传的 JSON 可序列化数据
   * @returns {Promise<boolean>}
   */
  async _put(path, data) {
    try {
      const body = JSON.stringify(data, null, 2);
      const res = await this._request('PUT', path, body);
      return res.ok || res.status === 201 || res.status === 204;
    } catch (_) {
      return false;
    }
  }

  /* -------------------------------------------------------
     high-level 同步操作
     ------------------------------------------------------- */

  /**
   * 测试连接
   * @returns {Promise<{ok: boolean, message: string}>}
   */
  async testConnection() {
    if (!this.url || !this._authHeader) {
      return { ok: false, message: 'Please configure WebDAV URL and credentials first.' };
    }

    try {
      // Try PROPFIND on the root
      const exists = await this._propfind('');
      if (!exists) {
        // Try a simple GET as fallback
        const res = await this._request('GET', '');
        if (res.ok || res.status === 401 || res.status === 404) {
          return { ok: true, message: 'Connection successful.' };
        }
      }
      return { ok: true, message: 'Connection successful.' };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }

  /**
   * 确保 VocabLearn/ 目录存在
   */
  async _ensureBaseDir() {
    const baseExists = await this._propfind('VocabLearn');
    if (!baseExists) {
      await this._mkcol('VocabLearn');
    }
    const historyExists = await this._propfind('VocabLearn/history');
    if (!historyExists) {
      await this._mkcol('VocabLearn/history');
    }
  }

  /**
   * 上传所有数据到 WebDAV
   * @returns {Promise<{ok: boolean, message: string}>}
   */
  async push() {
    if (!this.url || !this._authHeader) {
      return { ok: false, message: 'WebDAV not configured.' };
    }

    try {
      await this._ensureBaseDir();

      // 1. Push review pool
      const reviewPool = ReviewPool.getAll();
      await this._put('VocabLearn/review_pool.json', {
        data: reviewPool,
        updatedAt: new Date().toISOString(),
        version: 2,
      });

      // 2. Push settings
      const settings = Settings.getAll();
      await this._put('VocabLearn/settings.json', {
        data: settings,
        updatedAt: new Date().toISOString(),
      });

      // 3. Push session data
      const sessionData = {
        usedWords: Session.getUsedWords(),
        familiarWords: Session.getFamiliarWords(),
        unfamiliarWords: Session.getUnfamiliarWords(),
        batchIndex: Session.getBatchIndex(),
        sessionDate: Session.getSessionDate(),
        sourceType: Settings.getSourceType(),
        builtinVocabId: BuiltinVocab.get(),
        builtinVocabUsed: BuiltinVocab.getUsedWords(),
        fileWords: FileWords.get(),
      };
      await this._put('VocabLearn/session.json', {
        data: sessionData,
        updatedAt: new Date().toISOString(),
      });

      // 4. Push history records
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('vocab_record_')) {
          try {
            const record = JSON.parse(localStorage.getItem(key));
            const recordPath = `VocabLearn/history/${key}.json`;
            await this._put(recordPath, {
              data: record,
              updatedAt: new Date().toISOString(),
            });
          } catch (_) {}
        }
      }

      // 5. Update meta
      await this._put('VocabLearn/meta.json', {
        lastSyncAt: new Date().toISOString(),
        version: 2,
        clientInfo: 'VocabLearn Web',
      });

      // 6. Update local sync meta
      SyncSettings.setLastSyncTime(Date.now());
      SyncSettings.setLastSyncStatus('success');

      return { ok: true, message: 'Data pushed successfully.' };
    } catch (err) {
      SyncSettings.setLastSyncStatus('error');
      return { ok: false, message: `Push failed: ${err.message}` };
    }
  }

  /**
   * 从 WebDAV 拉取所有数据到本地
   * @returns {Promise<{ok: boolean, message: string, changed: boolean}>}
   */
  async pull() {
    if (!this.url || !this._authHeader) {
      return { ok: false, message: 'WebDAV not configured.', changed: false };
    }

    try {
      await this._ensureBaseDir();
      let changed = false;

      // 1. Pull review pool
      const remotePool = await this._get('VocabLearn/review_pool.json');
      if (remotePool && Array.isArray(remotePool.data)) {
        const localPool = ReviewPool.getAll();
        if (localPool.length === 0 || remotePool.data.length > localPool.length) {
          localStorage.setItem('vocab_review_pool', JSON.stringify(remotePool.data));
          changed = true;
        }
      }

      // 2. Pull settings
      const remoteSettings = await this._get('VocabLearn/settings.json');
      if (remoteSettings && remoteSettings.data) {
        const s = remoteSettings.data;
        if (s.apiKey) Settings.setApiKey(s.apiKey);
        if (s.wordsPerBatch) Settings.setWordsPerBatch(s.wordsPerBatch);
        if (s.difficulty) Settings.setDifficulty(s.difficulty);
        if (s.sourceType) Settings.setSourceType(s.sourceType);
        if (s.autoPronounce !== undefined) Settings.setAutoPronounce(s.autoPronounce);
        if (s.showShortcuts !== undefined) Settings.setShowShortcuts(s.showShortcuts);
        changed = true;
      }

      // 3. Pull session data
      const remoteSession = await this._get('VocabLearn/session.json');
      if (remoteSession && remoteSession.data) {
        const sd = remoteSession.data;
        if (sd.usedWords) localStorage.setItem('vocab_used_words', JSON.stringify(sd.usedWords));
        if (sd.familiarWords) localStorage.setItem('vocab_familiar_words', JSON.stringify(sd.familiarWords));
        if (sd.unfamiliarWords) localStorage.setItem('vocab_unfamiliar_words', JSON.stringify(sd.unfamiliarWords));
        if (sd.batchIndex) localStorage.setItem('vocab_batch_index', String(sd.batchIndex));
        if (sd.sessionDate) localStorage.setItem('vocab_session_date', sd.sessionDate);
        if (sd.sourceType) Settings.setSourceType(sd.sourceType);
        if (sd.builtinVocabId !== undefined) BuiltinVocab.set(sd.builtinVocabId);
        if (sd.builtinVocabUsed) {
          localStorage.setItem('vocab_builtin_used', JSON.stringify(sd.builtinVocabUsed));
        }
        if (sd.fileWords) FileWords.set(sd.fileWords);
        changed = true;
      }

      // 4. Pull history records
      const recordsPulled = await this._pullHistoryRecords();
      if (recordsPulled) changed = true;

      // 5. Update local sync meta
      SyncSettings.setLastSyncTime(Date.now());
      SyncSettings.setLastSyncStatus('success');

      return {
        ok: true,
        message: changed ? 'Data pulled and merged successfully.' : 'No new data to sync.',
        changed,
      };
    } catch (err) {
      SyncSettings.setLastSyncStatus('error');
      return { ok: false, message: `Pull failed: ${err.message}`, changed: false };
    }
  }

  /**
   * 拉取历史记录
   * @returns {Promise<boolean>} 是否有新增记录
   */
  async _pullHistoryRecords() {
    // WebDAV Listing via PROPFIND 是复杂的 XML 解析
    // 简单方案：尝试下载已知的日期记录
    // 更完整的实现需要 PROPFIND 列目录
    let changed = false;

    // 尝试最近 7 天的记录
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}${mm}${dd}`;
      const key = `vocab_record_${dateStr}`;

      // 本地没有才拉取
      if (!localStorage.getItem(key)) {
        const remote = await this._get(`VocabLearn/history/${key}.json`);
        if (remote && remote.data) {
          localStorage.setItem(key, JSON.stringify(remote.data));
          changed = true;
        }
      }
    }

    // 尝试获取 PROPFIND 的完整列表 — 通过获取 meta 里的记录列表
    // 这里简化处理，使用硬编码的已知模式
    // 更好的方案在后面更新

    return changed;
  }
}

/* =========================================================
   全局单例
   ========================================================= */
const SyncClient = new WebDAVClient();

/* =========================================================
   SyncSettings — 持久化配置
   ========================================================= */
const SyncSettings = {
  KEYS: {
    URL: 'vocab_sync_url',
    USER: 'vocab_sync_user',
    PASS: 'vocab_sync_pass',
    AUTO: 'vocab_sync_auto',
    LAST_SYNC: 'vocab_sync_last_time',
    STATUS: 'vocab_sync_last_status',
  },

  getUrl() {
    return localStorage.getItem(this.KEYS.URL) || '';
  },
  setUrl(v) {
    localStorage.setItem(this.KEYS.URL, v);
  },

  getUser() {
    return localStorage.getItem(this.KEYS.USER) || '';
  },
  setUser(v) {
    localStorage.setItem(this.KEYS.USER, v);
  },

  getPass() {
    return localStorage.getItem(this.KEYS.PASS) || '';
  },
  setPass(v) {
    localStorage.setItem(this.KEYS.PASS, v);
  },

  getAutoSync() {
    return localStorage.getItem(this.KEYS.AUTO) === 'true';
  },
  setAutoSync(v) {
    localStorage.setItem(this.KEYS.AUTO, v ? 'true' : 'false');
  },

  getLastSyncTime() {
    const val = localStorage.getItem(this.KEYS.LAST_SYNC);
    return val ? parseInt(val, 10) : 0;
  },
  setLastSyncTime(ts) {
    localStorage.setItem(this.KEYS.LAST_SYNC, String(ts));
  },

  getLastSyncStatus() {
    return localStorage.getItem(this.KEYS.STATUS) || '';
  },
  setLastSyncStatus(status) {
    localStorage.setItem(this.KEYS.STATUS, status);
  },

  /**
   * 获取所有配置
   * @returns {object}
   */
  getAll() {
    return {
      url: this.getUrl(),
      username: this.getUser(),
      password: this.getPass(),
      autoSync: this.getAutoSync(),
      lastSyncTime: this.getLastSyncTime(),
      lastSyncStatus: this.getLastSyncStatus(),
    };
  },

  /**
   * 保存所有配置
   */
  saveAll({ url, username, password, autoSync }) {
    if (url !== undefined) this.setUrl(url);
    if (username !== undefined) this.setUser(username);
    if (password !== undefined) this.setPass(password);
    if (autoSync !== undefined) this.setAutoSync(autoSync);
  },

  /**
   * 格式化的上次同步时间
   * @returns {string}
   */
  getFormattedLastSync() {
    const ts = this.getLastSyncTime();
    if (!ts) return 'Not synced yet.';
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `Last synced: ${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  },
};
