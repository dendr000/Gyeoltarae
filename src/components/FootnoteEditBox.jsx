// Copyright (c) dendr000. MIT License.
import { useEffect, useRef, useState } from 'react'
import { handleFootnoteBoxKey } from '../lib/footnoteBoxKeys.js'

// 각주([* 내용]) 하나를 여러 줄로 고치는 작은 상자. 각주 안에서 Alt+E(또는 "각주 편집" 단추)로 연다.
// 본문의 [br] 은 여기서 진짜 줄바꿈으로 보이고, 적용하면 다시 [br] 로 저장된다(변환은 lib/footnoteEdit.js).
// Ctrl+Enter 또는 "적용" = 반영, Esc 또는 "취소" = 버림. 상자 밖을 누르면 고친 내용이 있을 때 반영한다.
// 본문과 같은 입력 도우미도 쓴다: 괄호 자동 닫기, Ctrl+B/U 굵게·밑줄, Alt+H 사전 순환, Alt+Shift+H 한자 등록(상자는 반영하고 닫힘), Alt+←/→ (규칙: lib/footnoteBoxKeys.js).
// 이 상자는 글을 직접 바꾸지 않고 onApply(글)/onCancel() 만 부른다 — 본문 입력칸에 넣는 일은 EditorPane 이 한다(되돌리기 기록 유지).
export function FootnoteEditBox({ initialValue, top, left, dictMap, onOpenDict, onApply, onCancel }) {
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
      if (boxRef.current && !boxRef.current.contains(e.target)) finish(valueRef.current !== initialValue)
    }
    document.addEventListener('mousedown', onDown, true)
    return () => document.removeEventListener('mousedown', onDown, true)
    // 처음 한 번만 연결한다(initialValue 는 상자가 열려 있는 동안 바뀌지 않는다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      finish(false)
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      finish(true)
    } else {
      handleFootnoteBoxKey(e, areaRef.current, {
        setValue,
        dictMap,
        // 사전 창을 누르면 상자는 "바깥 클릭"으로 닫히므로, 먼저 지금 글을 반영하고 닫은 뒤 창을 연다.
        openDict: (selected) => {
          finish(true)
          onOpenDict?.(selected)
        },
      })
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
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
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
