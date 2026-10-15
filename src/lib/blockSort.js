// Copyright (c) dendr000. MIT License.

// Ctrl+Shift+` — 선택에 걸친 줄들을 "묶음" 단위로 이름순 정렬한다. 묶음의 맨 윗줄 글자가 기준이고 딸린 줄은 함께 움직인다.
// 줄 하나씩 정렬하는 Ctrl+` (lineSort.js)와 짝이다. 기본은 항상 오름차순이고, 설정에서 "다시 누르면 뒤집기"를 켜면 이미 오름차순일 때
// 내림차순으로 뒤집는다. 화면(textarea)과 분리한 순수 함수라서 시험할 수 있다.
//
// 묶음을 나누는 규칙 (선택한 줄 중 가장 얕게 들여쓴 줄을 "맨 윗줄 들여쓰기"로 본다):
//   - 맨 윗줄 들여쓰기의 줄이 묶음의 머리가 되고, 그보다 더 들여쓴 줄은 바로 위 묶음에 딸린다.     (* 항목 / "  * 하위 항목")
//   - 들여쓴 줄이 하나도 없으면, 목록 표시(*, -, +, 1., a.)로 시작하는 줄이 머리가 된다.            (1. 항목 / 2. 항목)
//     표시 없는 줄은 빈 줄 뒤에서 새 묶음이 되고 그 밖에는 위 묶음에 이어진다(빈 줄로 나뉜 덩어리).
//   - 묶음 사이의 빈 줄은 "구분선"으로 제자리에 남는다. 딸린 줄 앞의 빈 줄은 묶음 안에 남는다. 선택 앞뒤의 빈 줄도 제자리다.
// 비교는 줄 정렬과 같은 이름순이되, 머리 줄 앞의 목록 표시(* - + 1. a.)는 뺀다 — "1. 다 / 2. 가" 를 번호로 비교하면 정렬이 안 되므로.
// 머리가 전부 번호 목록(1. 2. 3.)이면 번호는 그 자리에 그대로 두고 내용만 옮긴다(정렬 뒤에도 1. 2. 3. 순서).
import { INDENT_UNIT } from './indentUnit.js'
import { FENCE_LINE_RE, collator, isBlank, selectedLines } from './lineSort.js'

const MARKER_RE = /^\s*(?:\*+|-|\+|\d+[.)]|[A-Za-z]\.)\s+/
const NUMBER_MARKER_RE = /^(\s*)(\d+[.)])(\s+)/

// 들여쓰기 폭: 공백 1칸 = 1, 탭 1개 = 들여쓰기 한 단계(INDENT_UNIT).
function indentOf(line) {
  let width = 0
  for (const ch of line) {
    if (ch === ' ') width += 1
    else if (ch === '\t') width += INDENT_UNIT
    else break
  }
  return width
}

// 선택한 줄(앞뒤 빈 줄을 뺀 부분)을 묶음들과 묶음 사이의 구분선(빈 줄들)으로 나눈다.
function splitGroups(core) {
  const base = Math.min(...core.filter((line) => !isBlank(line)).map(indentOf))
  const hasIndented = core.some((line) => !isBlank(line) && indentOf(line) > base)
  const groups = []
  const separators = []
  let current = null
  let pending = []
  for (const line of core) {
    if (isBlank(line)) {
      pending.push(line)
      continue
    }
    const isHead =
      current === null || (indentOf(line) <= base && (hasIndented || pending.length > 0 || MARKER_RE.test(line)))
    if (isHead) {
      if (current) {
        groups.push(current)
        separators.push(pending)
      }
      current = [line]
    } else {
      // 빈 줄 뒤에 딸린 줄이 이어지면 그 빈 줄은 묶음 안의 것이다.
      if (pending.length > 0) current.push(...pending)
      current.push(line)
    }
    pending = []
  }
  groups.push(current)
  return { groups, separators }
}

// 돌려주는 값: { from, to, insert, selStart, selEnd } (lineSort.js 의 sortLinesEdit 와 같은 모양)
// 기본은 **항상 오름차순**이다. { flip: true }(설정 "다시 누르면 뒤집기")로 부르면 이미 오름차순일 때 내림차순으로 뒤집는다.
// null 이면 아무것도 하지 않는다: 선택이 없을 때, 묶음이 하나뿐일 때, 코드블록 여는·닫는 줄(```)이 들어 있을 때, 바뀌는 것이 없을 때.
export function blockSortEdit(value, selStart, selEnd, { flip = false } = {}) {
  const selected = selectedLines(value, selStart, selEnd)
  if (!selected) return null
  const { blockStart, blockEnd, lines, separator, trailingCr } = selected
  if (lines.some((line) => FENCE_LINE_RE.test(line))) return null

  // 선택 앞뒤의 빈 줄은 제자리에 둔다.
  let first = 0
  while (first < lines.length && isBlank(lines[first])) first += 1
  let end = lines.length
  while (end > first && isBlank(lines[end - 1])) end -= 1
  if (first === end) return null

  const { groups, separators } = splitGroups(lines.slice(first, end))
  if (groups.length < 2) return null

  // 머리가 전부 번호 목록이면 번호는 제자리(원래 순서의 번호)에 남긴다.
  const renumber = groups.every((group) => NUMBER_MARKER_RE.test(group[0]))
  const numbers = renumber ? groups.map((group) => group[0].match(NUMBER_MARKER_RE)[2]) : []
  const keyOf = (group) => group[0].replace(MARKER_RE, '').trimStart()

  const build = (ordered) => {
    const out = lines.slice(0, first)
    ordered.forEach((group, i) => {
      const head = renumber ? group[0].replace(NUMBER_MARKER_RE, (_m, lead, _num, space) => lead + numbers[i] + space) : group[0]
      out.push(head, ...group.slice(1))
      if (i < separators.length) out.push(...separators[i])
    })
    out.push(...lines.slice(end))
    return out
  }

  const original = lines.join('\n')
  const ascending = [...groups].sort((a, b) => collator.compare(keyOf(a), keyOf(b)))
  let result = build(ascending)
  if (flip && result.join('\n') === original) result = build([...groups].sort((a, b) => collator.compare(keyOf(b), keyOf(a))))
  if (result.join('\n') === original) return null

  const insert = result.join(separator) + (trailingCr ? '\r' : '')
  return {
    from: blockStart,
    to: blockEnd,
    insert,
    selStart: blockStart,
    selEnd: blockStart + insert.length,
  }
}
