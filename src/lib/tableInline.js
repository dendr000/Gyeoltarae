// Copyright (c) dendr000. MIT License.

// 표 편집기 칸 안에서 Ctrl+B(굵게)·Ctrl+U(밑줄)를 눌렀을 때 고른 글자에 표시를 씌우거나 벗기는 규칙. 문서 편집기의 같은 단축키와 같은 표시를 쓴다.
// 화면과 분리한 순수 함수라서 시험할 수 있다.
export const BOLD_MARK = "'''"
export const UNDERLINE_MARK = '__'

// text 의 [start, end) 를 고른 상태에서 mark 를 토글한다. 돌려주는 값: { text, selStart, selEnd } — 바뀐 글과, 바뀐 뒤에 선택이 있어야 할 자리.
//   - 고른 글자가 표시로 감싸져 있지 않으면 감싼다(고른 글자만 선택된 채로 남는다).
//   - 이미 감싸져 있으면 벗긴다 — 표시가 고른 글자 바로 바깥에 붙어 있을 때, 또는 표시까지 포함해서 골랐을 때. 다시 누르면 원래대로 돌아온다.
//   - 한쪽에만 표시가 있거나 다른 표시(굵게 안의 밑줄 등)면 벗기지 않고 새로 감싼다.
//   - 고른 글자가 없으면 기본은 null — 호출한 쪽이 다른 동작을 한다(Ctrl+B 는 칸 전체 굵게). insertEmpty 를 켜면 표시 한 쌍을 넣고 그 사이에
//     커서를 둔다(문서 편집기와 같음).
// start 와 end 는 거꾸로여도 되고, 글 길이를 넘거나 음수여도 글 안으로 맞춘다.
export function toggleInlineMark(text, start, end, mark, { insertEmpty = false } = {}) {
  const clamp = (n) => Math.max(0, Math.min(n, text.length))
  const from = clamp(Math.min(start, end))
  const to = clamp(Math.max(start, end))
  const m = mark.length

  if (from === to) {
    if (!insertEmpty) return null
    const caret = from + m
    return { text: text.slice(0, from) + mark + mark + text.slice(from), selStart: caret, selEnd: caret }
  }

  // 표시가 고른 글자 바로 바깥 양쪽에 붙어 있다 -> 그 표시를 벗긴다.
  if (from - m >= 0 && text.slice(from - m, from) === mark && text.slice(to, to + m) === mark) {
    return { text: text.slice(0, from - m) + text.slice(from, to) + text.slice(to + m), selStart: from - m, selEnd: to - m }
  }
  // 표시까지 포함해서 골랐다 -> 고른 글자 양끝의 표시를 벗긴다.
  if (to - from >= 2 * m && text.slice(from, from + m) === mark && text.slice(to - m, to) === mark) {
    return { text: text.slice(0, from) + text.slice(from + m, to - m) + text.slice(to), selStart: from, selEnd: to - 2 * m }
  }
  // 감싼다.
  return { text: text.slice(0, from) + mark + text.slice(from, to) + mark + text.slice(to), selStart: from + m, selEnd: to + m }
}
