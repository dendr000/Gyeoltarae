import { describe, expect, it } from 'vitest'
import { ROOT, findNode, freshStore, namesOf } from '../helpers/store.js'

// 웹툰/이야기 작품 폴더를 스캐폴드로 만들어 둔 상태에서 시작하는 공통 준비
async function withWork(name = '이야기') {
  const ctx = await freshStore()
  await ctx.store.getState().createFolder(`${ROOT}/웹툰`, name)
  return { ...ctx, work: `${ROOT}/웹툰/${name}` }
}

describe('작품 폴더 스캐폴드 (소설/웹툰/만화 밑에 새 폴더 만들기)', () => {
  it('주인공·등장인물·사전·기록 폴더와 시작 문서들이 자동으로 만들어진다', async () => {
    const { store } = await withWork()
    const work = findNode(store.getState().tree, '이야기')

    expect(namesOf(work, 'dir').sort()).toEqual(['기록', '등장인물', '사전', '주인공'])
    expect(namesOf(findNode(work.children, '주인공'), 'file')).toEqual(['능력', '아이템'])
    expect(namesOf(findNode(work.children, '사전'), 'file')).toEqual(['설정'])
    // 작품 이름과 같은 개요 문서도 만들어진다
    expect(namesOf(work, 'file')).toEqual(['이야기'])
  })

  it('등장인물 폴더에 00 주인공 문서가 01~04 색 이름 문서와 함께 들어 있다', async () => {
    const { store } = await withWork()
    const characters = findNode(store.getState().tree, '등장인물')

    expect(namesOf(characters, 'file')).toEqual(['00 주인공', '01 파랑', '02 초록', '03 노랑', '04 빨강'])
  })

  it('만들어진 문서에는 작품 분류 태그가 자동으로 들어간다', async () => {
    const { api, work } = await withWork()
    const content = await api.readFile(`${work}/등장인물/00 주인공.md`)

    expect(content).toContain('[[분류:이야기]]')
    expect(content).toContain('[[분류:이야기/등장인물]]')
  })

  it('소설/웹툰/만화가 아닌 곳에서 만든 폴더는 빈 폴더 그대로다', async () => {
    const { store } = await freshStore()
    await store.getState().createFolder(ROOT, '그냥 폴더')

    expect(findNode(store.getState().tree, '그냥 폴더').children).toEqual([])
  })
})

describe('주인공 폴더 이름 변경 → 등장인물/00 주인공 문서 따라가기', () => {
  it('주인공 폴더를 유성호로 바꾸면 00 주인공 문서가 00 유성호가 된다', async () => {
    const { store, work } = await withWork()

    await store.getState().renameFile(`${work}/주인공`, '유성호', 'dir')

    const tree = store.getState().tree
    const characters = findNode(tree, '등장인물')
    expect(namesOf(characters, 'file')).toEqual(['00 유성호', '01 파랑', '02 초록', '03 노랑', '04 빨강'])
    // 폴더 자체도 바뀌었고 안의 문서는 그대로
    expect(namesOf(findNode(tree, '유성호'), 'file')).toEqual(['능력', '아이템'])
  })

  it('한 번 더 바꿔도 계속 따라간다 (유성호 → 민준)', async () => {
    const { store, work } = await withWork()

    await store.getState().renameFile(`${work}/주인공`, '유성호', 'dir')
    await store.getState().renameFile(`${work}/유성호`, '민준', 'dir')

    expect(namesOf(findNode(store.getState().tree, '등장인물'), 'file')).toContain('00 민준')
    expect(namesOf(findNode(store.getState().tree, '등장인물'), 'file')).not.toContain('00 유성호')
  })

  it('작품 폴더(소설/웹툰/만화 밑)가 아닌 곳에서는 구조가 비슷해도 문서 이름을 건드리지 않는다', async () => {
    const { store } = await freshStore()
    const s = store.getState()
    await s.createFolder(ROOT, '그냥')
    await s.createFolder(`${ROOT}/그냥`, 'A')
    await s.createFolder(`${ROOT}/그냥`, '등장인물')
    await s.createDoc(`${ROOT}/그냥/등장인물`, '00 A')

    await s.renameFile(`${ROOT}/그냥/A`, 'B', 'dir')

    expect(namesOf(findNode(store.getState().tree, '등장인물'), 'file')).toEqual(['00 A'])
  })

  it('주인공이 아닌 폴더 이름을 바꿔도 00 주인공 문서는 그대로다', async () => {
    const { store, work } = await withWork()

    await store.getState().renameFile(`${work}/사전`, '용어집', 'dir')

    expect(namesOf(findNode(store.getState().tree, '등장인물'), 'file')).toContain('00 주인공')
  })

  it('00 주인공 문서를 이미 지웠거나 이름을 바꿔 뒀으면 오류 없이 넘어가고 아무것도 새로 만들지 않는다', async () => {
    const { store, work } = await withWork()
    await store.getState().deleteFile(`${work}/등장인물/00 주인공.md`)

    await store.getState().renameFile(`${work}/주인공`, '유성호', 'dir')

    expect(namesOf(findNode(store.getState().tree, '등장인물'), 'file')).toEqual(['01 파랑', '02 초록', '03 노랑', '04 빨강'])
  })
})

describe('폴더 이름 변경 / 이동 시 분류 태그 갱신', () => {
  it('폴더 이름을 바꾸면 안의 문서가 가진 그 폴더의 분류 태그도 새 이름으로 바뀐다', async () => {
    const { store, api, work } = await withWork()

    await store.getState().renameFile(`${work}/주인공`, '유성호', 'dir')

    const content = await api.readFile(`${work}/유성호/능력.md`)
    expect(content).toContain('[[분류:이야기/유성호]]')
    expect(content).not.toContain('[[분류:이야기/주인공]]')
  })

  it('같은 종류의 다른 작품 폴더로 옮기면 그 폴더의 분류 태그가 새 작품 기준으로 바뀐다', async () => {
    const { store, api, work } = await withWork('이야기')
    await store.getState().createFolder(`${ROOT}/웹툰`, '다른작품')

    await store.getState().moveFile(`${work}/주인공`, `${ROOT}/웹툰/다른작품`, 'dir')

    const content = await api.readFile(`${ROOT}/웹툰/다른작품/주인공/능력.md`)
    expect(content).toContain('[[분류:다른작품/주인공]]')
    expect(content).not.toContain('[[분류:이야기/주인공]]')
  })

  // 지금은 안 됨 — 옮겨진 폴더 자신의 분류 태그만 바뀌고, 예전 작품 전체를 가리키던 상위 태그
  // ([[분류:이야기]])는 그대로 남는다. CHANGELOG 0.64.0의 "알려진 한계"에 적어 둔 것.
  it.todo('작품 경계를 넘어 옮기면 예전 작품 전체를 가리키던 상위 분류 태그도 새 작품으로 바뀐다')
})

describe('폴더 이동', () => {
  it('폴더를 옮기면 안의 문서가 전부 새 위치로 따라가고 원래 자리에서는 사라진다', async () => {
    const { store, work } = await withWork()

    await store.getState().moveFile(`${work}/주인공`, `${ROOT}/소설`, 'dir')

    const tree = store.getState().tree
    const moved = findNode(findNode(tree, '소설').children, '주인공')
    expect(namesOf(moved, 'file')).toEqual(['능력', '아이템'])
    expect(findNode(findNode(tree, '이야기').children, '주인공')).toBeNull()
  })

  it('문서를 옮기면 이름은 그대로고 위치만 바뀐다', async () => {
    const { store, work } = await withWork()

    await store.getState().moveFile(`${work}/사전/설정.md`, `${ROOT}/만화`, 'file')

    expect(namesOf(findNode(store.getState().tree, '만화'), 'file')).toEqual(['설정'])
    expect(namesOf(findNode(store.getState().tree, '사전'), 'file')).toEqual([])
  })

  it('폴더를 자기 하위 폴더로 옮기려 하면 거부하고 트리는 그대로다', async () => {
    const { store, work } = await withWork()
    const before = JSON.stringify(store.getState().tree)

    await expect(store.getState().moveFile(work, `${work}/주인공`, 'dir')).rejects.toThrow('하위 폴더')

    expect(JSON.stringify(store.getState().tree)).toBe(before)
  })
})

describe('삭제', () => {
  it('폴더를 지우면 그 안의 문서를 열어 둔 탭도 같이 닫힌다', async () => {
    const { store, work } = await withWork()
    await store.getState().openFile(`${work}/주인공/능력.md`, '능력')
    expect(store.getState().tabs).toHaveLength(2) // 작품 개요 문서 + 능력

    await store.getState().deleteFile(`${work}/주인공`)

    const paths = store.getState().tabs.map((t) => t.openPath)
    expect(paths.some((p) => p.includes('/주인공/'))).toBe(false)
    expect(store.getState().openPath).not.toContain('/주인공/')
  })
})
