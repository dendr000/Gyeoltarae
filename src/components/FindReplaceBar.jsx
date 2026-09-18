import { useEffect, useRef } from 'react'
import { X, ChevronUp, ChevronDown } from 'lucide-react'

// 현재 열린 문서 안에서만 찾는 기능(Ctrl+F) — 사이드바의 "제목·내용 검색"은 워크스페이스
// 전체를 뒤지는 전역 검색이라 서로 다른 기능. 찾아 바꾸기(Ctrl+Shift+F)는 같은 바에 입력칸
// 하나만 더 붙는 형태로 통일.
export function FindReplaceBar({ state, onQueryChange, onReplaceQueryChange, onNext, onPrev, onReplaceOne, onReplaceAll, onClose }) {
  const queryRef = useRef(null)

  useEffect(() => {
    queryRef.current?.focus()
    queryRef.current?.select()
  }, [])

  const count = state.matches.length
  const position = count === 0 ? 0 : state.currentIndex + 1

  return (
    <div className="find-bar" onClick={(e) => e.stopPropagation()}>
      <div className="find-bar-row">
        <input
          ref={queryRef}
          type="text"
          className="find-bar-input"
          placeholder="찾기"
          value={state.query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (e.shiftKey) onPrev()
              else onNext()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              onClose()
            }
          }}
        />
        <span className="find-bar-count">{count === 0 ? '0/0' : `${position}/${count}`}</span>
        <button type="button" className="find-bar-icon-btn" title="이전 (Shift+Enter)" onClick={onPrev} disabled={count === 0}>
          <ChevronUp size={14} />
        </button>
        <button type="button" className="find-bar-icon-btn" title="다음 (Enter)" onClick={onNext} disabled={count === 0}>
          <ChevronDown size={14} />
        </button>
        <button type="button" className="find-bar-icon-btn" title="닫기 (Esc)" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      {state.mode === 'replace' && (
        <div className="find-bar-row">
          <input
            type="text"
            className="find-bar-input"
            placeholder="바꿀 내용"
            value={state.replaceQuery}
            onChange={(e) => onReplaceQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onReplaceOne()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
              }
            }}
          />
          <button type="button" className="find-bar-text-btn" onClick={onReplaceOne} disabled={count === 0}>
            바꾸기
          </button>
          <button type="button" className="find-bar-text-btn" onClick={onReplaceAll} disabled={count === 0}>
            모두 바꾸기
          </button>
        </div>
      )}
    </div>
  )
}
