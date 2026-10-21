# 桌宠（触发器+目标区）实现状态调查报告

## 摘要

桌宠由 **两个独立的无边框透明窗口** 组成：**触发器窗口** (triggerWindow，钥匙/药瓶/纸飞机) 和 **目标区窗口** (dropzoneWindow，宝箱/坩埚/相册)。两者均设置了 `frame: false`、`transparent: true`、`hasShadow: false`，已经是无边框的。

**关键发现：**
1. 两个窗口的 `resizable` 均设为 `false`，**不支持缩放**。
2. 触发器支持鼠标拖动移动（通过主进程 60fps setInterval 跟踪鼠标位置实现），**但目标区窗口不支持移动**（虽然有 `moved` 事件监听来保存位置，但没有任何代码实际移动它——dropzone 窗口没有像 trigger 那样的拖动跟踪系统）。
3. HTML 中两个窗口均设置了 `-webkit-app-region: no-drag`，且触发器的移动是 **通过全局鼠标拦截实现的自定义拖拽**，而非 Electron 原生的窗口拖拽区域。
4. 存在**两套并行的桌宠 UI 实现**：一套在 `TriggerApp.tsx` + `DropZoneApp.tsx`（实际使用的，分别加载到 trigger.html 和 dropzone.html），另一套在 `WidgetApp.tsx`（加载到 widget.html，包含所有组件在一个窗口中，**似乎未被主进程使用**）。

---

## 详细发现

### 1. 窗口创建方式与 BrowserWindow 配置

文件：`src/main/index.ts`

#### 触发器窗口 (`createTriggerWindow`, ~第90-126行)
```typescript
triggerWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: clamp(bounds.width, 40, 200),   // 40-200px
    height: clamp(bounds.height, 40, 200),  // 40-200px
    frame: false,         // ✅ 无边框
    transparent: true,    // ✅ 透明背景
    alwaysOnTop: true,    // ✅ 始终置顶
    resizable: false,     // ❌ 不可缩放
    hasShadow: false,     // ✅ 无阴影
    skipTaskbar: true,    // ✅ 不在任务栏显示
    title: '触发物',
})
```

#### 目标区窗口 (`createDropzoneWindow`, ~第130-166行)
```typescript
dropzoneWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: clamp(bounds.width, 80, 500),   // 80-500px
    height: clamp(bounds.height, 80, 500),  // 80-500px
    frame: false,         // ✅ 无边框
    transparent: true,    // ✅ 透明背景
    alwaysOnTop: true,    // ✅ 始终置顶
    resizable: false,     // ❌ 不可缩放
    hasShadow: false,     // ✅ 无阴影
    skipTaskbar: true,    // ✅ 不在任务栏显示
    title: '目标区',
})
```

**结论：两个窗口都已经是无边框透明窗口。没有传统意义上的"窗口边框"问题。**

#### 默认配置（`src/main/store/ConfigStore.ts`）
```typescript
triggerBounds: { x: 200, y: 300, width: 60, height: 60 },
dropzoneBounds: { x: 400, y: 300, width: 120, height: 120 }
```

### 2. 三种样式方向定义

#### 皮肤类型（`src/shared/types/api.ts`）
```typescript
skin: 'pixel' | 'magic' | 'paper'
```

#### 皮肤名称（`src/renderer/src/App.tsx` 顶部）
```typescript
const SKIN_LIST = [
  { id: 'pixel', name: '像素宝箱', preview: '🗝' },
  { id: 'magic', name: '魔法药瓶', preview: '🧪' },
  { id: 'paper', name: '纸飞机', preview: '✈' }
]
```

#### 各皮肤对应的桌宠元素

| 皮肤 | 触发器（钥匙类） | 目标区（宝箱类） |
|------|-----------------|-----------------|
| pixel | 金色钥匙 (PixelKey) | 宝箱 (PixelChest) |
| magic | 魔法药瓶 (MagicBottle) | 炼金坩埚 (MagicCauldron) |
| paper | 纸飞机 (PaperPlane) | 记忆相册 (MemoryAlbum) |

### 3. UI 渲染逻辑

#### 实际使用的实现（两套独立窗口）

**触发器渲染** (`src/renderer/src/TriggerApp.tsx`)：
- 根据 `skin` 配置渲染对应的 SVG 图标（48x48）
- 标签文字："拖动我" / "放置!"
- 鼠标按下 → `triggerEvents.sendStartDrag()`
- 鼠标释放 → `triggerEvents.sendEndDrag()`
- 监听 `widget:cross-window-hover` 事件更新高亮状态
- 监听 `job:state-change` 事件重置状态
- 所有样式用 inline style

**目标区渲染** (`src/renderer/src/DropZoneApp.tsx`)：
- 根据 `skin` 和 `zoneState` 渲染对应的 SVG 图标（80x80）
- 状态：idle → hover → triggered
- 视图切换：idle → pipeline → reveal → error
- 监听 `widget:cross-window-hover` 事件
- 监听 `job:state-change` 事件
- Pipeline 面板显示 5 个阶段进度
- Reveal 面板显示生成结果 + 保存/关闭按钮
- Error 面板显示错误 + 重试/关闭按钮
- 所有样式用 inline style

#### 未使用的旧实现 (`src/renderer/src/WidgetApp.tsx`)
- 将所有功能整合在一个组件中（触发器 + 目标区 + pipeline + reveal + error + confirm dialog）
- 对应 `widget.html`，**但主进程中没有任何代码加载 widget.html**
- 这个文件似乎是一个更早的、将所有内容放在单个窗口中的设计

### 4. 移动和缩放支持情况

#### 触发器移动（支持 ✅）
- **实现方式**：主进程 `src/main/index.ts` 第 330-341 行的 setInterval（~60fps）
- 鼠标按下时记录起始位置 (`startDragTracking`)
- 每帧检查鼠标位置，调用 `triggerWindow.setPosition()` 移动窗口
- 松开时检查是否在目标区范围内 (`handleDrop`)
- `triggerWindow.on('moved')` 事件监听器保存新位置到 ConfigStore

#### 目标区移动（不支持 ❌）
- 有 `dropzoneWindow.on('moved')` 监听器来保存位置
- **但没有任何代码来移动 dropzoneWindow**——没有拖动跟踪、没有 IPC 处理、没有 `-webkit-app-region: drag`
- dropzone.html 明确设置了 `-webkit-app-region: no-drag`
- 目标区窗口被"锁定"在初始位置

#### 缩放（两者都不支持 ❌）
- 两个窗口的 `resizable: false`
- 没有缩放相关的 IPC、事件或 UI

### 5. 触发器与目标区之间的关系

#### 窗口关系
- **触发器窗口**（小，40-200px）：用户可拖动的钥匙/药瓶/纸飞机
- **目标区窗口**（大，80-500px）：固定的宝箱/坩埚/相册
- 触发器被拖到目标区上方 → 触发图片生成

#### 拖拽检测系统（`src/main/index.ts`）
1. `widget:start-drag` IPC → 主进程开始跟踪鼠标位置
2. setInterval 60fps 移动触发器窗口 + 检测是否悬停在目标区上方
3. `widget:cross-window-hover` 事件广播给两个窗口更新视觉状态
4. `widget:end-drag` IPC → 如果在目标区内则触发 `triggerGeneration()`

#### IPC 通道汇总
| 通道 | 方向 | 用途 |
|------|------|------|
| `widget:get-trigger-bounds` | invoke | 获取触发器位置 |
| `widget:get-dropzone-bounds` | invoke | 获取目标区位置 |
| `widget:get-dropzone-rect` | invoke | 获取目标区矩形（同 bounds） |
| `widget:cross-window-hover` | send→renderer | 跨窗口悬停状态 |
| `widget:start-drag` | renderer→send | 开始拖动 |
| `widget:end-drag` | renderer→send | 结束拖动 |
| `job:state-change` | send→renderer | 任务状态广播 |

### 6. 所有与桌宠相关的代码文件

| 文件 | 作用 |
|------|------|
| `src/main/index.ts` | 窗口创建 (第80-166行)、拖拽检测系统 (第170-240行)、IPC handlers (第250-280行)、鼠标追踪循环 (第328-341行) |
| `src/main/store/ConfigStore.ts` | 默认配置（triggerBounds, dropzoneBounds） |
| `src/main/ipc/index.ts` | 通用 IPC handlers（config get/set 等） |
| `src/preload/index.ts` | 暴露 electronAPI.widget 和 triggerEvents 给渲染进程 |
| `src/shared/types/api.ts` | WidgetBounds 类型、AppConfig.skin、ElectronAPI.widget 接口定义 |
| `src/renderer/trigger.html` | 触发器窗口 HTML 入口 |
| `src/renderer/dropzone.html` | 目标区窗口 HTML 入口 |
| `src/renderer/widget.html` | 旧版 widget HTML（未使用） |
| `src/renderer/src/trigger.tsx` | 触发器 React 入口点 |
| `src/renderer/src/dropzone.tsx` | 目标区 React 入口点 |
| `src/renderer/src/widget.tsx` | 旧版 widget React 入口点 |
| `src/renderer/src/TriggerApp.tsx` | 触发器 UI 组件（PixelKey, MagicBottle, PaperPlane） |
| `src/renderer/src/DropZoneApp.tsx` | 目标区 UI 组件（PixelChest, MagicCauldron, MemoryAlbum） |
| `src/renderer/src/WidgetApp.tsx` | 旧版一体化组件（未使用） |
| `src/renderer/src/styles/global.css` | 全局样式（第263-596行包含 widget/pipeline/reveal/error 样式） |
| `src/renderer/src/App.tsx` | 控制页（皮肤选择器 SKIN_LIST） |

---

## 结论与建议

### 当前问题总结
1. **样式很简陋**：SVG 图标都是基础几何图形，线条粗糙，缺乏细节和质感
2. **目标区无法移动**：用户只能移动触发器，目标区窗口被锁定在初始位置
3. **无法缩放**：两个窗口都设为 `resizable: false`
4. **代码冗余**：存在两套并行实现（WidgetApp vs TriggerApp+DropZoneApp），前者未被使用

### 建议修改方向
1. **重设计 SVG 样式**：三个皮肤的触发器和目标区都需要更精美的 SVG，可以加入渐变、阴影、动画效果
2. **移除 `resizable: false` 或添加自定义缩放控件**
3. **为目标区添加移动能力**：可复用触发器的拖动跟踪系统，或改用 `-webkit-app-region: drag`
4. **清理冗余代码**：删除 WidgetApp.tsx / widget.html / widget.tsx 如果确定不使用
5. **考虑使用 `-webkit-app-region: drag`** 替代全局鼠标拦截，实现更自然的窗口拖拽
