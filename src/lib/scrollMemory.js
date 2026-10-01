// 탭별 스크롤 위치 기억 — 스토어(zustand) state로 두지 않고 일부러 이 평범한 Map에 직접
// 저장함. 스크롤은 프레임마다 여러 번 일어날 수 있는데, App.jsx가 useAppStore()를 셀렉터
// 없이 통째로 구독하고 있어서(전체 트리 재구독) 스크롤할 때마다 store에 set()을 했다가는
// 스크롤 한 번에 앱 전체가 여러 번 리렌더링됨. 여기 Map은 리액트 상태가 아니라서 읽고 쓸 때
// 리렌더링을 전혀 일으키지 않음 — 탭을 전환한 "순간"에만 값을 읽어서 DOM에 직접
// scrollTop을 대입하면 되는 용도라 이걸로 충분함.
const viewerScrollByTab = new Map()
const editorScrollByTab = new Map()

export function getViewerScroll(tabId) {
  return tabId ? (viewerScrollByTab.get(tabId) ?? 0) : 0
}

export function setViewerScroll(tabId, value) {
  if (tabId) viewerScrollByTab.set(tabId, value)
}

export function getEditorScroll(tabId) {
  return tabId ? (editorScrollByTab.get(tabId) ?? 0) : 0
}

export function setEditorScroll(tabId, value) {
  if (tabId) editorScrollByTab.set(tabId, value)
}

// 탭이 완전히 닫힐 때(closeTab/closeTabsByPath/closeTabsUnderPath) 호출 — 안 불러도
// 메모리 누수 수준은 아니지만(문서 몇 개 정도로는 무시할 크기), 닫힌 탭의 기록을 남겨둘
// 이유도 없음.
export function clearScroll(tabId) {
  if (!tabId) return
  viewerScrollByTab.delete(tabId)
  editorScrollByTab.delete(tabId)
}
