// Copyright (c) dendr000. MIT License.

// 상용구 "활성 폴더" 규칙 — 갈피(Galpi)의 galpi-bp-active-folder 와 같은 개념.
// 상용구 모달에서 폴더를 고르면 그 폴더가 활성 폴더가 되고, 에디터(자동 추천 팝업·스페이스바 치환·
// Alt+Enter)는 "그 폴더 + '공통' 폴더"의 상용구만 쓴다. '전체'면 모든 폴더. 툴바의 "상용구 삽입"
// 목록은 이 범위와 무관하게 항상 전체에서 고른다(갈피도 같음).
export const ALL_FOLDER = '전체'
export const COMMON_FOLDER = '공통'

export function selectActiveSnippets(entries, activeFolder) {
  if (activeFolder === ALL_FOLDER) return entries
  return entries.filter((e) => e.category === activeFolder || e.category === COMMON_FOLDER)
}

// 모달을 닫은 뒤의 활성 폴더 — "닫으면 '전체'로 자동 복귀" 설정이 켜져 있으면 '전체', 꺼져 있으면
// 고른 폴더 그대로. 폴더를 정리하려고 골라 둔 채 닫아도 다른 폴더의 상용구가 에디터에서 말없이
// 안 먹히는 일이 없게 하려는 것(그래서 기본은 켜짐).
export function nextFolderAfterClose(activeFolder, resetOnClose) {
  return resetOnClose ? ALL_FOLDER : activeFolder
}

// 폴더별 "자동 추천에 쓰기" 체크. 체크를 푼 폴더(disabledFolders)의 상용구는 에디터의 자동 추천 팝업·
// 스페이스바 치환·Alt+Enter 에서 빠진다(활성 폴더 범위와는 별개이며 둘 다 통과해야 쓰인다). 기본은
// 아무것도 안 푼 상태(= 전부 사용)라서, 나중에 새로 생긴 폴더도 저절로 사용 대상이 된다.
// 툴바 "상용구 삽입" 목록은 이 체크와도 무관하게 항상 전체에서 고른다.
export function selectEnabledSnippets(entries, disabledFolders) {
  if (!disabledFolders || disabledFolders.length === 0) return entries
  const disabled = new Set(disabledFolders)
  return entries.filter((e) => !disabled.has(e.category))
}

// 한 폴더의 체크를 켜거나 끈 새 목록(원래 목록은 바꾸지 않는다).
export function withFolderEnabled(disabledFolders, folder, enabled) {
  const rest = disabledFolders.filter((name) => name !== folder)
  return enabled ? rest : [...rest, folder]
}

// 고른 폴더만 쓰고 나머지는 전부 끈 목록 — "이것만" 버튼.
export function disabledAllExcept(allFolders, folder) {
  return allFolders.filter((name) => name !== folder)
}
