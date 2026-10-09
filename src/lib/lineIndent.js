// Copyright (c) dendr000. MIT License.

// Tab / Shift+Tab — 여러 줄을 선택한 채 Tab 을 누르면 걸친 모든 줄을 들여쓰고, Shift+Tab 은 내어쓴다
// (VS Code 와 같다). 화면(textarea)과 분리한 순수 함수라서 시험할 수 있다.
import { INDENT, INDENT_UNIT } from './indentUnit.js'

// 돌려주는 값: { from, to, insert, selStart, selEnd }
//   from/to      - 바꿀 범위(걸친 줄들의 시작 ~ 마지막 줄의 끝, 줄바꿈은 포함하지 않는다)
//   insert       - 그 자리에 넣을 글
//   selStart/End - 바꾼 뒤 선택이 있어야 할 자리(같은 글자를 계속 선택하고 있게)
// null 이면 아무것도 하지 않는다(= 호출한 쪽이 평소 Tab 동작을 그대로 둔다):
//   들여쓰기인데 선택이 한 줄 안이거나 없을 때(그때는 평소처럼 공백 4칸을 넣는다).
// 내어쓰기(outdent)는 선택이 없어도 현재 줄에 적용한다. 지울 공백이 없어도 결과를 돌려주므로(insert 가
// 원래와 같다) 호출한 쪽은 Shift+Tab 의 기본 동작(입력칸 밖으로 포커스 이동)만 막으면 된다.
export function indentLinesEdit(value, selStart, selEnd, outdent) {
  const spansLines = selEnd > selStart && value.slice(selStart, selEnd).includes('\n')
  if (!outdent && !spansLines) return null

  const blockStart = selStart === 0 ? 0 : value.lastIndexOf('\n', selStart - 1) + 1
  // 선택이 다음 줄 맨 앞에서 끝나면(줄 전체를 선택한 흔한 경우) 그 다음 줄은 대상이 아니다.
  const lastCharPos = selEnd > selStart && value[selEnd - 1] === '\n' ? selEnd - 1 : selEnd
  const lineEndIdx = value.indexOf('\n', lastCharPos)
  const blockEnd = lineEndIdx === -1 ? value.length : lineEndIdx

  const lines = value.slice(blockStart, blockEnd).split('\n')
  const starts = []
  const deltas = []
  let cursor = blockStart
  const nextLines = lines.map((line) => {
    starts.push(cursor)
    cursor += line.length + 1
    if (!outdent) {
      // 빈 줄은 들여쓰지 않는다(VS Code 와 같다 — 보이지 않는 공백이 쌓이는 것을 막는다).
      if (line === '') {
        deltas.push(0)
        return line
      }
      deltas.push(INDENT_UNIT)
      return INDENT + line
    }
    let remove = 0
    if (line.startsWith('\t')) remove = 1
    else while (remove < INDENT_UNIT && line[remove] === ' ') remove += 1
    deltas.push(-remove)
    return line.slice(remove)
  })

  // 옛 위치 -> 새 위치. 줄 맨 앞(0번째 칸)은 그대로 두고, 그 뒤는 그 줄의 변화량만큼 옮긴다.
  const mapPos = (pos) => {
    let i = 0
    while (i + 1 < starts.length && starts[i + 1] <= pos) i += 1
    let shift = 0
    for (let j = 0; j < i; j += 1) shift += deltas[j]
    const offset = pos - starts[i]
    const own = offset === 0 ? 0 : Math.max(deltas[i], -offset)
    return pos + shift + own
  }

  return {
    from: blockStart,
    to: blockEnd,
    insert: nextLines.join('\n'),
    selStart: mapPos(selStart),
    selEnd: mapPos(selEnd),
  }
}
