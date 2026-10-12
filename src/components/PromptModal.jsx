import { useEffect, useRef, useState } from 'react'
import { getApi } from '../lib/api.js'

// Electron never implements window.prompt() (alert/confirm work, prompt
// doesn't — a deliberate upstream decision), so every "ask for a name"
// flow needs its own in-app modal instead. One reusable field-based modal
// covers every case in the app, from a single required name to a couple of
// fields (e.g. 자료's 유형+이름) shown together instead of as two prompts.
export function PromptModal({ title, fields, confirmLabel = '확인', onConfirm, onCancel }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? ''])))
  const firstInputRef = useRef(null)

  // Windows-only Electron bug: a freshly-autofocused input can look focused
  // (blue outline, blinking caret) while the OS never actually routes
  // keyboard input to the window, until something forces a real OS focus
  // change. The plain `autoFocus` attribute below fires the instant this
  // input mounts — i.e. BEFORE this effect's refocusWindow() round-trip has
  // even started, let alone finished — so relying on it alone re-focuses
  // too early to matter. Explicitly re-focusing the same element once
  // refocusWindow's IPC call actually resolves is what makes typing work
  // (see FileTree.jsx's rename input, which avoids this by not mounting
  // its input until after refocusWindow already resolved).
  useEffect(() => {
    getApi()
      .refocusWindow?.()
      ?.then(() => firstInputRef.current?.focus())
  }, [])

  const firstMissingRequired = fields.find((f) => f.required !== false && !values[f.key]?.trim())

  function handleConfirm() {
    if (firstMissingRequired) return
    onConfirm(Object.fromEntries(fields.map((f) => [f.key, (values[f.key] ?? '').trim()])))
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-panel prompt-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close-btn" onClick={onCancel}>
            ✕
          </button>
        </div>

        {fields.map((field, idx) => {
          const common = {
            ref: idx === 0 ? firstInputRef : undefined,
            autoFocus: idx === 0,
            value: values[field.key] ?? '',
            onChange: (e) => setValues((v) => ({ ...v, [field.key]: e.target.value })),
            onKeyDown: (e) => {
              // 여러 줄 칸(multiline)에서는 Enter 가 줄바꿈이고, 확인은 Ctrl+Enter 이다.
              if (e.key === 'Enter' && (!field.multiline || e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                handleConfirm()
              } else if (e.key === 'Escape') {
                onCancel()
              }
            },
          }
          return (
            <label key={field.key} className="prompt-modal-field">
              <span>{field.label}</span>
              {field.options ? (
                // options([{ value, label }])가 있으면 글을 직접 치는 칸 대신 목록에서 고르는 칸이다.
                <select {...common}>
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.multiline ? (
                // multiline 이면 한 줄 입력칸 대신 여러 줄 칸 — 항목이 많은 목록을 한 줄에 하나씩 보고 고치게 한다.
                <textarea rows={field.rows ?? 8} placeholder={field.placeholder} {...common} />
              ) : (
                <input type="text" placeholder={field.placeholder} {...common} />
              )}
            </label>
          )
        })}

        <div className="modal-actions">
          <button className="modal-cancel-btn" onClick={onCancel}>
            취소
          </button>
          <button className="modal-confirm-btn" onClick={handleConfirm} disabled={!!firstMissingRequired}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
