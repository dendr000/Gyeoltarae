// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { DEFAULT_VIEW_STATE, loadViewState, normalizeViewState, saveViewState } from '../../src/lib/characterViewState.js'

function fakeStorage(initial = {}) {
  const data = { ...initial }
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v }, data }
}

describe('normalizeViewState', () => {
  it('없거나 망가진 값은 기본값', () => {
    for (const v of [null, undefined, 5, 'x', []]) expect(normalizeViewState(v)).toEqual(DEFAULT_VIEW_STATE)
  })

  it('쓸 수 있는 칸만 받고 나머지는 버린다', () => {
    const out = normalizeViewState({ query: '귀', attrs: { 특기: ['복사', 3, '마약'], 나이: 'x' }, sortKey: 'first', sortDir: 'sideways', episodeFrom: 10, extra: 1 })
    expect(out.query).toBe('귀')
    expect(out.attrs).toEqual({ 특기: ['복사', '마약'] })
    expect(out.sortKey).toBe('first')
    expect(out.sortDir).toBe('asc')
    expect(out.episodeFrom).toBe('')
    expect('extra' in out).toBe(false)
  })

  it('기본값 객체를 건드리지 않는다', () => {
    const out = normalizeViewState({ attrs: { a: ['x'] } })
    out.attrs.b = ['y']
    expect(DEFAULT_VIEW_STATE.attrs).toEqual({})
  })
})

describe('saveViewState·loadViewState', () => {
  it('문서별로 저장하고 불러온다', () => {
    const storage = fakeStorage()
    saveViewState('D:/a.md', { ...DEFAULT_VIEW_STATE, query: '가' }, storage)
    saveViewState('D:/b.md', { ...DEFAULT_VIEW_STATE, query: '나' }, storage)
    expect(loadViewState('D:/a.md', storage).query).toBe('가')
    expect(loadViewState('D:/b.md', storage).query).toBe('나')
    expect(loadViewState('D:/c.md', storage)).toEqual(DEFAULT_VIEW_STATE)
  })

  it('저장된 글이 깨져 있어도 기본값', () => {
    expect(loadViewState('x', fakeStorage({ 'gyeoltarae.characterView': '{깨짐' }))).toEqual(DEFAULT_VIEW_STATE)
  })

  it('저장소를 못 쓰면 오류 없이 넘어간다', () => {
    const broken = { getItem() { throw new Error('막힘') }, setItem() { throw new Error('막힘') } }
    expect(() => saveViewState('x', DEFAULT_VIEW_STATE, broken)).not.toThrow()
    expect(loadViewState('x', broken)).toEqual(DEFAULT_VIEW_STATE)
    expect(loadViewState('x', undefined)).toEqual(DEFAULT_VIEW_STATE)
  })

  it('문서가 많아지면 오래된 것부터 버린다(최대 60개)', () => {
    const storage = fakeStorage()
    for (let i = 0; i < 70; i += 1) saveViewState(`doc${i}`, { ...DEFAULT_VIEW_STATE, query: String(i) }, storage)
    const all = JSON.parse(storage.data['gyeoltarae.characterView'])
    expect(Object.keys(all)).toHaveLength(60)
    expect(all.doc0).toBeUndefined()
    expect(all.doc69.query).toBe('69')
  })
})
