# VocabLearn v8.5 — 移动端体验修复

> 2026-05-24

---

## 问题

### 1. 底部导航选中态不更新
`showScreen()` 切换屏幕时，从未更新底部导航按钮的 `.active` 状态。用户切换页面后，高亮按钮仍停在旧页面上。

### 2. 部分页面无法滚动
移动端 WebView 缺少 `-webkit-overflow-scrolling: touch` 和必要的 `overflow-y: auto` 设置。特别是：
- `.word-grid` 网格区域
- `.detail-grid` 详情区域
- `.welcome-scroll` 欢迎页

### 3. 设置面板是模态框而非全屏页
手机端模态框体验差：背景遮罩、内容区太小、滚动不自然。应改为全屏独立页面。

---

## 修复

### 修复 1：底部导航选中态

在 `showScreen()` 结尾增加：
```js
function updateMobileNav(screenName) {
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === screenName);
  });
}
```

调用时机：`showScreen()` 函数末尾，在所有动画完成后调用。

映射关系：
| screen 名称 | 导航按钮 target |
|------------|----------------|
| welcome | welcome |
| grid | learn |
| detail | learn |
| done | learn |
| review | review |
| practice | practice |
| quiz (独立) | practice |
| dictation (独立) | practice |
| cloze (独立) | practice |
| reading | reading |
| settings | settings |

### 修复 2：滚动修复

在 `style.css` 中增加：
```css
/* 移动端滚动修复 */
body { overflow-x: hidden; }
.screen { overflow-y: auto; -webkit-overflow-scrolling: touch; }
.word-grid { overflow-y: auto; -webkit-overflow-scrolling: touch; max-height: calc(100vh - 180px); }
.detail-grid { overflow-y: auto; -webkit-overflow-scrolling: touch; }
.welcome-scroll { overflow-y: auto; -webkit-overflow-scrolling: touch; }
```

### 修复 3：设置全屏页

将设置页面从模态框改为全屏独立页面（仅移动端）：

**在 index.html 中**：
- 新增 `screenSettings` 屏幕（复制当前 modalSettings 的内容）
- 保留桌面端模态框不变
- 移动端点击设置 → 跳转到 screenSettings
- 增加返回按钮

**在 app.js 中**：
- 新增 `openSettingsScreen()` 函数（移动端使用 `showScreen('settings')`）
- 保持 `openSettings()` 不变（桌面端使用模态框）
- 在 `showScreen()` 中检测是否为移动端设置页

**在 CSS 中**：
- .screen#screenSettings 样式
- 移动端设置页全屏样式

### 实现步骤
1. 底部导航更新逻辑
2. 滚动修复 CSS
3. 设置全屏页
