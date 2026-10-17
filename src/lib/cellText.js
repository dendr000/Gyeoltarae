// Copyright (c) dendr000. MIT License.

// 표 편집기의 넓은 "선택한 셀 내용" 칸에서 칸 안 줄바꿈을 `4[br]4, 8` 대신 실제 줄바꿈으로 보여 주고 받는다. 칸에 저장되는 글(문서에 들어가는 문법)은
// 그대로 [br] 이다 — 뷰어는 [br] 만 줄바꿈으로 읽는다. 화면과 분리한 순수 함수라서 시험할 수 있다.

// 저장된 글 -> 넓은 칸에 보일 글: [br] 을 줄바꿈 문자로.
export function storedToDisplay(text) {
  return (text ?? '').replaceAll('[br]', '\n')
}

// 넓은 칸에 쳐진 글 -> 저장할 글: 줄바꿈 문자(\r\n 포함)를 [br] 로.
export function displayToStored(text) {
  return text.replace(/\r?\n/g, '[br]')
}
