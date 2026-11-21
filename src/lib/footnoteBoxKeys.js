// Copyright (c) dendr000. MIT License.
import { resolveCycleReplacement } from './dictCycle.js'
import { moveToLineEdge } from './lineEdge.js'
import { AUTO_PAIRS, AUTO_PAIR_CLOSERS, replaceRange, wrapSelection } from './textareaEdit.js'

// 각주 편집 상자(FootnoteEditBox)의 키 처리. 본문 편집기의 단축키 중 입력칸과 글만 있으면 되는 것을 같은 규칙으로 쓴다:
// 괄호·따옴표 자동 닫기, Ctrl+B(굵게)·Ctrl+U(밑줄)·Ctrl+Shift+Alt+-(취소선), Alt+H(고유명사 사전 순환 치환),
// Alt+Shift+H(한자 사전 등록), Alt+←/→(줄 처음/끝). 처리했으면 true 를 돌려주고 기본 동작은 막는다.
// area: 입력칸, setValue: 상자의 글 상태 바꾸기, dictMap: 사전, openDict(선택한 글): 사전 등록 창을 연다(상자는 먼저 닫는다).
export function handleFootnoteBoxKey(e, area, { setValue, dictMap, openDict }) {
  if (e.nativeEvent?.isComposing) return false
  const key = e.key
  const lower = typeof key === 'string' ? key.toLowerCase() : ''
  const { selectionStart, selectionEnd, value } = area

  if ((e.ctrlKey || e.metaKey) && !e.altKey && (lower === 'b' || lower === 'u')) {
    e.preventDefault()
    if (lower === 'b') wrapSelection(area, "'''", "'''", setValue, { caretAfter: true })
    else wrapSelection(area, '__', '__', setValue)
    return true
  }
  if (e.ctrlKey && e.shiftKey && e.altKey && (e.code === 'Minus' || e.code === 'NumpadSubtract')) {
    e.preventDefault()
    wrapSelection(area, '~~', '~~', setValue)
    return true
  }
  if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && lower === 'h') {
    e.preventDefault()
    openDict(selectionStart !== selectionEnd ? value.slice(selectionStart, selectionEnd) : '')
    return true
  }
  if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && lower === 'h') {
    e.preventDefault()
    if (selectionStart !== selectionEnd) return true
    const result = resolveCycleReplacement(value.slice(0, selectionStart), dictMap)
    if (!result) return true
    const start = selectionStart - result.matchLength
    replaceRange(area, start, selectionStart, result.replacement, setValue)
    const pos = start + result.replacement.length
    area.setSelectionRange(pos, pos)
    return true
  }
  if (e.altKey && !e.ctrlKey && !e.metaKey && (key === 'ArrowLeft' || key === 'ArrowRight')) {
    e.preventDefault()
    const r = moveToLineEdge(value, selectionStart, selectionEnd, area.selectionDirection, key === 'ArrowLeft' ? 'start' : 'end', e.shiftKey)
    area.setSelectionRange(r.start, r.end, r.direction)
    return true
  }
  if (!e.ctrlKey && !e.metaKey && !e.altKey) {
    // 이미 닫는 글자가 바로 앞에 있으면 새로 넣지 않고 건너뛴다.
    if (AUTO_PAIR_CLOSERS.has(key) && selectionStart === selectionEnd && value[selectionStart] === key) {
      e.preventDefault()
      area.setSelectionRange(selectionStart + 1, selectionStart + 1)
      return true
    }
    if (Object.prototype.hasOwnProperty.call(AUTO_PAIRS, key)) {
      e.preventDefault()
      if (selectionStart !== selectionEnd) {
        wrapSelection(area, key, AUTO_PAIRS[key], setValue)
      } else {
        replaceRange(area, selectionStart, selectionEnd, `${key}${AUTO_PAIRS[key]}`, setValue)
        area.setSelectionRange(selectionStart + 1, selectionStart + 1)
      }
      return true
    }
  }
  return false
}
