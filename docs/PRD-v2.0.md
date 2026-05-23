# VocabLearn 产品需求文档 v2.0

> 版本：v2.0
> 日期：2026-05-17
> 状态：草案

---

## 一、概述

v1.1 完成了复习机制、测验模式、发音等"好用"的基础。v2.0的核心方向是：

1. **降低使用门槛** — 内置精品词库，用户打开就能学，不再需要 API Key
2. **移动端支持** — PWA 化，手机浏览器"添加到主屏幕"就能用
3. **提升记忆质量** — SM-2 算法升级，更精确的 SRS 调度
4. **差异化功能** — 阅读模式，从文章中学习单词，打通"读→学"场景

---

## 二、内置精品词库（P0）

### 2.1 目标
用户不需要 API Key，不需要找文件，打开就能选词库开始学。

### 2.2 输入文件：`vocabulary/` 目录
在项目根目录下新建 `vocabulary/` 目录，每个词库一个 JSON 文件。

**文件结构：**
```
vocabulary/
├── index.json           # 词库索引（描述每个词库的信息）
├── cet4.json            # 大学英语四级
├── cet6.json            # 大学英语六级
├── ielts.json           # 雅思核心词汇
├── toefl.json           # 托福核心词汇
├── gre.json             # GRE 词汇
├── gk-gaokao.json       # 高考英语
├── k12.json             # 中考英语
└── business.json        # 商务英语
```

### 2.3 数据格式

**索引文件 (`vocabulary/index.json`)：**
```json
{
  "vocabularies": [
    {
      "id": "cet4",
      "name": "CET-4",
      "nameCn": "大学英语四级",
      "description": "约4500个四级核心词汇",
      "wordCount": 4500,
      "difficulty": "intermediate",
      "source": "builtin",
      "file": "cet4.json"
    },
    { "id": "cet6", "name": "CET-6", "nameCn": "大学英语六级", ... },
    { "id": "ielts", "name": "IELTS", "nameCn": "雅思核心词汇", ... },
    { "id": "toefl", "name": "TOEFL", "nameCn": "托福核心词汇", ... },
    { "id": "gre", "name": "GRE", "nameCn": "GRE词汇", ... },
    { "id": "gaokao", "name": "Gaokao", "nameCn": "高考英语", ... },
    { "id": "k12", "name": "K12", "nameCn": "中考英语", ... },
    { "id": "business", "name": "Business", "nameCn": "商务英语", ... }
  ]
}
```

**词库文件格式（每个词一条）：**
```json
[
  {
    "word": "abandon",
    "pronunciation": "/əˈbændən/",
    "partOfSpeech": "v.",
    "definition": "to leave someone or something completely",
    "chineseDef": "放弃，遗弃",
    "example": "They had to abandon the project due to lack of funds."
  },
  {
    "word": "ability",
    "pronunciation": "/əˈbɪləti/",
    "partOfSpeech": "n.",
    "definition": "the power or skill to do something",
    "chineseDef": "能力，才能",
    "example": "She has the ability to solve complex problems quickly."
  }
]
```

**字段说明：**
| 字段 | 必填 | 说明 |
|------|------|------|
| word | ✅ | 英文单词 |
| pronunciation | ✅ | 音标 |
| partOfSpeech | ✅ | 词性 |
| definition | ✅ | 英文释义 |
| chineseDef | ✅ | 中文释义 |
| example | ✅ | 例句 |

### 2.4 功能改动

#### 在"词源"（Source）面板中增加第三选项

**当前 Source 选项：**
- AI Generated（需 API Key）
- Text File(s)

**修改后 Source 选项：**
- AI Generated（需 API Key）
- Text File(s)
- **Built-in Vocabulary** → 选择后会展示词库列表，用户选中一个即可开始学习

#### 选择词库后的行为
- 词库加载到内存，作为"文件源"的一类
- 每批从词库中取 N 个未用过的词
- 详情页不再调 DeepSeek API，直接从 JSON 数据中取 pronunciation / definition / example
- 去重逻辑沿用已有的 session 去重

#### 欢迎页 Source 快捷入口
- 在 welcome hint 区域增加"精选词库"快速入口
- 用户未配 API Key 时，自动高亮推荐使用内置词库

### 2.5 验收标准
- [ ] 用户打开页面，不填 API Key，不传文件，可选一个内置词库开始学习
- [ ] 选词库后词网格正常显示
- [ ] 详情页正常显示音标/词性/释义/例句（不调 API）
- [ ] 学习记录和复习功能正常继承
- [ ] 所有词库文件格式正确、可加载

---

## 三、PWA + 离线支持（P1）

### 3.1 目标
用户可以在手机浏览器把 VocabLearn 添加到主屏幕，获得接近原生 App 的体验。离线时也能使用已缓存的数据。

### 3.2 新增文件

#### `manifest.json`
```json
{
  "name": "VocabLearn",
  "short_name": "VocabLearn",
  "description": "English vocabulary learning app",
  "start_url": "index.html",
  "display": "standalone",
  "background_color": "#0f1117",
  "theme_color": "#5b6ef5",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

#### `sw.js` (Service Worker)
- `install` 阶段：预缓存核心资源（index.html, style.css, app.js, storage.js, api.js, review.js, quiz.js, tts.js, manifest.json）
- `fetch` 阶段：缓存优先策略（Cache First），离线时从缓存读取
- `activate` 阶段：清理旧缓存

#### `icons/` 目录
- 使用 SVG 或简单生成 192x192 和 512x512 图标（使用现有 logo 风格）

### 3.3 index.html 改动
- `<head>` 中增加 `<link rel="manifest" href="manifest.json">`
- 增加 Service Worker 注册脚本

### 3.4 验收标准
- [ ] Android Chrome / iOS Safari 可以"添加到主屏幕"
- [ ] 打开后无浏览器地址栏，全屏体验
- [ ] 首次加载后断网，已加载的页面可正常打开
- [ ] 已缓存的内置词库离线可用

---

## 四、SM-2 算法升级（P1）

### 4.1 背景
当前 review.js 使用的是简化版 SRS（1天→2天→4天→mastered）。SM-2 是 SuperMemo 的经典算法，含四个参数：
- **easiness factor (EF)** — 词的"难度系数"，初始 2.5，范围 1.3-2.5
- **interval** — 间隔天数
- **repetition** — 连续答对次数
- **next review date** — 下次复习日期

### 4.2 算法细节

**答对时：**
```
if repetition == 0:
    interval = 1
elif repetition == 1:
    interval = 6
else:
    interval = Math.round(interval * EF)

repetition += 1
EF = Math.max(1.3, EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
```
其中 `quality` 为用户自评质量（0-5 分，0=完全忘记，5=完美记忆）

**答错时：**
```
repetition = 0
interval = 1
```

### 4.3 数据结构变更
```js
{
  word: "ephemeral",
  status: "reviewing",   // "unfamiliar" | "reviewing" | "mastered"
  ef: 2.5,               // easiness factor (1.3-2.5)
  interval: 1,           // 当前间隔天数
  repetition: 0,         // 连续答对次数
  nextReview: "2026-05-18",
  lastReviewed: "2026-05-17",
  qualityHistory: [3, 4], // 历史自评分数
}
```

### 4.4 UI 改动
- 复习时增加"难度自评"按钮：**Again / Hard / Good / Easy**
  - Again (0) → 完全忘记，重置间隔
  - Hard (2) → 记错了，微小惩罚
  - Good (4) → 记住了
  - Easy (5) → 非常轻松
- 每个选项对应不同的 quality 值和 EF 调整

### 4.5 迁移
- 旧复习池数据（简化版）自动转换为 SM-2 格式
- 旧数据中 correctCount → repetition，interval 保留，ef 设为 2.5

### 4.6 验收标准
- [ ] 复习时显示 4 个难度自评按钮
- [ ] 选择后正确更新 interval / ef / repetition
- [ ] 旧数据自动迁移，不丢失
- [ ] 多次复习后 ef 值根据历史质量合理调整

---

## 五、阅读模式（P2）

### 5.1 目标
用户粘贴一篇文章（或输入 URL 抓取内容），系统自动提取文章中的生词，用户可以逐个学习。这个功能打通"阅读→学生词"场景，是 VocabLearn 的差异化能力。

### 5.2 流程
1. 用户在阅读模式输入文章（粘贴文本 或 输入 URL）
2. 系统提取所有英文单词，对照词库标记"已知词"和"生词"
3. 展示文章 + 生词高亮
4. 点击生词弹出释义卡片
5. 一键将生词加入复习池

### 5.3 文章词提取算法
- 使用正则 `/\b[a-zA-Z]{2,}\b/g` 提取单词
- 去重
- 小写化
- 过滤停用词（the, a, an, is, are, was, were, etc.）
- 对比已掌握词库和复习池，标记未知词

### 5.4 新增 UI 组件

#### 文章输入区
- 大文本框供粘贴
- "从 URL 抓取"输入框（可选）
- "提取生词"按钮

#### 文章展示区
- 原文展示，生词高亮（使用 `<mark>` 或变色）
- 每个生词可点击显示释义浮窗

#### 生词列表
- 文章底部显示提取出的生词列表
- 每个词可查看释义
- "加入复习池"按钮（批量或逐个）

### 5.5 释义获取
- 尝试从内置词库中匹配（已有词库优先）
- 未匹配到的词可调 DeepSeek API（有 Key 时）
- 无 API Key 时显示"未找到释义"，不影响使用

### 5.6 验收标准
- [ ] 输入文章后能提取出单词列表
- [ ] 高亮显示生词
- [ ] 点击生词显示释义浮窗
- [ ] 一键将生词加入复习池
- [ ] 能过滤停用词
- [ ] 文章展示美观、可读

---

## 六、文件变更清单

### 新增文件
| 文件 | 目的 |
|------|------|
| `vocabulary/index.json` | 词库索引 |
| `vocabulary/cet4.json` | 四级词库（约4500词） |
| `vocabulary/cet6.json` | 六级词库（约6000词） |
| `vocabulary/ielts.json` | 雅思词库（约3500词） |
| `vocabulary/toefl.json` | 托福词库（约4000词） |
| `vocabulary/gre.json` | GRE词库（约5000词） |
| `vocabulary/gk-gaokao.json` | 高考词库（约3500词） |
| `vocabulary/k12.json` | 中考词库（约2000词） |
| `vocabulary/business.json` | 商务词库（约2000词） |
| `manifest.json` | PWA 配置文件 |
| `sw.js` | Service Worker |
| `icons/icon-192.png` | PWA 图标 192x192 |
| `icons/icon-512.png` | PWA 图标 512x512 |
| `reading.js` | 阅读模式逻辑 |

### 修改文件
| 文件 | 改动 |
|------|------|
| `index.html` | PWA manifest 引用、SW 注册、阅读模式屏幕、词库选择面板 |
| `style.css` | 阅读模式样式、词库选择样式、PWA 适配 |
| `app.js` | 词库选择逻辑、阅读模式状态机、SM-2 复习 UI 调整 |
| `review.js` | SM-2 算法替换简化版、迁移旧数据 |
| `storage.js` | 新增词库选择持久化、停用词表 |
| `README.md` | 更新文档 |

---

## 七、优先级与工作量估算

| 功能 | 优先级 | 工作量 | 依赖 |
|------|--------|--------|------|
| 内置词库（文件 + 加载逻辑） | P0 | 中 | 无 |
| PWA + 离线 | P1 | 小 | 无 |
| SM-2 算法升级 | P1 | 中 | 现有 review.js |
| 阅读模式 | P2 | 大 | 内置词库（已匹配释义） |

### 建议实施顺序
1. **内置词库** — 门槛最高、收益最大，先做
2. **PWA** — 投入小、移动端体验提升明显
3. **SM-2 升级** — 改写 review.js 的核心算法
4. **阅读模式** — 差异化功能，需要前面几项打好基础

---

## 八、风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| 词库数据量大，加载慢 | 用户体验下降 | JSON 分片、懒加载（首批 500 词即可开始） |
| SW 缓存策略不对导致页面更新不及时 | 用户看到旧版本 | activate 阶段清理旧缓存，加版本号 |
| SM-2 迁移导致旧数据丢失 | 用户不满 | 检测旧格式，转换时保留原词，仅初始化新字段 |
| 阅读模式解析英文文章不准确 | 提取过多/过少单词 | 预处理（分词 + 停用词过滤），支持用户手动增删 |
