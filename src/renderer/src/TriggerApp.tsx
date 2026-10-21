import React, { useState, useEffect } from 'react'
import type { AppConfig } from '../../shared/types/api'

type SkinId = 'pixel' | 'magic' | 'paper' | 'wish' | 'battery' | 'spider'

// ============================================================
// Skin A: Pixel Treasure Chest �?Golden ornate key
// ============================================================
function PixelKey(): React.ReactElement {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="keyGrad" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#FFF8DC" />
          <stop offset="40%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#B8860B" />
        </radialGradient>
        <filter id="keyGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#keyGlow)">
        {/* Key bow (ring) */}
        <circle cx="20" cy="24" r="12" fill="none" stroke="url(#keyGrad)" strokeWidth="4" />
        <circle cx="20" cy="24" r="6" fill="#1a1a2e" />
        {/* Key bow inner detail */}
        <circle cx="20" cy="24" r="9" fill="none" stroke="#B8860B" strokeWidth="0.5" />
        {/* Key shaft */}
        <rect x="32" y="22" width="22" height="4" rx="1" fill="url(#keyGrad)" />
        {/* Key teeth */}
        <rect x="48" y="20" width="3" height="4" rx="0.5" fill="#FFD700" />
        <rect x="48" y="26" width="3" height="3" rx="0.5" fill="#FFD700" />
        <rect x="44" y="26" width="2" height="2" rx="0.5" fill="#FFD700" />
        {/* Sparkles */}
        <circle cx="16" cy="16" r="1" fill="#FFF8DC" opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="30" cy="20" r="0.8" fill="#FFFACD" opacity="0.7">
          <animate attributeName="opacity" values="0.7;0.1;0.7" dur="2s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  )
}

// ============================================================
// Skin B: Magic Potion �?Glowing enchanted flask
// ============================================================
function MagicBottle(): React.ReactElement {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="potionGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E040FB" />
          <stop offset="50%" stopColor="#7C4DFF" />
          <stop offset="100%" stopColor="#448AFF" />
        </linearGradient>
        <radialGradient id="potionGlow" cx="50%" cy="60%" r="40%">
          <stop offset="0%" stopColor="#E040FB" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#E040FB" stopOpacity="0" />
        </radialGradient>
        <filter id="bottleGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#bottleGlow)">
        {/* Glow behind */}
        <ellipse cx="32" cy="38" rx="14" ry="16" fill="url(#potionGlow)" />
        {/* Bottle neck */}
        <rect x="27" y="8" width="10" height="12" rx="2" fill="#3a3a4e" stroke="#5a5a6e" strokeWidth="1" />
        {/* Cork */}
        <rect x="28" y="6" width="8" height="5" rx="1.5" fill="#8B6914" stroke="#6B4F10" strokeWidth="0.5" />
        {/* Bottle body */}
        <path d="M25 20 Q22 22 20 30 Q18 42 22 50 Q26 56 32 56 Q38 56 42 50 Q46 42 44 30 Q42 22 39 20 Z"
              fill="#2a2a3e" stroke="#4a4a6e" strokeWidth="1.2" />
        {/* Liquid */}
        <path d="M22 32 Q20 42 22 50 Q26 56 32 56 Q38 56 42 50 Q44 42 42 32 Q38 34 32 34 Q26 34 22 32 Z"
              fill="url(#potionGrad)" opacity="0.85">
          <animate attributeName="opacity" values="0.85;0.7;0.85" dur="2s" repeatCount="indefinite" />
        </path>
        {/* Liquid surface shimmer */}
        <ellipse cx="32" cy="32" rx="10" ry="2" fill="#E040FB" opacity="0.4">
          <animate attributeName="rx" values="10;11;10" dur="1.5s" repeatCount="indefinite" />
        </ellipse>
        {/* Bubbles */}
        <circle cx="28" cy="42" r="1.5" fill="#E040FB" opacity="0.6">
          <animate attributeName="cy" values="42;36;42" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="35" cy="46" r="1" fill="#7C4DFF" opacity="0.5">
          <animate attributeName="cy" values="46;38;46" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="30" cy="50" r="1.2" fill="#448AFF" opacity="0.4">
          <animate attributeName="cy" values="50;44;50" dur="1.8s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  )
}

// ============================================================
// Skin C: Paper Plane �?Sleek paper aeroplane
// ============================================================
function PaperPlane(): React.ReactElement {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="planeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#E8EAF6" />
          <stop offset="100%" stopColor="#C5CAE9" />
        </linearGradient>
        <linearGradient id="planeShadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#9FA8DA" />
          <stop offset="100%" stopColor="#5C6BC0" />
        </linearGradient>
        <filter id="planeGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#planeGlow)" style={{ transformOrigin: '32px 32px', animation: 'floatPlane 3s ease-in-out infinite' }}>
        {/* Top wing */}
        <path d="M8 30 L48 8 L40 30 Z" fill="url(#planeGrad)" stroke="#9FA8DA" strokeWidth="1" />
        {/* Bottom wing */}
        <path d="M8 30 L48 8 L40 52 Z" fill="url(#planeShadow)" stroke="#7986CB" strokeWidth="0.8" />
        {/* Fold line */}
        <line x1="8" y1="30" x2="48" y2="8" stroke="#B0BEC5" strokeWidth="0.5" />
        {/* Speed lines */}
        <line x1="4" y1="26" x2="14" y2="26" stroke="#90CAF9" strokeWidth="1" opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1s" repeatCount="indefinite" />
        </line>
        <line x1="2" y1="30" x2="10" y2="30" stroke="#90CAF9" strokeWidth="0.8" opacity="0.4">
          <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.2s" repeatCount="indefinite" />
        </line>
        <line x1="6" y1="34" x2="14" y2="34" stroke="#90CAF9" strokeWidth="0.8" opacity="0.3">
          <animate attributeName="opacity" values="0.3;0.05;0.3" dur="0.8s" repeatCount="indefinite" />
        </line>
      </g>
    </svg>
  )
}

// ============================================================
// Skin D: Wish Star — Twinkling golden star (星空许愿)
// ============================================================
function WishStar(): React.ReactElement {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wStarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF9C4" />
          <stop offset="50%" stopColor="#FFD54F" />
          <stop offset="100%" stopColor="#FFA726" />
        </linearGradient>
        <filter id="wStarGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g filter="url(#wStarGlow)">
        <polygon points="32,8 39,24 56,26 43,38 47,55 32,46 17,55 21,38 8,26 25,24" fill="url(#wStarGrad)" stroke="#E6A100" strokeWidth="1" />
      </g>
      <circle cx="52" cy="14" r="1.5" fill="#FFFFFF">
        <animate attributeName="opacity" values="1;0.1;1" dur="1.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="12" cy="16" r="1" fill="#FFF9C4">
        <animate attributeName="opacity" values="0.2;1;0.2" dur="1.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

// ============================================================
// Skin E: Battery Cell — Charging battery (电池仓)
// ============================================================
function BatteryCell(): React.ReactElement {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bCellGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#A7F3D0" />
          <stop offset="60%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect x="28" y="8" width="8" height="6" rx="1.5" fill="#B0BEC5" />
      <rect x="12" y="14" width="40" height="40" rx="6" fill="#1a2a2e" stroke="#546E7A" strokeWidth="1.5" />
      <rect x="17" y="20" width="24" height="28" rx="2" fill="url(#bCellGrad)">
        <animate attributeName="width" values="20;24;20" dur="2.2s" repeatCount="indefinite" />
      </rect>
      <rect x="44" y="25" width="4" height="18" rx="1.5" fill="#37474F" />
      <circle cx="50" cy="14" r="1.4" fill="#A7F3D0" opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.1;0.9" dur="1.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

// ============================================================
// Skin F: Cute Spider — Chibi spider (小蜘蛛)
// ============================================================
function CuteSpider(): React.ReactElement {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="spiderBodyGrad" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#9575CD" />
          <stop offset="100%" stopColor="#4527A0" />
        </radialGradient>
      </defs>
      <g stroke="#5E35B1" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M27 32 Q17 26 13 29" />
        <path d="M27 36 Q17 36 11 36" />
        <path d="M27 42 Q17 46 13 43" />
        <path d="M37 32 Q47 26 51 29" />
        <path d="M37 36 Q47 36 53 36" />
        <path d="M37 42 Q47 46 51 43" />
        <path d="M27 28 Q22 20 24 13" />
        <path d="M37 28 Q42 20 40 13" />
      </g>
      <circle cx="32" cy="43" r="12" fill="url(#spiderBodyGrad)" />
      <circle cx="32" cy="29" r="8" fill="url(#spiderBodyGrad)" />
      <circle cx="28" cy="27" r="2.6" fill="#FFFFFF" />
      <circle cx="36" cy="27" r="2.6" fill="#FFFFFF" />
      <circle cx="28.9" cy="27.1" r="1.2" fill="#1a1a2e" />
      <circle cx="36.9" cy="27.1" r="1.2" fill="#1a1a2e" />
      <path d="M30 31 Q32 33 34 31" fill="none" stroke="#1a1a2e" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

function TriggerSVG({ skin }: { skin: SkinId }): React.ReactElement {
  switch (skin) {
    case 'pixel': return <PixelKey />
    case 'magic': return <MagicBottle />
    case 'paper': return <PaperPlane />
    case 'wish': return <WishStar />
    case 'battery': return <BatteryCell />
    case 'spider': return <CuteSpider />
    default: return <PixelKey />
  }
}

export default function TriggerApp(): React.ReactElement {
  const [skin, setSkin] = useState<SkinId>('pixel')
  const draggingRef = React.useRef(false)

  useEffect(() => {
    const api = window.electronAPI

    api.config.get().then((cfg: AppConfig) => {
      setSkin(cfg.skin)
    })

    const checkConfig = setInterval(async () => {
      const cfg = await api.config.get()
      setSkin(cfg.skin || 'pixel')
    }, 3000)

    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      window.triggerEvents.sendDragMove(e.screenX, e.screenY)
    }

    const onUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      window.triggerEvents.sendEndDrag()
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)

    return () => {
      clearInterval(checkConfig)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = true
    window.triggerEvents.sendStartDrag(e.screenX, e.screenY)
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: 'transparent',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        cursor: 'grab'
      }}
    >
      <TriggerSVG skin={skin} />
    </div>
  )
}
