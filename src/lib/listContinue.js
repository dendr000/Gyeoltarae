// Copyright (c) dendr000. MIT License.

// 목록·인용 줄 끝에서 Enter — 아래 줄에 같은 표시를 자동으로 만들어 준다. 세 종류를 다룬다:
//   `* 항목`   별표 목록 → 다음 줄도 같은 별표(깊이 유지)
//   `1. 항목`  번호 목록 → 다음 줄은 다음 번호(`2. `, 앞의 0 자릿수 유지)
//   `> 내용`   인용      → 다음 줄도 같은 `>`(깊이 유지)
// 내용이 없는 표시만 있는 줄에서 Enter 를 한 번 더 치면 그 표시를 지워서 목록·인용을 끝낸다. 화면(textarea)과 분리한 순수 함수라서 시험할 수 있다.
import { isInCodeFenceAt } from './codeFence.js'

// 파서(wikiParser.js 의 LIST_RE = /^(\*+)\s+(.+)$/, OLIST_RE = /^\d+\.\s+(.+)$/, QUOTE_RE = /^(>+)\s?(.*)$/)와 같은 모양이다. 앞 들여쓰기는 허용한다.
const LIST_LINE_RE = /^([ \t]*)(\*+)([ \t]+)(.*)$/
const ORDERED_LINE_RE = /^([ \t]*)(\d+)\.([ \t]+)(.*)$/
const QUOTE_LINE_RE = /^([ \t]*)(>+)([ \t]?)(.*)$/

// 한 줄을 해석한다: { markerEnd(표시가 끝나는 줄 안 위치), content(표시 뒤 내용), nextMarker(다음 줄에 만들 표시) }. 목록·인용 줄이 아니면 null.
function parseLine(text) {
  let match = LIST_LINE_RE.exec(text)
  if (match) {
    const [, indent, stars, gap, content] = match
    return { markerEnd: indent.length + stars.length + gap.length, content, nextMarker: `${indent}${stars} ` }
  }
  match = ORDERED_LINE_RE.exec(text)
  if (match) {
    const [, indent, digits, gap, content] = match
    // 앞에 0 이 붙은 번호(01.)는 다음 번호도 같은 자릿수로(02.) 쓴다.
    const next = String(Number(digits) + 1).padStart(digits.startsWith('0') ? digits.length : 0, '0')
    return { markerEnd: indent.length + digits.length + 1 + gap.length, content, nextMarker: `${indent}${next}. ` }
  }
  match = QUOTE_LINE_RE.exec(text)
  if (match) {
    const [, indent, arrows, gap, content] = match
    // 공백 없는 인용(>문장)도 이어 쓰되 다음 줄은 `> ` 로 만든다.
    return { markerEnd: indent.length + arrows.length + gap.length, content, nextMarker: `${indent}${arrows} ` }
  }
  return null
}

// 돌려주는 값: { from, to, insert, caret }
//   from/to - 바꿀 범위, insert - 넣을 글, caret - 바꾼 뒤 커서 자리
// null 이면 아무것도 하지 않는다(= 호출한 쪽이 평소 Enter 동작을 그대로 둔다):
//   선택 영역이 있을 때, 코드블록 안일 때, 목록·인용 줄이 아닐 때, 커서가 표시(`* `, `1. `, `> `)보다 앞이나 안에 있을 때.
export function listContinueEdit(value, selStart, selEnd) {
  if (selStart !== selEnd) return null
  if (isInCodeFenceAt(value, selStart)) return null

  const lineStart = selStart === 0 ? 0 : value.lastIndexOf('\n', selStart - 1) + 1
  const idx = value.indexOf('\n', selStart)
  const rawEnd = idx === -1 ? value.length : idx
  // 윈도우 줄바꿈(CRLF)이면 줄 끝의 \r 은 내용이 아니다.
  const lineEnd = value[rawEnd - 1] === '\r' && rawEnd > lineStart ? rawEnd - 1 : rawEnd
  const parsed = parseLine(value.slice(lineStart, lineEnd))
  if (!parsed) return null

  if (selStart < lineStart + parsed.markerEnd) return null

  // 내용이 없는 항목(`* `, `1. `, `> ` 만 있는 줄)에서 Enter — 그 줄을 비워서 목록·인용을 끝낸다.
  if (parsed.content.trim() === '') {
    return { from: lineStart, to: lineEnd, insert: '', caret: lineStart }
  }

  const insert = `\n${parsed.nextMarker}`
  return { from: selStart, to: selStart, insert, caret: selStart + insert.length }
}
