// Copyright (c) dendr000. MIT License.

// Alt+↑/↓ — VS Code 의 "줄 위/아래로 이동"처럼 현재 줄(선택했으면 선택에 걸친 줄 전체)을 위·아래 줄과 자리를 바꾼다.
// 화면(textarea)과 분리한 순수 함수라서 시험할 수 있다.

// Alt+↑ 면 -1, Alt+↓ 면 +1, 아니면 null. Ctrl·Shift·Meta 가 같이 눌린 조합과 한글 조합 중(isComposing)에는 반응하지 않는다.
// Alt+←/→ 는 줄 처음/끝 이동(lineEdge.js)이라 겹치지 않는다.
export function isLineMoveKey(e) {
  if (e.isComposing || !e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return null
  if (e.key === 'ArrowUp') return -1
  if (e.key === 'ArrowDown') return 1
  return null
}

// 돌려주는 값: { from, to, insert, selStart, selEnd } — value 의 [from, to) 를 insert 로 바꾸고 선택을 selStart~selEnd 로 둔다.
//   바꾸는 범위는 옮기는 줄들과 자리를 바꿀 이웃 줄 한 줄뿐이라, 입력칸의 되돌리기(Ctrl+Z)가 한 번에 되돌린다.
// null 이면 아무것도 하지 않는다: 빈 문서이거나, 위로 갈 곳(맨 윗줄)·아래로 갈 곳(맨 아랫줄)이 없거나, direction 이 -1/1 이 아닐 때.
// 선택이 다음 줄 맨 앞에서 끝나면(줄 전체를 선택한 흔한 경우) 그 다음 줄은 옮기는 대상이 아니다. 줄바꿈이 CRLF 인 문서는 CRLF 를 유지한다.
export function moveLinesEdit(value, selStart, selEnd, direction) {
  if (direction !== -1 && direction !== 1) return null
  if (value === '') return null

  const newline = value.includes('\r\n') ? '\r\n' : '\n'
  // 줄 표: 줄마다 시작 위치와 내용(줄 끝의 \r 은 줄바꿈의 일부라 뺀다)의 끝 위치.
  const lines = []
  let position = 0
  for (const raw of value.split('\n')) {
    const text = raw.endsWith('\r') ? raw.slice(0, -1) : raw
    lines.push({ start: position, end: position + text.length, text })
    position += raw.length + 1
  }

  const lineAt = (pos) => lines.findLastIndex((line) => line.start <= pos)
  const first = lineAt(selStart)
  const lastPos = selEnd > selStart && value[selEnd - 1] === '\n' ? selEnd - 1 : selEnd
  const last = Math.max(first, lineAt(lastPos))

  const neighborIndex = direction === -1 ? first - 1 : last + 1
  if (neighborIndex < 0 || neighborIndex >= lines.length) return null

  const neighbor = lines[neighborIndex]
  const block = lines
    .slice(first, last + 1)
    .map((line) => line.text)
    .join(newline)
  const shift = (neighbor.text.length + newline.length) * direction // 옮긴 줄들은 이웃 줄 한 줄(과 줄바꿈)만큼 이동한다

  const from = direction === -1 ? neighbor.start : lines[first].start
  const to = direction === -1 ? lines[last].end : neighbor.end
  const insert = direction === -1 ? block + newline + neighbor.text : neighbor.text + newline + block
  const newLength = value.length - (to - from) + insert.length
  const clamp = (n) => Math.min(Math.max(n, 0), newLength)
  return { from, to, insert, selStart: clamp(selStart + shift), selEnd: clamp(selEnd + shift) }
}
