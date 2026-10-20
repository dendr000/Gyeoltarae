// Copyright (c) dendr000. MIT License.

// Alt+←/→ — 줄 처음/끝으로 이동(Home/End 키가 없는 노트북용). Shift 를 같이 누르면 선택을 넓힌다.
// Alt+← 는 들여쓰기가 있는 줄에서 줄 맨 앞이 아니라 글자의 맨 앞(들여쓰기를 지난 첫 글자)으로 간다. 이미 거기 있으면 줄 맨 앞으로 번갈아 간다.
// 줄바꿈 표시(wrap)로 화면에서 여러 줄로 접힌 긴 줄도 "글 한 줄" 기준으로 움직인다.
// 돌려주는 값: { start, end, direction } — textarea.setSelectionRange(start, end, direction) 에 그대로 쓴다.
//   edge   - 'start' | 'end'
//   extend - true 면 기준점(anchor)은 두고 움직이는 쪽 끝만 줄 처음/끝으로 옮긴다
export function moveToLineEdge(value, selStart, selEnd, selectionDirection, edge, extend) {
  const hasSelection = selStart !== selEnd
  const backward = hasSelection && selectionDirection === 'backward'
  const focus = hasSelection ? (backward ? selStart : selEnd) : selStart
  const anchor = hasSelection ? (backward ? selEnd : selStart) : selStart

  let target
  if (edge === 'start') {
    // lastIndexOf 의 시작 위치가 음수면 0 으로 취급돼서, 맨 앞에서는 따로 막는다.
    const lineStart = focus === 0 ? 0 : value.lastIndexOf('\n', focus - 1) + 1
    // 들여쓰기(공백·탭)가 있으면 줄 맨 앞이 아니라 글자의 맨 앞(들여쓰기를 지난 첫 글자 자리)으로 간다. 이미 거기 있으면 줄 맨 앞(들여쓰기 앞)으로 번갈아
    // 간다(VS Code 의 Home 과 같음). 들여쓰기가 없는 줄은 둘이 같아서 예전과 똑같이 줄 맨 앞이다. 공백뿐인 줄은 줄 끝이 "글자의 맨 앞" 자리다.
    let textStart = lineStart
    while (value[textStart] === ' ' || value[textStart] === '\t') textStart += 1
    target = focus === textStart && textStart > lineStart ? lineStart : textStart
  } else {
    const idx = value.indexOf('\n', focus)
    target = idx === -1 ? value.length : idx
  }

  if (!extend) return { start: target, end: target, direction: 'none' }
  return {
    start: Math.min(anchor, target),
    end: Math.max(anchor, target),
    direction: target < anchor ? 'backward' : 'forward',
  }
}
