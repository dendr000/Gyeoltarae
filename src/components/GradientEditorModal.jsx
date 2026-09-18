import { useState } from 'react'
import {
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowDownLeft,
  Circle,
  Plus,
  X,
} from 'lucide-react'
import { ColorPicker } from './ColorPicker.jsx'

const DIRECTIONS = [
  { deg: 0, icon: ArrowUp, label: '위' },
  { deg: 45, icon: ArrowUpRight, label: '오른쪽 위' },
  { deg: 90, icon: ArrowRight, label: '오른쪽' },
  { deg: 135, icon: ArrowDownRight, label: '오른쪽 아래' },
  { deg: 180, icon: ArrowDown, label: '아래' },
  { deg: 225, icon: ArrowDownLeft, label: '왼쪽 아래' },
  { deg: 270, icon: ArrowLeft, label: '왼쪽' },
  { deg: 315, icon: ArrowUpLeft, label: '왼쪽 위' },
]

const DEFAULT_COLORS = ['#ff6b6b', '#6b6bff']

function buildGradientCss(type, angleDeg, colors) {
  const list = colors.join(', ')
  return type === 'radial' ? `radial-gradient(circle, ${list})` : `linear-gradient(${angleDeg}deg, ${list})`
}

function buildMarkup({ mode, gradientCss, content, bold, width, textColor }) {
  const wrappedContent = bold ? `'''${content}'''` : content

  if (mode === 'text') {
    const weight = bold ? ' font-weight: bold;' : ''
    return `{{{#!wiki style="color: transparent; background: ${gradientCss}; -webkit-background-clip: text; background-clip: text;${weight}"\n${wrappedContent}\n}}}`
  }

  const inner = `{{{${textColor} ${wrappedContent}}}}`
  return `||<width=${width}><nopad> {{{#!wiki style="padding: 10px 14px; background: ${gradientCss};"\n${inner}\n}}} ||`
}

export function GradientEditorModal({ initialMode, onCancel, onConfirm }) {
  const [mode, setMode] = useState(initialMode ?? 'text')
  const [gradientType, setGradientType] = useState('linear')
  const [angleDeg, setAngleDeg] = useState(90)
  const [colors, setColors] = useState(DEFAULT_COLORS)
  const [content, setContent] = useState(mode === 'text' ? '그라데이션 텍스트' : '그라데이션 표 셀')
  const [bold, setBold] = useState(true)
  const [width, setWidth] = useState(320)
  const [textColor, setTextColor] = useState('#ffffff')

  const gradientCss = buildGradientCss(gradientType, angleDeg, colors)
  const markup = buildMarkup({ mode, gradientCss, content, bold, width, textColor })

  const updateColor = (i, value) => setColors((cs) => cs.map((c, ci) => (ci === i ? value : c)))
  const addColor = () => setColors((cs) => (cs.length < 4 ? [...cs, '#ffffff'] : cs))
  const removeColor = (i) => setColors((cs) => (cs.length > 2 ? cs.filter((_, ci) => ci !== i) : cs))

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>그라데이션 편집기</h2>
          <button className="modal-close-btn" onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className="mode-switch gradient-mode-switch">
          <button className={`mode-btn ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}>
            텍스트
          </button>
          <button className={`mode-btn ${mode === 'cell' ? 'active' : ''}`} onClick={() => setMode('cell')}>
            표 셀
          </button>
        </div>

        <div className="gradient-field-row">
          <span className="gradient-field-label">종류</span>
          <div className="cell-style-toolbar-inline">
            <button className={gradientType === 'linear' ? 'active' : ''} onClick={() => setGradientType('linear')}>
              직선
            </button>
            <button className={gradientType === 'radial' ? 'active' : ''} onClick={() => setGradientType('radial')}>
              <Circle size={13} /> 원형
            </button>
          </div>
        </div>

        {gradientType === 'linear' && (
          <div className="gradient-field-row">
            <span className="gradient-field-label">방향</span>
            <div className="gradient-direction-grid">
              {DIRECTIONS.map(({ deg, icon: Icon, label }) => (
                <button
                  key={deg}
                  className={angleDeg === deg ? 'active' : ''}
                  title={label}
                  onClick={() => setAngleDeg(deg)}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="gradient-field-row">
          <span className="gradient-field-label">색상</span>
          <div className="gradient-colors">
            {colors.map((c, i) => (
              <div key={i} className="gradient-color-chip">
                <ColorPicker value={c} onChange={(hex) => updateColor(i, hex)} title={`색상 ${i + 1}`} />
                {colors.length > 2 && (
                  <button className="gradient-color-remove" onClick={() => removeColor(i)}>
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
            {colors.length < 4 && (
              <button className="gradient-color-add" onClick={addColor} title="색상 추가">
                <Plus size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="gradient-field-row">
          <span className="gradient-field-label">내용</span>
          <input className="gradient-text-input" value={content} onChange={(e) => setContent(e.target.value)} />
        </div>

        <div className="gradient-field-row">
          <label className="modal-checkbox-row" style={{ marginBottom: 0 }}>
            <input type="checkbox" checked={bold} onChange={(e) => setBold(e.target.checked)} />
            굵게
          </label>
        </div>

        {mode === 'cell' && (
          <>
            <div className="gradient-field-row">
              <span className="gradient-field-label">글자색</span>
              <ColorPicker value={textColor} onChange={setTextColor} title="글자색" />
            </div>
            <div className="gradient-field-row">
              <span className="gradient-field-label">너비(px)</span>
              <input
                type="number"
                className="gradient-width-input"
                value={width}
                min={80}
                max={800}
                onChange={(e) => setWidth(Number(e.target.value) || 320)}
              />
            </div>
          </>
        )}

        <div className="gradient-preview-label">미리보기</div>
        <div
          className="gradient-preview"
          style={
            mode === 'text'
              ? { backgroundImage: gradientCss, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: bold ? 700 : 400 }
              : { width: Math.min(width, 400), background: gradientCss, color: textColor, fontWeight: bold ? 700 : 400 }
          }
        >
          {content || ' '}
        </div>

        <div className="table-editor-preview">
          <div className="table-editor-preview-label">삽입될 문법</div>
          <pre>{markup}</pre>
        </div>

        <div className="modal-actions">
          <button className="modal-cancel-btn" onClick={onCancel}>
            취소
          </button>
          <button className="modal-confirm-btn" onClick={() => onConfirm(markup)}>
            삽입
          </button>
        </div>
      </div>
    </div>
  )
}
