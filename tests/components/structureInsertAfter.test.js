// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { buildStructureOps } from '../../src/components/tableStructureOps.js'
import { emptyCell } from '../../src/lib/tableGrid.js'

// 행·열마다 있는 "+" 단추(insertRowAfter / insertColumnAfter)의 동작: 격자에 반영하고, 새 칸을 골라 포커스를 줄 자리를 돌려준다. 고른 범위와 무관하다.
const cell = (text, extra = {}) => ({ ...emptyCell(), text, ...extra })
const grid = (rows, cols) => Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => cell(`${r}${c}`)))

function ops(g, { focus = { r: 0, c: 0 } } = {}) {
  const state = { grid: null, anchor: null, focus: null }
  const built = buildStructureOps({
    grid: g,
    setGrid: (next) => {
      state.grid = typeof next === 'function' ? next(g) : next
    },
    range: { r1: focus.r, r2: focus.r, c1: focus.c, c2: focus.c },
    isMultiCell: false,
    focusCell: focus,
    setAnchor: (value) => {
      state.anchor = value
    },
    setFocusCell: (value) => {
      state.focus = value
    },
    headerRow: false,
    setGridAndHeader: () => {},
  })
  return { built, state }
}

describe('insertRowAfter', () => {
  it('그 행 바로 아래에 빈 행을 끼운다 (고른 칸이 다른 곳이어도)', () => {
    const { built, state } = ops(grid(3, 2), { focus: { r: 2, c: 1 } })
    built.insertRowAfter(0)
    expect(state.grid.map((row) => row[0].text)).toEqual(['00', '', '10', '20'])
  })

  it('맨 아래 행의 "+" 는 맨 아래에 끼운다', () => {
    const { built, state } = ops(grid(2, 2))
    built.insertRowAfter(1)
    expect(state.grid.map((row) => row[0].text)).toEqual(['00', '10', ''])
  })

  it('새 행의 칸(고른 칸과 같은 열)을 골라 그 자리를 포커스 대상으로 돌려준다', () => {
    const { built, state } = ops(grid(3, 3), { focus: { r: 0, c: 2 } })
    const target = built.insertRowAfter(1)
    expect(target).toEqual({ r: 2, c: 2 })
    expect(state.focus).toEqual({ r: 2, c: 2 })
    expect(state.anchor).toEqual({ r: 2, c: 2 })
  })
})

describe('insertColumnAfter', () => {
  it('그 열 바로 오른쪽에 빈 열을 끼운다', () => {
    const { built, state } = ops(grid(2, 3))
    built.insertColumnAfter(0)
    expect(state.grid[0].map((c) => c.text)).toEqual(['00', '', '01', '02'])
    expect(state.grid[1].map((c) => c.text)).toEqual(['10', '', '11', '12'])
  })

  it('맨 오른쪽 열의 "+" 는 맨 오른쪽에 끼운다', () => {
    const { built, state } = ops(grid(2, 2))
    built.insertColumnAfter(1)
    expect(state.grid[0].map((c) => c.text)).toEqual(['00', '01', ''])
  })

  it('새 열의 칸(고른 칸과 같은 행)을 골라 포커스 대상으로 돌려준다', () => {
    const { built, state } = ops(grid(3, 3), { focus: { r: 2, c: 0 } })
    expect(built.insertColumnAfter(0)).toEqual({ r: 2, c: 1 })
    expect(state.focus).toEqual({ r: 2, c: 1 })
  })

  it('가로 병합이 걸친 열이면 병합 뒤에 끼워 병합이 늘어나지 않는다', () => {
    const g = grid(2, 4)
    g[0][1] = cell('병합', { colspan: 2 })
    g[0][2] = { ...emptyCell(), mergedInto: { r: 0, c: 1 } }
    const { built, state } = ops(g)
    built.insertColumnAfter(1)
    expect(state.grid[0][1].colspan).toBe(2)
    expect(state.grid[0].length).toBe(5)
    expect(state.grid[0][3].text).toBe('')
  })
})
