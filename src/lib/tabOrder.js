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
