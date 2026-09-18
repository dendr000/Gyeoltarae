import { useEffect, useRef } from 'react'

// Generic right-click popup menu — positioned at (x, y), closes itself on an
// outside click, Escape, or after any item runs. Items: {label, onClick,
// danger?}. Clamps into the viewport so a click near the window edge
// doesn't render off-screen.
export function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    function handlePointerDown(e) {
      if (!ref.current?.contains(e.target)) onClose()
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const style = {
    left: Math.min(x, window.innerWidth - 180),
    top: Math.min(y, window.innerHeight - items.length * 32 - 16),
  }

  return (
    <div ref={ref} className="context-menu" style={style}>
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          className={`context-menu-item ${item.danger ? 'danger' : ''}`}
          onClick={() => {
            onClose()
            item.onClick()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
