import { afterEach, describe, expect, it, vi } from 'vitest'
import { freshStore } from '../helpers/store.js'

// 편집기·코드블록 글꼴 설정(monoFont)의 저장과 복원. 빈 글자는 기본(D2Coding). 글꼴 이름은 CSS 에 들어가므로 안전하지 않은 값은 기본으로 돌아간다.

const KEY = 'gyeoltarae-mono-font'

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => void data.set(key, String(value)),
    removeItem: (key) => void data.delete(key),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('monoFont 설정', () => {
  it('저장된 값이 없으면 기본(빈 글자)이다', async () => {
    vi.stubGlobal('localStorage', fakeStorage())
    const { state } = await freshStore()
    expect(state().monoFont).toBe('')
  })

  it('setMonoFont 가 상태에 반영하고 저장한다', async () => {
    const storage = fakeStorage()
    vi.stubGlobal('localStorage', storage)
    const { state } = await freshStore()
    state().setMonoFont('Fira Code')
    expect(state().monoFont).toBe('Fira Code')
    expect(storage.data.get(KEY)).toBe('Fira Code')
  })

  it('다음 시작에서 저장된 값을 읽는다', async () => {
    vi.stubGlobal('localStorage', fakeStorage({ [KEY]: 'Cascadia Mono' }))
    const { state } = await freshStore()
    expect(state().monoFont).toBe('Cascadia Mono')
  })

  it('저장된 값이 안전하지 않으면 기본으로 읽는다', async () => {
    vi.stubGlobal('localStorage', fakeStorage({ [KEY]: "x'; color: red" }))
    const { state } = await freshStore()
    expect(state().monoFont).toBe('')
  })

  it('안전하지 않은 이름을 고르면 기본으로 돌아가고 저장된 값도 지운다', async () => {
    const storage = fakeStorage({ [KEY]: 'Fira Code' })
    vi.stubGlobal('localStorage', storage)
    const { state } = await freshStore()
    state().setMonoFont('a;b')
    expect(state().monoFont).toBe('')
    expect(storage.data.has(KEY)).toBe(false)
  })

  it('빈 글자(기본)를 고르면 저장된 값을 지운다', async () => {
    const storage = fakeStorage({ [KEY]: 'Fira Code' })
    vi.stubGlobal('localStorage', storage)
    const { state } = await freshStore()
    state().setMonoFont('')
    expect(state().monoFont).toBe('')
    expect(storage.data.has(KEY)).toBe(false)
  })

  it('앞뒤 공백과 연속 공백을 정리해서 저장한다', async () => {
    const storage = fakeStorage()
    vi.stubGlobal('localStorage', storage)
    const { state } = await freshStore()
    state().setMonoFont('  Source   Code Pro ')
    expect(state().monoFont).toBe('Source Code Pro')
    expect(storage.data.get(KEY)).toBe('Source Code Pro')
  })

  it('localStorage 가 없는 환경에서도 죽지 않고 상태는 바뀐다', async () => {
    vi.stubGlobal('localStorage', undefined)
    const { state } = await freshStore()
    expect(() => state().setMonoFont('Fira Code')).not.toThrow()
    expect(state().monoFont).toBe('Fira Code')
  })
})
