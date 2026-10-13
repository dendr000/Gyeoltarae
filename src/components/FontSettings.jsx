import { useEffect, useMemo, useRef, useState } from 'react'
import { Type } from 'lucide-react'
import { useAppStore } from '../store/useAppStore.js'
import { MONO_FONT_CHOICES, isFontInstalled, sanitizeFontFamily } from '../lib/monoFont.js'

// 편집기·코드블록 글꼴 선택(헤더의 "글" 단추 → 패널). 고른 글꼴 이름은 스토어(monoFont)에 저장되고 App 이 --mono 로 적용한다. 규칙은 lib/monoFont.js.

const SAMPLE_TEXT = 'mmmmmmmmmmlli1WWWW한글가나'

// 글꼴이 설치됐는지 canvas 로 글자 폭을 재서 판별한다(없는 글꼴은 일반 글꼴 폭이 나온다). canvas 를 못 쓰는 환경이면 판별하지 못해 null.
function createMeasure() {
  try {
    const context = document.createElement('canvas').getContext('2d')
    if (!context) return null
    return (list) => {
      context.font = `16px ${list}`
      return context.measureText(SAMPLE_TEXT).width
    }
  } catch {
    return null
  }
}

export function FontSettings() {
  const monoFont = useAppStore((s) => s.monoFont)
  const setMonoFont = useAppStore((s) => s.setMonoFont)
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')
  const [message, setMessage] = useState('')
  const rootRef = useRef(null)

  // 패널 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!open) return undefined
    const onOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  // 패널을 열 때 한 번만 설치 여부를 잰다. D2Coding 은 앱에 들어 있어 잴 필요가 없다.
  const installed = useMemo(() => {
    if (!open) return {}
    const measure = createMeasure()
    const result = {}
    for (const { family } of MONO_FONT_CHOICES) {
      result[family] = family === 'D2Coding' ? true : measure ? isFontInstalled(family, measure) : null
    }
    return result
  }, [open])

  const selectedFamily = monoFont === '' ? 'D2Coding' : monoFont
  const isPreset = MONO_FONT_CHOICES.some((choice) => choice.family === selectedFamily)

  function choose(family) {
    setMonoFont(family === 'D2Coding' ? '' : family)
    setMessage('')
  }

  function applyCustom() {
    const name = sanitizeFontFamily(custom)
    if (name === null) {
      setMessage('글꼴 이름에는 영문·숫자·한글·공백·점·밑줄·하이픈만 쓸 수 있습니다 (최대 60자)')
      return
    }
    setMonoFont(name)
    const measure = createMeasure()
    const found = measure ? isFontInstalled(name, measure) : null
    setMessage(found === false ? `"${name}" 은 이 PC 에 설치돼 있지 않은 것 같습니다. 기본 글꼴(D2Coding)로 보입니다.` : `"${name}" 으로 바꿨습니다`)
  }

  return (
    <div className="font-settings" ref={rootRef}>
      <button type="button" className="theme-toggle-btn" title="편집·코드 글꼴 설정" onClick={() => setOpen((value) => !value)}>
        <Type size={14} /> 글꼴
      </button>
      {open && (
        <div className="font-settings-panel" role="dialog" aria-label="편집·코드 글꼴">
          <div className="font-settings-title">편집·코드 글꼴</div>
          <div className="font-settings-note">편집 모드와 코드블록에 쓰는 고정폭 글꼴입니다. 한글이 섞인 줄의 열 맞춤은 한글이 영문 2칸 폭인 글꼴(★)에서만 맞습니다.</div>
          <ul className="font-settings-list">
            {MONO_FONT_CHOICES.map((choice) => {
              const state = installed[choice.family]
              const disabled = state === false
              return (
                <li key={choice.family}>
                  <label className={disabled ? 'font-settings-option disabled' : 'font-settings-option'}>
                    <input
                      type="radio"
                      name="mono-font"
                      checked={selectedFamily === choice.family}
                      disabled={disabled}
                      onChange={() => choose(choice.family)}
                    />
                    <span className="font-settings-sample" style={{ fontFamily: `'${choice.family}', monospace` }}>
                      {choice.label}
                      {choice.hangulDouble ? ' ★' : ''}
                    </span>
                    {disabled && <span className="font-settings-tag">설치 안 됨</span>}
                  </label>
                </li>
              )
            })}
            <li>
              <label className="font-settings-option">
                <input type="radio" name="mono-font" checked={!isPreset} onChange={() => custom && applyCustom()} />
                <span>직접 입력</span>
                <input
                  type="text"
                  className="font-settings-custom"
                  placeholder="설치된 글꼴 이름"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      applyCustom()
                    }
                  }}
                />
                <button type="button" className="font-settings-apply" onClick={applyCustom}>
                  적용
                </button>
              </label>
            </li>
          </ul>
          {!isPreset && <div className="font-settings-note">지금: {monoFont}</div>}
          <pre className="font-settings-preview">{'Kim     30   서울\n이름    나이  지역\nSELECT * FROM t;'}</pre>
          {message && <div className="font-settings-message">{message}</div>}
        </div>
      )}
    </div>
  )
}
