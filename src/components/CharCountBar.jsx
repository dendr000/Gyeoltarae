import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore.js'
import { countChars, formatCount } from '../lib/charCount.js'

// 편집·뷰어 아래의 글자 수 표시줄: 열린 문서 전체의 글자 수(줄바꿈 포함 문자 수)를 늘 보여 주고, 글을 드래그해서 골랐으면 고른 글자 수도 보여 준다.
// 센 기준은 lib/charCount.js 다 — 공백·특수문자·한자·줄바꿈을 모두 포함해 문자 하나를 1자로 센다(바이트 수·토큰 수는 쓰지 않는다).
// 문서 전체는 문서 원문(문법 기호 포함)을 센다. 고른 글자 수는 설정(메뉴 "설정" > "선택 글자 수")이 켜져 있을 때만 보인다.
const TOOLTIP = '줄바꿈 포함 문자 수: 공백·특수문자·한자·줄바꿈을 모두 포함해 문자 하나를 1자로 셉니다 (바이트 수·토큰 수가 아닙니다)'

// 지금 고른 글의 글자 수: 편집창(textarea)에 포커스가 있으면 그 선택 범위, 아니면 뷰어에서 드래그한 글. 고른 것이 없으면 0.
function readSelectedCount() {
  const active = document.activeElement
  if (active && active.tagName === 'TEXTAREA' && active.classList.contains('editor-textarea')) {
    return countChars(active.value.slice(active.selectionStart, active.selectionEnd))
  }
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return 0
  const anchor = selection.anchorNode?.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : selection.anchorNode
  // 뷰어(문서 본문) 안에서 고른 글만 센다 — 사이드바·메뉴 글씨를 드래그한 것은 문서 글자 수가 아니다.
  if (!anchor?.closest?.('.viewer-scroll')) return 0
  return countChars(selection.toString())
}

export function CharCountBar({ text }) {
  const showSelection = useAppStore((s) => s.selectionCharCount)
  const total = countChars(text)
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    if (!showSelection) return undefined
    let frame = null
    // 선택이 바뀔 때마다 다시 읽는다. 마우스를 움직이는 동안 자주 오므로 한 화면 갱신에 한 번만 센다.
    const update = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(() => {
        frame = null
        setSelected(readSelectedCount())
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
  }, [showSelection])

  return (
    <div className="char-count-bar" title={TOOLTIP}>
      <span>
        글자 수 <strong>{formatCount(total)}</strong>자
        <span className="char-count-basis"> (줄바꿈 포함)</span>
      </span>
      {showSelection && selected > 0 && (
        <span className="char-count-selected">
          선택 <strong>{formatCount(selected)}</strong>자
        </span>
      )}
    </div>
  )
}
