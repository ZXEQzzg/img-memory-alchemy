import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { JobState, JobStateEvent, ProvenanceRecord } from '../../shared/types/api'

type WidgetView = 'idle' | 'pipeline' | 'reveal' | 'error'
type SkinId = 'pixel' | 'magic' | 'paper' | 'wish' | 'battery' | 'spider'
type DragState = 'idle' | 'dragging' | 'hover' | 'triggered'
type StageStatus = 'pending' | 'active' | 'done' | 'failed'

// ============================================================
// Skin A: Pixel Treasure Chest — Golden key + Ornate chest
// ============================================================
function PixelSkin({ dragState, onDrop }: { dragState: DragState; onDrop: (e: React.DragEvent) => void }): React.ReactElement {
  return (
    <>
      <div className="drop-zone pixel-chest" data-state={dragState}
        onDragOver={(e) => { e.preventDefault() }}
        onDrop={onDrop}
      >
        <svg width="64" height="64" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="wChestBody" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#A0522D" />
              <stop offset="50%" stopColor="#8B4513" />
              <stop offset="100%" stopColor="#654321" />
            </linearGradient>
            <linearGradient id="wChestLid" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#CD853F" />
              <stop offset="100%" stopColor="#8B4513" />
            </linearGradient>
            <radialGradient id="wChestGlow" cx="50%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="48" cy="84" rx="28" ry="5" fill="rgba(0,0,0,0.3)" />
          {dragState === 'hover' && (
            <ellipse cx="48" cy="36" rx="24" ry="20" fill="url(#wChestGlow)">
              <animate attributeName="opacity" values="0.6;1;0.6" dur="1.2s" repeatCount="indefinite" />
            </ellipse>
          )}
          {dragState === 'triggered' && (
            <ellipse cx="48" cy="30" rx="30" ry="24" fill="#FFD700" opacity="0.3">
              <animate attributeName="opacity" values="0.3;0.6;0.3" dur="0.6s" repeatCount="indefinite" />
            </ellipse>
          )}
          <rect x="20" y="48" width="56" height="32" rx="3" fill="url(#wChestBody)" stroke="#4a2800" strokeWidth="1.5" />
          <rect x="20" y="48" width="56" height="4" fill="#5a3800" opacity="0.6" />
          <rect x="20" y="76" width="56" height="4" fill="#5a3800" opacity="0.6" />
          <rect x="32" y="48" width="3" height="32" fill="#5a3800" opacity="0.4" />
          <rect x="61" y="48" width="3" height="32" fill="#5a3800" opacity="0.4" />
          <rect x="42" y="56" width="12" height="16" rx="2" fill="#DAA520" stroke="#B8860B" strokeWidth="1" />
          <circle cx="48" cy="62" r="3" fill="#1a1a2e" stroke="#B8860B" strokeWidth="0.5" />
          <rect x="47" y="64" width="2" height="5" rx="0.5" fill="#B8860B" />
          <path d="M20 48 Q48 24 76 48" fill="url(#wChestLid)" stroke="#4a2800" strokeWidth="1.5" />
          <circle cx="26" cy="46" r="1.5" fill="#DAA520" />
          <circle cx="70" cy="46" r="1.5" fill="#DAA520" />
          <circle cx="36" cy="36" r="1.5" fill="#DAA520" />
          <circle cx="60" cy="36" r="1.5" fill="#DAA520" />
        </svg>
        <p className="drop-zone-hint">{dragState === 'triggered' ? '✨ 生成中...' : dragState === 'hover' ? '放入!' : '拖放至此'}</p>
      </div>
      <div className="trigger-element pixel-key" draggable={dragState === 'idle'} data-state={dragState}>
        <svg width="44" height="44" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="wKeyGrad" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#FFF8DC" />
              <stop offset="40%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#B8860B" />
            </radialGradient>
          </defs>
          <circle cx="20" cy="24" r="12" fill="none" stroke="url(#wKeyGrad)" strokeWidth="4" />
          <circle cx="20" cy="24" r="6" fill="#1a1a2e" />
          <circle cx="20" cy="24" r="9" fill="none" stroke="#B8860B" strokeWidth="0.5" />
          <rect x="32" y="22" width="22" height="4" rx="1" fill="url(#wKeyGrad)" />
          <rect x="48" y="20" width="3" height="4" rx="0.5" fill="#FFD700" />
          <rect x="48" y="26" width="3" height="3" rx="0.5" fill="#FFD700" />
          <rect x="44" y="26" width="2" height="2" rx="0.5" fill="#FFD700" />
          <circle cx="16" cy="16" r="1" fill="#FFF8DC" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </svg>
        <p className="trigger-hint">{dragState === 'dragging' ? '松开生成' : '拖动钥匙'}</p>
      </div>
    </>
  )
}

// ============================================================
// Skin B: Magic Potion — Enchanted flask + Cauldron
// ============================================================
function MagicSkin({ dragState, onDrop }: { dragState: DragState; onDrop: (e: React.DragEvent) => void }): React.ReactElement {
  return (
    <>
      <div className="drop-zone magic-cauldron" data-state={dragState}
        onDragOver={(e) => { e.preventDefault() }}
        onDrop={onDrop}
      >
        <svg width="64" height="64" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="wCauldronBody" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#4a4a5e" />
              <stop offset="70%" stopColor="#2a2a3e" />
              <stop offset="100%" stopColor="#1a1a2e" />
            </radialGradient>
            <linearGradient id="wLiquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#9C27B0" />
              <stop offset="50%" stopColor="#7C4DFF" />
              <stop offset="100%" stopColor="#3F51B5" />
            </linearGradient>
          </defs>
          <ellipse cx="48" cy="86" rx="26" ry="4" fill="rgba(0,0,0,0.4)" />
          <path d="M22 44 Q18 60 20 72 Q22 80 30 82 Q40 84 48 84 Q56 84 66 82 Q74 80 76 72 Q78 60 74 44 Z"
                fill="url(#wCauldronBody)" stroke="#3a3a4e" strokeWidth="1.5" />
          <ellipse cx="48" cy="44" rx="27" ry="6" fill="#3a3a4e" stroke="#4a4a5e" strokeWidth="1.5" />
          <ellipse cx="48" cy="44" rx="24" ry="5" fill="#1a1a2e" />
          <path d="M24 80 L20 88 L28 86 Z" fill="#2a2a3e" stroke="#3a3a4e" strokeWidth="0.5" />
          <path d="M72 80 L76 88 L68 86 Z" fill="#2a2a3e" stroke="#3a3a4e" strokeWidth="0.5" />
          <ellipse cx="48" cy="44" rx="22" ry="4" fill="url(#wLiquidGrad)" opacity="0.9" />
          <circle cx="40" cy="40" r="2" fill="#E040FB" opacity="0.7">
            <animate attributeName="cy" values="44;30;44" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="54" cy="38" r="1.5" fill="#7C4DFF" opacity="0.6">
            <animate attributeName="cy" values="44;28;44" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite" />
          </circle>
          {dragState === 'hover' && (
            <ellipse cx="48" cy="36" rx="18" ry="14" fill="#E040FB" opacity="0.3">
              <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1s" repeatCount="indefinite" />
            </ellipse>
          )}
          {dragState === 'triggered' && (
            <ellipse cx="48" cy="28" rx="24" ry="18" fill="#E040FB" opacity="0.4">
              <animate attributeName="opacity" values="0.3;0.6;0.3" dur="0.6s" repeatCount="indefinite" />
            </ellipse>
          )}
        </svg>
        <p className="drop-zone-hint">{dragState === 'triggered' ? '⚗️ 炼金中...' : dragState === 'hover' ? '投入!' : '投入炼金锅'}</p>
      </div>
      <div className="trigger-element magic-potion" draggable={dragState === 'idle'} data-state={dragState}>
        <svg width="44" height="44" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="wPotionGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E040FB" />
              <stop offset="50%" stopColor="#7C4DFF" />
              <stop offset="100%" stopColor="#448AFF" />
            </linearGradient>
          </defs>
          <rect x="27" y="8" width="10" height="12" rx="2" fill="#3a3a4e" stroke="#5a5a6e" strokeWidth="1" />
          <rect x="28" y="6" width="8" height="5" rx="1.5" fill="#8B6914" stroke="#6B4F10" strokeWidth="0.5" />
          <path d="M25 20 Q22 22 20 30 Q18 42 22 50 Q26 56 32 56 Q38 56 42 50 Q46 42 44 30 Q42 22 39 20 Z"
                fill="#2a2a3e" stroke="#4a4a6e" strokeWidth="1.2" />
          <path d="M22 32 Q20 42 22 50 Q26 56 32 56 Q38 56 42 50 Q44 42 42 32 Q38 34 32 34 Q26 34 22 32 Z"
                fill="url(#wPotionGrad)" opacity="0.85" />
          <circle cx="28" cy="42" r="1.5" fill="#E040FB" opacity="0.6">
            <animate attributeName="cy" values="42;36;42" dur="2s" repeatCount="indefinite" />
          </circle>
        </svg>
        <p className="trigger-hint">{dragState === 'dragging' ? '投入！' : '拖动药瓶'}</p>
      </div>
    </>
  )
}

// ============================================================
// Skin C: Paper Plane — Paper airplane + Memory album
// ============================================================
function PaperSkin({ dragState, onDrop }: { dragState: DragState; onDrop: (e: React.DragEvent) => void }): React.ReactElement {
  return (
    <>
      <div className="drop-zone paper-album" data-state={dragState}
        onDragOver={(e) => { e.preventDefault() }}
        onDrop={onDrop}
      >
        <svg width="64" height="64" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="wAlbumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFCC02" />
              <stop offset="100%" stopColor="#F57F17" />
            </linearGradient>
          </defs>
          <ellipse cx="48" cy="86" rx="24" ry="4" fill="rgba(0,0,0,0.3)" />
          <rect x="24" y="14" width="48" height="66" rx="4" fill="url(#wAlbumGrad)" stroke="#E65100" strokeWidth="1.5" />
          <rect x="24" y="14" width="4" height="66" rx="2" fill="#E65100" opacity="0.4" />
          <rect x="30" y="20" width="38" height="56" rx="2" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="0.5" />
          <rect x="34" y="24" width="14" height="14" rx="1" fill="#81D4FA" stroke="#4FC3F7" strokeWidth="0.5" />
          <rect x="52" y="24" width="14" height="14" rx="1" fill="#FFCC80" stroke="#FFB74D" strokeWidth="0.5" />
          <rect x="34" y="42" width="14" height="14" rx="1" fill="#C8E6C9" stroke="#81C784" strokeWidth="0.5" />
          <rect x="52" y="42" width="14" height="14" rx="1" fill="#F8BBD0" stroke="#F48FB1" strokeWidth="0.5" />
          <rect x="70" y="20" width="3" height="20" rx="1" fill="#E53935" />
          <path d="M70 40 L71.5 44 L73 40" fill="#E53935" />
          {dragState === 'hover' && (
            <rect x="30" y="20" width="38" height="56" rx="2" fill="#FFD700" opacity="0.15">
              <animate attributeName="opacity" values="0.15;0.3;0.15" dur="1s" repeatCount="indefinite" />
            </rect>
          )}
        </svg>
        <p className="drop-zone-hint">{dragState === 'triggered' ? '📸 回忆中...' : dragState === 'hover' ? '放入!' : '放入相册'}</p>
      </div>
      <div className="trigger-element paper-plane" draggable={dragState === 'idle'} data-state={dragState}>
        <svg width="44" height="44" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="wPlaneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#E8EAF6" />
              <stop offset="100%" stopColor="#C5CAE9" />
            </linearGradient>
            <linearGradient id="wPlaneShadow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#9FA8DA" />
              <stop offset="100%" stopColor="#5C6BC0" />
            </linearGradient>
          </defs>
          <path d="M8 30 L48 8 L40 30 Z" fill="url(#wPlaneGrad)" stroke="#9FA8DA" strokeWidth="1" />
          <path d="M8 30 L48 8 L40 52 Z" fill="url(#wPlaneShadow)" stroke="#7986CB" strokeWidth="0.8" />
          <line x1="8" y1="30" x2="48" y2="8" stroke="#B0BEC5" strokeWidth="0.5" />
          <line x1="4" y1="26" x2="14" y2="26" stroke="#90CAF9" strokeWidth="1" opacity="0.5">
            <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1s" repeatCount="indefinite" />
          </line>
        </svg>
        <p className="trigger-hint">{dragState === 'dragging' ? '发射！' : '拖动纸飞机'}</p>
      </div>
    </>
  )
}

// ============================================================
// Pipeline Status Panel
// ============================================================
function PipelineStatusPanel({ stages, onCancel }: {
  stages: { name: string; label: string; status: StageStatus }[]
  onCancel: () => void
}): React.ReactElement {
  const statusIcon: Record<StageStatus, string> = {
    pending: '○', active: '◉', done: '✓', failed: '✗'
  }
  return (
    <div className="pipeline-status-panel">
      <div className="stages">
        {stages.map((s) => (
          <div key={s.name} className={`stage-indicator stage--${s.status}`}>
            <span className="stage-icon">{statusIcon[s.status]}</span>
            <span className="stage-label">{s.label}</span>
          </div>
        ))}
      </div>
      <button className="btn-cancel" onClick={onCancel}>✕ 取消</button>
    </div>
  )
}

// ============================================================
// Reveal Panel
// ============================================================
function RevealPanel({ result, onSave, onRetry, onDiscard, onShowOriginal }: {
  result: { imageDataUrl: string; provenance: ProvenanceRecord } | null
  onSave: () => void
  onRetry: () => void
  onDiscard: () => void
  onShowOriginal: () => void
}): React.ReactElement {
  if (!result) return <div className="reveal-panel"><p>无结果</p></div>
  return (
    <div className="reveal-panel">
      <img
        src={result.imageDataUrl}
        alt="Generated"
        className="generated-image"
        style={{ maxWidth: '100%', borderRadius: 8, objectFit: 'cover' }}
      />
      <div className="provenance-card">
        <p style={{ fontSize: 13, fontWeight: 600, color: '#c0cce8', marginBottom: 4 }}>
          🎨 {result.provenance.theme}
        </p>
        <p style={{ fontSize: 11, color: '#7a8aaa', marginBottom: 2 }}>
          📸 {result.provenance.sourcePhotos.length} 张原图参与
        </p>
        <p style={{ fontSize: 11, color: '#7a8aaa' }}>
          ⏰ {new Date(result.provenance.createdAt).toLocaleString()}
        </p>
      </div>
      <div className="action-bar">
        <button onClick={onSave}>💾 保存</button>
        <button onClick={onShowOriginal}>👁 查看原图</button>
        <button onClick={onRetry}>🔄 再生成</button>
        <button onClick={onDiscard}>🗑 丢弃</button>
      </div>
    </div>
  )
}

// ============================================================
// Error Panel
// ============================================================
function ErrorPanel({ error, onRetry, onDiscard }: {
  error: { stage: string; message: string } | null
  onRetry: () => void
  onDiscard: () => void
}): React.ReactElement {
  const stageLabels: Record<string, string> = {
    selecting: '选择照片', describing: 'AI 分析', prompting: '生成提示词',
    moderating: '安全审查', generating: '图片生成'
  }
  return (
    <div className="error-panel">
      <div style={{ fontSize: 32 }}>⚠️</div>
      <p style={{ fontWeight: 600, fontSize: 14, color: '#e88080' }}>生成失败</p>
      {error && (
        <>
          <p style={{ fontSize: 12, color: '#c08080' }}>
            失败阶段：<span style={{ color: '#e0a0a0' }}>{stageLabels[error.stage] || error.stage}</span>
          </p>
          <p style={{ fontSize: 12, color: '#a0a0a0', textAlign: 'center' }}>{error.message}</p>
        </>
      )}
      <div className="action-bar" style={{ marginTop: 8 }}>
        <button onClick={onRetry} style={{ borderColor: 'rgba(80,180,90,0.4)', background: 'rgba(40,100,50,0.3)', color: '#7ecb82' }}>
          🔄 重试
        </button>
        <button onClick={onDiscard}>🗑 丢弃</button>
      </div>
    </div>
  )
}

// ============================================================
// Upload Confirm Dialog
// ============================================================
function UploadConfirmDialog({ onConfirm, onCancel, fileInfo }: {
  onConfirm: () => void
  onCancel: () => void
  fileInfo: { filenames: string[]; serviceName: string } | null
}): React.ReactElement | null {
  if (!fileInfo) return null
  return (
    <div className="upload-confirm-overlay">
      <div className="upload-confirm-dialog">
        <h3 style={{ color: '#e0e0e0', fontSize: 15, marginBottom: 8 }}>确认上传</h3>
        <p style={{ fontSize: 12, color: '#a0b0d0', marginBottom: 8 }}>
          以下照片将发送至 <strong>{fileInfo.serviceName}</strong> 用于分析和生成：
        </p>
        <ul style={{ fontSize: 11, color: '#8090b0', marginBottom: 12, listStyle: 'none' }}>
          {fileInfo.filenames.slice(0, 5).map((f) => <li key={f}>📄 {f}</li>)}
          {fileInfo.filenames.length > 5 && <li>... 还有 {fileInfo.filenames.length - 5} 个</li>}
        </ul>
        <p style={{ fontSize: 11, color: '#7a8aaa', marginBottom: 12 }}>
          💰 此操作可能产生 API 调用费用
        </p>
        <div className="action-bar">
          <button onClick={onCancel} style={{ borderColor: 'rgba(180,80,80,0.4)', background: 'rgba(100,40,40,0.3)', color: '#e88080' }}>
            ✕ 取消
          </button>
          <button onClick={onConfirm} style={{ borderColor: 'rgba(80,180,90,0.4)', background: 'rgba(40,100,50,0.3)', color: '#7ecb82' }}>
            ✓ 确认上传
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Main Widget App
// ============================================================
function WidgetApp(): React.ReactElement {
  const [view, setView] = useState<WidgetView>('idle')
  const [skin, setSkin] = useState<SkinId>('pixel')
  const [isDemoMode, setIsDemoMode] = useState(true)
  const [dragState, setDragState] = useState<DragState>('idle')
  const [referenceCount, setReferenceCount] = useState<1 | 'multi'>(1)
  const [, setJobState] = useState<JobState>('idle')
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [pipelineStages, setPipelineStages] = useState<{ name: string; label: string; status: StageStatus }[]>(
    [
      { name: 'selecting', label: '📷 选择照片', status: 'pending' },
      { name: 'describing', label: '🤖 AI 分析', status: 'pending' },
      { name: 'prompting', label: '✍️ 生成提示词', status: 'pending' },
      { name: 'moderating', label: '🛡️ 安全审查', status: 'pending' },
      { name: 'generating', label: '🎨 生成图片', status: 'pending' }
    ]
  )
  const [result, setResult] = useState<{ imageDataUrl: string; provenance: ProvenanceRecord } | null>(null)
  const [error, setError] = useState<{ stage: string; message: string } | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmFileInfo, setConfirmFileInfo] = useState<{ filenames: string[]; serviceName: string } | null>(null)
  const [photoCount, setPhotoCount] = useState(0)
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    window.electronAPI.config.get().then((cfg) => {
      setSkin(cfg.skin)
      setIsDemoMode(cfg.mode === 'demo')
      setReferenceCount(cfg.referenceCount)
    })
    window.electronAPI.photo.listDirectories().then((dirs) => {
      const total = dirs.reduce((sum, d) => sum + d.validCount, 0)
      setPhotoCount(total)
    })
  }, [])

  useEffect(() => {
    unsubRef.current = window.electronAPI.job.onStateChange((event: JobStateEvent) => {
      if (event.jobId !== currentJobId) return
      setJobState(event.state)
      setPipelineStages((prev) => {
        const stages = [...prev]
        const stageIdx = stages.findIndex((s) => s.name === event.state)
        stages.forEach((s, i) => {
          if (i < stageIdx && s.status === 'active') s.status = 'done'
        })
        if (stageIdx >= 0) {
          stages[stageIdx].status = 'active'
        }
        if (event.state === 'succeeded') {
          if (event.result) {
            setResult(event.result)
            setView('reveal')
          }
        } else if (event.state === 'failed') {
          if (event.error) {
            setError(event.error)
            setView('error')
            const errIdx = stages.findIndex((s) => s.name === event.error!.stage)
            if (errIdx >= 0) stages[errIdx].status = 'failed'
          }
        } else if (event.state === 'cancelled') {
          setView('idle')
          setDragState('idle')
        }
        return stages
      })
    })
    return () => { unsubRef.current?.() }
  }, [currentJobId])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragState('triggered')
    if (photoCount < 1) return
    if (!isDemoMode) {
      setShowConfirm(true)
      setConfirmFileInfo({
        filenames: ['照片1.jpg', '照片2.jpg'],
        serviceName: 'Qwen-VL + DeepSeek + Qwen-Image'
      })
    } else {
      startGeneration()
    }
  }, [photoCount, isDemoMode])

  const startGeneration = useCallback(async () => {
    setShowConfirm(false)
    setConfirmFileInfo(null)
    setError(null)
    setResult(null)
    setPipelineStages([
      { name: 'selecting', label: '📷 选择照片', status: 'pending' },
      { name: 'describing', label: '🤖 AI 分析', status: 'pending' },
      { name: 'prompting', label: '✍️ 生成提示词', status: 'pending' },
      { name: 'moderating', label: '🛡️ 安全审查', status: 'pending' },
      { name: 'generating', label: '🎨 生成图片', status: 'pending' }
    ])
    setView('pipeline')
    setDragState('triggered')
    try {
      const jobId = await window.electronAPI.job.start({ referenceCount })
      setCurrentJobId(jobId)
    } catch (err) {
      setError({ stage: 'selecting', message: err instanceof Error ? err.message : '启动失败' })
      setView('error')
      setDragState('idle')
    }
  }, [])

  const handleCancel = useCallback(async () => {
    if (currentJobId) {
      await window.electronAPI.job.cancel(currentJobId)
    }
    setView('idle')
    setDragState('idle')
    setResult(null)
    setError(null)
    setPipelineStages([
      { name: 'selecting', label: '📷 选择照片', status: 'pending' },
      { name: 'describing', label: '🤖 AI 分析', status: 'pending' },
      { name: 'prompting', label: '✍️ 生成提示词', status: 'pending' },
      { name: 'moderating', label: '🛡️ 安全审查', status: 'pending' },
      { name: 'generating', label: '🎨 生成图片', status: 'pending' }
    ])
  }, [currentJobId])

  const handleSave = useCallback(async () => {
    if (result) {
      const suggestedName = `${result.provenance.theme || 'memory-alchemy'}.png`
      await window.electronAPI.file.saveGeneratedImage(result.imageDataUrl, suggestedName)
    }
  }, [result])

  const handleRetry = useCallback(async () => {
    try {
      const jobId = await window.electronAPI.job.retry()
      setCurrentJobId(jobId)
    } catch {
      startGeneration()
    }
  }, [startGeneration])

  const handleDiscard = useCallback(() => {
    setView('idle')
    setDragState('idle')
    setResult(null)
    setError(null)
  }, [])

  const handleShowOriginal = useCallback(() => {
    if (result && result.provenance.sourcePhotos.length > 0) {
      window.electronAPI.file.openImageViewer(result.provenance.sourcePhotos[0].path)
    }
  }, [result])

  const triggerDisabled = photoCount < 1

  const renderSkin = () => {
    if (skin === 'pixel') return <PixelSkin dragState={dragState} onDrop={handleDrop} />
    if (skin === 'magic') return <MagicSkin dragState={dragState} onDrop={handleDrop} />
    return <PaperSkin dragState={dragState} onDrop={handleDrop} />
  }

  return (
    <div className="widget-container" data-skin={skin}>
      {isDemoMode && <div className="demo-badge">Demo</div>}
      {view === 'idle' && (
        <div className="skin-layer"
          onDragOver={(e) => { e.preventDefault(); if (dragState === 'idle') setDragState('hover') }}
          onDragLeave={() => { if (dragState === 'hover') setDragState('idle') }}
          onDrop={handleDrop}
        >
          {triggerDisabled ? (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
              <p style={{ fontSize: 12, color: '#e88080' }}>图片数量不足</p>
              <p style={{ fontSize: 11, color: '#7a8aaa' }}>请在控制页添加包含照片的目录</p>
            </div>
          ) : (
            renderSkin()
          )}
        </div>
      )}
      {view === 'pipeline' && (
        <PipelineStatusPanel stages={pipelineStages} onCancel={handleCancel} />
      )}
      {view === 'reveal' && (
        <RevealPanel result={result} onSave={handleSave} onRetry={handleRetry} onDiscard={handleDiscard} onShowOriginal={handleShowOriginal} />
      )}
      {view === 'error' && (
        <ErrorPanel error={error} onRetry={handleRetry} onDiscard={handleDiscard} />
      )}
      {showConfirm && (
        <UploadConfirmDialog fileInfo={confirmFileInfo} onConfirm={startGeneration}
          onCancel={() => { setShowConfirm(false); setConfirmFileInfo(null); setDragState('idle') }} />
      )}
    </div>
  )
}

export default WidgetApp
