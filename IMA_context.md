# IMA_context.md — 记忆炼金（ImgHeTi）项目现状

> 本文件是项目的“活文档”，随项目演进而更新。只记录事实与关键结构，不含废话。
> 更新时请同步修改本文件的“版本/现状”相关小节。

---

## 1. 一句话定位与赛道

- 一句话：把等待 AI 的 1–3 分钟，变成「开一只装着自己记忆的盲盒」。
- 赛道：赛道一 · 无用之用（AWS KIRO 鬼点子计划）。
- 核心卖点：私人相册随机抽图 + 黑盒随机融合 + 仪式感桌面交互（钥匙→宝箱），结果可溯源。
- 备选名：记忆炼金 / Memory Alchemy / NOT / ImgHeTi。

---

## 2. 当前总体状态

- 项目可跑通：Electron 桌面应用，`npm run dev` 启动后出现 **控制页 + 触发物 + 目标区** 三个窗口。
- Demo 模式完整闭环（无 Key、无网络）：本地预置示例图 → 五段流水线 → 揭晓 → 保存/重试/丢弃。
- Real 模式：已写 adapter（Qwen VL / DeepSeek / Qwen Image），但 **图片生成模型名与文档不一致，且 endpoint/参数未按真实 API 文档核实**。
- **已做（第 1 轮）**：① 修复“触发后宝箱消失”bug（目标区常驻宝箱，钥匙触发后复位到拖拽前位置）；② 新增 token/图片用量监控（文本 token + 输入/输出图片数，展示在控制页）。
- **已做（第 2 轮 · 生成稳定性）**：③ 图片理解改为**严格 JSON 输出 + 兜底解析**（废掉脆弱正则）；④ 新增**提示词守卫**（拦截空值/占位符/中文混入，不合格重试一次）；⑤ 脑洞提示词加**锚定约束**（必须使用原图主体与细节、多图各至少贡献一个元素）+ **创作尺度**（保守/平衡/放飞，影响约束强度与 temperature）；⑥ 新增**生成后相关性自检**（identical/related/unrelated，不合格自动重生成一次，可关）；⑦ 图像生成 `prompt_extend` 仅在“放飞”档开启；⑧ 新增**全链路可观测性**（理解原文、解析结果、脑洞原文、守卫结论、质检结论全部落库并在控制页可查看）。
- **已做（第 3 轮 · 兜底与桌面控制）**：⑨ 修复输入图片计数 bug（生成阶段参考图不再重复 +1，2 张不再显示 3 张）；⑩ 控制页新增「隐藏/显示桌宠」「桌宠置顶」开关（置顶默认关，桌宠与普通浏览器同级）；⑪ 兜底强化：提示词请求失败→本地模板、审查服务不可用→跳过放行、图片生成失败/返回空图→自动重试；⑫ 用量展示增加「按阶段明细」（可看到失败重试的每次调用成本）。
- **已做（第 4 轮 · 揭晓与保存）**：⑬ 生成成功自动弹出「揭晓窗口」（大图 + 主题 + 提示词 + [保存][另存为…][查看原图][关闭]）；⑭ 新增「默认保存目录」设置（默认 `系统图片目录\记忆炼金`，一键[保存]存到这里，[另存为…]走系统对话框）；⑮ 删历史记录时同步清理内部缓存文件。
- **已做（第 5 轮 · 新增三套桌宠皮肤）**：⑯ 新增 `wish` 星空许愿（星星+许愿瓶，接触时瓶身与瓶内小星星抖动）、`battery` 电池仓（电池+电池仓，接触发光+微电流）、`spider` 小蜘蛛（Q版蜘蛛+蜘蛛网，接触时网上开花）。共 6 套皮肤，尺寸与原有三套一致（触发物 56px / 目标区 96px）。
- lint（0 error）、typecheck（node + web）通过。关键缺口（详见 §11）：**0 个测试文件**；Real 模式“上传二次确认”未真正接入；缩放不完整。

---

## 3. 技术栈

| 层次 | 技术 |
|---|---|
| 桌面框架 | Electron 28 |
| 前端 | React 18 + TypeScript 5 |
| 构建 | Vite 5 + electron-vite 2 |
| 状态管理 | Zustand（已声明依赖，主流程实际用 React useState） |
| 样式 | CSS Modules + CSS 变量 + 大量 inline style（皮肤 SVG） |
| 测试 | Vitest + fast-check（已配置，**但当前无测试文件**） |
| Lint | ESLint + Prettier |

---

## 4. 进程与窗口架构

- **主进程**（`src/main/`）：所有 FS、路径校验、网络请求、IPC handler、状态机。
- **渲染进程**：contextIsolation 开启，`nodeIntegration: false`，仅通过 preload 的 `contextBridge` 访问 `window.electronAPI` / `window.triggerEvents`。
- 三个实际窗口：
  1. `index.html` → 控制页（`App.tsx`）：目录/排除/参考图模式/皮肤/模式切换/隐私/API 状态/实时流水线/历史。
  2. `trigger.html` → 触发物（`TriggerApp.tsx`）：钥匙/药瓶/纸飞机，自定义拖拽。
  3. `dropzone.html` → 目标区（`DropZoneApp.tsx`）：宝箱/炼金锅/相册，常驻展示（hover/触发发光），进度与结果统一在控制页。
  4. `reveal.html` → 揭晓窗口（`RevealApp.tsx`）：生成成功自动弹出，展示大图 + 保存/另存为/查看原图/关闭。
- **遗留死代码**：`widget.html` + `WidgetApp.tsx` + `widget.tsx` 是早期“单窗口挂件”实现，主进程已不再加载，可清理（保留 `UploadConfirmDialog` 逻辑作为上传确认的参考实现）。

窗口细节：
- trigger / dropzone 均为 `frame:false, transparent:true, skipTaskbar:true`；`alwaysOnTop` 由配置 `widgetAlwaysOnTop` 控制（默认 false，即与普通浏览器同级，不压住浏览器）。
- **dropzone 移动**：原生 `-webkit-app-region: drag`（dropzone.html）。
- **trigger 移动**：自定义拖拽（mousedown→`widget:start-drag`，mousemove→`widget:drag-move`，mouseup→`widget:end-drag`），主进程移动窗口并判定与 dropzone 是否相交。
- **缩放**：dropzone 有 `dropzoneScale` 配置 + 渲染层 CSS `transform: scale()`；trigger 固定尺寸；均无控制页 UI 入口，窗口本身 `resizable:false`（**不满足任务书“可扩大/缩小”完整要求**）。

---

## 5. 主流程（五段流水线）与状态机

```
本地随机选图 → 图片理解 → 脑洞 Prompt → 安全守门 → 图片生成 → 揭晓溯源
selecting      describing   prompting     moderating    generating    succeeded
```

- 驱动：`GenerationJobService.runPipeline()`（主进程，顺序 async，非框架编排）。
- `GenerationJob` 状态机（`src/main/job/GenerationJob.ts`）：
  `idle → selecting → describing → prompting → moderating → generating → succeeded | failed | cancelled`
  非法转换抛错；`cancel()` 触发 `AbortController.abort()`；`reset()` 仅允许从 succeeded/failed/cancelled 回 idle。
- 每个网络请求附加 60s `AbortSignal.timeout`；新任务会先取消旧任务；旧任务回调按 `jobId` 丢弃。
- `retry()` 复用上次 `pendingPhotos` 走同一条 `runPipeline`（跳过抽图，从 describing 重跑）。
- 图片生成只把 **第一张原图** 作为视觉参考传入（`photos[0].path`），其余图提供语义灵感（描述文本）。
- **质量闸门**：`prompting` 阶段跑 `checkPrompt()`（`src/main/job/promptGuard.ts`），只阻断「内容空/过短」「占位符 `[主体对象]`」这类**结构性问题**；**中文不阻断**（Qwen-Image 支持中文提示词，早期误拦已修正）。命中阻断项时把失败原因回传给模型 + 降低采样温度重试一次（`MAX_PROMPT_ATTEMPTS=2`），仍不合格则改用 `buildFallbackPrompt()` 本地兜底模板，保证流水线不中断。`moderating` 阶段若不通过，会把**拒绝原因回传给脑洞模型**重新生成提示词再审一次（`MAX_MODERATION_ATTEMPTS=2`），并把原因写入错误提示与链路详情。`generating` 阶段跑 `verifyRelevance()` 自检，判定 identical/unrelated 则自动重生成一次（`MAX_IMAGE_ATTEMPTS=2`）。
- **触发交互**：只有“钥匙拖到宝箱上松开”才触发；触发后钥匙复位到拖拽前位置（防止持续重叠误触发）；目标区窗口常驻宝箱（不随状态切换视图），流水线进度/结果/用量统一展示在控制页。

---

## 6. 模型与提示词（现有实现）

### 6.1 模型配置（注意文档与代码不一致）

| 角色 | 文档口径 | 代码实际 |
|---|---|---|
| 脑洞 + 守门（文本） | deepseek-v4 | `deepseek-v4-pro`（`DeepSeekAdapter`，`api.deepseek.com/chat/completions`） |
| 视觉理解 | qwen3-vl-plus | `qwen3-vl-plus`（`QwenVLAdapter`，dashscope multimodal-generation） |
| 图片生成 | qwen-image-3.0 | **`qwen-image-2.0-pro`**（`QwenImageAdapter`，dashscope multimodal-generation，messages 格式） |

- `ModelGateway` 五接口：`describeImages` / `createPrompt` / `moderatePrompt` / `generateImage` / `verifyRelevance`；方法统一返回 `ModelResult<T> = { data, usage, raw? }`（`raw` 为模型原文，供排障）。`createPrompt` / `generateImage` 额外接收 `{ creativity }`。
- 工厂 `createModelGateway(mode)`：demo→`MockModelGateway`；real→`RealModelGateway`（组合 QwenVL + DeepSeek + QwenImage）。real 但缺 Key 时回退 mock。
- **待核实**：QwenImageAdapter 用的 endpoint 与 messages 参数格式需按真实 API 文档确认（任务书阶段三要求）。
- 每个 adapter 方法返回 `{ data, usage }`（`ModelUsage`），聚合后写入 `ProvenanceRecord.usage`（`GenerationUsage`）。

### 6.2 现有提示词

- **理解**（`QwenVLAdapter.DESCRIBE_INSTRUCTION`，逐图单次调用，`max_tokens: 800`）：
  要求只输出一个 JSON 对象，结构
  `{"subjects":[...],"environment":"...","colors":[...],"mood":"...","details":[...]}`；
  并强制三条：① 所有字段必填且用中文；② 必须具体（例“白底黑字的招牌”而非“文字”）；**③ 画面中出现人物（含自拍者/路人）必须写入 subjects，不许忽略人**。
  解析：先 `extractJson()` 取第一个完整 JSON 对象；失败回退 `fromText()` 前缀解析；再失败则把整段原文塞进 environment 兜底（保证信息不整体丢失）。
- **脑洞**（`DeepSeekAdapter.buildSystemPrompt(creativity)`，`response_format: json_object`，`thinking:{type:'disabled'}`，temperature 0.6/0.85/1.05）：
  角色为“AI 绘画提示词工程师”，五条硬性规则：① 必须直接使用描述中的主体/环境/颜色/细节，不得替换成描述外的主体或场景；② 每张照片至少 1 个可识别元素出现在最终提示词中；③ `text` 只能英文、不得含中文、**不得含方括号占位符（如 `[主体对象]`）**、不得留未填充模板变量；④ 必须具体描写主体/环境/颜色/光线/风格；⑤ 禁止色情暴力恐怖仇恨。
  再叠加创作尺度规则：保守＝不得增删或替换主体；平衡＝保留核心主体，可改风格光线组合；放飞＝可超现实重构但仍须保留可识别元素。
- **守门**（`DeepSeekAdapter.MODERATOR_SYSTEM_PROMPT`，temperature 0）：
  只对【明确】的色情/性暗示、暴力伤害、恐怖主义、仇恨歧视、自残自杀、未成年人性化判不通过；并**显式列出必须判通过的常见正常内容**（人物/肖像/自拍、动物、儿童日常、黑暗夜景、奇幻/超现实/科幻、戏剧性光影与史诗感构图），明确禁止因风格词（cinematic/dark/dramatic/epic/fantasy/surreal/moody）或中性人物/身体描述而误判；拿不准时判通过；不通过时 `reason` 必须引用具体问题片段。
  结论解析为**容错**（`resolveVerdict`）：兼容 `true/"true"/"yes"/"通过"` 等文本写法，也兼容 `safe`/`ok`/`allowed`/`violation` 等别名字段；完全无法解析时才判不通过，且如实标注「审查结论无法解析」而非内容问题。
- **质检**（`QwenVLAdapter.verifyRelevance`，最多带 2 张参考图 + 生成图）：
  判断“生成作品 vs 原始素材”关系，输出 `{"verdict":"identical|related|unrelated","reason":"..."}`；identical＝几乎复制原图，related＝保留至少一个可识别主体/场景，unrelated＝几乎无关联。

---

## 7. 核心模块清单（主进程）

| 模块 | 文件 | 职责 |
|---|---|---|
| 窗口/生命周期/拖拽判定 | `src/main/index.ts` | 三窗口创建、trigger 拖拽跟随、dropzone 尺寸自适应状态、job 广播、widget IPC |
| PhotoRepository | `src/main/photo/PhotoRepository.ts` | 递归扫描、格式过滤(`.jpg/.jpeg/.png/.gif/.webp`)、排除过滤、Fisher-Yates 随机抽样 + 上次批次去重 |
| GenerationJob | `src/main/job/GenerationJob.ts` | jobId(UUID)、AbortController、严格状态机 |
| GenerationJobService | `src/main/job/GenerationJobService.ts` | 五段流水线驱动（含提示词守卫重试、生成后自检重试）、旧 job 丢弃、60s 超时、错误映射、重试、链路中间产物记录、结果落盘(userData/generated) |
| promptGuard | `src/main/job/promptGuard.ts` | 提示词守卫：阻断空值 / 占位符 `[...]`；中文与缺主题仅作提示不阻断；`buildFallbackPrompt()` 本地兜底模板 |
| ModelGateway 接口 | `src/main/gateway/ModelGateway.ts` | 四接口 + 数据类型 |
| MockModelGateway | `src/main/gateway/MockModelGateway.ts` | demo 确定性预置数据 + 延时，零网络 |
| DeepSeekAdapter | `src/main/gateway/DeepSeekAdapter.ts` | 脑洞 + 守门 |
| QwenVLAdapter | `src/main/gateway/QwenVLAdapter.ts` | 视觉理解（JSON 结构化）+ 生成结果相关性校验 |
| QwenImageAdapter | `src/main/gateway/QwenImageAdapter.ts` | 图片生成 |
| createModelGateway | `src/main/gateway/createModelGateway.ts` | demo/real 工厂 |
| ConfigStore | `src/main/store/ConfigStore.ts` | AppConfig 持久化到 userData/config.json |
| ProvenanceStore | `src/main/store/ProvenanceStore.ts` | 溯源记录 save/list/delete → userData/provenance.json |
| FileService | `src/main/file/FileService.ts` | 保存图（系统对话框 + 防覆盖源目录）、读缩略图、打开查看器 |
| IPC 注册 | `src/main/ipc/index.ts` | photo/job/config/provenance/file/env 等 handler |

---

## 8. 数据模型与配置

- `AppConfig`（`src/shared/types/api.ts`）：`mode('demo'|'real')`、`skin('pixel'|'magic'|'paper')`、`referenceCount(1|'multi')`、`creativity('faithful'|'balanced'|'wild')`、`qualityGuard(boolean)`、`widgetVisible(boolean)`、`widgetAlwaysOnTop(boolean)`、`directories[]`、`exclusions[]`、`triggerBounds`、`dropzoneBounds`、`dropzoneScale`。默认：demo / pixel / 1 / balanced / 守卫开 / 桌宠显示开 / 不置顶 / 空目录。
- `ProvenanceRecord`：id、createdAt、theme、promptText、promptStyle、sourcePhotos[{path,filename}]、generatedImagePath、savedImagePath、isDemoGeneration、usage?、debug?。
- `GenerationDebug`：`rawDescriptions`（理解原文）、`descriptions`（解析结果）、`rawPromptOutput`（脑洞原文）、`promptIssues`（守卫阻断项）、`promptAdvisory`（守卫提示项，如含中文）、`usedFallbackPrompt`（是否用了兜底模板）、`moderation`（内容审查结论：passed/reason/raw）、`quality`（相关性质检）、`imageAttempts`（生成尝试次数）。控制页历史卡片“查看链路详情”可展开。
- `QualityVerdict`：`{ verdict: 'identical'|'related'|'unrelated'|'unknown'; reason: string }`。
- `ModelUsage` / `GenerationUsage`：每次模型调用 / 整次生成的用量（文本输入输出 token、输入图片数、输出图片数、分阶段明细）。
- `JobStateEvent`：jobId、state、progress、error{stage,message,code}、result{imageDataUrl,provenance}。
- 六套皮肤：`pixel` 钥匙+宝箱 / `magic` 药瓶+炼金锅 / `paper` 纸飞机+窗户（接触开窗露出五彩景色） / `wish` 星星+许愿瓶（瓶身略倾斜，接触抖动） / `battery` 电池+电池仓（接触发光+微电流） / `spider` 蜘蛛+蜘蛛网（标准对称网、无阴影、接触时小花慢绽）。所有目标区皮肤已 `overflow="visible"`，解除发光被 viewBox 上下截断的问题。

---

## 9. IPC 通道（preload 暴露）

- `window.electronAPI.photo.*`：selectDirectory / addDirectory / removeDirectory / listDirectories / addExclusion / removeExclusion / listExclusions。
- `window.electronAPI.job.*`：start / cancel / retry / onStateChange。
- `window.electronAPI.config.*`：get / set。
- `window.electronAPI.provenance.*`：save / list / delete。
- `window.electronAPI.file.*`：saveGeneratedImage / openImageViewer / readThumbnail。
- `window.electronAPI.env.get(name)`：**当前返回 env 的完整值**（UI 只用布尔判断存在与否，但值确实越过了 IPC 边界，与“不把 Key 传给渲染进程”的意图略有出入）。
- `window.electronAPI.widget.*`：getTriggerBounds / getDropzoneBounds / getDropzoneRect / onDropzoneRect / onCrossWindowHover / onJobStateChange。
- `window.triggerEvents.*`：sendStartDrag / sendDragMove / sendEndDrag。

---

## 10. KIRO / 规格现状

- `.kiro/specs/img-memory-alchemy/`：feature spec，`workflowType: requirements-first`，含 requirements.md（14 组需求，Given/When/Then）、design.md（架构/状态机/属性测试定义）、tasks.md（三阶段任务，主体标 [x]，测试类标 [ ]* 未做）、tasks.meta.json。
- `.kiro/specs/widget-independent-pets/`：bugfix spec，`workflowType: requirements-first`，含 bugfix.md（把单窗口挂件拆成 trigger+dropzone 两个独立窗口）。
- `.agents/tasks/pet-investigation-2026-10-13/report.md`：桌宠实现状态调查（部分结论已过时：其称 dropzone 不能移动、trigger 用 60fps setInterval，与当前代码不符）。

---

## 11. 已知差距与待办（后续迭代重点）

1. **0 个测试文件**：vitest 已配置、README/design/tasks 均声称有单元+属性测试，实际 `src/**` 无 `*.test.ts` / `*.spec.ts`，`npm run test` 会空跑。
2. **Real 模式上传二次确认未真正接入**：`GenerationJobService` 在 real 模式 emit `{state:'selecting', progress:-1}` 作为“确认信号”，但**没有等待用户确认**就直接进入 describing 发起网络请求；实际窗口 `DropZoneApp` 未实现确认弹窗（确认弹窗逻辑只在遗留 `WidgetApp.tsx` 里，且文件名是硬编码占位）。
3. **图片生成模型名不一致**：文档 qwen-image-3.0 vs 代码 `qwen-image-2.0-pro`；QwenImageAdapter endpoint/参数待按真实 API 文档核实。
4. **缩放不完整**：trigger/dropzone 窗口 `resizable:false`，dropzone 仅渲染层缩放且无 UI 入口，trigger 无法缩放，不满足“可扩大/缩小（有大小上下限）”。
5. **重试语义**：`retry()` 总是从 describing 重跑，非“从失败阶段续跑”（需求 7.4）。
6. **遗留死代码**：WidgetApp.tsx / widget.html / widget.tsx 未使用，建议清理（确认弹窗逻辑先迁到 DropZoneApp 再删）。
7. **小问题**：`env:get` IPC 返回值越过边界（UI 只用布尔判断存在与否，但值本身会传到渲染进程）。
8. **`out/`、`.env`、`dist/`、生成图/历史目录**需确认 `.gitignore` 覆盖（任务书要求）。
9. **多图仍只把第一张进视觉通道**：`generateImage` 只传 `photos[0]`，第 2/3 张仅通过文字摘要影响结果；真正的“多图融合”需按真实 API 文档确认 Qwen-Image 是否支持多图输入。
10. **用量字段名未经真实 API 核实**：`input_tokens/output_tokens/image_tokens` 等按通用约定读取，字段缺失时按 0 记；待 API 文档确认后校正。
11. **质量守卫的代价**：启用后每次生成会多 1 次 VL 调用（参考图最多 2 张 + 生成图），失败或请求体过大时降级为 `unknown` 不阻塞主流程；不合格会再生成一次，耗时与成本上升。可用控制页“质量守卫”开关关闭。
12. **提示词守卫只做结构检查**：只查空值/占位符/中文，不做“是否真的用到了原图主体”的语义级校验，语义级依赖第 6 项的质检兜底。

---

## 12. 关键文件索引

- 需求/背景：`任务书.md`、`关键信息.md`、`记忆炼金_项目全景文档.md`、`README.md`、`Config_ModAPI.md`、`.env.example`。
- 共享类型：`src/shared/types/api.ts`。
- 主流程：`src/main/job/GenerationJobService.ts`、`src/main/job/GenerationJob.ts`、`src/main/job/promptGuard.ts`。
- 模型层：`src/main/gateway/*`。
- 选图：`src/main/photo/PhotoRepository.ts`。
- 窗口/拖拽：`src/main/index.ts`、`src/preload/index.ts`。
- 控制页：`src/renderer/src/App.tsx`。
- 桌宠：`src/renderer/src/TriggerApp.tsx`、`src/renderer/src/DropZoneApp.tsx`（实际使用）；`WidgetApp.tsx`（遗留）。
