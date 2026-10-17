import { useEffect, useRef, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { TABLE_EDITOR_HELP } from '../lib/tableEditorHelp.js'

// 표 편집기 헤더의 "도움말" 단추. 마우스를 올리면 도움말 팝업이 보이고, 눌러서 고정할 수도 있다(고정하면 바깥을 누를 때 닫힌다).
// 예전에는 표 위쪽에 작은 글씨 한 덩어리로 적혀 있었다. 내용은 lib/tableEditorHelp.js 에 주제별로 있다.
export function TableEditorHelp() {
  const [hover, setHover] = useState(false)
  const [pinned, setPinned] = useState(false)
  const rootRef = useRef(null)

  // 고정한 도움말은 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!pinned) return undefined
    const closeOutside = (e) => {
      if (!rootRef.current?.contains(e.target)) setPinned(false)
    }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [pinned])

  const open = hover || pinned
  return (
    // 팝업도 이 요소 안에 있어서 단추에서 팝업으로 마우스를 옮겨도 닫히지 않는다.
    <div ref={rootRef} className="table-editor-help" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        type="button"
        className={`table-editor-help-btn${pinned ? ' active' : ''}`}
        title="도움말 — 마우스를 올리면 보이고, 누르면 고정됩니다"
        aria-expanded={open}
        onClick={() => setPinned((value) => !value)}
      >
        <CircleHelp size={16} />
        <span>도움말</span>
      </button>
      {open && (
        <div className="table-editor-help-popover" role="dialog" aria-label="표 편집기 도움말">
          {TABLE_EDITOR_HELP.map((section) => (
            <section key={section.title} className="table-editor-help-section">
              <h3>{section.title}</h3>
              <ul>
                {section.items.map((item) => (
                  <li key={`${item.keys ?? ''}${item.text}`}>
                    {item.keys && <span className="help-keys">{item.keys}</span>}
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
