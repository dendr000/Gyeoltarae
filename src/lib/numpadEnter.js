// Copyright (c) dendr000. MIT License.

// 문서 편집기에서 숫자패드 Enter 를 눌렀는지 판단한다(그 자리에 [br] 을 넣는 단축키용). 화면과 분리한 순수 함수라서 시험할 수 있다.
// 그냥 Enter(줄바꿈·목록 이어쓰기)와 Shift+Enter(이어쓰기 없는 줄바꿈), Ctrl/Alt+Enter(상용구 수동 치환)는 그대로 두므로 조합키가 없을 때만 해당한다.
// Fn 은 키보드 장치가 처리해서 프로그램에 보이지 않는다 — 노트북의 Fn+Enter 가 숫자패드 Enter 로 오는 키보드에서만 Fn+Enter 도 이 키로 잡힌다.
export function isNumpadEnterKey(e) {
  return e.key === 'Enter' && e.code === 'NumpadEnter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey
}
