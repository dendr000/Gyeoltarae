import { describe, expect, it } from 'vitest'
import { ROOT, freshStore } from '../helpers/store.js'

// 만화 폴더에 문서 두 개를 만들어 둔 상태 — createDoc은 만든 문서를 바로 열기 때문에
// 끝나면 B가 활성 탭이고 A는 배경 탭이다.
async function withTwoDocs() {
  const ctx = await freshStore()
  await ctx.state().createDoc(`${ROOT}/만화`, '문서A')
  await ctx.state().createDoc(`${ROOT}/만화`, '문서B')
  const [tabA, tabB] = ctx.state().tabs
  return { ...ctx, tabA, tabB }
}

describe('탭 열기', () => {
  it('같은 문서를 다시 열면 탭이 늘어나지 않고 그 탭으로 돌아온다', async () => {
    const { state, tabA, tabB } = await withTwoDocs()
    expect(state().tabs).toHaveLength(2)
    expect(state().activeTabId).toBe(tabB.id)

    await state().openFile(tabA.openPath, tabA.openName)

    expect(state().tabs).toHaveLength(2)
    expect(state().activeTabId).toBe(tabA.id)
  })
})

describe('탭 전환 시 저장 안 된 입력 보존', () => {
  it('입력 직후(자동 저장 대기 중)에 바로 다른 탭으로 넘어가도 내용이 디스크에 저장된다', async () => {
    const { state, api, tabA, tabB } = await withTwoDocs()
    await state().switchTab(tabA.id)

    state().updateText('A에 방금 친 내용')
    expect(state().isDirty).toBe(true)
    await state().switchTab(tabB.id)

    expect(await api.readFile(tabA.openPath)).toBe('A에 방금 친 내용')
  })

  it('다른 탭을 갔다 돌아와도 그 탭의 내용이 그대로다', async () => {
    const { state, tabA, tabB } = await withTwoDocs()
    await state().switchTab(tabA.id)
    state().updateText('A 수정본')

    await state().switchTab(tabB.id)
    await state().switchTab(tabA.id)

    expect(state().rawText).toBe('A 수정본')
  })
})

describe('탭 닫기', () => {
  it('활성 탭을 닫으면 이웃 탭이 활성이 된다', async () => {
    const { state, tabA, tabB } = await withTwoDocs()

    await state().closeTab(tabB.id)

    expect(state().tabs.map((t) => t.id)).toEqual([tabA.id])
    expect(state().activeTabId).toBe(tabA.id)
    expect(state().openPath).toBe(tabA.openPath)
  })

  it('마지막 탭을 닫으면 빈 화면이 된다', async () => {
    const { state, tabA, tabB } = await withTwoDocs()
    await state().closeTab(tabB.id)
    await state().closeTab(tabA.id)

    expect(state().tabs).toEqual([])
    expect(state().activeTabId).toBeNull()
    expect(state().openPath).toBeNull()
    expect(state().rawText).toBe('')
  })

  it('닫는 탭에 저장 안 된 입력이 있으면 닫기 전에 저장한다', async () => {
    const { state, api, tabB } = await withTwoDocs()
    state().updateText('B 마지막 입력')

    await state().closeTab(tabB.id)

    expect(await api.readFile(tabB.openPath)).toBe('B 마지막 입력')
  })
})

describe('폴더 이름 변경 / 이동 시 열려 있던 탭의 경로', () => {
  it('폴더 이름을 바꾸면 그 안 문서를 연 탭(활성·배경 모두)의 경로가 새 이름으로 바뀐다', async () => {
    const { state } = await freshStore()
    await state().createDoc(`${ROOT}/만화`, '문서A')
    await state().createDoc(`${ROOT}/만화`, '문서B')
    const before = state().tabs.map((t) => t.openPath)
    expect(before.every((p) => p.includes('/만화/'))).toBe(true)

    await state().renameFile(`${ROOT}/만화`, '단편', 'dir')

    const tabs = state().tabs
    expect(tabs.map((t) => t.openPath)).toEqual(before.map((p) => p.replace('/만화/', '/단편/')))
    // 탭 id도 새 경로 기준으로 바뀌고, 활성 탭 id와 열린 문서 경로가 서로 어긋나지 않는다
    expect(tabs.map((t) => t.id)).toEqual(tabs.map((t) => `file:${t.openPath}`))
    expect(state().activeTabId).toBe(`file:${state().openPath}`)
    expect(state().openPath).toContain('/단편/')
  })

  it('이름을 바꾼 문서 자신의 탭은 제목도 새 이름으로 바뀐다', async () => {
    const { state } = await freshStore()
    await state().createDoc(`${ROOT}/만화`, '예전이름')
    const { openPath } = state()

    await state().renameFile(openPath, '새이름', 'file')

    expect(state().tabs[0].title).toBe('새이름')
    expect(state().openName).toBe('새이름')
    expect(state().openPath).toBe(`${ROOT}/만화/새이름.md`)
  })

  it('문서를 다른 폴더로 옮기면 열려 있던 탭이 새 경로를 가리키고 제목은 그대로다', async () => {
    const { state } = await freshStore()
    await state().createDoc(`${ROOT}/만화`, '이동할문서')
    const { openPath } = state()

    await state().moveFile(openPath, `${ROOT}/소설`, 'file')

    expect(state().openPath).toBe(`${ROOT}/소설/이동할문서.md`)
    expect(state().tabs[0].openPath).toBe(`${ROOT}/소설/이동할문서.md`)
    expect(state().tabs[0].title).toBe('이동할문서')
  })

  it('옮긴 뒤 그 탭에서 저장하면 새 위치의 파일에 저장되고 옛 경로에 파일이 새로 생기지 않는다', async () => {
    const { state, api } = await freshStore()
    await state().createDoc(`${ROOT}/만화`, '이동할문서')
    const oldPath = state().openPath
    await state().moveFile(oldPath, `${ROOT}/소설`, 'file')

    state().updateText('이동 후 입력')
    await state().saveOpenFile()

    expect(await api.readFile(`${ROOT}/소설/이동할문서.md`)).toBe('이동 후 입력')
    expect(await api.readFile(oldPath)).toBe('')
  })
})
