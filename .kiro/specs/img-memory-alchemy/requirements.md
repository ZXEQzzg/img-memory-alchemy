# 需求文档 — 记忆炼金（Img Memory Alchemy）

## 简介

记忆炼金是一款运行在桌面端的 Electron 应用，为用户提供「仪式感随机生成」体验：  
将本地授权相册中的照片随机抽取，经由 AI 五段流水线（理解 → 脑洞 → 守门 → 生成），炼成一幅意想不到的新作品。  
核心交互是把桌面挂件上的触发物（钥匙/药瓶/纸飞机）拖入目标区域并松开，用仪式感防止误触；生成完毕后揭晓作品与原图来源。

本文档覆盖 MVP 验收所需的功能需求，边界安全需求，以及 Demo / 真实 API 两种运行模式的行为。

---

## 词汇表（Glossary）

| 术语 | 定义 |
|---|---|
| **App** | 记忆炼金桌面应用整体 |
| **ControlPage** | 控制页，用于配置目录、皮肤、模式和查看隐私声明 |
| **Widget** | 桌面炼金挂件小窗（无边框独立窗口） |
| **Trigger** | 挂件上的可拖拽触发物（钥匙 / 药瓶 / 纸飞机）|
| **DropZone** | 挂件上的目标接受区域（宝箱 / 炼金锅 / 记忆相册）|
| **PhotoRepository** | 本地图片扫描、过滤、排除、随机抽取模块 |
| **ModelGateway** | 四接口模型适配层（`describeImages` / `createPrompt` / `moderatePrompt` / `generateImage`）|
| **GenerationJob** | 单次生成任务实体，持有 job id、AbortController 和严格状态机 |
| **Provenance** | 成品溯源记录（来源文件路径 + 生成主题 + 时间戳）|
| **DemoMode** | 不发起任何网络请求、使用本地预置结果完整走完流水线的演示模式 |
| **RealMode** | 通过已配置 API Key 调用真实模型服务的生产模式 |
| **Pipeline** | 五段流水线：选图 → 理解 → 脑洞 → 守门 → 生成 |
| **Skin** | 挂件皮肤，共三套：像素宝箱、魔法炼金、记忆相册 |
| **IPC** | Electron 主进程与渲染进程之间的类型化通信通道 |

---

## 需求

### 需求 1：目录授权与图片管理

**用户故事**：作为用户，我希望能管理哪些本地目录参与随机抽图，以便我对隐私和范围有完全控制权。

#### 验收标准

1. WHEN 用户在 ControlPage 点击「添加目录」，THE App SHALL 打开系统文件夹选择对话框，并将所选路径添加到授权目录列表。
2. WHEN 用户在授权目录列表中点击「移除」，THE App SHALL 从列表中删除该目录，且不扫描或抽取该目录中的图片。
3. WHEN PhotoRepository 扫描授权目录，THE App SHALL 仅识别 `.jpg`、`.jpeg`、`.png`、`.gif`、`.webp` 格式的文件为有效图片。
4. WHEN 授权目录为空（不含任何有效图片格式文件），THE App SHALL 在目录条目旁显示「无有效图片」的提示，并将该目录的有效图片计数显示为 0。
5. IF 授权目录路径不可访问（权限不足或已删除），THEN THE App SHALL 在目录条目旁显示「无法访问」的错误说明，并将该目录排除在抽图范围之外。
6. WHEN 图片文件存在但已损坏无法解码，THE App SHALL 跳过该文件，并在该文件所属目录的扫描结果中记录跳过数量。
7. WHEN ControlPage 加载，THE App SHALL 显示每个授权目录的有效图片数量。
8. THE App SHALL 仅扫描用户明确添加到授权列表中的目录，不扫描任何其他本地路径。

---

### 需求 2：排除管理

**用户故事**：作为用户，我希望能排除特定文件夹或单张图片，以便保护我不希望参与生成的私密内容。

#### 验收标准

1. WHEN 用户在 ControlPage 点击「排除文件夹」，THE App SHALL 打开文件夹选择对话框，并将所选路径加入排除列表。
2. WHEN 用户在 ControlPage 点击「排除图片」，THE App SHALL 打开文件选择对话框，并将所选图片路径加入排除列表。
3. WHILE 排除列表中存在路径，THE PhotoRepository SHALL 在每次抽图前过滤掉命中该路径（文件夹路径前缀匹配或文件路径精确匹配）的所有图片。
4. WHEN 用户从排除列表中移除一条记录，THE App SHALL 恢复该路径下的图片为可抽取状态。
5. THE App SHALL 在 ControlPage 中展示完整的排除列表，并允许用户逐条删除。

---

### 需求 3：参考图模式选择

**用户故事**：作为用户，我希望能选择单图或多图参考模式，以便控制每次炼金消耗的照片数量与随机程度。

#### 验收标准

1. WHEN 用户在 ControlPage 选择「单图模式」，THE App SHALL 在每次触发时恰好抽取 1 张照片。
2. WHEN 用户在 ControlPage 选择「多图模式（2–3 张）」，THE App SHALL 在每次触发时随机抽取 2 或 3 张不重复的照片。
3. IF 授权且未排除的有效图片总数少于所选模式所需的最少数量，THEN THE App SHALL 在 Widget 上显示「图片数量不足，请先在控制页添加目录」的提示，并禁用触发功能。
4. THE PhotoRepository SHALL 保证同一批次抽取的照片之间不重复，且优先避免与上一次抽取的完全相同的组合。

---

### 需求 4：仪式感触发（防误触核心）

**用户故事**：作为用户，我希望只有完成「拖动 → 进入有效区域 → 松开」的完整动作才能启动生成，以便避免任何意外触发。

#### 验收标准

1. WHEN 用户仅点击 Trigger 但未拖动，THE App SHALL 不发起任何抽图或 API 调用。
2. WHEN 用户将鼠标悬浮在 Trigger 或 DropZone 上，THE App SHALL 不发起任何抽图或 API 调用。
3. WHEN 用户拖动 Trigger 进入 DropZone 的有效区域，THE App SHALL 播放 DropZone 的「接近反馈」动效（宝箱半开发光 / 炼金锅冒泡 / 相册翻页等皮肤等价效果）。
4. WHEN 用户将正在拖动的 Trigger 移出 DropZone 有效区域，THE App SHALL 立即还原 DropZone 的外观至静止状态。
5. WHEN 用户在 DropZone 有效区域内松开鼠标（drop 事件），THE App SHALL 开始一次新的 GenerationJob，并将 Trigger 动画复位到初始位置。
6. WHEN 用户在 DropZone 有效区域外松开鼠标，THE App SHALL 将 Trigger 动画复位到初始位置，不发起任何生成。
7. IF 当前存在进行中的 GenerationJob，THEN THE App SHALL 禁用 Trigger 拖拽，直到任务完成、取消或失败。

---

### 需求 5：皮肤切换

**用户故事**：作为用户，我希望能在三套不同风格的皮肤之间切换，以便让桌面挂件符合我的审美偏好。

#### 验收标准

1. THE App SHALL 提供三套皮肤：  
   - 皮肤 A：像素风金钥匙 + 宝箱  
   - 皮肤 B：魔法药瓶 + 炼金锅  
   - 皮肤 C：纸飞机 + 记忆相册  
2. WHEN 用户在 ControlPage 选择某套皮肤，THE App SHALL 立即更新 Widget 的视觉外观，包括 Trigger 和 DropZone。
3. WHILE 任意皮肤处于激活状态，THE Widget SHALL 保持「拖动 → 接近反馈 → 松开触发 → 复位」的完整交互逻辑可用。
4. THE App SHALL 持久化用户最后选择的皮肤，重启后恢复。

---

### 需求 6：Widget 窗口行为

**用户故事**：作为用户，我希望挂件可以自由摆放位置并调整大小，以便它不影响我的正常桌面工作。

#### 验收标准

1. THE Widget SHALL 以独立、无边框窗口形式显示，可叠加在其他应用之上。
2. WHEN 用户拖动 Widget 非交互区域，THE App SHALL 移动 Widget 窗口位置。
3. WHEN 用户调整 Widget 窗口大小，THE App SHALL 将尺寸限制在最小 160×160px 至最大 480×480px 范围内。
4. THE App SHALL 持久化 Widget 的上次位置和尺寸，重启后恢复。

---

### 需求 7：五段流水线与生成状态

**用户故事**：作为用户，我希望在生成过程中能看到每个阶段的进行状态，以便我了解当前进度并随时决定是否取消。

#### 验收标准

1. WHEN 一次 GenerationJob 启动，THE App SHALL 依次在界面上标出「选图 → 理解 → 脑洞 → 守门 → 生成」五个阶段的状态（等待 / 进行中 / 完成 / 失败）。
2. WHEN 用户在任意阶段点击「取消」，THE App SHALL 立即中止当前 GenerationJob，释放网络请求（AbortController），并将 Trigger 复位。
3. IF 某阶段发生错误（网络超时、模型拒绝、API 错误），THEN THE App SHALL 将 GenerationJob 标记为失败，显示失败所在阶段和错误原因描述，并展示「重试」入口。
4. WHEN 用户点击「重试」，THE App SHALL 以相同的已选照片重新从失败阶段开始执行，不重新抽图。
5. IF 一个旧的 GenerationJob 的异步回调在新的 GenerationJob 启动后才返回，THEN THE App SHALL 丢弃旧 Job 的结果，不覆盖当前界面状态。
6. THE GenerationJob SHALL 维护严格的状态转换：`idle → selecting → describing → prompting → moderating → generating → succeeded | failed | cancelled`，且只能按此顺序前进，不能回退（cancelled 和 failed 除外）。

---

### 需求 8：隐私边界与上传确认

**用户故事**：作为用户，我希望在任何照片上传前都能得到明确告知，以便我能自主决定是否将照片发送给外部服务。

#### 验收标准

1. THE App SHALL 在 RealMode 下，在首次 GenerationJob 发起网络请求前，弹出确认对话框，显示：本次选中图片的文件名列表、将要调用的外部模型服务名称、用途说明和可能的费用提示。
2. WHEN 用户在确认对话框中点击「取消」，THE App SHALL 不发起任何网络请求，GenerationJob 状态转换为 cancelled，Trigger 复位。
3. THE App SHALL 仅在本次 GenerationJob 中将本次抽中的图片文件上传到外部服务，绝不批量上传整个授权目录。
4. THE App SHALL 绝不读取、记录或显示任何 API Key 的值。
5. IF `.env` 文件中缺少必要的 API Key，THEN THE App SHALL 在 ControlPage 的 RealMode 配置区域显示「配置不完整」警告，并禁止切换到 RealMode 进行生成。

---

### 需求 9：安全内容守门

**用户故事**：作为用户，我希望生成内容经过安全审查，以便尽量避免不适当的输出。

#### 验收标准

1. WHEN `moderatePrompt` 接口调用完成，THE ModelGateway SHALL 返回审查通过或拒绝的结果。
2. IF `moderatePrompt` 返回拒绝，THEN THE App SHALL 中止当前 GenerationJob，在界面显示「内容安全审查未通过」提示，并提供重新生成或丢弃的选项。
3. THE App SHALL 在 ControlPage 的隐私声明区域显示：「安全措施可降低风险，但不能保证每一次生成都符合个人心理预期」。
4. THE ModelGateway 的 `createPrompt` 接口 SHALL 在系统提示中明确排除羞辱、暴力伤害、色情化及仇恨等内容方向。

---

### 需求 10：成品揭晓与溯源

**用户故事**：作为用户，我希望在生成成功后能看到作品及其来源，并自主决定是否保存，以便保护我的存储空间和隐私。

#### 验收标准

1. WHEN GenerationJob 状态转换为 succeeded，THE App SHALL 优先展示生成的作品图片。
2. WHEN 成品展示页加载，THE App SHALL 同时显示「本次配方」：生成主题（脑洞 prompt 摘要）、参与的原图文件名列表和缩略图、生成时间。
3. WHEN 用户点击「保存成品」，THE App SHALL 打开系统保存对话框，将生成图片和 Provenance 记录存储到用户指定位置，且不覆盖任何原始照片。
4. WHEN 用户点击「查看原图」，THE App SHALL 以只读方式展示本次参与的原始照片缩略图或打开系统查看器，不允许编辑。
5. WHEN 用户点击「再来一次」，THE App SHALL 重置状态到 idle，允许用户再次触发 Widget。
6. WHEN 用户点击「丢弃」，THE App SHALL 清除本次生成结果的内存数据，不保存任何文件，状态回到 idle。
7. THE App SHALL 绝不自动保存生成图片；所有持久化均需用户明确操作。

---

### 需求 11：Demo 模式

**用户故事**：作为评委 / 演示者，我希望在没有 API Key 和网络的情况下完整体验所有功能，以便评估产品价值而不需要配置外部服务。

#### 验收标准

1. WHEN App 在 DemoMode 下运行，THE App SHALL 使用本地预置的示例图片和预置的生成结果，走完「选图 → 理解 → 脑洞 → 守门 → 生成 → 揭晓」完整流程，不发起任何网络请求。
2. THE App SHALL 在 DemoMode 的每个生成结果上显示明显的「Demo 生成」标识，不允许伪装成真实模型输出。
3. WHEN App 处于 DemoMode，THE App SHALL 在 ControlPage 和 Widget 上显示「演示模式」状态标签。
4. THE App SHALL 提供显式的模式切换入口（DemoMode ↔ RealMode），且切换时有状态变化的视觉反馈。
5. WHEN App 处于 DemoMode，THE App SHALL 在 DemoMode 下模拟所有五个阶段的状态流转，包括短暂的「进行中」状态，以展示真实流程体验。

---

### 需求 12：取消与复位保障

**用户故事**：作为用户，我希望在任何情况下都能取消生成并让挂件回到可用状态，以便不会卡死在某个流程中。

#### 验收标准

1. WHEN 用户在流水线任意阶段点击「取消」，THE App SHALL 在 500ms 内更新界面状态为 cancelled，并将 Trigger 动画复位到初始位置。
2. IF GenerationJob 因网络超时（超过 60 秒）未收到响应，THEN THE App SHALL 自动将任务标记为 failed，并触发与取消相同的 UI 复位流程。
3. WHEN GenerationJob 完成（succeeded / failed / cancelled），THE App SHALL 确保 Trigger 已复位，Widget 可再次被拖动触发。
4. THE App SHALL 在整个生命周期内绝不出现 Trigger 永久锁定、界面无响应或卡在生成中的状态。

---

### 需求 13：安全与代码边界

**用户故事**：作为开发者和用户，我希望应用遵循严格的安全编码规范，以便防止数据泄露和权限滥用。

#### 验收标准

1. THE App SHALL 启用 Electron context isolation，渲染进程不直接访问 Node.js API。
2. THE App SHALL 通过 preload 脚本以最小化、类型化的 IPC channel 暴露文件系统能力，所有路径访问在主进程中验证合法性。
3. THE App SHALL 将 `.env`、`Config_ModAPI.md`、生成图片默认输出目录及本地历史文件夹添加到 `.gitignore`，不得提交到版本控制。
4. THE App SHALL 将 API Key 仅读取自 `.env` 文件或系统环境变量，不硬编码在任何源文件中。
5. THE App SHALL 通过 `GenerationJob` 的 AbortController 在取消或超时时清理所有挂起的 HTTP 请求，防止资源泄漏。

---

### 需求 14：构建与工程质量

**用户故事**：作为开发者，我希望项目具备标准的工程化配置，以便评委能快速本地启动，并保证代码质量。

#### 验收标准

1. THE App SHALL 通过 `npm run lint` 无错误完成 ESLint 检查。
2. THE App SHALL 通过 `npm run typecheck` 无错误完成 TypeScript 类型检查。
3. THE App SHALL 通过 `npm run build` 成功构建可分发包。
4. THE App SHALL 包含核心模块（PhotoRepository、GenerationJob 状态机、ModelGateway mock）的单元测试，且全部通过。
5. THE App SHALL 提供 `README.md`，包含：本地依赖安装步骤、Demo 模式启动命令、`.env.example` 说明，让评委在无 API Key 情况下完整体验 Demo。
