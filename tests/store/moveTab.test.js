// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { freshStore } from '../helpers/store.js'

// 스토어의 moveTab(id, direction): 탭 목록의 순서만 바꾸고, 활성 탭과 각 탭의 내용은 그대로다.
describe('moveTab', () => {
  async function withTabs() {
    const ctx = await freshStore()
    ctx.store.setState({
      tabs: [
        { id: 't1', title: '가', openPath: '/mock/workspace/가.md' },
        { id: 't2', title: '나', openPath: '/mock/workspace/나.md' },
        { id: 't3', title: '다', openPath: '/mock/workspace/다.md' },
      ],
      activeTabId: 't2',
    })
    return ctx
  }

  it('탭을 왼쪽·오른쪽으로 한 칸씩 옮긴다', async () => {
    const { state } = await withTabs()
    state().moveTab('t2', -1)
    expect(state().tabs.map((t) => t.id)).toEqual(['t2', 't1', 't3'])
    state().moveTab('t2', 1)
    state().moveTab('t2', 1)
    expect(state().tabs.map((t) => t.id)).toEqual(['t1', 't3', 't2'])
  })

  it('활성 탭은 그대로이고 탭 내용도 바뀌지 않는다 (옮긴 탭이 활성이 아니어도)', async () => {
    const { state } = await withTabs()
    state().moveTab('t1', 1)
    expect(state().activeTabId).toBe('t2')
    expect(state().tabs.find((t) => t.id === 't1')).toEqual({ id: 't1', title: '가', openPath: '/mock/workspace/가.md' })
  })

  it('더 갈 곳이 없으면 목록이 바뀌지 않는다', async () => {
    const { state } = await withTabs()
    const before = state().tabs
    state().moveTab('t1', -1)
    state().moveTab('t3', 1)
    expect(state().tabs).toBe(before)
  })
})
