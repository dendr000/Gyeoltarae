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

        {fields.map((field, idx) => (
          <label key={field.key} className="prompt-modal-field">
            <span>{field.label}</span>
            <input
              type="text"
              ref={idx === 0 ? firstInputRef : undefined}
              autoFocus={idx === 0}
              value={values[field.key] ?? ''}
              placeholder={field.placeholder}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleConfirm()
                } else if (e.key === 'Escape') {
                  onCancel()
                }
              }}
            />
          </label>
        ))}

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
