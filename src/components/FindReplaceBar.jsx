import { useLayoutEffect, useRef } from 'react'
import { X, ChevronUp, ChevronDown } from 'lucide-react'
import { findKeyAction } from '../lib/docFind.js'

// 현재 열린 문서 안에서만 찾는 기능(Ctrl+F) — 사이드바의 "제목·내용 검색"은 워크스페이스
// 전체를 뒤지는 전역 검색이라 서로 다른 기능. 찾아 바꾸기(Ctrl+Shift+F)는 같은 바에 입력칸
// 하나만 더 붙는 형태로 통일.
//
// 찾을 내용·바꿀 내용 칸은 여러 줄을 받는 입력칸(textarea)이다: Shift+Enter 로 줄바꿈을 넣고, 여러 줄을 붙여 넣어도 그대로 들어간다.
// 보이는 대로 찾고 바꾸므로 "\n" 같은 표기는 쓰지 않는다. 키 규칙은 lib/docFind.js 의 findKeyAction.

// 입력칸이 한 줄일 때는 한 줄 높이, 줄이 늘면 따라 커지고 이 높이(px)를 넘으면 칸 안에서 스크롤한다.
const MAX_INPUT_HEIGHT = 120

// 내용에 맞춰 높이를 조절하는 입력칸. 값이 바뀔 때(입력·붙여넣기·검색어 미리 채움)마다 맞춘다.
function GrowingInput({ value, inputRef, ...props }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    // scrollHeight 는 테두리를 뺀 높이라서 테두리(offsetHeight - clientHeight)를 더해야 스크롤바 없이 딱 맞는다.
    el.style.height = `${Math.min(el.scrollHeight + (el.offsetHeight - el.clientHeight), MAX_INPUT_HEIGHT)}px`
  }, [value])
  // 바깥(찾기 칸 포커스용)에서도 이 요소를 잡을 수 있게 inputRef 에 같이 담는다.
  const setRef = (el) => {
    ref.current = el
    if (inputRef) inputRef.current = el
  }
  return <textarea ref={setRef} rows={1} value={value} {...props} />
}

export function FindReplaceBar({ state, onQueryChange, onReplaceQueryChange, onNext, onPrev, onReplaceOne, onReplaceAll, onClose }) {
  const queryRef = useRef(null)

  useLayoutEffect(() => {
    queryRef.current?.focus()
    queryRef.current?.select()
  }, [])

  const count = state.matches.length
  const position = count === 0 ? 0 : state.currentIndex + 1

  // 키 규칙(lib/docFind.js): 줄바꿈(Shift+Enter)은 입력칸의 기본 동작에 맡기고, 나머지는 기본 동작을 막고 해당 동작을 한다.
  const handleKey = (field, actions) => (e) => {
    const action = findKeyAction(e.nativeEvent, field)
    if (action === null || action === 'newline') return
    e.preventDefault()
    actions[action]?.()
  }

  return (
    <div className="find-bar" onClick={(e) => e.stopPropagation()}>
      <div className="find-bar-row">
        <GrowingInput
          inputRef={queryRef}
          className="find-bar-input find-bar-input-multiline"
          placeholder="찾기 (Shift+Enter: 줄바꿈)"
          value={state.query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKey('query', { next: onNext, prev: onPrev, close: onClose })}
        />
        <span className="find-bar-count">{count === 0 ? '0/0' : `${position}/${count}`}</span>
        <button type="button" className="find-bar-icon-btn" title="이전 (Ctrl+Enter 또는 Shift+F3)" onClick={onPrev} disabled={count === 0}>
          <ChevronUp size={14} />
        </button>
        <button type="button" className="find-bar-icon-btn" title="다음 (Enter 또는 F3)" onClick={onNext} disabled={count === 0}>
          <ChevronDown size={14} />
        </button>
        <button type="button" className="find-bar-icon-btn" title="닫기 (Esc)" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      {state.mode === 'replace' && (
        <div className="find-bar-row">
          <GrowingInput
            className="find-bar-input find-bar-input-multiline"
            placeholder="바꿀 내용 (Shift+Enter: 줄바꿈)"
            value={state.replaceQuery}
            onChange={(e) => onReplaceQueryChange(e.target.value)}
            onKeyDown={handleKey('replace', { replaceOne: onReplaceOne, close: onClose })}
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
