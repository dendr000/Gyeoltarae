const MODES = [
  { key: 'preview', label: '뷰어' },
  { key: 'dual', label: '듀얼' },
  { key: 'focus', label: '편집' },
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
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="editor-header-right">
        <span className={`save-status save-status-${saveStatus}`}>{SAVE_LABEL[saveStatus]}</span>
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
