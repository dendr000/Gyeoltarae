// Copyright (c) dendr000. MIT License.
import { beforeEach, describe, expect, it, vi } from 'vitest'

// 스토어의 단축키 설정: 기본 키 + 사용자가 바꾼 키(shortcutOverrides)를 합친 shortcuts 와 바꾸기·되돌리기 동작. 바꾼 키는 localStorage 에 저장한다.
// 시험은 node 환경이라 localStorage 를 간단히 흉내 낸다.
function installLocalStorage(initial = {}) {
  const data = new Map(Object.entries(initial))
  globalThis.localStorage = {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => {
      data.set(k, String(v))
    },
    removeItem: (k) => {
      data.delete(k)
    },
  }
  return data
}

async function freshState(initial) {
  const data = installLocalStorage(initial)
  vi.resetModules()
  const { useAppStore } = await import('../../src/store/useAppStore.js')
  return { data, state: () => useAppStore.getState() }
}

const KEY = 'wikidesk-shortcuts'

describe('단축키 설정 스토어', () => {
  beforeEach(() => {
    delete globalThis.localStorage
  })

  it('처음에는 기본 키다 (바꾼 것 없음)', async () => {
    const { state } = await freshState()
    expect(state().shortcutOverrides).toEqual({})
    expect(state().shortcuts['doc.new']).toBe('Ctrl+N')
    expect(state().shortcuts['line.moveUp']).toBe('Alt+ArrowUp')
  })

  it('저장된 바꾼 키를 시작할 때 읽는다 (깨진 값은 무시)', async () => {
    const { state } = await freshState({ [KEY]: '{"doc.new":"Ctrl+Alt+N","zzz":"Ctrl+Q"}' })
    expect(state().shortcuts['doc.new']).toBe('Ctrl+Alt+N')
    expect(state().shortcutOverrides).toEqual({ 'doc.new': 'Ctrl+Alt+N' })
    const broken = await freshState({ [KEY]: 'not json' })
    expect(broken.state().shortcuts['doc.new']).toBe('Ctrl+N')
  })

  it('setShortcut: 바꾸면 shortcuts 가 따라가고 저장된다', async () => {
    const { state, data } = await freshState()
    const result = state().setShortcut('doc.new', 'Ctrl+Alt+N')
    expect(result).toEqual({ ok: true })
    expect(state().shortcuts['doc.new']).toBe('Ctrl+Alt+N')
    expect(JSON.parse(data.get(KEY))).toEqual({ 'doc.new': 'Ctrl+Alt+N' })
  })

  it('setShortcut: 규칙에 어긋난 키는 거절하고 바꾸지 않는다 (이유를 돌려준다)', async () => {
    const { state } = await freshState()
    const result = state().setShortcut('doc.new', 'N')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('Ctrl')
    expect(state().shortcuts['doc.new']).toBe('Ctrl+N')
    expect(state().setShortcut('doc.new', 'Ctrl+C').ok).toBe(false)
  })

  it('setShortcut: 다른 기능이 쓰는 키면 거절하고 어느 기능인지 알려 준다', async () => {
    const { state } = await freshState()
    const result = state().setShortcut('doc.new', 'Ctrl+M')
    expect(result.ok).toBe(false)
    expect(result.conflict).toBe('sidebar.toggle')
    expect(state().shortcuts['doc.new']).toBe('Ctrl+N')
    expect(state().shortcuts['sidebar.toggle']).toBe('Ctrl+M')
  })

  it('setShortcut: force 면 충돌한 다른 기능의 키를 해제하고 바꾼다', async () => {
    const { state } = await freshState()
    const result = state().setShortcut('doc.new', 'Ctrl+M', { force: true })
    expect(result).toEqual({ ok: true })
    expect(state().shortcuts['doc.new']).toBe('Ctrl+M')
    expect(state().shortcuts['sidebar.toggle']).toBe('')
  })

  it('setShortcut: 빈 글이면 그 기능의 단축키를 없앤다 (해제)', async () => {
    const { state } = await freshState()
    expect(state().setShortcut('line.duplicate', '')).toEqual({ ok: true })
    expect(state().shortcuts['line.duplicate']).toBe('')
  })

  it('setShortcut: 기본 키로 바꾸면 바꾼 목록에서 빠진다 (저장은 최소한으로)', async () => {
    const { state, data } = await freshState()
    state().setShortcut('doc.new', 'Ctrl+Alt+N')
    state().setShortcut('doc.new', 'Ctrl+N')
    expect(state().shortcutOverrides).toEqual({})
    expect(JSON.parse(data.get(KEY))).toEqual({})
  })

  it('setShortcut: 모르는 기능 id 는 거절한다', async () => {
    const { state } = await freshState()
    expect(state().setShortcut('nothing', 'Ctrl+K').ok).toBe(false)
  })

  it('resetShortcut: 한 기능을 기본 키로 되돌린다', async () => {
    const { state } = await freshState()
    state().setShortcut('doc.new', 'Ctrl+Alt+N')
    state().setShortcut('line.sort', '')
    state().resetShortcut('doc.new')
    expect(state().shortcuts['doc.new']).toBe('Ctrl+N')
    expect(state().shortcuts['line.sort']).toBe('')
  })

  it('resetAllShortcuts: 전부 기본 키로 되돌린다', async () => {
    const { state, data } = await freshState()
    state().setShortcut('doc.new', 'Ctrl+Alt+N')
    state().setShortcut('line.sort', '')
    state().resetAllShortcuts()
    expect(state().shortcutOverrides).toEqual({})
    expect(state().shortcuts['line.sort']).toBe('Ctrl+`')
    expect(JSON.parse(data.get(KEY))).toEqual({})
  })

  it('localStorage 를 못 쓰는 환경에서도 오류 없이 메모리에서는 바뀐다', async () => {
    const { state } = await freshState()
    globalThis.localStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(() => state().setShortcut('doc.new', 'Ctrl+Alt+N')).not.toThrow()
    expect(state().shortcuts['doc.new']).toBe('Ctrl+Alt+N')
  })
})
