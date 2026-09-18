import { useEffect, useRef, useState } from 'react'
import { Pipette } from 'lucide-react'

function hslToHex(h, s, l) {
  s /= 100
  l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

const STANDARD_ROW = ['#000000', '#666666', '#e03131', '#f76707', '#f5c518', '#82c91e', '#2f9e44', '#1098ad', '#1c7ed6', '#3b5bdb', '#7048e8']

const HUES = [0, 25, 45, 90, 140, 175, 200, 220, 250, 280, 320]
const TINTS = [92, 80, 65, 45] // pastel -> more saturated, top row lightest

const PALETTE_GRID = TINTS.map((l) => [
  hslToHex(0, 0, l), // gray column
  ...HUES.map((h) => hslToHex(h, 70, l)),
])

export function ColorPicker({ value, onChange, onClear, title }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const customInputRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function handleOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const pick = (hex) => {
    onChange(hex)
    setOpen(false)
  }

  return (
    <div className="color-picker" ref={rootRef}>
      <button type="button" className="color-picker-trigger" title={title} onClick={() => setOpen((v) => !v)}>
        <span className="color-picker-swatch" style={{ background: value || 'transparent' }} />
      </button>
      {open && (
        <div className="color-picker-popover">
          <div className="color-picker-row">
            {STANDARD_ROW.map((hex) => (
              <button
                key={hex}
                className="color-picker-cell"
                style={{ background: hex }}
                title={hex}
                onClick={() => pick(hex)}
              />
            ))}
          </div>
          {PALETTE_GRID.map((row, ri) => (
            <div className="color-picker-row" key={ri}>
              {row.map((hex, ci) => (
                <button
                  key={ci}
                  className="color-picker-cell"
                  style={{ background: hex }}
                  title={hex}
                  onClick={() => pick(hex)}
                />
              ))}
            </div>
          ))}
          <div className="color-picker-footer">
            <button
              type="button"
              className="color-picker-custom-btn"
              onClick={() => customInputRef.current?.click()}
            >
              <Pipette size={13} /> 직접 선택
            </button>
            <input
              ref={customInputRef}
              type="color"
              className="color-picker-custom-input"
              value={value || '#ffffff'}
              onChange={(e) => onChange(e.target.value)}
            />
            {onClear && (
              <button
                type="button"
                className="color-picker-clear-btn"
                onClick={() => {
                  onClear()
                  setOpen(false)
                }}
              >
                없음
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
