import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore.js'
import { countChars, formatCount } from '../lib/charCount.js'

// 편집·뷰어 아래의 글자 수 표시줄: 맨 오른쪽에 열린 문서 전체의 글자 수가 늘 보이고, 글을 드래그해서 골랐으면 그 왼쪽에 고른 글자 수가 보인다.
// 드래그 글자 수는 선택이 바뀔 때마다 생기고 사라지고 바뀌므로 전체 글자 수를 오른쪽 끝에 고정해서 그 자리가 흔들리지 않게 한다.
// 센 기준은 lib/charCount.js 다 — 공백·특수문자·한자를 모두 포함해 문자 하나를 1자로 센다(바이트 수·토큰 수는 쓰지 않는다).
//   - 문서 전체 글자 수는 늘 기본 글자 수(줄바꿈을 세지 않음)이고 문서 원문(문법 기호 포함)을 센다.
//   - 드래그 글자 수도 기본은 줄바꿈을 세지 않고, 메뉴 "설정" > "줄바꿈 포함 글자 수"를 켜면 줄바꿈도 1자로 센다.
const TOTAL_TOOLTIP = '문서 전체 글자 수: 공백·특수문자·한자를 모두 포함해 문자 하나를 1자로 셉니다 (줄바꿈은 세지 않습니다)'
const SELECTED_TOOLTIP = '드래그한 글자 수 (메뉴 "설정" > "줄바꿈 포함 글자 수"를 켜면 줄바꿈도 1자로 셉니다)'

// 지금 고른 글: 편집창(textarea)에 포커스가 있으면 그 선택 범위, 아니면 뷰어에서 드래그한 글. 고른 것이 없으면 빈 글.
function readSelectedText() {
  const active = document.activeElement
  if (active && active.tagName === 'TEXTAREA' && active.classList.contains('editor-textarea')) {
    return active.value.slice(active.selectionStart, active.selectionEnd)
  }
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return ''
  const anchor = selection.anchorNode?.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : selection.anchorNode
  // 뷰어(문서 본문) 안에서 고른 글만 센다 — 사이드바·메뉴 글씨를 드래그한 것은 문서 글자 수가 아니다.
  if (!anchor?.closest?.('.viewer-scroll')) return ''
  return selection.toString()
}

export function CharCountBar({ text }) {
  const countNewlines = useAppStore((s) => s.countNewlines)
  const total = countChars(text)
  const [selectedText, setSelectedText] = useState('')
  // 설정을 바꾸면 고른 글은 그대로 두고 센 값만 바로 바뀐다.
  const selected = countChars(selectedText, { includeNewlines: countNewlines })

  useEffect(() => {
    let frame = null
    // 선택이 바뀔 때마다 다시 읽는다. 마우스를 움직이는 동안 자주 오므로 한 화면 갱신에 한 번만 읽는다.
    const update = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(() => {
        frame = null
        setSelectedText(readSelectedText())
      })
    }
    // textarea 안의 선택은 selectionchange 가 문서까지 오지 않는 환경도 있어서 마우스·키 입력으로도 다시 읽는다.
    document.addEventListener('selectionchange', update)
    document.addEventListener('mouseup', update, true)
    document.addEventListener('keyup', update, true)
    document.addEventListener('input', update, true)
    return () => {
      document.removeEventListener('selectionchange', update)
      document.removeEventListener('mouseup', update, true)
      document.removeEventListener('keyup', update, true)
      document.removeEventListener('input', update, true)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className="char-count-bar">
      {selected > 0 && (
        <span className="char-count-selected" title={SELECTED_TOOLTIP}>
          선택 <strong>{formatCount(selected)}</strong>자
        </span>
      )}
      <span className="char-count-total" title={TOTAL_TOOLTIP}>
        글자 수 <strong>{formatCount(total)}</strong>자
      </span>
    </div>
  )
}
