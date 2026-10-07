// Copyright (c) dendr000. MIT License.

// 갈피의 상용구 단축키를 그대로 옮긴 것(useMemoEvents.js):
//   Alt+T        -> 상용구 모달 열기 (선택한 글자가 있으면 본문에 채워서)
//   Alt+Shift+T  -> 타이핑 중 추천 팝업 켜기/끄기
// 돌려주는 값: 'open-modal' | 'toggle-suggest' | null(해당 없음)
//
// 물리 키(code === 'KeyT')도 같이 본다 — 한글 입력 상태에서는 e.key 가 't' 가 아니라 자모('ㅅ')로
// 오기 때문에 e.key 만 보면 한글 모드에서 단축키가 안 먹는다. Ctrl/Meta 가 같이 눌린 조합은
// 다른 단축키(브라우저·OS)의 몫이라 가로채지 않는다.
export function matchSnippetShortcut(e) {
  if (!e.altKey || e.ctrlKey || e.metaKey) return null
  const isT = e.code === 'KeyT' || e.key?.toLowerCase() === 't'
  if (!isT) return null
  return e.shiftKey ? 'toggle-suggest' : 'open-modal'
}
