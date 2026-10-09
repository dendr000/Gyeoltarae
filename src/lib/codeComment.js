// Copyright (c) dendr000. MIT License.

// 코드블록 안에서 Ctrl+/ — 현재 줄(여러 줄을 선택했으면 걸친 줄 전체)을 주석 처리하고, 이미 주석이면
// 풀어 준다(VS Code·DBeaver 와 같다). 화면(textarea)과 분리한 순수 함수라서 시험할 수 있다.
import { isInCodeFenceAt, matchCodeFenceOpen, openCodeFenceAt } from './codeFence.js'
import { resolveCodeLanguage } from './codeHighlight.js'

// 문법표(grammar)별 주석 기호. close 가 있으면 줄마다 /* ... */ 처럼 감싸는 방식이다.
const LINE = (open) => ({ open, close: '' })
const SQL_STYLE = LINE('-- ')
const SLASH_STYLE = LINE('// ')
const HASH_STYLE = LINE('# ')
const COMMENT_BY_GRAMMAR = {
  sql: SQL_STYLE,
  pgsql: SQL_STYLE,
  javascript: SLASH_STYLE,
  typescript: SLASH_STYLE,
  java: SLASH_STYLE,
  c: SLASH_STYLE,
  cpp: SLASH_STYLE,
  csharp: SLASH_STYLE,
  go: SLASH_STYLE,
  kotlin: SLASH_STYLE,
  php: SLASH_STYLE,
  rust: SLASH_STYLE,
  swift: SLASH_STYLE,
  python: HASH_STYLE,
  bash: HASH_STYLE,
  ruby: HASH_STYLE,
  yaml: HASH_STYLE,
  ini: HASH_STYLE,
  dockerfile: HASH_STYLE,
  css: { open: '/* ', close: ' */' },
  xml: { open: '<!-- ', close: ' -->' },
  // json, markdown, diff 에는 주석이 없다 -> 해당 없음(null).
}

// 코드블록 여는 줄의 언어 이름(lang)으로 주석 기호를 정한다. 언어를 안 적었거나 모르는 이름이면 이
// 앱의 코드블록이 주로 SQL 이라서 SQL 주석(--)으로 본다. 주석이 없는 형식이면 null.
export function commentSyntaxFor(lang) {
  const resolved = resolveCodeLanguage(lang)
  if (!resolved || resolved.grammar === null) return SQL_STYLE
  return COMMENT_BY_GRAMMAR[resolved.grammar] ?? null
}

// 돌려주는 값: { from, to, insert, selStart, selEnd }
//   from/to      - 바꿀 범위(걸친 줄들의 시작 ~ 마지막 줄의 끝, 줄바꿈은 포함하지 않는다)
//   insert       - 그 자리에 넣을 글
//   selStart/End - 바꾼 뒤 선택이 있어야 할 자리
// null 이면 아무것도 하지 않는다:
//   코드블록 밖일 때, 걸친 줄에 ``` 줄이 있을 때, 그 언어에 주석이 없을 때, 비어 있지 않은 줄이 없을 때.
export function toggleCommentEdit(value, selStart, selEnd) {
  if (!isInCodeFenceAt(value, selStart)) return null

  const blockStart = selStart === 0 ? 0 : value.lastIndexOf('\n', selStart - 1) + 1
  // 선택이 다음 줄 맨 앞에서 끝나면(줄 전체를 선택한 흔한 경우) 그 다음 줄은 대상이 아니다.
  const lastCharPos = selEnd > selStart && value[selEnd - 1] === '\n' ? selEnd - 1 : selEnd
  const lineEndIdx = value.indexOf('\n', lastCharPos)
  const blockEnd = lineEndIdx === -1 ? value.length : lineEndIdx

  const lines = value.slice(blockStart, blockEnd).split('\n')
  // ``` 줄이 끼어 있으면 건드리지 않는다(코드블록이 깨지거나 다른 블록에 걸친 선택).
  if (lines.some((line) => matchCodeFenceOpen(line) !== null)) return null

  const before = blockStart === 0 ? [] : value.slice(0, blockStart - 1).split('\n')
  const open = openCodeFenceAt(before, before.length)
  const syntax = commentSyntaxFor(open?.lang ?? '')
  if (syntax === null) return null

  const tOpen = syntax.open.trimEnd()
  const tClose = syntax.close.trimStart()
  const isBlank = (line) => line.trim() === ''
  const isCommented = (line) => {
    const t = line.trim()
    return t.startsWith(tOpen) && (tClose === '' || (t.endsWith(tClose) && t.length >= tOpen.length + tClose.length))
  }
  const indentOf = (line) => line.length - line.trimStart().length

  const content = lines.filter((line) => !isBlank(line))
  if (content.length === 0) return null
  const uncomment = content.every(isCommented)
  const commentCol = Math.min(...content.map(indentOf))

  // 줄마다의 고침 목록 [{ off, rem, ins }] (줄 안의 위치, 지울 글자 수, 넣을 글).
  const editsByLine = lines.map((line) => {
    if (isBlank(line)) return []
    if (!uncomment) {
      const edits = [{ off: commentCol, rem: 0, ins: syntax.open }]
      if (syntax.close) edits.push({ off: line.length, rem: 0, ins: syntax.close })
      return edits
    }
    const col = indentOf(line)
    const openRem = tOpen.length + (line[col + tOpen.length] === ' ' ? 1 : 0)
    const edits = [{ off: col, rem: openRem, ins: '' }]
    if (syntax.close) {
      const trimmedEnd = line.trimEnd().length
      const closeStart = trimmedEnd - tClose.length
      const spaceBefore = line[closeStart - 1] === ' ' && closeStart - 1 >= col + openRem ? 1 : 0
      edits.push({ off: closeStart - spaceBefore, rem: tClose.length + spaceBefore, ins: '' })
    }
    return edits
  })

  const starts = []
  const netByLine = editsByLine.map((edits) => edits.reduce((sum, e) => sum + e.ins.length - e.rem, 0))
  let cursor = blockStart
  const nextLines = lines.map((line, i) => {
    starts.push(cursor)
    cursor += line.length + 1
    let out = ''
    let pos = 0
    for (const e of editsByLine[i]) {
      out += line.slice(pos, e.off) + e.ins
      pos = e.off + e.rem
    }
    return out + line.slice(pos)
  })

  // 옛 위치 -> 새 위치. 선택이 있을 때 시작점은 "넣는 자리 바로 앞"에 있으면 그대로 두어 새 주석까지
  // 선택에 들어오게 하고, 끝점과 커서만 있을 때는 넣은 글 뒤로 보낸다.
  const mapPos = (pos, strictStart) => {
    let i = 0
    while (i + 1 < starts.length && starts[i + 1] <= pos) i += 1
    let shift = 0
    for (let j = 0; j < i; j += 1) shift += netByLine[j]
    const offset = pos - starts[i]
    let running = 0
    for (const e of editsByLine[i]) {
      const passed = e.rem === 0 ? (strictStart ? offset > e.off : offset >= e.off) : offset >= e.off + e.rem
      if (passed) running += e.ins.length - e.rem
      else if (offset > e.off) return starts[i] + shift + e.off + running // 지워지는 글 안 -> 그 자리로
    }
    return pos + shift + running
  }

  const hasSelection = selStart !== selEnd
  return {
    from: blockStart,
    to: blockEnd,
    insert: nextLines.join('\n'),
    selStart: mapPos(selStart, hasSelection),
    selEnd: mapPos(selEnd, false),
  }
}
