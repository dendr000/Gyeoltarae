// Copyright (c) dendr000. MIT License.

// 표 편집기에서 칸 <-> "선택한 셀 내용" 큰 입력칸을 한 손으로 오가는 키 규칙. 화면과 분리한 순수 함수라서 시험할 수 있다.
// 키는 F2(한 손가락) 또는 Ctrl+Enter(노트북에서 Fn 없이)다. Shift+Enter 는 칸 안 줄바꿈, 그냥 Enter 는 아래 칸 이동이라 겹치지 않는다.
export function isJumpKey(e) {
  if (e.altKey || e.shiftKey) return false
  if (e.key === 'F2') return !e.ctrlKey && !e.metaKey
  return (e.ctrlKey || e.metaKey) && e.key === 'Enter'
}

// 지금 포커스가 어디(where)인지 보고 갈 곳을 정한다. where: 'cell'(표의 칸 입력창) | 'content'(큰 입력칸) | 'other'(그 밖).
//   - 칸/그 밖에서 누르면 큰 입력칸으로 간다. 돌아올 칸(origin)으로 지금 칸을 기억해 두라고 알려 준다. 큰 입력칸은 칸 하나만 골랐을 때만
//     있으므로(contentVisible) 여러 칸을 골랐으면 갈 곳이 없다(null).
//   - 큰 입력칸에서 누르면 기억해 둔 칸(origin)으로, 없으면 고른 칸(focusCell)으로 돌아간다.
export function jumpTarget({ where, activeCell, origin, focusCell, contentVisible }) {
  if (where === 'content') {
    const back = origin ?? focusCell
    return { to: 'cell', r: back.r, c: back.c }
  }
  if (!contentVisible) return null
  const from = where === 'cell' && activeCell ? activeCell : focusCell
  return { to: 'content', origin: { r: from.r, c: from.c } }
}
