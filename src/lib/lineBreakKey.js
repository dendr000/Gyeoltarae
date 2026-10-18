// Copyright (c) dendr000. MIT License.

// 표 편집기 칸 안에서 [br](칸 안 줄바꿈)을 넣는 키 규칙. 화면과 분리한 순수 함수라서 시험할 수 있다.
// Shift+Enter 와 숫자패드 Enter(e.code === 'NumpadEnter')가 줄바꿈이고, 그냥 Enter 는 아래 칸 이동이다. Fn 은 키보드 장치가 처리해서 프로그램에는
// 보이지 않는다 — 노트북에서 Fn+Enter 는 대개 숫자패드 Enter 로 오지만(키보드마다 다름) 그렇지 않은 키보드에서는 이 규칙으로 잡히지 않는다.
// Ctrl·Alt·Meta 가 든 조합(Ctrl+Enter 는 큰 입력칸 오가기)은 줄바꿈 키가 아니다.
export function isLineBreakKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return false
  if (e.key !== 'Enter') return false
  return e.shiftKey || e.code === 'NumpadEnter'
}
