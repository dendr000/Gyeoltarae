// Copyright (c) dendr000. MIT License.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { diffDisabledFolders, selectLoadableItems, summarizeSnippetFolders } from '../../src/lib/snippetScope.js'
import { loadSnippetEntries } from '../../src/lib/snippetLoad.js'
import { freshStore } from '../helpers/store.js'

// 폴더별 사용 체크를 푼 폴더는 앱이 켜질 때 읽지 않고(시작이 빨라짐), 목록에서도 완전히 숨긴다. 다시 켜면 그 폴더만 읽어 온다.
// 노드 환경에는 localStorage 가 없어서 메모리로 흉내 낸다(스토어는 이 PC 의 설정을 거기에 저장한다).
function fakeLocalStorage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) }
}
afterEach(() => {
  vi.unstubAllGlobals()
})

const item = (category, title) => ({ category, title, path: `/mock/snip/${category}/${title}.md` })

describe('selectLoadableItems / summarizeSnippetFolders / diffDisabledFolders', () => {
  const items = [item('SQL', 'a'), item('SQL', 'b'), item('명령', 'c'), item('Python', 'd')]

  it('체크를 푼 폴더의 상용구는 읽을 목록에서 뺀다', () => {
    expect(selectLoadableItems(items, ['SQL']).map((i) => i.title)).toEqual(['c', 'd'])
  })

  it('푼 폴더가 없거나 목록이 없으면 전부 읽는다', () => {
    expect(selectLoadableItems(items, [])).toBe(items)
    expect(selectLoadableItems(items, undefined)).toBe(items)
  })

  it('모두 꺼져 있으면 아무것도 읽지 않는다', () => {
    expect(selectLoadableItems(items, ['SQL', '명령', 'Python'])).toEqual([])
  })

  it('폴더 요약은 읽지 않는 폴더까지 개수와 함께 가나다순으로 낸다', () => {
    expect(summarizeSnippetFolders(items)).toEqual([
      { name: '명령', count: 1 },
      { name: 'Python', count: 1 },
      { name: 'SQL', count: 2 },
    ])
    expect(summarizeSnippetFolders([])).toEqual([])
  })

  it('체크 변화에서 새로 끈 폴더와 새로 켠 폴더를 가려낸다', () => {
    expect(diffDisabledFolders(['SQL', '마법'], ['마법', 'Java'])).toEqual({ newlyDisabled: ['Java'], newlyEnabled: ['SQL'] })
    expect(diffDisabledFolders([], ['A', 'B'])).toEqual({ newlyDisabled: ['A', 'B'], newlyEnabled: [] })
    expect(diffDisabledFolders(['A'], [])).toEqual({ newlyDisabled: [], newlyEnabled: ['A'] })
    expect(diffDisabledFolders(['A'], ['A'])).toEqual({ newlyDisabled: [], newlyEnabled: [] })
  })
})

describe('loadSnippetEntries', () => {
  it('파일을 읽어 "폴더/제목" 키의 색인을 만들고 못 읽은 것은 건너뛴다', async () => {
    const readFile = async (path) => {
      if (path.includes('bad')) throw new Error('읽기 실패')
      return `본문:${path}`
    }
    const index = await loadSnippetEntries({ readFile, items: [item('A', 'ok'), item('A', 'bad')] })
    expect(Object.keys(index)).toEqual(['A/ok'])
    expect(index['A/ok']).toMatchObject({ category: 'A', title: 'ok', content: '본문:/mock/snip/A/ok.md' })
  })

  it('폴더별 순서 파일의 위치(rank)를 붙인다', async () => {
    const index = await loadSnippetEntries({
      readFile: async () => '',
      items: [item('A', 'x'), item('A', 'y')],
      orderTexts: { A: 'y\nx' },
    })
    expect(index['A/y'].rank).toBeLessThan(index['A/x'].rank)
  })

  it('파일 하나를 읽으러 갈 때마다 1부터 진행을 알린다', async () => {
    const seen = []
    await loadSnippetEntries({ readFile: async () => '', items: [item('A', '1'), item('A', '2'), item('A', '3')], onProgress: (n) => seen.push(n) })
    expect(seen).toEqual([1, 2, 3])
  })
})

describe('스토어: 읽지 않는 폴더', () => {
  async function setup({ disabled = [] } = {}) {
    vi.stubGlobal('localStorage', fakeLocalStorage({ 'wikidesk-snippet-disabled-folders': JSON.stringify(disabled) }))
    const { state, api } = await freshStore()
    const reads = []
    const scan = [item('Python', 'p1'), item('Python', 'p2'), item('SQL', 's1'), item('SQL', 's2'), item('SQL', 's3'), item('명령', 'c1')]
    api.scanSnippets = async () => scan
    const baseRead = api.readFile
    api.readFile = async (path) => {
      if (path.startsWith('/mock/snip/')) {
        reads.push(path)
        return `본문 ${path}`
      }
      return baseRead(path)
    }
    await state().rebuildIndexes()
    return { state, api, reads, scan }
  }

  it('체크를 푼 폴더의 파일은 읽지 않고, 색인에도 넣지 않는다', async () => {
    const { state, reads } = await setup({ disabled: ['SQL'] })
    expect(reads.some((p) => p.includes('/SQL/'))).toBe(false)
    expect(Object.keys(state().snippetIndex).sort()).toEqual(['Python/p1', 'Python/p2', '명령/c1'])
  })

  it('폴더 목록에는 읽지 않은 폴더도 개수와 함께 남는다', async () => {
    const { state } = await setup({ disabled: ['SQL'] })
    expect(state().snippetFolders).toEqual([
      { name: '명령', count: 1 },
      { name: 'Python', count: 2 },
      { name: 'SQL', count: 3 },
    ])
  })

  it('아무것도 끄지 않았으면 전부 읽는다', async () => {
    const { state, reads } = await setup()
    expect(reads).toHaveLength(6)
    expect(Object.keys(state().snippetIndex)).toHaveLength(6)
  })

  it('끈 폴더를 다시 켜면 그 폴더 파일만 읽어 색인에 더한다', async () => {
    const { state, reads } = await setup({ disabled: ['SQL'] })
    const before = reads.length
    await state().setSnippetFolderEnabled('SQL', true)
    expect(reads.slice(before).every((p) => p.includes('/SQL/'))).toBe(true)
    expect(reads.length - before).toBe(3)
    expect(Object.keys(state().snippetIndex)).toContain('SQL/s2')
    expect(state().disabledSnippetFolders).toEqual([])
  })

  it('켠 폴더 말고 다른 끈 폴더는 계속 읽지 않는다', async () => {
    const { state } = await setup({ disabled: ['SQL', 'Python'] })
    await state().setSnippetFolderEnabled('SQL', true)
    expect(Object.keys(state().snippetIndex).some((key) => key.startsWith('Python/'))).toBe(false)
    expect(Object.keys(state().snippetIndex).filter((key) => key.startsWith('SQL/'))).toHaveLength(3)
  })

  it('폴더를 끄면 읽어 둔 상용구가 바로 색인에서 빠진다(디스크를 다시 읽지 않음)', async () => {
    const { state, reads } = await setup()
    const before = reads.length
    await state().setSnippetFolderEnabled('SQL', false)
    expect(Object.keys(state().snippetIndex).some((key) => key.startsWith('SQL/'))).toBe(false)
    expect(Object.keys(state().snippetIndex)).toHaveLength(3)
    expect(reads.length).toBe(before)
  })

  it('"이것만"·"모두 해제"처럼 한꺼번에 바꿔도 맞게 정리된다', async () => {
    const { state } = await setup()
    await state().setDisabledSnippetFolders(['SQL', '명령'])
    expect(Object.keys(state().snippetIndex).sort()).toEqual(['Python/p1', 'Python/p2'])
    await state().setDisabledSnippetFolders(['Python', 'SQL'])
    expect(Object.keys(state().snippetIndex).sort()).toEqual(['명령/c1'])
    await state().setDisabledSnippetFolders([])
    expect(Object.keys(state().snippetIndex)).toHaveLength(6)
  })

  it('다시 읽는 도중 폴더를 또 끄면 그 폴더의 상용구는 더하지 않는다', async () => {
    const { state, api } = await setup({ disabled: ['SQL'] })
    const baseRead = api.readFile
    api.readFile = async (path) => {
      if (path.includes('/SQL/s1')) await state().setSnippetFolderEnabled('SQL', false)
      return baseRead(path)
    }
    await state().setSnippetFolderEnabled('SQL', true)
    expect(Object.keys(state().snippetIndex).some((key) => key.startsWith('SQL/'))).toBe(false)
  })

  it('읽지 않기로 한 폴더에 상용구를 새로 만들면 그 폴더를 다시 켜서 목록에 보이게 한다', async () => {
    const { state, api } = await setup({ disabled: ['SQL'] })
    const scan = await api.scanSnippets()
    api.ensureSnippet = async (workspace, category, title) => {
      scan.push(item(category, title))
      return `/mock/snip/${category}/${title}.md`
    }
    api.writeFile = async () => {}
    await state().createSnippetWithContent('SQL', '새것', '본문')
    expect(state().disabledSnippetFolders).toEqual([])
    expect(Object.keys(state().snippetIndex)).toContain('SQL/새것')
  })

  it('끈 폴더 목록은 이 PC 의 설정에 저장된다', async () => {
    const { state } = await setup()
    await state().setSnippetFolderEnabled('SQL', false)
    expect(JSON.parse(localStorage.getItem('wikidesk-snippet-disabled-folders'))).toEqual(['SQL'])
  })

  it('읽는 동안 헤더 진행 표시가 켜지고(100개 이상일 때) 끝나면 꺼진다', async () => {
    vi.stubGlobal('localStorage', fakeLocalStorage({ 'wikidesk-snippet-disabled-folders': JSON.stringify(['큰']) }))
    const { state, api } = await freshStore()
    const scan = Array.from({ length: 120 }, (_, i) => item('큰', `t${i}`))
    api.scanSnippets = async () => scan
    api.readFile = async () => '본문'
    await state().rebuildIndexes()
    expect(state().snippetLoad).toBeNull()
    const seen = []
    const unsubscribe = (await import('../../src/store/useAppStore.js')).useAppStore.subscribe((s, prev) => {
      if (s.snippetLoad !== prev.snippetLoad) seen.push(s.snippetLoad)
    })
    await state().setSnippetFolderEnabled('큰', true)
    unsubscribe()
    expect(seen[0]).toEqual({ done: 0, total: 120 })
    expect(seen.at(-1)).toBeNull()
    expect(Object.keys(state().snippetIndex)).toHaveLength(120)
  })
})
