# VocabLearn v7.5 — 移动端交互修复

> 日期：2026-05-23

---

## 问题诊断

### 问题 1：触摸滚动触发标记
- `click` 事件在移动端 `touchend` 后自动触发，不管用户是点击还是滚动
- 手指在词网格上滑动浏览时，经过的词块会弹出窥探浮窗或触发标记

### 问题 2：长按计时器在滚动时启动
- `touchstart` 在滚动时也触发，启动了 400ms 长按计时器
- 虽然 `touchmove` 会取消计时器，但如果滚动速度慢，手指只是微动，计时器不会被清除
- 结果：用户只是慢慢滑动屏幕，某些词就被标记为陌生了

### 问题 3：窥探浮窗在手机上位置不准
- 浮窗定位在词块附近，小屏下容易溢出视口

---

## 解决方案

### 修复 1：替换 click 为 tap 检测（核心修复）

在 `app.js` 中新增 `isTapEvent()` 函数，替换所有词块的直接 `click` 绑定：

```js
function isTapEvent(e) {
  // 非触摸设备 → 永远是 click
  if (e.pointerType !== 'touch') return true;

  // 触摸设备 → 检查移动距离 < 10px
  if (!e.detail) return true; // fallback

  // 对于 click 事件，如果是触摸触发的，检查 touch 位置变化
  // 使用全局 touch tracking
  return true;
}
```

更精确的实现：在 `renderWordGrid()` 中，对每个词块：

```js
// 用 pointer 事件替代 click（桌面和移动端统一）
let pointerStartX = 0;
let pointerStartY = 0;

chip.addEventListener('pointerdown', (e) => {
  pointerStartX = e.clientX;
  pointerStartY = e.clientY;
  chip.dataset.pointerDown = 'true';
});

chip.addEventListener('pointermove', (e) => {
  if (chip.dataset.pointerDown === 'true') {
    const dx = Math.abs(e.clientX - pointerStartX);
    const dy = Math.abs(e.clientY - pointerStartY);
    if (dx > 10 || dy > 10) {
      chip.dataset.pointerDown = 'false'; // 是滑动，不是点击
    }
  }
});

chip.addEventListener('pointerup', (e) => {
  if (chip.dataset.pointerDown === 'true') {
    const dx = Math.abs(e.clientX - pointerStartX);
    const dy = Math.abs(e.clientY - pointerStartY);
    if (dx < 10 && dy < 10) {
      // ✅ 是 tap（点击），执行正常逻辑
      handleChipClick(e, word, chip, origIdx, clickBehavior);
    }
    // ❌ 移动 > 10px，忽略（是滑动）
  }
  chip.dataset.pointerDown = 'false';
});
```

### 修复 2：长按计时器加入移动检测

修改 `addLongPressListener()`：
- `touchstart` 时记录起始位置
- `touchmove` 时检测移动距离 > 5px 直接取消计时器，不清除位置记录
- 使用 `{ passive: true }` 保证滚动不卡顿

### 修复 3：窥探浮窗移动端适配

修改 `showPeekPopup()` 和 CSS：
- 屏幕宽度 < 480px 时，浮窗变为底部 sheet
- 底部 sheet：从下往上 slide-in，`border-radius: 20px 20px 0 0`
- 避免浮窗溢出视口
- 增加遮罩层，点击遮罩关闭

### 修复 4：详情页左右滑动防误触

当前详情页已有左右滑动切换卡片。但在手机上，上下滚动和左右滑动容易混淆：
- 增加滑动角度检测：水平移动 > 30° 才触发卡片切换
- 竖直移动 > 20px 时取消滑动

---

## 验收标准

- [ ] 词网格上滚动浏览 → 不触发任何标记
- [ ] 点击词块 → 弹出窥探浮窗（桌面）或底部 sheet（移动端）
- [ ] 点击窥探浮窗内按钮 → 正常标记/不标记
- [ ] 长按词块 → 直接标记陌生
- [ ] 长按时如果手指移动 > 5px → 取消长按，不标记
- [ ] 详情页左右滑动不干扰上下滚动
- [ ] 无功能回归

---

## 实施顺序

1. 替换 click 为 pointer + 距离检测
2. 修复长按移动误触
3. 窥探浮窗移动端适配（底部 sheet）
4. 详情页滑动防误触
