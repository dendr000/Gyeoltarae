import { describe, expect, it } from 'vitest'
import { createHistory, record, redo, undo } from '../../src/lib/gridHistory.js'

// 표 편집기의 되돌리기·다시 실행 기록. 현재 상태(present)는 { grid, headerRow }. 같은 칸을 이어서 치는 입력은 한 번에 묶어서(coalesce)
// 글자 하나마다 되돌리기 단계가 생기지 않게 한다.

const state = (grid, headerRow = false) => ({ grid, headerRow })
const G = (n) => [[{ text: String(n) }]] // 서로 다른 격자 객체

describe('record', () => {
  it('바뀐 상태를 기록하고 이전 상태를 되돌리기 목록에 쌓는다', () => {
    let h = createHistory(state(G(0)))
    h = record(h, state(G(1)))
    h = record(h, state(G(2)))
    expect(h.past.map((s) => s.grid[0][0].text)).toEqual(['0', '1'])
    expect(h.present.grid[0][0].text).toBe('2')
    expect(h.future).toEqual([])
  })

  it('같은 격자·같은 헤더 설정이면 기록하지 않는다 (같은 객체를 돌려준다)', () => {
    const grid = G(0)
    const h = createHistory(state(grid))
    expect(record(h, state(grid))).toBe(h)
  })

  it('헤더 설정만 바뀌어도 기록한다', () => {
    const grid = G(0)
    const h = record(createHistory(state(grid, false)), state(grid, true))
    expect(h.past.length).toBe(1)
    expect(h.present.headerRow).toBe(true)
  })

  it('새 변경을 기록하면 다시 실행 목록이 비워진다', () => {
    let h = createHistory(state(G(0)))
    h = record(h, state(G(1)))
    h = undo(h)
    expect(h.future.length).toBe(1)
    h = record(h, state(G(9)))
    expect(h.future).toEqual([])
  })

  it('기록 개수는 limit 까지만 남기고 오래된 것부터 버린다', () => {
    let h = createHistory(state(G(0)))
    for (let i = 1; i <= 10; i += 1) h = record(h, state(G(i)), { limit: 3 })
    expect(h.past.length).toBe(3)
    expect(h.past[0].grid[0][0].text).toBe('7')
  })
})

describe('record - 같은 칸 입력 묶기 (coalesce)', () => {
  it('같은 key 로 1초 안에 이어진 변경은 한 단계로 묶는다', () => {
    let h = createHistory(state(G(0)))
    h = record(h, state(G(1)), { key: 'cell:0:0', at: 1000 })
    h = record(h, state(G(2)), { key: 'cell:0:0', at: 1300 })
    h = record(h, state(G(3)), { key: 'cell:0:0', at: 1900 })
    expect(h.past.length).toBe(1)
    expect(h.past[0].grid[0][0].text).toBe('0')
    expect(h.present.grid[0][0].text).toBe('3')
  })

  it('쉬었다가(window 초과) 다시 치면 새 단계', () => {
    let h = createHistory(state(G(0)))
    h = record(h, state(G(1)), { key: 'k', at: 1000 })
    h = record(h, state(G(2)), { key: 'k', at: 2500 })
    expect(h.past.length).toBe(2)
  })

  it('key 가 다르면 새 단계', () => {
    let h = createHistory(state(G(0)))
    h = record(h, state(G(1)), { key: 'cell:0:0', at: 1000 })
    h = record(h, state(G(2)), { key: 'cell:0:1', at: 1100 })
    expect(h.past.length).toBe(2)
  })

  it('key 없는 변경 사이에 끼면 묶이지 않는다', () => {
    let h = createHistory(state(G(0)))
    h = record(h, state(G(1)), { key: 'k', at: 1000 })
    h = record(h, state(G(2)), { at: 1050 })
    h = record(h, state(G(3)), { key: 'k', at: 1100 })
    expect(h.past.length).toBe(3)
  })

  it('되돌린 뒤에는 같은 key 라도 묶이지 않는다', () => {
    let h = createHistory(state(G(0)))
    h = record(h, state(G(1)), { key: 'k', at: 100 })
    h = undo(h)
    h = record(h, state(G(2)), { key: 'k', at: 200 }) // 시각상 묶일 만큼 가까워도 되돌린 뒤라 새 단계
    expect(h.past.length).toBe(1)
    expect(h.past[0].grid[0][0].text).toBe('0')
  })
})

describe('undo / redo', () => {
  it('되돌리고 다시 실행한다', () => {
    let h = createHistory(state(G(0)))
    h = record(h, state(G(1)))
    h = record(h, state(G(2)))
    h = undo(h)
    expect(h.present.grid[0][0].text).toBe('1')
    h = undo(h)
    expect(h.present.grid[0][0].text).toBe('0')
    h = redo(h)
    expect(h.present.grid[0][0].text).toBe('1')
    h = redo(h)
    expect(h.present.grid[0][0].text).toBe('2')
  })

  it('다시 실행한 뒤에도 다시 되돌릴 수 있다 (되돌리기 ↔ 다시 실행을 오갈 수 있다)', () => {
    let h = record(createHistory(state(G(0))), state(G(1)))
    h = undo(h)
    h = redo(h)
    expect(h.past.length).toBe(1)
    h = undo(h)
    expect(h.present.grid[0][0].text).toBe('0')
  })

  it('헤더 설정도 함께 되돌린다', () => {
    const grid = G(0)
    let h = record(createHistory(state(grid, true)), state(G(1), false))
    h = undo(h)
    expect(h.present.headerRow).toBe(true)
  })

  it('더 되돌릴 것이 없으면 같은 객체를 돌려준다', () => {
    const h = createHistory(state(G(0)))
    expect(undo(h)).toBe(h)
    expect(redo(h)).toBe(h)
  })

  it('원래 기록을 바꾸지 않는다', () => {
    let h = createHistory(state(G(0)))
    h = record(h, state(G(1)))
    const before = h.past.length
    undo(h)
    expect(h.past.length).toBe(before)
  })
})
