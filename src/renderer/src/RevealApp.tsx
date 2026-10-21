import React, { useState, useEffect } from 'react'
import type { ProvenanceRecord } from '../../shared/types/api'

interface RevealResult {
  imageDataUrl: string
  provenance: ProvenanceRecord
}

/**
 * 揭晓窗口：生成成功后自动弹出，展示成品大图与操作按钮。
 * - [保存]：一键保存到「默认保存目录」（控制页可配置）
 * - [另存为…]：系统对话框选位置
 */
export default function RevealApp(): React.ReactElement {
  const [result, setResult] = useState<RevealResult | null>(null)
  const [savedTo, setSavedTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const api = window.electronAPI
    api.reveal.getLatest().then((r) => { if (r) setResult(r) })
    return api.reveal.onResult((r) => setResult(r))
  }, [])

  const handleSave = async (): Promise<void> => {
    if (!result) return
    try {
      setError(null)
      setSavedTo(null)
      const name = `${result.provenance.theme || 'memory-alchemy'}.png`
      const path = await window.electronAPI.file.saveToDirectory(result.imageDataUrl, name)
      setSavedTo(path)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    }
  }

  const handleSaveAs = async (): Promise<void> => {
    if (!result) return
    try {
      setError(null)
      const name = `${result.provenance.theme || 'memory-alchemy'}.png`
      await window.electronAPI.file.saveGeneratedImage(result.imageDataUrl, name)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    }
  }

  if (!result) {
    return <div style={{ padding: 48, textAlign: 'center', color: '#7a8aaa' }}>加载中…</div>
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, height: '100vh', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>🎨 {result.provenance.theme}</h2>
        <button className="btn btn-sm" onClick={() => window.close()}>✕ 关闭</button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: 8, overflow: 'hidden' }}>
        <img src={result.imageDataUrl} alt="成品" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 6 }} />
      </div>

      {result.provenance.promptText && (
        <div style={{ fontSize: 12, color: '#a0b0d0', lineHeight: 1.6, wordBreak: 'break-word' }}>{result.provenance.promptText}</div>
      )}
      {result.provenance.promptStyle && (
        <div style={{ fontSize: 11, color: '#7a8aaa' }}>风格：{result.provenance.promptStyle}</div>
      )}
      <div style={{ fontSize: 11, color: '#7a8aaa' }}>
        📸 {result.provenance.sourcePhotos.length} 张原图参与 · {new Date(result.provenance.createdAt).toLocaleString('zh-CN')}
      </div>

      {savedTo && <div style={{ fontSize: 12, color: '#7ecb82', wordBreak: 'break-all' }}>✅ 已保存到：{savedTo}</div>}
      {error && <div style={{ fontSize: 12, color: '#e88080', wordBreak: 'break-all' }}>❌ {error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={handleSave}>💾 保存</button>
        <button className="btn btn-sm" onClick={handleSaveAs}>另存为…</button>
      </div>
    </div>
  )
}
