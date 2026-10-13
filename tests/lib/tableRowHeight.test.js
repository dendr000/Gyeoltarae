import { describe, expect, it } from 'vitest'
import { emptyCell } from '../../src/lib/tableGrid.js'
import { getRowHeight, normalizeHeight, setRowHeight } from '../../src/lib/tableStyle.js'

// 표 편집기의 행 높이 — 열 너비와 같은 방식: 그 행의 맨 왼쪽 "붙일 수 있는" 칸 한 곳에 height=...px 속성을 둔다.

const cell = (text, extra = {}) => ({ ...emptyCell(), text, ...extra })
const covered = (r, c) => ({ ...emptyCell(), mergedInto: { r, c } })
const g = (rows) => rows.map((row) => row.map((v) => (typeof v === 'string' ? cell(v) : v)))
const heights = (grid) => grid.map((row) => row.map((c) => c.extraAttrs.filter((t) => t.startsWith('height='))))
const five = () => g([['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']])

describe('normalizeHeight', () => {
  it('px 정수만 (1~9999), 소수는 반올림', () => {
    expect(normalizeHeight('40')).toBe('40px')
    expect(normalizeHeight(' 40.4 ')).toBe('40px')
    expect(normalizeHeight('9999')).toBe('9999px')
  })

  it('범위를 벗어나거나 숫자가 아니면 null', () => {
    for (const value of ['', 'abc', '0', '-3', '10000']) expect(normalizeHeight(value)).toBeNull()
  })
})

describe('getRowHeight / setRowHeight - 행 높이', () => {
  it('설정하면 그 행의 맨 왼쪽 칸에 height= 토큰이 붙는다', () => {
    const { grid, changed } = setRowHeight(five(), 1, 1, '60px')
    expect(changed).toBe(1)
    expect(heights(grid)[1]).toEqual([['height=60px'], []])
    expect(heights(grid).filter((_, r) => r !== 1).flat().flat()).toEqual([])
  })

  it('여러 행에 한꺼번에', () => {
    const { grid, changed } = setRowHeight(five(), 1, 3, '30px')
    expect(changed).toBe(3)
    expect(heights(grid).map((row) => row[0].length)).toEqual([0, 1, 1, 1, 0])
  })

  it('다시 설정하면 값을 바꾸고, 같은 행의 다른 칸에 있던 height 는 지운다', () => {
    const grid = five()
    grid[2][1] = cell('f', { extraAttrs: ['height=99px', 'nopad'] })
    const { grid: next } = setRowHeight(grid, 2, 2, '70px')
    expect(heights(next)[2]).toEqual([['height=70px'], []])
    expect(next[2][1].extraAttrs).toEqual(['nopad'])
  })

  it('지우기(null)와 이미 같은 상태', () => {
    const set = setRowHeight(five(), 1, 1, '60px').grid
    const same = setRowHeight(set, 1, 1, '60px')
    expect(same.changed).toBe(0)
    expect(same.grid).toBe(set)
    const cleared = setRowHeight(set, 1, 1, null)
    expect(cleared.changed).toBe(1)
    expect(heights(cleared.grid).flat().flat()).toEqual([])
    expect(setRowHeight(five(), 0, 0, null).changed).toBe(0)
  })

  it('맨 왼쪽 칸이 세로 병합에 걸려 있으면 그 오른쪽의 첫 붙일 수 있는 칸에 붙인다', () => {
    const grid = [
      [cell('X', { rowspan: 2 }), cell('b')],
      [covered(0, 0), cell('c')],
    ]
    const { grid: next } = setRowHeight(grid, 0, 0, '50px')
    expect(next[0][0].extraAttrs).toEqual([])
    expect(next[0][1].extraAttrs).toEqual(['height=50px'])
  })

  it('붙일 수 있는 칸이 없는 행은 건너뛴다', () => {
    const grid = [[cell('X', { rowspan: 2 })], [covered(0, 0)]]
    const result = setRowHeight(grid, 0, 1, '50px')
    expect(result.changed).toBe(0)
    expect(result.grid).toBe(grid)
  })

  it('getRowHeight: 읽어서 { value, unit } (단위 없는 값은 px)', () => {
    const grid = five()
    expect(getRowHeight(grid, 0)).toBeNull()
    grid[0][1] = cell('b', { extraAttrs: ['height=35'] })
    expect(getRowHeight(grid, 0)).toEqual({ value: 35, unit: 'px' })
  })

  it('높이가 맨 왼쪽 칸이 아닌 다른 칸에 있으면 같은 값이어도 맨 왼쪽 칸으로 옮긴다 (이미 설정된 것으로 보지 않음)', () => {
    const grid = five()
    grid[1][1] = cell('d', { extraAttrs: ['height=60px'] })
    const { grid: next, changed } = setRowHeight(grid, 1, 1, '60px')
    expect(changed).toBe(1)
    expect(heights(next)[1]).toEqual([['height=60px'], []])
  })

  it('네 자리 높이(1000px)도 읽는다', () => {
    const grid = five()
    grid[0][0] = cell('a', { extraAttrs: ['height=1000px'] })
    expect(getRowHeight(grid, 0)).toEqual({ value: 1000, unit: 'px' })
  })

  it('width 속성은 건드리지 않는다', () => {
    const grid = five()
    grid[1][0] = cell('c', { extraAttrs: ['width=100px'] })
    const { grid: next } = setRowHeight(grid, 1, 1, '40px')
    expect(next[1][0].extraAttrs).toEqual(['width=100px', 'height=40px'])
  })

  it('원래 격자를 바꾸지 않는다', () => {
    const grid = five()
    setRowHeight(grid, 0, 4, '40px')
    expect(heights(grid).flat().flat()).toEqual([])
  })
})
