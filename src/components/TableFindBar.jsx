import { useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { rangeLabel } from '../lib/tableStats.js'

// 표 편집기 안에서 찾아 바꾸기(Ctrl+F). 문서 편집기의 찾기 바(FindReplaceBar.jsx)와 같은 모양·키(Enter 다음, Shift+Enter 이전, Esc 닫기)다.
// 상태와 동작은 useTableFind 가 갖고 있고, 여기서는 그리기만 한다. find 는 그 훅이 돌려준 값.
export function TableFindBar({ find }) {
  const queryRef = useRef(null)

  // 열릴 때, 그리고 이미 열려 있는데 Ctrl+F 를 다시 눌렀을 때 찾기 입력칸으로 포커스를 돌린다.
  useEffect(() => {
    queryRef.current?.focus()
    queryRef.current?.select()
  }, [find.focusToken])

  const count = find.matches.length
  const position = count === 0 ? 0 : find.current + 1

  return (
    <div className="table-find-bar" onClick={(e) => e.stopPropagation()}>
      <input
        ref={queryRef}
        type="text"
        className="find-bar-input"
        placeholder="찾을 글자"
        value={find.query}
        onChange={(e) => find.changeQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return
          if (e.key === 'Enter') {
            e.preventDefault()
            if (e.shiftKey) find.prev()
            else find.next()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            find.closeBar()
          }
        }}
      />
      <input
        type="text"
        className="find-bar-input"
        placeholder="바꿀 글자"
        value={find.replacement}
        onChange={(e) => find.setReplacement(e.target.value)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return
          if (e.key === 'Enter') {
            e.preventDefault()
            find.replaceOne()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            find.closeBar()
          }
        }}
      />
      <span className="find-bar-count">{count === 0 ? '0/0' : `${position}/${count}`}</span>
      <button type="button" className="find-bar-icon-btn" title="이전 (Shift+Enter)" onClick={find.prev} disabled={count === 0}>
        <ChevronUp size={14} />
      </button>
      <button type="button" className="find-bar-icon-btn" title="다음 (Enter)" onClick={find.next} disabled={count === 0}>
        <ChevronDown size={14} />
      </button>
      <button type="button" className="find-bar-text-btn" title="바꿀 글자 입력칸에서 Enter 로도 됩니다" onClick={find.replaceOne} disabled={find.current === -1}>
        바꾸기
      </button>
      <button type="button" className="find-bar-text-btn" onClick={find.replaceEverything} disabled={count === 0}>
        모두 바꾸기
      </button>
      <label className="table-find-scope" title="여러 칸을 골라 두고 열면 자동으로 켜져서, 그 범위 안에서만 찾고 바꿉니다. 끄면 표 전체입니다">
        <input type="checkbox" checked={find.scope !== null} disabled={find.scope === null && !find.canScope} onChange={find.toggleScope} />
        선택 범위만{find.scope ? ` (${rangeLabel(find.scope)})` : ''}
      </label>
      <button type="button" className="find-bar-icon-btn" title="닫기 (Esc)" onClick={find.closeBar}>
        <X size={14} />
      </button>
      {find.message && <span className="table-find-message">{find.message}</span>}
    </div>
  )
}
