// Copyright (c) dendr000. MIT License.

// `* 항목` 줄 끝에서 Enter — 아래 줄에 같은 `* ` 를 자동으로 만들어 준다. 내용이 없는 `* ` 줄에서 Enter
// 를 한 번 더 치면 그 `* ` 를 지워서 목록을 끝낸다. 화면(textarea)과 분리한 순수 함수라서 시험할 수 있다.
import { isInCodeFenceAt } from './codeFence.js'

// 파서(wikiParser.js 의 LIST_RE = /^(\*+)\s+(.+)$/)와 같은 모양: 별표 1개 이상 + 공백. 앞 들여쓰기는 허용한다.
const LIST_LINE_RE = /^([ \t]*)(\*+)([ \t]+)(.*)$/

// 돌려주는 값: { from, to, insert, caret }
//   from/to - 바꿀 범위, insert - 넣을 글, caret - 바꾼 뒤 커서 자리
// null 이면 아무것도 하지 않는다(= 호출한 쪽이 평소 Enter 동작을 그대로 둔다):
//   선택 영역이 있을 때, 코드블록 안일 때, 목록 줄이 아닐 때, 커서가 `* ` 표시보다 앞에 있을 때.
export function listContinueEdit(value, selStart, selEnd) {
  if (selStart !== selEnd) return null
  if (isInCodeFenceAt(value, selStart)) return null

  const lineStart = selStart === 0 ? 0 : value.lastIndexOf('\n', selStart - 1) + 1
  const idx = value.indexOf('\n', selStart)
  const lineEnd = idx === -1 ? value.length : idx
  const match = LIST_LINE_RE.exec(value.slice(lineStart, lineEnd))
  if (!match) return null

  const [, indent, stars, gap, content] = match
  const markerEnd = lineStart + indent.length + stars.length + gap.length
  if (selStart < markerEnd) return null

  // 내용이 없는 항목(`* ` 만 있는 줄)에서 Enter — 그 줄을 비워서 목록을 끝낸다.
  if (content.trim() === '') {
    return { from: lineStart, to: lineEnd, insert: '', caret: lineStart }
  }

  const insert = `\n${indent}${stars} `
  return { from: selStart, to: selStart, insert, caret: selStart + insert.length }
}
