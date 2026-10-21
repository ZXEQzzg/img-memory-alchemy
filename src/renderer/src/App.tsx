import React, { useState, useEffect, useCallback } from 'react'
import type { AppConfig, DirectoryEntry, ExclusionEntry, ProvenanceRecord, JobStateEvent, GenerationUsage, CreativityLevel, GenerationDebug } from '../../shared/types/api'

const SKIN_LIST = [
  { id: 'pixel' as const, name: '像素宝箱', preview: '📦' },
  { id: 'magic' as const, name: '魔法药瓶', preview: '🧪' },
  { id: 'paper' as const, name: '纸飞机', preview: '✈️' },
  { id: 'wish' as const, name: '星空许愿', preview: '🌠' },
  { id: 'battery' as const, name: '电池仓', preview: '🔋' },
  { id: 'spider' as const, name: '小蜘蛛', preview: '🕷️' }
]

const CREATIVITY_LIST = [
  { id: 'faithful' as const, name: '保守', desc: '最大程度保留原图主体与场景，只做风格化与氛围提升' },
  { id: 'balanced' as const, name: '平衡', desc: '保留核心主体，可自由改变风格、光线与组合方式' },
  { id: 'wild' as const, name: '放飞', desc: '允许超现实重构，但仍须保留可识别元素' }
]

export default function App(): React.ReactElement {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [directories, setDirectories] = useState<DirectoryEntry[]>([])
  const [exclusions, setExclusions] = useState<ExclusionEntry[]>([])
  const [exclusionPath, setExclusionPath] = useState('')
  const [exclusionType, setExclusionType] = useState<'folder' | 'file'>('folder')
  const [historyVersion, setHistoryVersion] = useState(0)

  useEffect(() => {
    window.electronAPI.config.get().then((cfg) => {
      setConfig(cfg)
      return window.electronAPI.photo.listDirectories()
    }).then((dirs) => {
      setDirectories(dirs)
      return window.electronAPI.photo.listExclusions()
    }).then((exs) => {
      setExclusions(exs)
    })
  }, [])

  const handleAddDirectory = useCallback(async () => {
    const result = await window.electronAPI.photo.selectDirectory()
    if (!result) return
    const scan = await window.electronAPI.photo.addDirectory(result)
    setDirectories((prev) => {
      const filtered = prev.filter((d) => d.path !== result)
      return [...filtered, scan.entry]
    })
    setConfig(await window.electronAPI.config.get())
  }, [])

  const handleRemoveDirectory = useCallback(async (path: string) => {
    await window.electronAPI.photo.removeDirectory(path)
    const dirs = await window.electronAPI.photo.listDirectories()
    setDirectories(dirs)
    setConfig(await window.electronAPI.config.get())
  }, [])

  const handleAddExclusion = useCallback(async () => {
    if (!exclusionPath.trim()) return
    await window.electronAPI.photo.addExclusion(exclusionPath.trim(), exclusionType)
    const exs = await window.electronAPI.photo.listExclusions()
    setExclusions(exs)
    setExclusionPath('')
    setConfig(await window.electronAPI.config.get())
  }, [exclusionPath, exclusionType])

  const handleRemoveExclusion = useCallback(async (path: string) => {
    await window.electronAPI.photo.removeExclusion(path)
    const exs = await window.electronAPI.photo.listExclusions()
    setExclusions(exs)
    setConfig(await window.electronAPI.config.get())
  }, [])

  const handleReferenceCountChange = useCallback(async (val: 1 | 'multi') => {
    setConfig((prev) => (prev ? { ...prev, referenceCount: val } : prev))
    await window.electronAPI.config.set({ referenceCount: val })
  }, [])

  const handleCreativityChange = useCallback(async (creativity: CreativityLevel) => {
    setConfig((prev) => (prev ? { ...prev, creativity } : prev))
    await window.electronAPI.config.set({ creativity })
  }, [])

  const handleQualityGuardChange = useCallback(async (qualityGuard: boolean) => {
    setConfig((prev) => (prev ? { ...prev, qualityGuard } : prev))
    await window.electronAPI.config.set({ qualityGuard })
  }, [])

  const handleWidgetVisibleChange = useCallback(async (widgetVisible: boolean) => {
    setConfig((prev) => (prev ? { ...prev, widgetVisible } : prev))
    await window.electronAPI.widget.setVisible(widgetVisible)
  }, [])

  const handleWidgetAlwaysOnTopChange = useCallback(async (widgetAlwaysOnTop: boolean) => {
    setConfig((prev) => (prev ? { ...prev, widgetAlwaysOnTop } : prev))
    await window.electronAPI.widget.setAlwaysOnTop(widgetAlwaysOnTop)
  }, [])

  const handleSelectSaveDirectory = useCallback(async () => {
    const dir = await window.electronAPI.file.selectSaveDirectory()
    if (dir) {
      setConfig((prev) => (prev ? { ...prev, saveDirectory: dir } : prev))
      await window.electronAPI.config.set({ saveDirectory: dir })
    }
  }, [])

  const handleSkinChange = useCallback(async (skin: AppConfig['skin']) => {
    setConfig((prev) => (prev ? { ...prev, skin } : prev))
    await window.electronAPI.config.set({ skin })
  }, [])

  const handleModeChange = useCallback(async (mode: 'demo' | 'real') => {
    if (!config) return
    setConfig((prev) => (prev ? { ...prev, mode } : prev))
    await window.electronAPI.config.set({ mode })
  }, [config])

  if (!config) {
    return <div className="app"><div style={{ padding: 48, textAlign: 'center', color: '#7a8aaa' }}>加载中...</div></div>
  }

  return (
    <div className="app">
      <header className="mode-status-bar">
        <div className="app-title">
          <span className="app-icon">✨</span>
          <h1>记忆炼金</h1>
        </div>
        <div className="mode-controls">
          <span className={`mode-badge ${config.mode === 'demo' ? 'mode-badge--demo' : 'mode-badge--real'}`}>
            {config.mode === 'demo' ? '🎭 演示模式' : '⚡ 真实模式'}
          </span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#a0b0d0', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.mode === 'real'}
              onChange={(e) => handleModeChange(e.target.checked ? 'real' : 'demo')}
              style={{ accentColor: '#4a80d0' }}
            />
            Real Mode
          </label>
        </div>
      </header>

      <main className="app-main">
        <section className="control-section">
          <div className="section-header">
            <h2>📁 照片目录</h2>
            <p className="section-desc">添加本地照片目录，支持 .jpg / .png / .gif / .webp</p>
          </div>
          <button className="btn btn-primary" onClick={handleAddDirectory}>➕ 添加目录</button>
          {directories.length === 0 ? (
            <div className="empty-list"><p className="empty-hint">📭 尚未添加任何目录</p></div>
          ) : (
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {directories.map((d) => (
                <li key={d.path} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#1e2a44', borderRadius: 6 }}>
                  <span style={{ fontSize: 13, color: '#c0cce8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.path}</span>
                  {d.isAccessible ? (
                    <span style={{ fontSize: 12, color: '#7ecb82', margin: '0 12px' }}>{d.validCount} 张有效</span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#e88080', margin: '0 12px' }}>{d.errorReason || '无法访问'}</span>
                  )}
                  <button className="btn btn-sm" onClick={() => handleRemoveDirectory(d.path)}>移除</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="control-section">
          <div className="section-header">
            <h2>💾 保存设置</h2>
            <p className="section-desc">生成图片一键「保存」的默认位置</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 1, fontSize: 12, color: '#a0b0d0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {config.saveDirectory || '系统图片目录\\记忆炼金（默认）'}
            </span>
            <button className="btn btn-sm" onClick={handleSelectSaveDirectory}>📁 选择目录</button>
          </div>
        </section>

        <section className="control-section">
          <div className="section-header">
            <h2>🚫 排除列表</h2>
            <p className="section-desc">排除特定文件夹和照片，避免生成敏感内容</p>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input type="text" value={exclusionPath} onChange={(e) => setExclusionPath(e.target.value)} placeholder="输入文件夹或文件路径..."
              style={{ flex: 1, padding: '8px 12px', background: '#1e2a44', border: '1px solid #2d3a5a', borderRadius: 6, color: '#e0e0e0', fontSize: 13 }} />
            <select value={exclusionType} onChange={(e) => setExclusionType(e.target.value as 'folder' | 'file')}
              style={{ padding: '8px 12px', background: '#1e2a44', border: '1px solid #2d3a5a', borderRadius: 6, color: '#e0e0e0', fontSize: 13 }}>
              <option value="folder">📁 文件夹</option>
              <option value="file">🖼️ 文件</option>
            </select>
            <button className="btn btn-primary" onClick={handleAddExclusion} disabled={!exclusionPath.trim()}>添加</button>
          </div>
          {exclusions.length === 0 ? (
            <div className="empty-list"><p className="empty-hint">暂无排除项</p></div>
          ) : (
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {exclusions.map((ex) => (
                <li key={ex.path} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#1e2a44', borderRadius: 6 }}>
                  <span style={{ fontSize: 13, color: '#c0cce8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ex.type === 'folder' ? '📁' : '🖼️'} {ex.path}
                  </span>
                  <button className="btn btn-sm" onClick={() => handleRemoveExclusion(ex.path)}>删除</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="control-section">
          <div className="section-header">
            <h2>🎨 参考图模式</h2>
            <p className="section-desc">选择生成时参考照片的数量</p>
          </div>
          <div className="radio-group">
            <label className="radio-label">
              <input type="radio" name="refCount" checked={config.referenceCount === 1} onChange={() => handleReferenceCountChange(1)} />
              <span>单图参考 - 每次使用 1 张照片作为视觉参考</span>
            </label>
            <label className="radio-label">
              <input type="radio" name="refCount" checked={config.referenceCount === 'multi'} onChange={() => handleReferenceCountChange('multi')} />
              <span>多图参考 - 每次随机选取 2-3 张照片融合风格</span>
            </label>
          </div>
        </section>

        <section className="control-section">
          <div className="section-header">
            <h2>🎚 创作尺度</h2>
            <p className="section-desc">控制 AI 对原图内容的保留程度</p>
          </div>
          <div className="radio-group">
            {CREATIVITY_LIST.map((c) => (
              <label className="radio-label" key={c.id}>
                <input
                  type="radio"
                  name="creativity"
                  checked={config.creativity === c.id}
                  onChange={() => handleCreativityChange(c.id)}
                />
                <span><strong>{c.name}</strong> — {c.desc}</span>
              </label>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#a0b0d0', cursor: 'pointer', marginTop: 10 }}>
            <input
              type="checkbox"
              checked={config.qualityGuard}
              onChange={(e) => handleQualityGuardChange(e.target.checked)}
              style={{ accentColor: '#4a80d0' }}
            />
            质量守卫（生成后自检与原图的相关性，不合格自动重新生成一次）
          </label>
        </section>

        <section className="control-section">
          <div className="section-header">
            <h2>🎨 桌宠皮肤</h2>
            <p className="section-desc">选择桌宠的视觉风格</p>
          </div>
          <div className="skin-selector">
            {SKIN_LIST.map((s) => (
              <div key={s.id} className={`skin-card ${config.skin === s.id ? 'skin-card--active' : ''}`} onClick={() => handleSkinChange(s.id)}>
                <span className="skin-preview">{s.preview}</span>
                <span className="skin-name">{s.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="control-section">
          <div className="section-header">
            <h2>🪟 桌宠显示</h2>
            <p className="section-desc">控制桌面挂件的显示与层级</p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#a0b0d0', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.widgetVisible}
              onChange={(e) => handleWidgetVisibleChange(e.target.checked)}
              style={{ accentColor: '#4a80d0' }}
            />
            显示桌宠（钥匙 + 宝箱）
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#a0b0d0', cursor: 'pointer', marginTop: 8 }}>
            <input
              type="checkbox"
              checked={config.widgetAlwaysOnTop}
              onChange={(e) => handleWidgetAlwaysOnTopChange(e.target.checked)}
              style={{ accentColor: '#4a80d0' }}
            />
            桌宠置顶（始终显示在其他窗口之上；关闭后与普通浏览器同级）
          </label>
        </section>

        <section className="control-section">
          <div className="section-header"><h2>🔒 隐私声明</h2></div>
          <div className="privacy-notice">
            <ul className="privacy-list">
              <li><strong>数据本地化</strong>：所有照片和生成结果存储在本地，不上传至任何服务器</li>
              <li><strong>Demo 模式</strong>：使用本地预置数据，不发起任何网络请求，无需 API Key</li>
              <li><strong>Real 模式</strong>：照片描述将发送至 AI 服务商进行处理，请注意隐私</li>
              <li><strong>隐私控制</strong>：原始照片不会被修改或覆盖，生成结果保存至用户指定位置</li>
            </ul>
          </div>
        </section>

        <section className="control-section">
          <div className="section-header"><h2>🔑 API 配置</h2></div>
          <ApiConfigSection config={config} />
        </section>

        <section className="control-section">
          <div className="section-header"><h2>🔧 实时生成流程</h2></div>
          <LivePipelineSection onGenerated={() => setHistoryVersion((v) => v + 1)} />
        </section>

        <section className="control-section">
          <div className="section-header"><h2>📜 生成历史</h2></div>
          <HistorySection refreshKey={historyVersion} />
        </section>
      </main>
    </div>
  )
}

const PIPELINE_STAGES = [
  { key: 'selecting', label: '选图', icon: '📷' },
  { key: 'describing', label: '理解', icon: '🤖' },
  { key: 'prompting', label: '脑洞', icon: '💡' },
  { key: 'moderating', label: '守门', icon: '🛡️' },
  { key: 'generating', label: '生成', icon: '🎨' }
]

function LivePipelineSection({ onGenerated }: { onGenerated: () => void }): React.ReactElement {
  const [event, setEvent] = React.useState<JobStateEvent | null>(null)

  React.useEffect(() => {
    return window.electronAPI.job.onStateChange((e: JobStateEvent) => {
      setEvent(e)
      if (e.state === 'succeeded') {
        onGenerated()
      }
    })
  }, [onGenerated])

  const activeIdx = PIPELINE_STAGES.findIndex((s) => s.key === event?.state)

  function statusOf(idx: number): 'done' | 'active' | 'failed' | 'pending' {
    if (event?.state === 'succeeded') return 'done'
    if (event?.state === 'failed') {
      const failedIdx = PIPELINE_STAGES.findIndex((s) => s.key === event?.error?.stage)
      if (failedIdx >= 0) {
        if (idx < failedIdx) return 'done'
        if (idx === failedIdx) return 'failed'
      }
      return 'pending'
    }
    if (activeIdx < 0) return 'pending'
    if (idx < activeIdx) return 'done'
    if (idx === activeIdx) return 'active'
    return 'pending'
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {PIPELINE_STAGES.map((s, i) => {
          const st = statusOf(i)
          return (
            <div key={s.key} style={{
              flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 8,
              background: st === 'active' ? 'rgba(74,128,208,0.3)' : st === 'done' ? 'rgba(40,100,60,0.22)' : st === 'failed' ? 'rgba(160,60,60,0.3)' : 'rgba(30,40,70,0.5)',
              border: st === 'active' ? '1px solid rgba(74,128,208,0.55)' : st === 'done' ? '1px solid rgba(80,180,90,0.4)' : st === 'failed' ? '1px solid rgba(200,90,90,0.5)' : '1px solid rgba(60,80,120,0.3)',
              transition: 'background 0.2s'
            }}>
              <div style={{ fontSize: 18 }}>{st === 'done' ? '✓' : st === 'failed' ? '✗' : s.icon}</div>
              <div style={{ fontSize: 11, color: '#c0cce8', marginTop: 2 }}>{s.label}</div>
            </div>
          )
        })}
      </div>

      {(!event || event.state === 'idle') && (
        <p style={{ fontSize: 12, color: '#7a8aaa' }}>等待触发 —— 把钥匙拖到宝箱上，松手即开始。</p>
      )}
      {event && ['selecting', 'describing', 'prompting', 'moderating', 'generating'].includes(event.state) && (
        <p style={{ fontSize: 12, color: '#80b0e0' }}>⏳ 进行中：{PIPELINE_STAGES[activeIdx]?.label || '…'}</p>
      )}
      {event?.state === 'succeeded' && (
        <p style={{ fontSize: 12, color: '#7ecb82' }}>✅ 生成完成，结果已保存到下方历史。</p>
      )}
      {event?.state === 'failed' && (
        <div>
          <p style={{ fontSize: 12, color: '#e88080' }}>❌ 生成失败：{event.error?.message || '未知错误'}</p>
          <button className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => window.electronAPI.job.retry()}>🔄 重试</button>
        </div>
      )}
      {event?.state === 'cancelled' && (
        <p style={{ fontSize: 12, color: '#a0b0d0' }}>已取消。</p>
      )}
    </div>
  )
}

function verdictColor(verdict: string): string {
  if (verdict === 'related') return '#7ecb82'
  if (verdict === 'unknown') return '#9fb0d0'
  return '#e88080'
}

function DebugPanel({ debug }: { debug: GenerationDebug }): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  return (
    <div style={{ marginTop: 8 }}>
      <button className="btn btn-sm" onClick={() => setOpen((v) => !v)}>
        {open ? '▾ 收起链路详情' : '▸ 查看链路详情'}
      </button>
      {open && (
        <div style={{ marginTop: 6, padding: 8, background: 'rgba(15,22,40,0.7)', borderRadius: 6, fontSize: 11, color: '#9fb0d0', lineHeight: 1.7, wordBreak: 'break-word' }}>
          {debug.quality && (
            <div>
              🔎 相关性质检：
              <strong style={{ color: verdictColor(debug.quality.verdict) }}>{debug.quality.verdict}</strong>
              （{debug.quality.reason}）
              {debug.imageAttempts ? ` · 生成尝试 ${debug.imageAttempts} 次` : ''}
            </div>
          )}
          {debug.promptIssues && (
            <div>
              🛡 提示词守卫：
              {debug.promptIssues.length === 0
                ? <span style={{ color: '#7ecb82' }}>通过</span>
                : <span style={{ color: '#e88080' }}>{debug.promptIssues.join('；')}</span>}
            </div>
          )}
          {debug.promptAdvisory && debug.promptAdvisory.length > 0 && (
            <div style={{ color: '#c9b26a' }}>💡 提示：{debug.promptAdvisory.join('；')}</div>
          )}
          {debug.usedFallbackPrompt && (
            <div style={{ color: '#e8a060' }}>⚠ 本次使用了本地兜底提示词模板</div>
          )}
          {debug.moderation && (
            <div>
              🚦 内容审查：
              {debug.moderation.skipped
                ? <span style={{ color: '#c9b26a' }}>已跳过（{debug.moderation.reason}）</span>
                : debug.moderation.passed
                  ? <span style={{ color: '#7ecb82' }}>通过</span>
                  : <span style={{ color: '#e88080' }}>未通过{debug.moderation.reason ? `（${debug.moderation.reason}）` : ''}</span>}
            </div>
          )}
          {debug.descriptions && debug.descriptions.length > 0 && (
            <div style={{ marginTop: 2 }}>
              🧠 理解结果：
              {debug.descriptions.map((d, i) => (
                <div key={i} style={{ marginLeft: 10 }}>
                  照片{i + 1}｜主体：{d.subjects.join('、') || '—'}｜环境：{d.environment || '—'}｜颜色：{d.colors.join('、') || '—'}｜氛围：{d.mood || '—'}｜细节：{d.details.join('、') || '—'}
                </div>
              ))}
            </div>
          )}
          {debug.rawDescriptions && debug.rawDescriptions.length > 0 && (
            <details style={{ marginTop: 4 }}>
              <summary style={{ cursor: 'pointer' }}>👁 理解模型原文</summary>
              <pre style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0', fontSize: 10, color: '#8fa0c0' }}>{debug.rawDescriptions.join('\n\n')}</pre>
            </details>
          )}
          {debug.rawPromptOutput && (
            <details style={{ marginTop: 4 }}>
              <summary style={{ cursor: 'pointer' }}>👁 脑洞模型原文</summary>
              <pre style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0', fontSize: 10, color: '#8fa0c0' }}>{debug.rawPromptOutput}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

function UsageLine({ usage }: { usage: GenerationUsage }): React.ReactElement {
  return (
    <div style={{ marginTop: 8, padding: '6px 8px', background: 'rgba(20,30,50,0.6)', borderRadius: 6, fontSize: 11, color: '#9fb0d0' }}>
      📊 消耗：文本输入 {usage.promptTokens} / 输出 {usage.completionTokens} tokens（合计 {usage.totalTokens}）· 输入图片 {usage.inputImages} 张 · 生成图片 {usage.outputImages} 张
      {usage.stages && usage.stages.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary style={{ cursor: 'pointer', fontSize: 10, color: '#8fa0c0' }}>按阶段明细（含失败重试的每次调用）</summary>
          <div style={{ marginTop: 2, fontSize: 10, color: '#8fa0c0', lineHeight: 1.7 }}>
            {usage.stages.map((s, i) => (
              <div key={i}>{s.model}：文本入 {s.inputTokens} / 出 {s.outputTokens} tokens · 图入 {s.inputImages} / 图出 {s.outputImages}</div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function HistorySection({ refreshKey }: { refreshKey: number }): React.ReactElement {
  const [records, setRecords] = React.useState<ProvenanceRecord[]>([])
  const [loading, setLoading] = React.useState(true)

  const reload = React.useCallback(() => {
    window.electronAPI.provenance.list().then((r) => { setRecords(r.reverse()); setLoading(false) })
  }, [])

  useEffect(() => { reload() }, [reload, refreshKey])

  const handleDelete = React.useCallback(async (id: string) => {
    await window.electronAPI.provenance.delete(id)
    reload()
  }, [reload])

  if (loading) return <p style={{ fontSize: 13, color: '#7a8aaa' }}>加载中...</p>
  if (records.length === 0) return <p style={{ fontSize: 13, color: '#7a8aaa' }}>暂无历史记录。完成一次生成后会自动出现在这里。</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {records.map((r) => (
        <HistoryCard key={r.id} record={r} onDelete={handleDelete} />
      ))}
    </div>
  )
}

function HistoryCard({ record, onDelete }: { record: ProvenanceRecord; onDelete: (id: string) => void }): React.ReactElement {
  const [genImage, setGenImage] = React.useState<string | null>(null)
  const [sourceImages, setSourceImages] = React.useState<Record<string, string>>({})

  useEffect(() => {
    if (record.generatedImagePath) {
      window.electronAPI.file.readThumbnail(record.generatedImagePath).then(setGenImage).catch(() => setGenImage(null))
    }
    record.sourcePhotos.forEach((p) => {
      window.electronAPI.file.readThumbnail(p.path).then((d) => {
        setSourceImages((prev) => ({ ...prev, [p.path]: d }))
      }).catch(() => {})
    })
  }, [record])

  const openGenerated = () => {
    if (record.generatedImagePath) window.electronAPI.file.openImageViewer(record.generatedImagePath)
  }

  return (
    <div style={{ padding: 12, background: '#1e2a44', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
        <span style={{ fontSize: 14, color: '#c0cce8', fontWeight: 'bold' }}>🎨 {record.theme}</span>
        <span style={{ fontSize: 11, color: '#7a8aaa', whiteSpace: 'nowrap' }}>{new Date(record.createdAt).toLocaleString('zh-CN')}</span>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        {genImage ? (
          <img src={genImage} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(100,150,220,0.3)', cursor: 'pointer', flexShrink: 0 }} onClick={openGenerated} />
        ) : (
          <div style={{ width: 96, height: 96, background: '#16213e', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#4a5a7a', flexShrink: 0 }}>🖼️</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {record.promptText && (
            <div style={{ fontSize: 12, color: '#a0b0d0', marginBottom: 6, wordBreak: 'break-word' }}>{record.promptText}</div>
          )}
          {record.promptStyle && (
            <div style={{ fontSize: 11, color: '#7a8aaa' }}>风格：{record.promptStyle}</div>
          )}
          {record.isDemoGeneration && <span style={{ fontSize: 10, color: '#a0b4e8', background: '#2d3561', padding: '2px 6px', borderRadius: 8 }}>Demo</span>}
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, color: '#7a8aaa', marginBottom: 4 }}>来源照片（{record.sourcePhotos.length}）：</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {record.sourcePhotos.map((p) => (
            <div key={p.path} style={{ textAlign: 'center' }}>
              {sourceImages[p.path] ? (
                <img src={sourceImages[p.path]} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 4, border: '1px solid rgba(100,150,220,0.2)', cursor: 'pointer' }} onClick={() => window.electronAPI.file.openImageViewer(p.path)} />
              ) : (
                <div style={{ width: 56, height: 56, background: '#16213e', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#4a5a7a' }}>🖼️</div>
              )}
              <div style={{ fontSize: 9, color: '#7a8aaa', maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.filename}</div>
            </div>
          ))}
        </div>
      </div>

      {record.usage && <UsageLine usage={record.usage} />}
      {record.debug && <DebugPanel debug={record.debug} />}

      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        {record.generatedImagePath && <button className="btn btn-sm" onClick={openGenerated}>👁 打开生成图</button>}
        <button className="btn btn-sm" onClick={() => onDelete(record.id)}>🗑 删除</button>
      </div>
    </div>
  )
}

function ApiConfigSection({ config }: { config: AppConfig }): React.ReactElement {
  const [hasQwenKey, setHasQwenKey] = React.useState<boolean | null>(null)
  const [hasDeepSeekKey, setHasDeepSeekKey] = React.useState<boolean | null>(null)
  useEffect(() => {
    checkEnvVar('QWEN_API_KEY').then(setHasQwenKey)
    checkEnvVar('DEEPSEEK_API_KEY').then(setHasDeepSeekKey)
  }, [])
  async function checkEnvVar(name: string): Promise<boolean> {
    try { const val = await window.electronAPI.env.get(name); return !!val } catch { return false }
  }
  const isComplete = hasQwenKey === true && hasDeepSeekKey === true
  if (hasQwenKey === null && hasDeepSeekKey === null) return <p style={{ fontSize: 13, color: '#7a8aaa' }}>检测中...</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <span style={{ color: hasQwenKey ? '#7ecb82' : '#e88080' }}>{hasQwenKey ? '✅' : '❌'} Qwen API Key（视觉理解 + 图片生成）</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <span style={{ color: hasDeepSeekKey ? '#7ecb82' : '#e88080' }}>{hasDeepSeekKey ? '✅' : '❌'} DeepSeek API Key（脑洞 + 守门）</span>
      </div>
      {config.mode === 'real' && !isComplete && (
        <div style={{ padding: 8, background: 'rgba(100,40,40,0.3)', border: '1px solid rgba(180,80,80,0.4)', borderRadius: 6, fontSize: 12, color: '#e88080' }}>
          ⚠ 配置不完整 - 请设置缺失的 API Key 后再切换到 Real Mode
        </div>
      )}
      {isComplete && (
        <div style={{ padding: 8, background: 'rgba(40,100,50,0.3)', border: '1px solid rgba(80,180,90,0.4)', borderRadius: 6, fontSize: 12, color: '#7ecb82' }}>
          ✅ API 配置完整 - 可以使用 Real Mode
        </div>
      )}
    </div>
  )
}
