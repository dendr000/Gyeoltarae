import { FontSettings } from './FontSettings.jsx'
import { snippetLoadPercent } from '../lib/snippetLoad.js'
import { formatCount } from '../lib/charCount.js'
import { useAppStore } from '../store/useAppStore.js'

const MODES = [
  { key: 'preview', label: '뷰어', shortcut: 'Ctrl+1' },
  { key: 'dual', label: '듀얼', shortcut: 'Ctrl+2' },
  { key: 'focus', label: '편집', shortcut: 'Ctrl+3' },
]

const THEME_ICON = {
  system: '🖥️',
  light: '☀️',
  dark: '🌙',
}

const THEME_ORDER = ['system', 'light', 'dark']
const THEME_LABEL = {
  system: '시스템',
  light: '라이트',
  dark: '다크',
}

const SAVE_LABEL = {
  idle: '',
  saving: '저장 중…',
  saved: '저장됨',
  error: '저장 실패',
}

export function EditorHeader({ title, mode, onModeChange, saveStatus, theme, onThemeChange }) {
  // 상용구를 불러오는 중이면 { done, total }(lib/snippetLoad.js). "저장됨" 옆에 돌아가는 표시와 게이지바로 보여 준다.
  const snippetLoad = useAppStore((s) => s.snippetLoad)
  const nextTheme = () => {
    const idx = THEME_ORDER.indexOf(theme)
    onThemeChange(THEME_ORDER[(idx + 1) % THEME_ORDER.length])
  }

  return (
    <div className="editor-header">
      <div className="editor-header-title">{title || '문서를 선택하세요'}</div>
      <div className="mode-switch">
        {MODES.map((m) => (
          <button
            key={m.key}
            className={`mode-btn ${mode === m.key ? 'active' : ''}`}
            onClick={() => onModeChange(m.key)}
            title={`${m.label} 모드 (${m.shortcut})${m.key === 'dual' ? '' : ' — Ctrl+E 로 뷰어와 편집을 오갑니다'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="editor-header-right">
        {snippetLoad && (
          <span
            className="snippet-load"
            role="status"
            title={`상용구 ${formatCount(snippetLoad.total)}개를 불러오는 중입니다. 끝나면 사라집니다.`}
          >
            <span className="snippet-load-spinner" aria-hidden="true" />
            <span className="snippet-load-text">
              상용구 {formatCount(snippetLoad.done)}/{formatCount(snippetLoad.total)}
            </span>
            <span className="snippet-load-bar" aria-hidden="true">
              <span className="snippet-load-bar-fill" style={{ width: `${snippetLoadPercent(snippetLoad)}%` }} />
            </span>
          </span>
        )}
        <span className={`save-status save-status-${saveStatus}`}>{SAVE_LABEL[saveStatus]}</span>
        <FontSettings />
        <button
          className="theme-toggle-btn"
          onClick={nextTheme}
          title={`화면 모드: ${THEME_LABEL[theme]} (클릭하여 전환)`}
        >
          {THEME_ICON[theme]} {THEME_LABEL[theme]}
        </button>
      </div>
    </div>
  )
}
