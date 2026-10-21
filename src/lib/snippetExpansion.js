// Copyright (c) dendr000. MIT License.

// 상용구 본문을 펼칠 때의 규칙 — 화면(textarea)과 분리한 순수 함수라서 시험할 수 있다.
//
// 본문 안의 표시:
//   {#}      커서 자리. 첫 번째 {#} 는 펼친 직후 커서가 서는 자리이고, 두 번째부터는 Tab 으로 차례로 건너뛰는 자리다
//            (예: `{{{#!folding {#}\n{#}\n}}}` — 제목 칸에 커서가 서고 Tab 을 누르면 내용 칸으로 간다).
//   {!이름}  동작 표시. 본문이 이것 하나뿐이면 글자를 넣지 않고 그 이름의 동작을 실행한다(예: `{!표}` — 표 편집기 열기).
//            어떤 이름이 있는지는 EditorPane 이 정한다(여기서는 이름만 가려낸다).

const CURSOR_MARK = '{#}'
const ACTION_RE = /^\{!([^{}\s]+)\}$/

// 본문을 해석한다. 돌려주는 값:
//   text   - 실제로 넣을 글(표시를 뺀 것)
//   caret  - 펼친 뒤 커서가 설 자리(text 안의 위치). {#} 가 없으면 null(글 끝)
//   stops  - Tab 으로 건너뛸 다음 자리들(text 안의 위치, 오름차순)
//   action - `{!이름}` 이면 그 이름, 아니면 null (이때 text 는 빈 글)
export function parseSnippetContent(content) {
  const action = ACTION_RE.exec(content.trim())
  if (action) return { text: '', caret: null, stops: [], action: action[1] }

  const marks = []
  let text = ''
  let from = 0
  for (;;) {
    const at = content.indexOf(CURSOR_MARK, from)
    if (at === -1) break
    text += content.slice(from, at)
    marks.push(text.length)
    from = at + CURSOR_MARK.length
  }
  text += content.slice(from)
  return { text, caret: marks.length > 0 ? marks[0] : null, stops: marks.slice(1), action: null }
}

// 글이 바뀐 뒤 남은 Tab 자리들의 위치를 맞춘다. editAt 은 바뀐 자리, delta 는 글 길이의 변화(+는 넣음, -는 지움).
// 넣은 자리 이후의 자리는 뒤로 밀리고, 지운 범위 안의 자리는 지운 자리로 모인다. 원래 배열은 바꾸지 않는다.
export function shiftStops(stops, editAt, delta) {
  if (delta === 0) return stops
  if (delta > 0) return stops.map((stop) => (stop >= editAt ? stop + delta : stop))
  const removedEnd = editAt - delta
  return stops.map((stop) => {
    if (stop >= removedEnd) return stop + delta
    return stop > editAt ? editAt : stop
  })
}

// Tab 을 눌렀을 때 건너뛸 자리. caret 보다 뒤에 있는 첫 자리로 가고(커서가 이미 지나온 자리는 버린다), 남은 자리들과 함께 돌려준다.
// 갈 곳이 없으면 null.
export function nextStop(stops, caret) {
  const index = stops.findIndex((stop) => stop > caret)
  if (index === -1) return null
  return { stop: stops[index], rest: stops.slice(index + 1) }
}
