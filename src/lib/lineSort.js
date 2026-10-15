// Copyright (c) dendr000. MIT License.

// Ctrl+` — 선택에 걸친 줄들을 이름순(가나다·ABC·숫자 크기순)으로 정렬한다. 이미 오름차순이면 내림차순으로 뒤집어서, 같은 키를
// 다시 누르면 반대 방향이 된다. 화면(textarea)과 분리한 순수 함수라서 시험할 수 있다.
//
// 비교 규칙: 줄 앞의 공백은 무시하고, 대소문자는 구분하지 않으며(같은 것은 원래 순서 유지), 숫자는 크기로 비교한다(문서2 < 문서10).
// 왼쪽 폴더 트리와 같은 한국어 정렬 규칙(localeCompare 'ko')이라 기호 < 숫자 < 한글 < 영문 순이다. 빈 줄(공백만 있는 줄)은 방향과 상관없이 맨 아래로 간다.

// 줄 정렬(Ctrl+`)과 묶음 정렬(Ctrl+Shift+`, blockSort.js)이 함께 쓰는 규칙들.
export const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' })
export const FENCE_LINE_RE = /^\s*(`{3,}|~{3,})/

export const isBlank = (line) => line.trim() === ''

function compareAscending(a, b) {
  const blankA = isBlank(a)
  const blankB = isBlank(b)
  if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1
  return collator.compare(a.trimStart(), b.trimStart())
}

// 빈 줄은 항상 아래, 나머지만 방향을 바꾼다. Array.prototype.sort 는 안정 정렬이라 같은 것끼리는 원래 순서를 지킨다.
const compareDescending = (a, b) => {
  const blankA = isBlank(a)
  const blankB = isBlank(b)
  if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1
  return collator.compare(b.trimStart(), a.trimStart())
}

// 선택에 걸친 줄들을 꺼낸다. 선택이 없으면 null.
//   blockStart/blockEnd - 걸친 줄들의 시작 ~ 마지막 줄의 끝(마지막 줄바꿈은 포함하지 않는다)
//   lines               - 그 줄들(줄 끝의 \r 은 뺀 내용)
//   separator           - 줄 사이의 줄바꿈(\n 또는 \r\n)
//   trailingCr          - 마지막 줄 끝에 \r 이 있었는지(바깥에 이어지는 줄바꿈의 일부라서 정렬 대상에서 빼 둔다)
export function selectedLines(value, selStart, selEnd) {
  if (value === '' || selEnd <= selStart) return null

  const blockStart = selStart === 0 ? 0 : value.lastIndexOf('\n', selStart - 1) + 1
  // 선택이 다음 줄 맨 앞에서 끝나면(줄 전체를 선택한 흔한 경우) 그 다음 줄은 대상이 아니다.
  const lastCharPos = value[selEnd - 1] === '\n' ? selEnd - 1 : selEnd
  const lineEndIdx = value.indexOf('\n', lastCharPos)
  const blockEnd = lineEndIdx === -1 ? value.length : lineEndIdx

  const raw = value.slice(blockStart, blockEnd)
  const trailingCr = raw.endsWith('\r')
  const body = trailingCr ? raw.slice(0, -1) : raw
  return {
    blockStart,
    blockEnd,
    lines: body.split(/\r?\n/),
    separator: body.includes('\r\n') ? '\r\n' : '\n',
    trailingCr,
  }
}

// 돌려주는 값: { from, to, insert, selStart, selEnd }
//   from/to      - 바꿀 범위(걸친 줄들의 시작 ~ 마지막 줄의 끝, 마지막 줄바꿈은 포함하지 않는다)
//   insert       - 그 자리에 넣을 글(정렬된 줄들)
//   selStart/End - 바꾼 뒤 정렬된 줄들 전체가 선택된 채로 남도록 하는 자리
// null 이면 아무것도 하지 않는다: 선택이 없을 때, 한 줄만 걸쳤을 때, 코드블록 여는·닫는 줄(```)이 들어 있을 때(순서를 바꾸면
// 구조가 깨진다), 정렬해도 바뀌는 것이 없을 때.
export function sortLinesEdit(value, selStart, selEnd) {
  const selected = selectedLines(value, selStart, selEnd)
  if (!selected) return null
  const { blockStart, blockEnd, lines, separator, trailingCr } = selected
  if (lines.length < 2) return null
  if (lines.some((line) => FENCE_LINE_RE.test(line))) return null

  const ascending = [...lines].sort(compareAscending)
  const sorted = ascending.every((line, i) => line === lines[i]) ? [...lines].sort(compareDescending) : ascending
  if (sorted.every((line, i) => line === lines[i])) return null

  const insert = sorted.join(separator) + (trailingCr ? '\r' : '')
  return {
    from: blockStart,
    to: blockEnd,
    insert,
    selStart: blockStart,
    selEnd: blockStart + insert.length,
  }
}
