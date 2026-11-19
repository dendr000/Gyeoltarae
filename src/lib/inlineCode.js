// Copyright (c) dendr000. MIT License.
import { isCodeFenceClose, matchCodeFenceOpen } from './codeFence.js'

// 글 속 짧은 코드 — `{{{ 코드 }}}` (한 줄)와 `백틱 코드`. 뷰어(wikiParser.js)와 편집기의 배경 색칠이 같은 규칙을 쓰도록 한 곳에 둔다.
// `{{{+1 글}}}`·`{{{#색 글}}}`·`{{{#!...` 는 코드가 아니라 기존 문법이다.
// 백틱은 여는 쪽 뒤와 닫는 쪽 앞이 공백이 아닐 때만 코드로 본다(`Ctrl+` 와 Ctrl+Shift+`` 처럼 글 속에 백틱이 두 개 있는 경우를 코드로 오해하지 않으려고).
export const INLINE_BRACE_CODE_RE = /\{\{\{(?![+-][1-5]\s|#)([^\n]+?)\}\}\}/g
export const INLINE_BACKTICK_CODE_RE = /`([^`\s](?:[^`\n]*[^`\s])?)`/g

// 한 줄 안의 글 속 코드의 [시작, 끝) 위치(줄 안 글자 위치) 목록. 앞에서부터 정렬되고 겹치는 것은 하나로 합친다.
export function inlineCodeRanges(line) {
  if (!line.includes('{{{') && !line.includes('`')) return []
  const found = []
  for (const m of line.matchAll(INLINE_BRACE_CODE_RE)) {
    if (m[1].trim() !== '') found.push([m.index, m.index + m[0].length])
  }
  for (const m of line.matchAll(INLINE_BACKTICK_CODE_RE)) {
    found.push([m.index, m.index + m[0].length])
  }
  found.sort((a, b) => a[0] - b[0])
  const merged = []
  for (const range of found) {
    const last = merged[merged.length - 1]
    if (last && range[0] < last[1]) last[1] = Math.max(last[1], range[1])
    else merged.push([range[0], range[1]])
  }
  return merged
}

// 글 전체의 줄마다 inlineCodeRanges 결과(코드 없는 줄은 빈 목록). 코드블록(```) 안의 줄은 글 속 코드로 치지 않는다.
export function inlineCodeLineRanges(text) {
  let open = null
  return text.split('\n').map((rawLine) => {
    const line = rawLine.replace(/\r$/, '')
    if (open !== null) {
      if (isCodeFenceClose(line, open.ticks)) open = null
      return []
    }
    open = matchCodeFenceOpen(line)
    if (open !== null) return []
    return inlineCodeRanges(line)
  })
}

// 줄의 어느 조각(text, 줄 안 offset 에서 시작)을 코드 범위로 잘라 [{ text, code }] 로 돌려준다. 조각을 모두 이으면 원래 text 다.
export function splitByRanges(text, offset, ranges) {
  const end = offset + text.length
  const pieces = []
  let cursor = 0
  for (const [rs, re] of ranges) {
    const from = Math.max(rs, offset) - offset
    const to = Math.min(re, end) - offset
    if (from >= to) continue
    if (from > cursor) pieces.push({ text: text.slice(cursor, from), code: false })
    pieces.push({ text: text.slice(from, to), code: true })
    cursor = to
  }
  if (cursor < text.length) pieces.push({ text: text.slice(cursor), code: false })
  return pieces.length > 0 ? pieces : [{ text, code: false }]
}
