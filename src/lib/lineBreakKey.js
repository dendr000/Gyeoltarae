// Copyright (c) dendr000. MIT License.

// 표 편집기 칸 안에서 [br](칸 안 줄바꿈)을 넣는 키 규칙. 화면과 분리한 순수 함수라서 시험할 수 있다.
// Shift+Enter 와 Alt+Enter(엑셀의 칸 안 줄바꿈과 같은 키)가 줄바꿈이고, 그냥 Enter 는 아래 칸 이동이다. Ctrl·Meta 가 든 조합(Ctrl+Enter 는 큰 입력칸
// 오가기)은 줄바꿈 키가 아니다.
// 숫자패드 Enter·Fn+Enter 는 키보드에 따라 그냥 Enter 로 오기도 해서(Fn 은 키보드 장치가 처리해 프로그램에 보이지 않는다) 쓰지 않는다.
export function isLineBreakKey(e) {
  if (e.ctrlKey || e.metaKey) return false
  if (e.key !== 'Enter') return false
  return e.shiftKey || e.altKey
}
