// Copyright (c) dendr000. MIT License.
import { useEffect, useRef, useState } from 'react'
import { matchSnippetShortcut } from '../lib/snippetShortcuts.js'

// 각주([* 내용]) 하나를 여러 줄로 고치는 작은 상자. 각주 안에서 Alt+E(또는 "각주 편집" 단추)로 연다.
// 본문의 [br] 은 여기서 진짜 줄바꿈으로 보이고, 적용하면 다시 [br] 로 저장된다(변환은 lib/footnoteEdit.js).
// Ctrl+Enter 또는 "적용" = 반영, Esc 또는 "취소" = 버림. 상자 밖을 누르면 고친 내용이 있을 때 반영한다.
// 본문과 같은 입력 도우미도 쓴다 — 상용구 팝업·스페이스 치환, 괄호 자동 닫기, Ctrl+B/U, 사전 순환(Alt+H), [[ 링크 보조, 줄 이동·복제 등. 규칙은 EditorPane 의 본문
// 함수를 그대로 쓰고(assist), 사전 등록(Alt+Shift+H)·상용구 등록(Alt+T) 창은 바깥이라 먼저 지금 글을 반영하고 상자를 닫은 뒤 연다.
// 이 상자는 글을 직접 바꾸지 않고 onApply(글)/onCancel() 만 부른다 — 본문 입력칸에 넣는 일은 EditorPane 이 한다(되돌리기 기록 유지).
export function FootnoteEditBox({ initialValue, top, left, assist, onOpenDict, onOpenSnippetModal, onApply, onCancel }) {
  const [value, setValue] = useState(initialValue)
  const boxRef = useRef(null)
  const areaRef = useRef(null)
  const valueRef = useRef(value)
  valueRef.current = value
  const doneRef = useRef(false)

  const finish = (apply) => {
    if (doneRef.current) return
    doneRef.current = true
    if (apply) onApply(valueRef.current)
    else onCancel()
  }

  useEffect(() => {
    const area = areaRef.current
    if (area) {
      area.focus()
      area.setSelectionRange(area.value.length, area.value.length)
    }
    // 상자 밖을 누르면: 고친 내용이 있으면 반영하고 닫는다(없으면 그냥 닫는다).
    const onDown = (e) => {
      // 상용구·파일 추천 팝업(상자 밖에 그려짐)을 누르는 것은 바깥 클릭이 아니다.
      if (e.target.closest?.('.file-suggest-menu')) return
      if (boxRef.current && !boxRef.current.contains(e.target)) finish(valueRef.current !== initialValue)
    }
    document.addEventListener('mousedown', onDown, true)
    // 본문의 입력 도우미가 이 입력칸을 "지금 고치는 곳"으로 쓰게 등록한다(닫히면 해제하고 팝업도 닫는다).
    assist?.register({ area, setValue })
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      assist?.register(null)
    }
    // 처음 한 번만 연결한다(initialValue 는 상자가 열려 있는 동안 바뀌지 않는다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return
    const area = areaRef.current
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      finish(true)
      return
    }
    // 사전 등록·상용구 등록 창: 지금까지 고친 글을 먼저 반영하고 상자를 닫은 뒤, 선택한 글을 채워 창을 연다.
    const selected = area && area.selectionStart !== area.selectionEnd ? area.value.slice(area.selectionStart, area.selectionEnd) : ''
    if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'h') {
      e.preventDefault()
      finish(true)
      onOpenDict?.(selected)
      return
    }
    if (matchSnippetShortcut(e) === 'open-modal') {
      e.preventDefault()
      finish(true)
      onOpenSnippetModal?.(selected)
      return
    }
    if (assist) assist.onKeyDown(e)
    // 팝업을 닫는 Esc 처럼 도우미가 키를 처리했으면 상자를 닫지 않는다.
    if (e.defaultPrevented) return
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      finish(false)
    }
  }

  const lineCount = Math.min(10, Math.max(3, value.split('\n').length + 1))

  return (
    <div ref={boxRef} className="footnote-edit-box" style={{ top, left }} role="dialog" aria-label="각주 편집">
      <textarea
        ref={areaRef}
        className="footnote-edit-input"
        rows={lineCount}
        value={value}
        spellCheck={false}
        onChange={(e) => (assist ? assist.onChange(e, setValue) : setValue(e.target.value))}
        onKeyDown={onKeyDown}
        onClick={() => assist?.onCursorMove()}
        onKeyUp={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') assist?.onCursorMove()
        }}
        onBlur={() => assist?.onBlur()}
      />
      <div className="footnote-edit-foot">
        <span className="footnote-edit-hint">줄바꿈은 [br] 로 저장됩니다 · Ctrl+Enter 적용 · Esc 취소</span>
        <span className="footnote-edit-actions">
          <button type="button" className="footnote-edit-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => finish(false)}>
            취소
          </button>
          <button type="button" className="footnote-edit-btn primary" onMouseDown={(e) => e.preventDefault()} onClick={() => finish(true)}>
            적용
          </button>
        </span>
      </div>
    </div>
  )
}
