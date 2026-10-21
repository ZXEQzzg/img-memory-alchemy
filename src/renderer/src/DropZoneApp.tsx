import React, { useState, useEffect } from 'react'
import type { JobStateEvent, AppConfig } from '../../shared/types/api'

type SkinId = 'pixel' | 'magic' | 'paper' | 'wish' | 'battery' | 'spider'
type ZoneState = 'idle' | 'hover' | 'triggered'

// ============================================================
// Skin A: Pixel Treasure Chest — Ornate wooden chest with glow
// ============================================================
function PixelChest({ state }: { state: ZoneState }): React.ReactElement {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <linearGradient id="chestBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#A0522D" />
          <stop offset="50%" stopColor="#8B4513" />
          <stop offset="100%" stopColor="#654321" />
        </linearGradient>
        <linearGradient id="chestLid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#CD853F" />
          <stop offset="100%" stopColor="#8B4513" />
        </linearGradient>
        <radialGradient id="chestGlow" cx="50%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#FFD700" stopOpacity="0" />
        </radialGradient>
        <filter id="chestShadow">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      {/* Ground shadow */}
      <ellipse cx="48" cy="84" rx="28" ry="5" fill="rgba(0,0,0,0.3)" filter="url(#chestShadow)" />
      {/* Glow effect */}
      {state !== 'idle' && (
        <ellipse cx="48" cy="36" rx="24" ry="20" fill="url(#chestGlow)">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="1.2s" repeatCount="indefinite" />
        </ellipse>
      )}
      {state === 'triggered' && (
        <ellipse cx="48" cy="30" rx="30" ry="24" fill="#FFD700" opacity="0.3">
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="0.6s" repeatCount="indefinite" />
        </ellipse>
      )}
      {/* Chest body */}
      <rect x="20" y="48" width="56" height="32" rx="3" fill="url(#chestBody)" stroke="#4a2800" strokeWidth="1.5" />
      {/* Metal bands on body */}
      <rect x="20" y="48" width="56" height="4" fill="#5a3800" opacity="0.6" />
      <rect x="20" y="76" width="56" height="4" fill="#5a3800" opacity="0.6" />
      <rect x="32" y="48" width="3" height="32" fill="#5a3800" opacity="0.4" />
      <rect x="61" y="48" width="3" height="32" fill="#5a3800" opacity="0.4" />
      {/* Lock plate */}
      <rect x="42" y="56" width="12" height="16" rx="2" fill="#DAA520" stroke="#B8860B" strokeWidth="1" />
      <circle cx="48" cy="62" r="3" fill="#1a1a2e" stroke="#B8860B" strokeWidth="0.5" />
      <rect x="47" y="64" width="2" height="5" rx="0.5" fill="#B8860B" />
      {/* Chest lid */}
      <path d="M20 48 Q48 24 76 48" fill="url(#chestLid)" stroke="#4a2800" strokeWidth="1.5" />
      {/* Lid metal band */}
      <path d="M20 48 Q48 30 76 48" fill="none" stroke="#5a3800" strokeWidth="3" opacity="0.4" />
      {/* Lid decoration - rivets */}
      <circle cx="26" cy="46" r="1.5" fill="#DAA520" />
      <circle cx="70" cy="46" r="1.5" fill="#DAA520" />
      <circle cx="36" cy="36" r="1.5" fill="#DAA520" />
      <circle cx="60" cy="36" r="1.5" fill="#DAA520" />
      {/* Open lid for hover */}
      {state === 'hover' && (
        <path d="M20 48 Q48 18 76 48" fill="none" stroke="#4a2800" strokeWidth="1.5" opacity="0.5">
          <animate attributeName="d" values="M20 48 Q48 18 76 48;M20 48 Q48 14 76 48;M20 48 Q48 18 76 48" dur="1s" repeatCount="indefinite" />
        </path>
      )}
      {/* Sparks when triggered */}
      {state === 'triggered' && (
        <>
          <circle cx="38" cy="30" r="2" fill="#FFD700">
            <animate attributeName="cy" values="30;18;30" dur="0.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="56" cy="28" r="1.5" fill="#FFF8DC">
            <animate attributeName="cy" values="28;14;28" dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="48" cy="32" r="1.8" fill="#FFA500">
            <animate attributeName="cy" values="32;20;32" dur="0.7s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0;1" dur="0.7s" repeatCount="indefinite" />
          </circle>
        </>
      )}
    </svg>
  )
}

// ============================================================
// Skin B: Magic Cauldron — Bubbling alchemy cauldron
// ============================================================
function MagicCauldron({ state }: { state: ZoneState }): React.ReactElement {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <radialGradient id="cauldronBody" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#4a4a5e" />
          <stop offset="70%" stopColor="#2a2a3e" />
          <stop offset="100%" stopColor="#1a1a2e" />
        </radialGradient>
        <linearGradient id="liquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#9C27B0" />
          <stop offset="50%" stopColor="#7C4DFF" />
          <stop offset="100%" stopColor="#3F51B5" />
        </linearGradient>
        <radialGradient id="liquidGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E040FB" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#7C4DFF" stopOpacity="0" />
        </radialGradient>
        <filter id="cauldronShadow">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      {/* Ground shadow */}
      <ellipse cx="48" cy="86" rx="26" ry="4" fill="rgba(0,0,0,0.4)" filter="url(#cauldronShadow)" />
      {/* Cauldron body */}
      <path d="M22 44 Q18 60 20 72 Q22 80 30 82 Q40 84 48 84 Q56 84 66 82 Q74 80 76 72 Q78 60 74 44 Z"
            fill="url(#cauldronBody)" stroke="#3a3a4e" strokeWidth="1.5" />
      {/* Cauldron rim */}
      <ellipse cx="48" cy="44" rx="27" ry="6" fill="#3a3a4e" stroke="#4a4a5e" strokeWidth="1.5" />
      <ellipse cx="48" cy="44" rx="24" ry="5" fill="#1a1a2e" />
      {/* Cauldron legs */}
      <path d="M24 80 L20 88 L28 86 Z" fill="#2a2a3e" stroke="#3a3a4e" strokeWidth="0.5" />
      <path d="M72 80 L76 88 L68 86 Z" fill="#2a2a3e" stroke="#3a3a4e" strokeWidth="0.5" />
      <path d="M44 84 L44 88 L52 88 L52 84 Z" fill="#2a2a3e" stroke="#3a3a4e" strokeWidth="0.5" />
      {/* Metal bands */}
      <path d="M20 58 Q48 62 76 58" fill="none" stroke="#5a5a6e" strokeWidth="1" opacity="0.5" />
      <path d="M20 68 Q48 72 76 68" fill="none" stroke="#5a5a6e" strokeWidth="1" opacity="0.4" />
      {/* Liquid surface */}
      <ellipse cx="48" cy="44" rx="22" ry="4" fill="url(#liquidGrad)" opacity="0.9">
        <animate attributeName="ry" values="4;4.5;4" dur="2s" repeatCount="indefinite" />
      </ellipse>
      {/* Glow above cauldron */}
      {state !== 'idle' && (
        <ellipse cx="48" cy="36" rx="18" ry="14" fill="url(#liquidGlow)">
          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.5s" repeatCount="indefinite" />
        </ellipse>
      )}
      {/* Bubbles (always animating) */}
      <circle cx="40" cy="40" r="2" fill="#E040FB" opacity="0.7">
        <animate attributeName="cy" values="44;30;44" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
        <animate attributeName="r" values="2;1;2" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="54" cy="38" r="1.5" fill="#7C4DFF" opacity="0.6">
        <animate attributeName="cy" values="44;28;44" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="48" cy="42" r="1.2" fill="#3F51B5" opacity="0.5">
        <animate attributeName="cy" values="44;34;44" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0;0.5" dur="1.8s" repeatCount="indefinite" />
      </circle>
      {/* Extra bubbles on hover */}
      {state === 'hover' && (
        <>
          <circle cx="34" cy="36" r="2.5" fill="#FF6F00" opacity="0.8">
            <animate attributeName="cy" values="42;22;42" dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="1.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="62" cy="34" r="2" fill="#FF6F00" opacity="0.7">
            <animate attributeName="cy" values="42;24;42" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="1.4s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      {/* Intense eruption on triggered */}
      {state === 'triggered' && (
        <>
          <ellipse cx="48" cy="30" rx="24" ry="18" fill="#E040FB" opacity="0.2">
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="0.6s" repeatCount="indefinite" />
          </ellipse>
          <circle cx="36" cy="24" r="3" fill="#E040FB" opacity="0.9">
            <animate attributeName="cy" values="36;12;36" dur="0.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0;0.9" dur="0.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="60" cy="26" r="2.5" fill="#7C4DFF" opacity="0.8">
            <animate attributeName="cy" values="36;14;36" dur="0.7s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="0.7s" repeatCount="indefinite" />
          </circle>
          <circle cx="48" cy="20" r="3.5" fill="#FFF8DC" opacity="0.6">
            <animate attributeName="cy" values="30;8;30" dur="0.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="0.5s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      {/* Steam wisps */}
      {state !== 'idle' && (
        <>
          <path d="M42 38 Q44 34 42 30 Q40 26 42 22" fill="none" stroke="rgba(200,200,220,0.3)" strokeWidth="1.5"
                strokeLinecap="round">
            <animate attributeName="d"
                     values="M42 38 Q44 34 42 30 Q40 26 42 22;M42 38 Q40 34 42 30 Q44 26 42 22;M42 38 Q44 34 42 30 Q40 26 42 22"
                     dur="2s" repeatCount="indefinite" />
          </path>
          <path d="M54 36 Q56 32 54 28 Q52 24 54 20" fill="none" stroke="rgba(200,200,220,0.25)" strokeWidth="1.2"
                strokeLinecap="round">
            <animate attributeName="d"
                     values="M54 36 Q56 32 54 28 Q52 24 54 20;M54 36 Q52 32 54 28 Q56 24 54 20;M54 36 Q56 32 54 28 Q52 24 54 20"
                     dur="2.5s" repeatCount="indefinite" />
          </path>
        </>
      )}
    </svg>
  )
}

// ============================================================
// Skin C: Memory Window — 窗户（接触时开窗，露出五彩斑斓的景色）
// ============================================================
function MemoryWindow({ state }: { state: ZoneState }): React.ReactElement {
  const open = state !== 'idle'
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <linearGradient id="windowSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FF9A9E" />
          <stop offset="25%" stopColor="#FECFEF" />
          <stop offset="50%" stopColor="#A18CD1" />
          <stop offset="75%" stopColor="#84FAB0" />
          <stop offset="100%" stopColor="#8EC5FC" />
        </linearGradient>
        <radialGradient id="windowGlow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFD6A5" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#FFD6A5" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="48" cy="88" rx="26" ry="4" fill="rgba(0,0,0,0.25)" />
      {open && (
        <ellipse cx="48" cy="50" rx="34" ry="32" fill="url(#windowGlow)">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.4s" repeatCount="indefinite" />
        </ellipse>
      )}
      {/* 窗框 */}
      <rect x="14" y="18" width="68" height="68" rx="5" fill="#7A5C3E" stroke="#4E3A26" strokeWidth="2" />
      {/* 窗内五彩景色（开窗时可见） */}
      {open && (
        <g>
          <rect x="18" y="22" width="60" height="60" rx="3" fill="url(#windowSky)" />
          <circle cx="30" cy="36" r="6" fill="#FFF176" opacity="0.9" />
          <circle cx="66" cy="60" r="5" fill="#F48FB1" opacity="0.9" />
          <circle cx="58" cy="30" r="3" fill="#FFFFFF" opacity="0.85" />
          <circle cx="36" cy="64" r="3.5" fill="#90CAF9" opacity="0.85" />
        </g>
      )}
      {/* 十字窗棂 */}
      <rect x="46" y="22" width="4" height="60" fill="#7A5C3E" />
      <rect x="18" y="50" width="60" height="4" fill="#7A5C3E" />
      {/* 左扇窗（接触时向左侧平推滑开） */}
      <g>
        {open && (
          <animateTransform attributeName="transform" type="translate" from="0 0" to="-26 0" dur="0.55s" fill="freeze" />
        )}
        <rect x="18" y="22" width="28" height="60" rx="1" fill="#C68B4B" stroke="#8B5A2B" strokeWidth="1" />
        <line x1="24" y1="22" x2="24" y2="82" stroke="#8B5A2B" strokeWidth="0.6" opacity="0.5" />
        <line x1="40" y1="22" x2="40" y2="82" stroke="#8B5A2B" strokeWidth="0.6" opacity="0.5" />
      </g>
      {/* 右扇窗（接触时向右侧平推滑开） */}
      <g>
        {open && (
          <animateTransform attributeName="transform" type="translate" from="0 0" to="26 0" dur="0.55s" fill="freeze" />
        )}
        <rect x="50" y="22" width="28" height="60" rx="1" fill="#C68B4B" stroke="#8B5A2B" strokeWidth="1" />
        <line x1="56" y1="22" x2="56" y2="82" stroke="#8B5A2B" strokeWidth="0.6" opacity="0.5" />
        <line x1="72" y1="22" x2="72" y2="82" stroke="#8B5A2B" strokeWidth="0.6" opacity="0.5" />
      </g>
      {/* 开窗时窗外彩点 */}
      {state === 'triggered' && (
        <>
          <circle cx="30" cy="20" r="1.6" fill="#FFD6A5">
            <animate attributeName="opacity" values="1;0;1" dur="0.7s" repeatCount="indefinite" />
          </circle>
          <circle cx="66" cy="18" r="1.4" fill="#FECFEF">
            <animate attributeName="opacity" values="1;0;1" dur="0.9s" repeatCount="indefinite" />
          </circle>
        </>
      )}
    </svg>
  )
}

// ============================================================
// Skin D: Wish Bottle — 许愿瓶（接触时瓶身与瓶内小星星抖动）
// ============================================================
function WishBottle({ state }: { state: ZoneState }): React.ReactElement {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <linearGradient id="wishGlass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(190,225,255,0.55)" />
          <stop offset="50%" stopColor="rgba(130,180,240,0.35)" />
          <stop offset="100%" stopColor="rgba(90,150,225,0.55)" />
        </linearGradient>
        <radialGradient id="wishGlow" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#C8E6FF" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#C8E6FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="48" cy="86" rx="26" ry="4" fill="rgba(0,0,0,0.3)" />
      {state !== 'idle' && (
        <ellipse cx="48" cy="44" rx="30" ry="34" fill="url(#wishGlow)">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="1.4s" repeatCount="indefinite" />
        </ellipse>
      )}
      <g transform="rotate(-12 48 48)">
        <g>
        {state !== 'idle' && (
          <animateTransform attributeName="transform" type="translate" values="0,0;2,-1;-2,1;0,0" dur="0.35s" repeatCount="indefinite" />
        )}
        <rect x="42" y="6" width="12" height="10" rx="2" fill="#C68B4B" stroke="#8B5A2B" strokeWidth="1" />
        <rect x="40" y="14" width="16" height="8" fill="url(#wishGlass)" stroke="#8FC1EA" strokeWidth="1" />
        <path d="M34 22 Q34 20 40 20 L56 20 Q62 20 62 22 L62 68 Q62 76 54 78 Q48 80 42 78 Q34 76 34 68 Z" fill="url(#wishGlass)" stroke="#8FC1EA" strokeWidth="1.5" />
        <polygon points="42,38 44,42 48,42 45,45 46,49 42,46 38,49 39,45 36,42 40,42" fill="#FFD54F" opacity="0.95">
          <animate attributeName="opacity" values="0.95;0.45;0.95" dur="1.2s" repeatCount="indefinite" />
        </polygon>
        <polygon points="52,50 54,54 58,54 55,57 56,61 52,58 48,61 49,57 46,54 50,54" fill="#FFE082" opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.6s" repeatCount="indefinite" />
        </polygon>
        <polygon points="46,62 47,64 49,64 48,66 48,68 46,66 44,68 44,66 43,64 45,64" fill="#FFF9C4" opacity="0.85">
          <animate attributeName="opacity" values="0.85;0.35;0.85" dur="1s" repeatCount="indefinite" />
        </polygon>
        </g>
      </g>
    </svg>
  )
}

// ============================================================
// Skin E: Battery Bay — 电池仓（接触时发光 + 微电流）
// ============================================================
function BatteryBay({ state }: { state: ZoneState }): React.ReactElement {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <radialGradient id="bayGlow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#7CFFB2" stopOpacity="0.7" />
          <stop offset="60%" stopColor="#7CFFB2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bayBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#37474F" />
          <stop offset="100%" stopColor="#1c2a30" />
        </linearGradient>
      </defs>
      <ellipse cx="48" cy="86" rx="28" ry="5" fill="rgba(0,0,0,0.35)" />
      {state !== 'idle' && (
        <ellipse cx="48" cy="46" rx="34" ry="30" fill="url(#bayGlow)">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="0.8s" repeatCount="indefinite" />
        </ellipse>
      )}
      <rect x="30" y="18" width="10" height="8" rx="1.5" fill="#B0BEC5" />
      <rect x="56" y="18" width="10" height="8" rx="1.5" fill="#B0BEC5" />
      <rect x="20" y="24" width="56" height="56" rx="8" fill="url(#bayBody)" stroke="#546E7A" strokeWidth="2" />
      <rect x="26" y="30" width="44" height="44" rx="5" fill="#0e1a20" stroke="#263238" strokeWidth="1.5" />
      <rect x="34" y="40" width="20" height="26" rx="3" fill="#1f2e36" stroke="#3a4a54" strokeWidth="1" />
      <rect x="56" y="46" width="4" height="14" rx="1" fill="#3a4a54" />
      {state !== 'idle' && (
        <g stroke="#B9F6CA" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M34 36 L41 41 L37 41 L43 47">
            <animate attributeName="opacity" values="1;0.15;1" dur="0.5s" repeatCount="indefinite" />
          </path>
          <path d="M58 36 L52 41 L57 41 L51 47">
            <animate attributeName="opacity" values="0.15;1;0.15" dur="0.6s" repeatCount="indefinite" />
          </path>
        </g>
      )}
      {state === 'triggered' && (
        <circle cx="48" cy="46" r="4" fill="#7CFFB2" opacity="0.5">
          <animate attributeName="r" values="3;7;3" dur="0.7s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="0.7s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  )
}

// ============================================================
// Skin F: Spider Web — 蜘蛛网（标准对称网、无阴影，接触时小花慢慢绽放）
// ============================================================
function SpiderWeb({ state }: { state: ZoneState }): React.ReactElement {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <radialGradient id="webGlow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#E1BEE7" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#E1BEE7" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* 无地面阴影 */}
      {state !== 'idle' && (
        <ellipse cx="48" cy="44" rx="34" ry="32" fill="url(#webGlow)">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.6s" repeatCount="indefinite" />
        </ellipse>
      )}
      {/* 标准蛛网：多边形 + 弧线内收，顶部为边，辐条顶端突出 */}
      <g transform="rotate(22.5 48 42)">
        <g stroke="#B0BEC5" strokeWidth="1" opacity="0.85" fill="none">
          <line x1="48" y1="42" x2="81" y2="42" />
          <line x1="48" y1="42" x2="71.33" y2="65.33" />
          <line x1="48" y1="42" x2="48" y2="75" />
          <line x1="48" y1="42" x2="24.67" y2="65.33" />
          <line x1="48" y1="42" x2="15" y2="42" />
          <line x1="48" y1="42" x2="24.67" y2="18.67" />
          <line x1="48" y1="42" x2="48" y2="9" />
          <line x1="48" y1="42" x2="71.33" y2="18.67" />
          <path d="M75,42 Q68.33,50.42 67.09,61.09 Q56.42,62.33 48,69 Q39.58,62.33 28.91,61.09 Q27.67,50.42 21,42 Q27.67,33.58 28.91,22.91 Q39.58,21.67 48,15 Q56.42,21.67 67.09,22.91 Q68.33,33.58 75,42 Z" />
          <path d="M63,42 Q59.09,46.59 58.61,52.61 Q52.59,53.59 48,57 Q43.41,53.59 37.39,52.61 Q36.91,46.59 33,42 Q36.91,37.41 37.39,31.39 Q43.41,30.41 48,27 Q52.59,30.41 58.61,31.39 Q59.09,37.41 63,42 Z" />
        </g>
      </g>
      <circle cx="48" cy="42" r="2.5" fill="#B0BEC5" opacity="0.85" />
      {/* 小花慢慢绽放 */}
      {state !== 'idle' && (
        <g>
          <g opacity="0">
            <animate attributeName="opacity" values="0;1" dur="1.8s" fill="freeze" />
            <circle cx="30" cy="30" r="2" fill="#F48FB1" />
            <circle cx="36" cy="30" r="2" fill="#81C784" />
            <circle cx="33" cy="27" r="2" fill="#F48FB1" />
            <circle cx="33" cy="33" r="2" fill="#81C784" />
            <circle cx="33" cy="30" r="2" fill="#FFD54F" />
          </g>
          <g opacity="0">
            <animate attributeName="opacity" values="0;1" dur="2.2s" fill="freeze" />
            <circle cx="52" cy="52" r="2" fill="#81C784" />
            <circle cx="58" cy="52" r="2" fill="#F48FB1" />
            <circle cx="55" cy="49" r="2" fill="#81C784" />
            <circle cx="55" cy="55" r="2" fill="#F48FB1" />
            <circle cx="55" cy="52" r="2" fill="#FFF176" />
          </g>
          <g opacity="0">
            <animate attributeName="opacity" values="0;1" dur="2.6s" fill="freeze" />
            <circle cx="64" cy="28" r="1.8" fill="#90CAF9" />
            <circle cx="69" cy="28" r="1.8" fill="#90CAF9" />
            <circle cx="66.5" cy="25.5" r="1.8" fill="#90CAF9" />
            <circle cx="66.5" cy="30.5" r="1.8" fill="#90CAF9" />
            <circle cx="66.5" cy="28" r="1.8" fill="#FFF176" />
          </g>
        </g>
      )}
    </svg>
  )
}

function DropZoneSVG({ skin, state }: { skin: SkinId; state: ZoneState }): React.ReactElement {
  switch (skin) {
    case 'pixel': return <PixelChest state={state} />
    case 'magic': return <MagicCauldron state={state} />
    case 'paper': return <MemoryWindow state={state} />
    case 'wish': return <WishBottle state={state} />
    case 'battery': return <BatteryBay state={state} />
    case 'spider': return <SpiderWeb state={state} />
    default: return <PixelChest state={state} />
  }
}

// ============================================================
// 主组件：目标区窗口只负责展示宝箱，始终常驻。
// 生成进度与结果统一显示在控制页，避免宝箱在触发后消失。
// ============================================================

const STAGE_LABELS: Record<string, string> = {
  selecting: '选图中…',
  describing: '理解图片…',
  prompting: '构思脑洞…',
  moderating: '安全守门…',
  generating: '生成作品…'
}

export default function DropZoneApp(): React.ReactElement {
  const [skin, setSkin] = useState<SkinId>('pixel')
  const [hovering, setHovering] = useState(false)
  const [active, setActive] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const api = window.electronAPI

    let toastTimer: ReturnType<typeof setTimeout> | null = null
    const showToast = (text: string) => {
      setStatusText(text)
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => setStatusText(''), 2500)
    }

    api.config.get().then((cfg: AppConfig) => {
      setSkin(cfg.skin)
      if (cfg.dropzoneScale) setScale(cfg.dropzoneScale)
    })

    const unsubHover = api.widget.onCrossWindowHover((hoveringState: boolean) => {
      setHovering(hoveringState)
    })

    const unsubJob = api.widget.onJobStateChange((event: JobStateEvent) => {
      switch (event.state) {
        case 'selecting':
        case 'describing':
        case 'prompting':
        case 'moderating':
        case 'generating':
          setActive(true)
          setStatusText(STAGE_LABELS[event.state] || '炼金中…')
          break
        case 'succeeded':
          setActive(false)
          showToast('✅ 完成，查看控制页')
          break
        case 'failed':
          setActive(false)
          showToast('❌ 失败，查看控制页')
          break
        default:
          setActive(false)
          setStatusText('')
          break
      }
    })

    const checkConfig = setInterval(async () => {
      const cfg = await api.config.get()
      setSkin(cfg.skin || 'pixel')
      if (cfg.dropzoneScale) setScale(cfg.dropzoneScale)
    }, 3000)

    return () => {
      unsubHover()
      unsubJob()
      clearInterval(checkConfig)
      if (toastTimer) clearTimeout(toastTimer)
    }
  }, [])

  const zoneState: ZoneState = active ? 'triggered' : hovering ? 'hover' : 'idle'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      background: 'transparent'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: 'transparent',
        filter: zoneState === 'hover'
          ? 'drop-shadow(0 0 8px rgba(255,215,0,0.7))'
          : zoneState === 'triggered'
            ? 'drop-shadow(0 0 10px rgba(255,215,0,0.9))'
            : 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
        transition: 'filter 0.3s ease',
        transform: `scale(${scale})`,
        transformOrigin: 'center center'
      }}>
        <DropZoneSVG skin={skin} state={zoneState} />
        {statusText && (
          <span style={{
            fontSize: 10,
            color: statusText.startsWith('✅') ? '#7ecb82' : statusText.startsWith('❌') ? '#e88080' : '#FFD700',
            marginTop: 4,
            textShadow: '0 0 4px rgba(0,0,0,0.8)',
            whiteSpace: 'nowrap'
          }}>
            {statusText}
          </span>
        )}
      </div>
    </div>
  )
}
