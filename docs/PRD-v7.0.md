# VocabLearn v7.0 — 全面 UI 翻新与设计系统

> 日期：2026-05-23
> 目标：从"功能完整"到"看起来专业"

---

## 一、现状诊断

4566 行 CSS，积累自 10 个版本迭代。每个版本在不同时间加了不同的样式，存在以下问题：

1. **颜色不一致** — 主色在不同组件中有微小偏差（#5b6ef5 vs #5865f2 vs #5a6df5）
2. **间距无体系** — 有的组件用 16px padding，有的用 20px，有的用 24px
3. **字体层级不清晰** — 标题/正文/辅助文字的大小和权重没有体系
4. **冗余样式堆积** — 多次迭代后旧样式未被清理
5. **组件风格不统一** — v1.1 的按钮 vs v5.0 的按钮 vs v6.5 的按钮 视觉上有差异

---

## 二、设计系统建立

### 2.1 色彩系统

#### 主色板
```
Token              Dark          Light        用途
--color-bg         #0d1117       #ffffff      背景
--color-surface    #161b22       #f6f8fa      表面对
--color-surface-2  #1c2333       #eef1f5      表面-2（hover/选中）
--color-border     #30363d       #d0d7de      边框
--color-text       #e6edf3       #1f2328      正文
--color-text-muted #8b949e       #656d76      辅助文字
--color-primary    #5865f2       #5865f2      主色（保持不变）
--color-primary-h  #4752c4       #4752c4      主色 hover
--color-accent     #f0c040       #f0c040      强调色（保持不变）
--color-success    #3ecf8e       #2da44e      成功
--color-danger     #f56565       #cf222e      危险
--color-warning    #ed8936       #d4760b      警告
```

#### 语义色
```
--color-word-known    #3ecf8e (绿色)  认识的词
--color-word-unknown  #f0c040 (黄色)  陌生的词
--color-word-mastered #1a7f37 (深绿)  已掌握
```

### 2.2 间距体系

基于 4px 网格：
```
Token              PX     使用场景
--space-1          4px    微间距
--space-2          8px    内联间距
--space-3          12px   组件内间距
--space-4          16px   标准间距
--space-5          20px   大间距
--space-6          24px   区块间距
--space-8          32px   大区块间距
--space-10         40px   页面间距
--space-12         48px   超大间距
```

### 2.3 字体层级

```
Token              Size    Weight  使用场景
--text-xs          0.75rem 500     标签、徽章、辅助信息
--text-sm          0.825rem 500    表单提示、时间戳
--text-base        0.925rem 400    正文
--text-md          1rem    500     小标题、词块文字
--text-lg          1.25rem 600     卡片标题
--text-xl          1.5rem  700     页面标题
--text-2xl         2rem    700     欢迎页大标题

--font-sans: 'Inter', 'SF Pro', system-ui, sans-serif
--font-mono: 'JetBrains Mono', 'SF Mono', monospace
```

### 2.4 圆角体系

```
--radius-sm:   4px   按钮、输入框
--radius-md:   8px   卡片、模态框
--radius-lg:   12px  大卡片
--radius-xl:   16px  欢迎页主卡片
--radius-full: 999px 徽章、头像
```

### 2.5 阴影体系

```
--shadow-sm:   0 1px 3px rgba(0,0,0,0.3)
--shadow-md:   0 4px 12px rgba(0,0,0,0.4)
--shadow-lg:   0 8px 24px rgba(0,0,0,0.5)
--shadow-glow: 0 0 0 3px var(--color-primary-glow)
```

### 2.6 过渡体系

```
--transition-fast:   100ms ease
--transition-base:   200ms ease
--transition-slow:   350ms ease
--transition-spring: 350ms cubic-bezier(0.34, 1.56, 0.64, 1)
```

---

## 三、组件重设计

### 3.1 卡片体系（Card System）

所有卡片统一为 4 种变体：

**基础卡（Base Card）**
```
background: var(--color-surface)
border: 1px solid var(--color-border)
border-radius: var(--radius-md)
padding: var(--space-4)
hover: translateY(-1px) + shadow
```

**高亮卡（Elevated Card）**
```
background: var(--color-surface)
border: 1px solid var(--color-border)
border-radius: var(--radius-md)
padding: var(--space-5)
box-shadow: var(--shadow-md)
hover: translateY(-2px) + shadow-lg
```

**交互卡（Interactive Card）**
```
基础卡 + cursor: pointer
hover: border-color 变 primary
active: scale(0.98)
```

**警告卡（Danger Card）**
```
基础卡 + border-left: 3px solid var(--color-danger)
```

### 3.2 按钮体系（Button System）

统一为 5 种变体，使用 CSS 自定义属性：

```
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 500;
  font-family: var(--font-sans);
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--transition-base);
  white-space: nowrap;
  line-height: 1;
}
```

| 变体 | 背景 | 边框 | 文字 | 用途 |
|------|------|------|------|------|
| primary | primary | — | white | 主要操作 |
| secondary | surface-2 | border | text | 次要操作 |
| ghost | transparent | transparent | muted | 轻量操作 |
| danger | danger | — | white | 危险操作 |
| link | transparent | transparent | primary | 文字链接 |

尺寸变体：
- `.btn-sm` padding: 4px 10px, font-size: 0.75rem
- `.btn`（默认）padding: 8px 16px
- `.btn-lg` padding: 12px 24px, font-size: 1rem

### 3.3 输入框体系

```
.input {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font-size: var(--text-base);
  color: var(--color-text);
  outline: none;
  transition: border-color var(--transition-base), box-shadow var(--transition-base);
}
.input:focus {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-glow);
}
```

### 3.4 导航体系

**桌面端头部导航：**
- 高度 52px，left: logo + sessionInfo，right: 操作按钮
- sticky top

**移动端底部导航：**
- 高度 56px，5 项（Learn/Review/Practice/Settings/+1 extra）
- 选中项 primary 色 + 下划线指示
- badge 显示待复习数

### 3.5 模态框体系

```
.modal-backdrop {
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
}
.modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-modal);
  padding: var(--space-5);
  max-width: 480px;
  width: 90%;
  animation: modalIn 200ms ease;
}
```

---

## 四、逐屏翻新

### 4.1 欢迎页（screenWelcome）

当前：每日卡片 + 2×3 网格 + 底部快捷入口 + 学习日历

翻新要点：
- 顶部留白更大，呼吸感更强
- 每日卡片重新排版：进度条粗体 + 三个统计用 icon+数字 横向排列
- 2×3 网格卡片圆角统一 12px，图标和文字间距收拢
- 底部快捷入口改为图标圆形按钮（视觉更轻）
- 整体信息层级：目标 > 继续学习 > 次要入口

### 4.2 词网格（screenGrid）

当前：toolbar + 词网格 + footer

翻新要点：
- 搜索框 + 排序下拉 + 批量操作 合并为一行，视觉紧凑
- 计时器右上角小字，不干扰主区域
- 词块间距：gap 10px → 调整到 8px（桌面）/ 10px（移动端）
- 词块文字字号：0.9rem → 0.875rem（容纳更长的词）
- 底部标记计数 font-size 缩小，颜色更柔和

### 4.3 详情页（screenDetail）

当前：卡片列表展示

翻新要点：
- 卡片顶部增加进度指示器：词 3/13
- 左右滑动手势提示（首次进入时显示半透明箭头）
- 卡片内排版优化：word + pronunciation 一行，POS 标签，definition，example，chinese
- 底部"取消标记"按钮用 ghost 样式，视觉更轻

### 4.4 复习页（screenReview）

当前：列表 + 自评四按钮

翻新要点：
- 当前复习词放大展示，居中（带来"这个就是现在要记的"的专注感）
- 四色按钮宽度统一，颜色更深，hover 有光晕
- 连续 streak 用数字 + 火苗 🔥 展示
- 记忆健康条在词列表右侧（窄条，不占主要空间）

### 4.5 其他页面

- 测验页：选项按钮用卡片样式替代纯文本
- 听写页：输入框居中放大，提交按钮圆角统一
- 设置页：分组设置项用 section 卡片分隔

---

## 五、动效系统升级

### 5.1 入场动效（统一规范）

| 场景 | 动画 | 时长 | 曲线 |
|------|------|------|------|
| 页面切换 | fade + slide | 250ms | ease |
| 卡片列表 | stagger 60ms + slide-up | 200ms | ease-out |
| 词块出现 | scale(0.95→1) + fade | 150ms | spring |
| 模态框 | scale(0.9→1) + fade | 200ms | spring |
| Toast | slide-up + fade | 250ms | ease-out |

### 5.2 微交互动效

| 交互 | 动画 | 时长 |
|------|------|------|
| 按钮 hover | 背景渐变 + shadow | 150ms |
| 按钮 active | scale(0.97) | 100ms |
| 卡片 hover | translateY(-1px) + shadow | 200ms |
| 标记认识/不认识 | 颜色渐变 200ms | 200ms |
| 搜索过滤 | 词块 fade 切换 | 200ms |
| 完成目标 | confetti 彩纸 | 1000ms |

### 5.3 过渡动效优化

在 showScreen() 中统一使用 `transition` + `requestAnimationFrame` 组合，替代现有的 setTimeout 控制。保证：
- 旧屏幕完全退出后才展示新屏幕
- 动效期间不阻塞用户操作
- 快速点击连续切换时自动合并

---

## 六、CSS 重构

### 6.1 策略

1. 用 CSS 自定义属性（variables）统一所有颜色/间距/圆角/字体
2. 按组件类型分组注释（/* Cards */, /* Buttons */, /* Modals */, etc.）
3. 删除所有冗余/重复样式（用 git diff 对比）
4. 浅色主题只用 `[data-theme="light"]` 覆盖颜色变量，不复制整个样式
5. 响应式：在同一组件内用 media query，不分散

### 6.2 文件结构（style.css 内）

```
/* =========================================================
   1. Design Tokens
   ========================================================= */
   :root { /* all variables */ }
   [data-theme="light"] { /* override colors */ }

/* 2. Reset & Base */
/* 3. Typography */
/* 4. Layout (header, main, nav) */
/* 5. Buttons */
/* 6. Cards */
/* 7. Forms (inputs, selects, toggles) */
/* 8. Modals */
/* 9. Toast */
/* 10. Screens (welcome, grid, detail, done, review, quiz, etc.) */
/* 11. Components (peek-popup, badge, progress, skeleton, heatmap, etc.) */
/* 12. Animations (keyframes) */
/* 13. Responsive (600px, 380px) */
```

---

## 七、实施顺序

| Step | 内容 | 工作量 |
|------|------|--------|
| 1 | 设计 Token 统一：颜色/间距/字体/圆角/阴影/过渡变量 | 小 |
| 2 | 按钮/输入框/卡片/模态框体系重构 | 中 |
| 3 | 欢迎页 + 词网格视觉翻新 | 中 |
| 4 | 详情页 + 复习页 + 测验页视觉翻新 | 中 |
| 5 | 动效系统升级（入场/微交互/过渡） | 中 |
| 6 | 设置/阅读/听写/完形/同步 视觉统一 | 小 |
| 7 | CSS 清理（删除冗余，组件注释分组） | 中 |

---

## 八、验收标准

- [ ] CSS 自定义属性覆盖所有颜色/间距/圆角/字体
- [ ] 浅色主题只靠变量覆盖，不复制样式
- [ ] 5 种按钮变体全站统一
- [ ] 4 种卡片变体全站统一
- [ ] 模态框全站统一
- [ ] 间距基于 4px 网格体系
- [ ] 字体层级清晰（标题/正文/辅助）
- [ ] 欢迎页信息层级优化
- [ ] 词网格词块尺寸统一
- [ ] 入场动效全屏统一规范
- [ ] 微交互反馈全站一致
- [ ] CSS 无冗余样式
- [ ] 深色/浅色主题都好看
- [ ] 无功能回归
