# VocabLearn v4.0 — 词库补完 + Anki导出 + 听写完形 + WebDAV同步

> 日期：2026-05-17

---

## 一、词库补完（P0）

### 目标
将 11 套词库扩充到接近完整版，用户打开选词库就能学全部考纲词汇。

### 目标量

| 词库 | 当前 | 目标 | 方法 |
|------|------|------|------|
| CET-4 | 453 | ~4500 | 使用 tools/generate-vocab.js 分批生成 |
| CET-6 | 289 | ~6000 | 同上 |
| IELTS | 291 | ~3500 | 同上 |
| TOEFL | 356 | ~4000 | 同上 |
| GRE | 411 | ~5000 | 同上 |
| Gaokao | 643 | ~3500 | 同上 |
| K12 | 100 | ~2000 | 同上 |
| Business | 109 | ~2000 | 同上 |
| SAT | 74 | ~3000 | 同上 |
| Phrasal Verbs | 50 | ~500 | 同上 |
| Collins | 98 | ~3000 | 同上 |

### 实现方式
1. 编写 `tools/batch-generate.js` — 按词库逐个调用 DeepSeek API，每批 100 词
2. 使用已有 generate-vocab.js 的思路，传入词库 ID、难度、已有词做排除
3. 每次生成 100 词，追加到对应 JSON 文件
4. 生成完毕后跑 validate-vocab.js 校验
5. 更新 index.json

---

## 二、Anki 导出（P1）

### 目标
用户可以将已学词汇（熟悉词、陌生词、复习池全量）导出为 Anki 兼容的格式。

### 输出格式

**方案 A：CSV/TSV 导出（优先实现）**
Anki 支持直接导入 CSV 文件。格式最简单、无依赖。

```
word,pronunciation,partOfSpeech,definition,chineseDef,example
abandon,/əˈbændən/,v.,"to leave someone or something completely","放弃，遗弃","They had to abandon the project due to lack of funds."
```

用户导入 Anki 时设置：
- 第 1 列 → 正面（Front）
- 第 2-6 列 → 背面（Back），用模板 `{{pronunciation}}<br>{{partOfSpeech}} {{definition}}<br>{{chineseDef}}<br><i>{{example}}</i>`

**方案 B：.apkg 格式（如果时间够）**
.apkg 本质是 SQLite 数据库（.anki2）+ 媒体文件，压缩为 ZIP。
需要纯 JS SQLite 实现（如 sql.js）或直接构造 ZIP + SQLite 文件。

### UI 改动
- 完成页（screenDone）和欢迎页增加"导出到 Anki"按钮
- 选择导出范围：仅陌生词 / 全部复习池 / 当前批次 / 自定义选择
- 点击后下载 .csv 文件

### 验收标准
- [ ] 导出 CSV 文件可用
- [ ] Anki 可以直接导入（验证导入后字段映射正确）
- [ ] 导出范围选择有效

---

## 三、更多学习模式：听写 + 完形填空（P1）

### 3.1 听写模式

**流程：**
1. 系统自动朗读单词（调用 tts.js）
2. 用户输入听到的拼写
3. 自动判断对错
4. 听写 10 词一轮，出分
5. 错词自动加入复习池

**UI：**
- 屏幕中央显示"现在听写"提示
- 自动播放发音（可重复点击播放）
- 大输入框供用户输入
- 回车提交答案
- 答对绿色反馈，答错显示正确拼写

### 3.2 完形填空模式

**流程：**
1. 展示带有空缺的例句（example 句子中挖掉目标词）
2. 用户从 4 个选项中选出正确单词填入空缺
3. 答对显示完整句子，答错显示正确答案
4. 10 题一轮，出分

**示例：**
```
They had to _____ the project due to lack of funds.
A) abandon  B) ability  C) abstract  D) abuse
```

**实现逻辑：**
- 从词库/当前批次中取词
- 用词库中的 example 句子
- 用 `_____` 替换目标词
- 从当前池中取 3 个干扰词作为选项

### 3.3 UI 整合
- 欢迎页学习模式增加"听写"和"完形填空"入口
- 底部导航增加选项
- 两种模式的结果数据（得分、错词）与现有数据打通

---

## 四、WebDAV 同步（P2）

### 目标
用户可将学习数据（复习池、历史记录、设置）同步到自选的 WebDAV 服务器（坚果云、iCloud、Nextcloud 等），实现多设备数据一致。

### 数据范围
需要同步的数据（localStorage keys）：
- 复习池（REVIEW_STORE_KEY）
- 设置（全部 Settings）
- 历史记录（vocab_record_YYYYMMDD）
- 已用词列表
- 词库选择

### 实现方案

#### 4.1 WebDAV 客户端（纯前端）
- 使用标准 HTTP 方法实现 WebDAV 协议子集：
  - `PROPFIND` — 检查目录/文件是否存在
  - `GET` — 下载数据文件
  - `PUT` — 上传数据文件
  - `MKCOL` — 创建目录

#### 4.2 核心模块 `sync.js`

```js
// sync.js
const Sync = {
  // 保存 WebDAV 连接信息
  configure({ url, username, password }) { ... },

  // 上传所有数据到 WebDAV
  push() { ... },

  // 从 WebDAV 拉取所有数据到本地
  pull() { ... },

  // 自动同步（检测本地变更后 push，或定时拉取）
  autoSync() { ... },

  // 冲突处理（以最新修改时间为准）
  resolveConflict(local, remote) { ... },
}
```

#### 4.3 数据文件结构（WebDAV 端）
```
VocabLearn/
├── review_pool.json      # 复习池
├── settings.json         # 设置
├── history/              # 历史记录
│   ├── record-20260501.json
│   ├── record-20260502.json
│   └── record-20260517.json
└── meta.json             # 同步元数据（版本、上次同步时间）
```

#### 4.4 UI 改动
- 设置面板增加"同步"区域
- 输入 WebDAV URL + 账号密码
- "测试连接"按钮
- "手动同步"按钮（上传 / 下载）
- "自动同步"开关（每次完成批次后自动上传）
- 显示上次同步时间

#### 4.5 同步时机
- 每次完成学习批次后（自动上传）
- 每次打开页面时（自动下载）
- 用户主动点击同步按钮
- 同步冲突时弹出选择窗口

#### 4.6 安全性
- 账号密码存 localStorage（当前仅能如此，纯前端无服务器）
- 建议用户使用 WebDAV 专属应用密码
- 传输走 HTTPS

### 验收标准
- [ ] 配置 WebDAV 后可以成功上传数据
- [ ] 另一设备配置相同 WebDAV 可拉取数据
- [ ] 数据一致性：A 设备学完 → B 设备打开看到新词
- [ ] 自动同步在完成批次后触发
- [ ] 同步冲突时有处理机制

---

## 五、实施顺序

| 步骤 | 内容 | 工作量 | 估算 |
|------|------|--------|------|
| 1 | 词库补完到目标量级 | 大 | 需多次 API 调用 |
| 2 | Anki 导出（CSV） | 小 | ~半天 |
| 3 | 听写模式 + 完形填空 | 中 | ~1天 |
| 4 | WebDAV 同步 | 大 | ~2天 |

---

## 六、文件变更清单

### 新增文件
| 文件 | 目的 |
|------|------|
| `tools/batch-generate.js` | DeepSeek API 批量生成完整词库 |
| `anki.js` | Anki CSV 导出模块 |
| `dictation.js` | 听写模式逻辑 |
| `cloze.js` | 完形填空模式逻辑 |
| `sync.js` | WebDAV 同步引擎 |

### 修改文件
| 文件 | 改动 |
|------|------|
| `index.html` | 听写/完形屏 DOM、同步设置面板、Anki 导出按钮 |
| `style.css` | 听写/完形/同步面板样式 |
| `app.js` | 听写/完形状态机、同步事件绑定、Anki 导出入口 |
| `storage.js` | WebDAV 配置持久化、同步元数据 |
| `vocabulary/*.json` | 扩充到目标词量 |
| `vocabulary/index.json` | 更新词量统计 |
| `README.md` | 更新文档 |
