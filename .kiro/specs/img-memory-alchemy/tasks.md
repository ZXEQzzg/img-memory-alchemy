# 实施计划：记忆炼金（Img Memory Alchemy）

## 概述

按照任务书第 6 节的四阶段顺序拆分实施任务：

1. **阶段一：可运行骨架** — Electron + Vite + React + IPC 框架，确保工程可启动
2. **阶段二：Demo 完整闭环** — MockGateway + 三皮肤拖放 + 状态机 + 揭晓保存 + 单测
3. **阶段三：真实模型接入** — ApiGateway adapters + 上传确认 + 错误处理

实现语言：**TypeScript**（Electron 主进程 + React 渲染进程）

---

## 任务

### 一、可运行骨架

- [x] 1. 初始化项目结构与工程配置
  - 使用 `electron-vite` 脚手架初始化，目录结构：`src/main`、`src/preload`、`src/renderer`
  - 配置 TypeScript 5、ESLint、Prettier
  - 创建 `.gitignore`，加入 `.env`、`Config_ModAPI.md`、`dist/`、`generated-images/`、`provenance/`
  - 创建 `.env.example`，列出 `QWEN_API_KEY`、`ANTHROPIC_API_KEY` 占位符
  - 创建 `README.md`，包含本地启动步骤和 Demo 模式说明
  - _需求：14.1、14.2、14.3、14.5、13.3、13.4_

- [x] 2. 搭建 Electron 双窗口框架
  - [x] 2.1 创建主进程入口，管理 ControlPage 窗口和 Widget 窗口的生命周期
    - ControlPage：标准有边框窗口，800×600，可调整大小
    - Widget：无边框透明窗口，默认 240×240，`alwaysOnTop: true`
    - _需求：6.1、6.3_
  - [x] 2.2 实现 Widget 窗口位置与尺寸的持久化读写（写入 `AppConfig`）
    - 最小尺寸 160×160，最大尺寸 480×480
    - 启动时从 ConfigStore 恢复上次位置和尺寸
    - _需求：6.2、6.3、6.4_
  - [ ]* 2.3 为窗口边界限制编写单元测试
    - 测试尺寸 clamp 逻辑：低于最小值 → 160，超过最大值 → 480
    - _需求：6.3_

- [x] 3. 实现 preload IPC 接口骨架
  - [x] 3.1 创建 `preload.ts`，通过 `contextBridge` 暴露 `electronAPI` 类型化接口
    - 注册所有 IPC channel（photo:*、job:*、config:*、provenance:*、file:*）
    - 渲染进程不开启 `nodeIntegration`，启用 `contextIsolation`
    - _需求：13.1、13.2_
  - [x] 3.2 实现主进程 IPC Handler 注册层，所有 handler 统一在 `registerIpcHandlers()` 中注册
    - 每个 handler 调用前验证路径合法性（绝对路径、授权目录前缀）
    - _需求：13.2_

- [x] 4. 实现 ConfigStore 与 AppConfig 持久化
  - [x] 4.1 实现 `ConfigStore`，基于 `electron-store` 或 JSON 文件持久化 `AppConfig`
    - 字段：`mode`（默认 `demo`）、`skin`（默认 `pixel`）、`referenceCount`（默认 `1`）、`directories`、`exclusions`、`widgetBounds`
    - _需求：5.4、6.4_
  - [ ]* 4.2 为 ConfigStore 编写单元测试
    - 测试 get/set 读写一致性（round-trip）
    - _需求：5.4_

- [x] 5. 搭建渲染进程 React 应用骨架
  - [x] 5.1 创建 ControlPage React 应用，展示占位各功能区（目录管理、排除管理、皮肤选择、模式切换、隐私声明）
    - _需求：1、2、3、5_
  - [x] 5.2 创建 Widget React 应用，展示占位皮肤区域和状态面板
    - _需求：4、5、6_

- [x] 6. 阶段一检查点
  - 运行 `npm run lint`、`npm run typecheck`、`npm run build` 确认全部通过
  - 手动启动应用，确认双窗口正常出现，无控制台错误
  - 确保所有测试通过，遇到问题请向用户提问

---

### 二、Demo 完整闭环

- [x] 7. 实现 PhotoRepository 核心逻辑
  - [x] 7.1 实现目录扫描：递归读取授权目录，过滤有效格式，标记损坏/不可访问文件
    - 支持 `.jpg`、`.jpeg`、`.png`、`.gif`、`.webp`
    - _需求：1.3、1.4、1.5、1.6_
  - [ ]* 7.2 为图片格式过滤编写属性测试
    - **属性 1：图片格式过滤正确性**
    - **验证需求：1.3**
    - `// Feature: img-memory-alchemy, Property 1: 图片格式过滤正确性`
  - [x] 7.3 实现排除列表过滤逻辑（文件夹前缀匹配 + 文件精确匹配）
    - _需求：2.3、2.4_
  - [ ]* 7.4 为排除过滤编写属性测试
    - **属性 2：排除列表过滤不变量**
    - **验证需求：2.3**
    - `// Feature: img-memory-alchemy, Property 2: 排除列表过滤不变量`
  - [x] 7.5 实现随机抽样逻辑（`sample()`），保证批次内不重复，优先历史去重
    - _需求：3.2、3.4_
  - [ ]* 7.6 为抽样逻辑编写属性测试
    - **属性 3：批次内不重复**
    - **属性 4：历史去重优先**
    - **验证需求：3.2、3.4**
    - `// Feature: img-memory-alchemy, Property 3: 批次内不重复`
    - `// Feature: img-memory-alchemy, Property 4: 历史去重优先`

- [x] 8. 实现 GenerationJob 状态机
  - [x] 8.1 实现 `GenerationJob` 类：状态机转换、AbortController、jobId（UUID v4）
    - 严格实现 `idle → selecting → describing → prompting → moderating → generating → succeeded | failed | cancelled` 转换
    - 非法转换抛出错误并记录
    - _需求：7.6、12.1、12.3_
  - [ ]* 8.2 为状态机编写属性测试
    - **属性 5：GenerationJob 状态机合法转换**
    - **验证需求：7.6**
    - `// Feature: img-memory-alchemy, Property 5: GenerationJob 状态机合法转换`
  - [x] 8.3 实现 `GenerationJobService`（主进程），管理当前活动 Job，处理旧 Job 结果丢弃逻辑
    - 收到新 `job:start` 时，若有进行中 Job 则先取消
    - 通过 jobId 对比丢弃过期结果
    - _需求：7.5_
  - [x] 8.4 实现超时策略：每个网络请求附加 60s `AbortSignal.timeout`
    - _需求：12.2_

- [x] 9. 实现 MockModelGateway（Demo 模式）
  - [x] 9.1 创建 `MockModelGateway`，实现四个接口，返回确定性本地预置数据
    - `describeImages()`：返回预置的 `ImageDescription` 数组
    - `createPrompt()`：返回预置的 `GeneratedPrompt`（包含主题）
    - `moderatePrompt()`：返回 `{ passed: true }`
    - `generateImage()`：返回本地预置图片的 base64 dataUrl
    - 所有方法不发起任何网络请求
    - _需求：11.1、11.2_
  - [ ]* 9.2 为 DemoMode 零网络请求编写属性测试
    - **属性 7：DemoMode 零网络请求**
    - **验证需求：11.1**
    - `// Feature: img-memory-alchemy, Property 7: DemoMode 零网络请求`
  - [x] 9.3 准备 Demo 模式预置资源：3 张示例原图 + 1 张预置生成图，放入 `src/assets/demo/`
    - _需求：11.1、11.2_

- [x] 10. 实现 ControlPage 功能 UI
  - [x] 10.1 实现目录管理：添加目录（IPC 调用）、移除目录、展示有效图片数量和错误说明
    - _需求：1.1、1.2、1.4、1.5、1.7_
  - [x] 10.2 实现排除管理：添加排除文件夹/图片、展示排除列表、逐条删除
    - _需求：2.1、2.2、2.5_
  - [x] 10.3 实现参考图模式选择（单图 / 多图 Radio），写入 ConfigStore
    - _需求：3.1、3.2_
  - [x] 10.4 实现皮肤选择器（三张皮肤预览卡片），切换后即时更新 Widget
    - _需求：5.1、5.2、5.4_
  - [x] 10.5 实现 Demo/Real 模式切换开关，DemoMode 时显示「演示模式」标签
    - _需求：11.3、11.4_
  - [x] 10.6 实现隐私声明区域（固定文本）和 API 配置状态展示
    - _需求：9.3、8.5_

- [x] 11. 实现 Widget 三套皮肤与触发交互
  - [x] 11.1 创建皮肤资产系统（SVG/PNG 资源 + CSS 变量方案），实现像素宝箱皮肤（皮肤 A）
    - Trigger：像素金钥匙 SVG，idle 与 dragging 两个状态
    - DropZone：像素宝箱 SVG，idle / hover（半开发光）/ triggered 三个状态
    - _需求：5.1、4.3、4.4_
  - [x] 11.2 实现魔法药瓶 + 炼金锅皮肤（皮肤 B）
    - 接近反馈：炼金锅冒泡动效（CSS animation）
    - _需求：5.1_
  - [x] 11.3 实现纸飞机 + 记忆相册皮肤（皮肤 C）
    - 接近反馈：相册封面翻开动效
    - _需求：5.1_
  - [x] 11.4 实现拖放交互逻辑（drag events → IPC job:start），确保点击/悬浮不触发
    - `dragstart` / `dragenter` / `dragleave` / `drop` / `dragend` 全部处理
    - drop 后调用 IPC `job:start`，dragend 后执行 Trigger 复位动画
    - _需求：4.1、4.2、4.3、4.4、4.5、4.6_
  - [x] 11.5 实现「图片数量不足」时禁用 Trigger 的逻辑
    - _需求：3.3_

- [x] 12. 实现流水线状态面板与揭晓面板
  - [x] 12.1 实现 `PipelineStatusPanel`：五个阶段指示器（等待/进行中/完成/失败），带取消按钮
    - 订阅 IPC `job:onStateChange` 事件更新 UI
    - _需求：7.1、7.2_
  - [x] 12.2 实现 `RevealPanel`：生成图展示、本次配方（主题 + 原图缩略图 + 时间）、四个操作按钮
    - _需求：10.1、10.2、10.3、10.4、10.5、10.6_
  - [x] 12.3 实现 `ErrorPanel`：失败阶段描述、重试按钮、丢弃按钮
    - _需求：7.3、7.4_
  - [x] 12.4 实现取消和复位逻辑：取消 → AbortController.abort() → Trigger 动画复位 ≤500ms
    - _需求：12.1、12.3_

- [x] 13. 实现 ProvenanceStore 和文件保存
  - [x] 13.1 实现 `ProvenanceStore`：save / list / delete，持久化到本地 JSON 文件
    - _需求：10.3、10.7_
  - [x] 13.2 实现文件保存 IPC handler（`file:save-generated-image`）：调用系统 save dialog，写入用户指定位置
    - 不覆盖原始照片（保存目标限制在非源图目录）
    - _需求：10.3、10.7_
  - [ ]* 13.3 编写上传集合属性测试
    - **属性 6：上传文件集合是抽取结果的子集**
    - **验证需求：8.3**
    - `// Feature: img-memory-alchemy, Property 6: 上传文件集合是抽取结果的子集`

- [x] 14. 阶段二检查点
  - 运行全部单元测试与属性测试，确认通过
  - 手动验证 Demo 模式：无 Key 无网络完整跑通五段流水线
  - 手动验证三套皮肤交互：接近反馈、触发、复位
  - 验证点击/悬浮不触发生成
  - 确保所有测试通过，遇到问题请向用户提问

---

### 三、真实模型接入

> **前提**：在开始本阶段前，需确认 API 文档（Qwen3-VL-Plus、Anthropic Claude、Qwen-Image-3.0 的 endpoint、鉴权方式、图片传递格式）。若尚未确认，停在 adapter 层并向用户提问。

- [x] 15. 实现 ApiModelGateway（真实 API 模式）
  - [x] 15.1 实现 `QwenVLAdapter`：调用 Qwen3-VL-Plus，实现 `describeImages()`
    - 根据已确认的 API 文档实现鉴权（Bearer Token）、图片编码（base64）和响应解析
    - 传入 AbortSignal，支持取消和 60s 超时
    - _需求：7.1（describing 阶段）、8.1、8.2、8.3、12.2_
  - [x] 15.2 实现 `AnthropicAdapter`：调用 Anthropic Claude API，实现 `createPrompt()` 和 `moderatePrompt()`
    - `createPrompt`：system prompt 中明确排除不适内容方向
    - `moderatePrompt`：返回通过/拒绝结果
    - _需求：9.4、9.1、9.2_
  - [x] 15.3 实现 `QwenImageAdapter`：调用 Qwen-Image-3.0，实现 `generateImage()`
    - 参考图（第一张原图）作为视觉参考传入，其余仅提供语义 prompt
    - 返回 base64 dataUrl
    - _需求：7.1（generating 阶段）_
  - [x] 15.4 通过工厂函数 `createModelGateway(mode)` 在主进程中根据配置切换 Mock/Api 实现
    - _需求：11.4_

- [x] 16. 实现上传确认对话框
  - [x] 16.1 在 `GenerationJobService` 的 `start()` 中，RealMode 下在第一次网络调用前触发 IPC 事件通知渲染进程
    - _需求：8.1_
  - [x] 16.2 在 Widget 渲染进程中实现 `UploadConfirmDialog`，显示：选中图片文件名、外部服务名称、用途说明、费用提示、确认/取消按钮
    - _需求：8.1、8.2_
  - [x] 16.3 用户点击取消时，通过 IPC 通知主进程取消当前 Job，Trigger 复位
    - _需求：8.2_

- [x] 17. 实现 RealMode 配置校验
  - [x] 17.1 在 ControlPage 的 `ApiConfigSection` 中，检测 `process.env` 中 API Key 是否存在
    - 若缺少，显示「配置不完整」警告，禁止切换到 RealMode
    - _需求：8.5_
  - [x] 17.2 在主进程 `GenerationJobService.start()` 中二次校验 API Key，若缺少则 Job 直接转 `failed`
    - _需求：8.5_

- [x] 18. 端到端错误处理完善
  - [x] 18.1 完善各 API adapter 的错误捕获：网络错误、非 2xx 响应、超时、内容拒绝，映射到统一的 `JobError` 类型
    - _需求：7.3、12.2_
  - [x] 18.2 实现重试逻辑：从失败阶段重新开始，不重新抽图（复用 `describing` 阶段前已有的 `selectedPhotos`）
    - _需求：7.4_
  - [ ]* 18.3 为 API adapter 错误映射编写单元测试
    - 覆盖超时、非 2xx、空响应体三种场景
    - _需求：7.3_

- [x] 19. 最终检查点
  - 运行 `npm run lint`、`npm run typecheck`、`npm run build` 全部通过
  - 运行所有单元测试与属性测试，全部通过
  - 手动验证 RealMode 完整流程（需要配置 API Key）：上传确认弹窗、成功揭晓、保存成品
  - 验证原始照片未被修改
  - 验证取消、超时、内容拒绝三种失败路径均能正确复位
  - 确保所有测试通过，遇到问题请向用户提问

---

## 注释

- 标有 `*` 的子任务为可选测试任务，可在 MVP 快速验证时跳过，但建议完成以保证质量
- 每个任务引用了具体的需求编号（需求 X.Y），便于追溯
- 阶段三开始前需确认三个模型的实际 API 文档；如有任何 endpoint、鉴权或参数不确定之处，停在 adapter 层提问
- 所有属性测试使用 **fast-check**，每个属性最少运行 100 次迭代
- DemoMode 始终优先保证可用，评委不需要 API Key 即可体验完整流程

## 任务依赖图

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "5.1", "5.2"] },
    { "id": 2, "tasks": ["2.2", "3.2", "4.2", "2.3"] },
    { "id": 3, "tasks": ["7.1", "8.1", "9.1"] },
    { "id": 4, "tasks": ["7.2", "7.3", "8.2", "8.3", "9.2", "9.3"] },
    { "id": 5, "tasks": ["7.4", "7.5", "8.4", "10.1", "10.2", "10.3", "11.1"] },
    { "id": 6, "tasks": ["7.6", "10.4", "10.5", "10.6", "11.2", "11.3", "13.1"] },
    { "id": 7, "tasks": ["11.4", "11.5", "12.1", "13.2"] },
    { "id": 8, "tasks": ["12.2", "12.3", "12.4", "13.3"] },
    { "id": 9, "tasks": ["15.1", "15.2", "15.3"] },
    { "id": 10, "tasks": ["15.4", "16.1", "17.1"] },
    { "id": 11, "tasks": ["16.2", "16.3", "17.2"] },
    { "id": 12, "tasks": ["18.1", "18.2"] },
    { "id": 13, "tasks": ["18.3"] }
  ]
}
```
