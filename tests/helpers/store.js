import { vi } from 'vitest'

export const ROOT = '/mock/workspace'

// 매 테스트마다 모듈을 새로 불러와서(= mockApi의 가짜 파일 시스템과 스토어 상태가 처음부터
// 다시 시작) 앞 테스트가 만든 폴더·문서·탭이 다음 테스트에 섞이지 않게 한다. 스토어와
// getApi는 같은 모듈 묶음에서 가져와야 같은 가짜 파일 시스템을 본다.
export async function freshStore() {
  vi.resetModules()
  const { useAppStore } = await import('../../src/store/useAppStore.js')
  const { getApi } = await import('../../src/lib/api.js')
  await useAppStore.getState().loadWorkspace(ROOT)
  // state()는 호출할 때마다 "지금 시점"의 스토어 상태를 돌려준다 (store.getState()의 줄임)
  return { store: useAppStore, api: getApi(), state: () => useAppStore.getState() }
}

export function findNode(nodes, name) {
  for (const node of nodes ?? []) {
    if (node.name === name) return node
    const found = findNode(node.children, name)
    if (found) return found
  }
  return null
}

export function namesOf(node, type) {
  return (node?.children ?? []).filter((c) => c.type === type).map((c) => c.name)
}
