// Copyright (c) dendr000. MIT License.

// 탭 순서 바꾸기: 탭을 마우스로 누른 채 왼쪽/오른쪽 방향키를 누르면 그 탭이 한 칸씩 옮겨 간다. 화면과 분리한 순수 함수라서 시험할 수 있다.

// tabs 에서 id 탭을 direction(-1 왼쪽, +1 오른쪽)으로 한 칸 옮긴 새 목록. 더 갈 곳이 없거나 없는 탭이거나 방향이 잘못이면 받은 목록을 그대로 돌려준다.
export function moveTabById(tabs, id, direction) {
  if (direction !== -1 && direction !== 1) return tabs
  const from = tabs.findIndex((tab) => tab.id === id)
  const to = from + direction
  if (from === -1 || to < 0 || to >= tabs.length) return tabs
  const next = [...tabs]
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}

// 키 이벤트가 탭 옮기기 키(조합키 없는 ←/→)면 방향(-1/+1), 아니면 null. 한글 조합 중에는 반응하지 않는다.
export function isTabMoveKey(e) {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return null
  if (e.key === 'ArrowLeft') return -1
  if (e.key === 'ArrowRight') return 1
  return null
}

// Ctrl+Alt+← 면 -1, Ctrl+Alt+→ 면 +1, 아니면 null — 지금 열린(활성) 탭을 한 칸 옮기는 키. 글 입력칸에 커서가 있어도 쓸 수 있다. 편집기의 Alt+←/→(줄 처음/끝으로
// 이동)와는 Ctrl 로 구별되고, 줄 이동(Ctrl+Alt+↑/↓)과는 방향이 달라 겹치지 않는다. Shift·Meta 가 같이 눌린 조합과 한글 조합 중(isComposing)에는 반응하지 않는다.
export function activeTabMoveKey(e) {
  if (e.isComposing || !e.ctrlKey || !e.altKey || e.shiftKey || e.metaKey) return null
  if (e.key === 'ArrowLeft') return -1
  if (e.key === 'ArrowRight') return 1
  return null
}
