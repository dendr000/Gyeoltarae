import { describe, expect, it } from 'vitest'
import { enterTarget, tabTarget } from '../../src/lib/tableNav.js'

// 셀 모양은 표 편집기의 grid 와 같다: { colspan, rowspan, mergedInto }. 병합으로 가려진 칸은 mergedInto 가 있다.
const cell = () => ({ text: '', colspan: 1, rowspan: 1, mergedInto: null })
const grid = (rows, cols) => Array.from({ length: rows }, () => Array.from({ length: cols }, cell))

describe('tabTarget (Tab — 아래 행의 첫 번째 셀로)', () => {
  it('아래 행이 있으면 그 행의 첫 번째 셀(0열)이다', () => {
    expect(tabTarget(grid(3, 3), 0)).toEqual({ r: 1, c: 0, addRow: false })
    expect(tabTarget(grid(3, 3), 1)).toEqual({ r: 2, c: 0, addRow: false })
  })

  it('현재 열과 상관없이 항상 첫 번째 셀이다', () => {
    // tabTarget 은 열을 받지도 않는다 — 어느 열에서 눌러도 같은 곳
    expect(tabTarget(grid(2, 5), 0).c).toBe(0)
  })

  it('마지막 행이면 새 행을 만들고 그 행의 첫 번째 셀로 간다', () => {
    expect(tabTarget(grid(3, 3), 2)).toEqual({ r: 3, c: 0, addRow: true })
  })

  it('행이 하나뿐인 표에서도 새 행이 생긴다', () => {
    expect(tabTarget(grid(1, 2), 0)).toEqual({ r: 1, c: 0, addRow: true })
  })

  it('아래 행의 첫 칸이 병합으로 가려져 있으면 그다음 보이는 셀로 간다', () => {
    const g = grid(3, 3)
    g[1][0] = { ...cell(), mergedInto: { r: 0, c: 0 } } // 위 셀의 rowspan 이 덮은 칸
    expect(tabTarget(g, 0)).toEqual({ r: 1, c: 1, addRow: false })
  })
})

describe('enterTarget (Enter — 바로 아래 셀로)', () => {
  it('같은 열의 바로 아래 셀이다', () => {
    expect(enterTarget(grid(3, 3), 0, 2)).toEqual({ r: 1, c: 2, addRow: false })
    expect(enterTarget(grid(3, 3), 1, 0)).toEqual({ r: 2, c: 0, addRow: false })
  })

  it('마지막 행이면 새 행을 만들고 같은 열로 간다', () => {
    expect(enterTarget(grid(3, 3), 2, 1)).toEqual({ r: 3, c: 1, addRow: true })
  })

  it('세로로 병합된 셀(rowspan 2)은 병합이 끝난 다음 행으로 간다', () => {
    const g = grid(4, 2)
    g[0][0] = { ...cell(), rowspan: 2 }
    g[1][0] = { ...cell(), mergedInto: { r: 0, c: 0 } }
    expect(enterTarget(g, 0, 0)).toEqual({ r: 2, c: 0, addRow: false })
  })

  it('세로 병합이 표 끝까지 이어지면 새 행을 만든다', () => {
    const g = grid(2, 2)
    g[0][0] = { ...cell(), rowspan: 2 }
    g[1][0] = { ...cell(), mergedInto: { r: 0, c: 0 } }
    expect(enterTarget(g, 0, 0)).toEqual({ r: 2, c: 0, addRow: true })
  })

  it('아래 칸이 다른 셀의 병합에 가려져 있으면 그 병합 셀(보이는 셀)로 간다', () => {
    const g = grid(3, 3)
    g[1][1] = { ...cell(), mergedInto: { r: 1, c: 0 } } // 옆 셀의 colspan 이 덮은 칸
    expect(enterTarget(g, 0, 1)).toEqual({ r: 1, c: 0, addRow: false })
  })

  it('가로로 병합된 셀(colspan)에서도 같은 열의 아래로 간다', () => {
    const g = grid(2, 3)
    g[0][0] = { ...cell(), colspan: 2 }
    g[0][1] = { ...cell(), mergedInto: { r: 0, c: 0 } }
    expect(enterTarget(g, 0, 0)).toEqual({ r: 1, c: 0, addRow: false })
  })
})
