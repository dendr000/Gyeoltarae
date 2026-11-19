// Copyright (c) dendr000. MIT License.
import { isCodeFenceClose, matchCodeFenceOpen } from './codeFence.js'
import { escapeFootnoteClosers, footnoteRegExp } from './footnoteSyntax.js'

// 편집 모드의 각주([* 내용]) 도우미. 화면과 분리한 순수 함수라서 시험할 수 있다(tests/lib/footnoteEdit.test.js).
// 각주 모양은 wikiParser.js 의 규칙과 같다(lib/footnoteSyntax.js): `[*` 뒤에 공백 하나(없어도 됨), 내용은 `]` 가 나오기 전까지이고, 내용 안의 `[br]`·`[[링크]]`·`[0]` 같은 대괄호 묶음은 닫는 표시가 아니다.
// 각주는 한 줄 안에서만 센다(편집기는 줄 단위로 색을 칠하고, 각주 편집 상자도 한 줄 속 각주 하나를 다룬다).
const FOOTNOTE_RE = footnoteRegExp(false)

// 한 줄 안의 각주들: [{ start, end, bodyStart, body }]. start 는 `[` 자리, end 는 `]` 바로 다음 자리(줄 안 위치), bodyStart 는 내용이 시작하는 자리.
export function findFootnotes(line) {
  const found = []
  for (const m of line.matchAll(FOOTNOTE_RE)) {
    const end = m.index + m[0].length
    const body = m[1]
    found.push({ start: m.index, end, bodyStart: end - 1 - body.length, body })
  }
  return found
}

// 글 전체에서 커서(pos)가 대괄호 안쪽에 있는 각주 하나. 위치는 글 전체 기준이다. 없으면 null.
// `[` 바로 앞이나 `]` 바로 뒤는 각주 밖이다(그 자리에서 평소처럼 글을 써야 하므로).
export function footnoteAt(text, pos) {
  if (typeof text !== 'string' || !Number.isInteger(pos) || pos < 0 || pos > text.length) return null
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1
  let lineEnd = text.indexOf('\n', pos)
  if (lineEnd === -1) lineEnd = text.length
  const line = text.slice(lineStart, lineEnd)
  for (const fn of findFootnotes(line)) {
    const start = lineStart + fn.start
    const end = lineStart + fn.end
    if (pos > start && pos < end) return { start, end, bodyStart: lineStart + fn.bodyStart, body: fn.body }
  }
  return null
}

// 각주 내용 -> 편집 상자에 보일 글. [br] 은 진짜 줄바꿈으로 바꿔 보여 준다.
export function bodyToEditable(body) {
  return body.replace(/\[br\]/g, '\n')
}

// 편집 상자의 글 -> 각주 내용. 줄바꿈은 [br] 로 저장한다. 줄 끝 공백과 앞뒤 빈 줄은 지운다.
// 각주를 닫아 버릴 `]` 는(`[[링크]]`·`[0]` 처럼 짝이 맞는 대괄호 묶음 밖의 것) 전각 `］` 로 바꾼다.
export function editableToBody(value) {
  const lines = escapeFootnoteClosers(value.replace(/\r\n?/g, '\n'))
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
  while (lines.length > 0 && lines[0].trim() === '') lines.shift()
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()
  return lines.join('[br]')
}

// 각주(footnoteAt 의 결과) 내용만 newBody 로 바꾸는 편집: { from, to, insert }. `[*` 와 `]` 는 그대로 둔다.
export function footnoteBodyEdit(fn, newBody) {
  return { from: fn.bodyStart, to: fn.end - 1, insert: newBody }
}

const LINE_BREAK_MARK = '[br]'

// 한 줄을 색칠 조각으로 나눈다. 조각을 모두 이으면 원래 줄과 똑같다(배경판의 글자 위치가 입력칸과 어긋나면 안 되므로).
//   { text }                      각주 밖의 글
//   { text, footnote: n }         각주 한 조각(n: 글 전체에서 센 각주 번호, 0부터)
//   { text: '[br]', footnote: n, br: true }   각주 안의 줄바꿈 표시
// firstIndex: 이 줄의 첫 각주가 글 전체에서 몇 번째인지. 각주가 없으면 null.
export function footnoteSegments(line, firstIndex = 0) {
  const notes = findFootnotes(line)
  if (notes.length === 0) return null
  const segments = []
  let cursor = 0
  notes.forEach((fn, i) => {
    const n = firstIndex + i
    if (fn.start > cursor) segments.push({ text: line.slice(cursor, fn.start) })
    const inner = line.slice(fn.start, fn.end)
    let at = 0
    for (let k = inner.indexOf(LINE_BREAK_MARK); k !== -1; k = inner.indexOf(LINE_BREAK_MARK, at)) {
      if (k > at) segments.push({ text: inner.slice(at, k), footnote: n })
      segments.push({ text: LINE_BREAK_MARK, footnote: n, br: true })
      at = k + LINE_BREAK_MARK.length
    }
    if (at < inner.length) segments.push({ text: inner.slice(at), footnote: n })
    cursor = fn.end
  })
  if (cursor < line.length) segments.push({ text: line.slice(cursor) })
  return segments
}

// 글 전체의 줄마다 footnoteSegments 결과(각주가 없는 줄은 null). 코드블록(```) 안의 줄은 각주로 치지 않는다(뷰어도 코드로 그린다).
// 각주 번호는 코드블록 밖의 각주만 위에서부터 센다 — 뷰어의 각주 번호와 같은 순서다.
export function footnoteLineSegments(text) {
  let open = null
  let counter = 0
  return text.split('\n').map((rawLine) => {
    const line = rawLine.replace(/\r$/, '')
    if (open !== null) {
      if (isCodeFenceClose(line, open.ticks)) open = null
      return null
    }
    open = matchCodeFenceOpen(line)
    if (open !== null) return null
    if (!line.includes('[*')) return null
    const segments = footnoteSegments(line, counter)
    if (segments) counter += findFootnotes(line).length
    return segments
  })
}
