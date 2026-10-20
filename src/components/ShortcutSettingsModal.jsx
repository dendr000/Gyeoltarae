import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore.js'
import { SHORTCUT_ACTIONS, comboLabel, eventToCombo } from '../lib/shortcuts.js'

// 메뉴 "설정" > "단축키…" 로 여는 창: 기능마다 지금 키를 보여 주고, "변경"을 누른 뒤 원하는 키 조합을 누르면 그 키로 바뀐다. 해제·기본값 되돌리기도 된다.
// 규칙(수식키·예약된 키·충돌)은 lib/shortcuts.js 와 store 의 setShortcut 이 정한다. 이 창은 키를 받아 그 결과를 안내한다.
const GROUPS = [...new Set(SHORTCUT_ACTIONS.map((a) => a.group))]

function modifierPreview(e) {
  const parts = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  return parts.length > 0 ? `${parts.join('+')}+…` : ''
}

export function ShortcutSettingsModal({ onClose }) {
  const shortcuts = useAppStore((s) => s.shortcuts)
  const overrides = useAppStore((s) => s.shortcutOverrides)
  const setShortcut = useAppStore((s) => s.setShortcut)
  const resetShortcut = useAppStore((s) => s.resetShortcut)
  const resetAllShortcuts = useAppStore((s) => s.resetAllShortcuts)

  const [capturingId, setCapturingId] = useState(null) // 키를 기다리는 기능 id
  const [preview, setPreview] = useState('') // 수식키를 누른 동안 보여 줄 글(Ctrl+…)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(null) // { id, combo, conflict } — 다른 기능이 쓰는 키라 확인을 기다리는 중

  const labelOf = (id) => SHORTCUT_ACTIONS.find((a) => a.id === id)?.label ?? id

  // 키를 기다리는 동안: 누른 키를 이 창이 모두 받는다(다른 단축키가 동작하거나 글자가 입력되지 않게 캡처 단계에서 막는다). Esc 는 취소다.
  useEffect(() => {
    if (!capturingId) return undefined
    function handleKeyDown(e) {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setCapturingId(null)
        setPreview('')
        setMessage('')
        return
      }
      const combo = eventToCombo(e)
      if (combo === null) {
        setPreview(modifierPreview(e))
        return
      }
      const result = setShortcut(capturingId, combo)
      setCapturingId(null)
      setPreview('')
      if (result.ok) {
        setMessage(`"${labelOf(capturingId)}" 을(를) ${comboLabel(combo)} 로 지정했습니다`)
      } else if (result.conflict) {
        setPending({ id: capturingId, combo, conflict: result.conflict })
        setMessage('')
      } else {
        setMessage(`${comboLabel(combo)}: ${result.reason}`)
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [capturingId, setShortcut])

  // 키를 기다리지 않는 동안 Esc 로 창을 닫는다.
  useEffect(() => {
    if (capturingId) return undefined
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [capturingId, onClose])

  function startCapture(id) {
    setPending(null)
    setMessage('')
    setPreview('')
    setCapturingId(id)
  }

  function confirmPending() {
    const result = setShortcut(pending.id, pending.combo, { force: true })
    setMessage(
      result.ok
        ? `"${labelOf(pending.id)}" 을(를) ${comboLabel(pending.combo)} 로 지정했습니다 ("${labelOf(pending.conflict)}" 의 단축키는 없어졌습니다)`
        : result.reason,
    )
    setPending(null)
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !capturingId && onClose()}>
      <div className="modal-panel shortcut-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>단축키</h2>
          <div className="modal-header-actions">
            <button type="button" className="modal-close-btn" title="닫기 (Esc)" onClick={onClose} disabled={Boolean(capturingId)}>
              ✕
            </button>
          </div>
        </div>
        <p className="shortcut-hint">기능 오른쪽의 &quot;변경&quot;을 누른 뒤 원하는 키 조합을 누르세요. Esc 로 취소합니다. Ctrl 이나 Alt 가 들어간 조합만 지정할 수 있습니다.</p>

        <div className="shortcut-message" role="status" aria-live="polite">
          {pending ? (
            <>
              <span>
                {comboLabel(pending.combo)} 는 &quot;{labelOf(pending.conflict)}&quot; 이(가) 쓰고 있습니다. 그 기능의 단축키를 없애고 이 키로 바꿀까요?
              </span>
              <button type="button" onClick={confirmPending}>
                바꾸기
              </button>
              <button type="button" onClick={() => setPending(null)}>
                취소
              </button>
            </>
          ) : (
            message
          )}
        </div>

        {GROUPS.map((group) => (
          <section key={group} className="shortcut-group">
            <h3>{group}</h3>
            <ul>
              {SHORTCUT_ACTIONS.filter((a) => a.group === group).map((action) => {
                const changed = Object.hasOwn(overrides, action.id)
                const capturing = capturingId === action.id
                return (
                  <li key={action.id} className={capturing ? 'capturing' : undefined}>
                    <span className="shortcut-label">{action.label}</span>
                    <kbd className={`shortcut-key${changed ? ' changed' : ''}${shortcuts[action.id] ? '' : ' none'}`}>
                      {capturing ? preview || '키를 누르세요…' : comboLabel(shortcuts[action.id])}
                    </kbd>
                    <span className="shortcut-actions">
                      <button type="button" onClick={() => startCapture(action.id)} disabled={Boolean(capturingId) && !capturing}>
                        {capturing ? '입력 중…' : '변경'}
                      </button>
                      <button
                        type="button"
                        title="이 기능의 단축키를 없앱니다"
                        onClick={() => {
                          setPending(null)
                          setMessage(setShortcut(action.id, '').ok ? `"${action.label}" 의 단축키를 없앴습니다` : '')
                        }}
                        disabled={Boolean(capturingId) || !shortcuts[action.id]}
                      >
                        없애기
                      </button>
                      <button
                        type="button"
                        title={`기본 키(${comboLabel(action.defaultKey)})로 되돌립니다`}
                        onClick={() => {
                          setPending(null)
                          resetShortcut(action.id)
                          setMessage(`"${action.label}" 을(를) 기본 키(${comboLabel(action.defaultKey)})로 되돌렸습니다`)
                        }}
                        disabled={Boolean(capturingId) || !changed}
                      >
                        기본값
                      </button>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}

        <div className="shortcut-footer">
          <button
            type="button"
            onClick={() => {
              setPending(null)
              resetAllShortcuts()
              setMessage('모든 단축키를 기본 키로 되돌렸습니다')
            }}
            disabled={Boolean(capturingId) || Object.keys(overrides).length === 0}
          >
            모두 기본값으로
          </button>
        </div>
      </div>
    </div>
  )
}
