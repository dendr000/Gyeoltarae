// Copyright (c) dendr000. MIT License.

// 사이드바(왼쪽 문서/폴더 목록) 열기·닫기 단축키 Ctrl+M(Mac 은 Cmd+M) 판별. 화면과 분리한 순수 함수라서 시험할 수 있다.
// Shift/Alt 가 같이 눌린 조합은 다른 단축키를 위해 비워 둔다. 한글 입력 조합 중(isComposing)에는 반응하지 않는다.
// 한글 자판 상태에서는 e.key 가 'ㅡ' 로 올 수 있어서, 물리 키 위치(e.code === 'KeyM')도 함께 본다.
export function isSidebarToggleKey(e) {
  if (e.isComposing) return false
  if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return false
  return e.key?.toLowerCase() === 'm' || e.code === 'KeyM'
}
