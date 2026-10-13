import { describe, expect, it } from 'vitest'
import { emptyCell } from '../../src/lib/tableGrid.js'
import { transposeGrid } from '../../src/lib/tableTranspose.js'

// 표 편집기의 행·열 바꾸기(전치): 가로와 세로를 뒤집는다. 병합은 가로↔세로가 서로 바뀌고, 행·열 방향 속성(rowbgcolor↔colbgcolor, width↔height)도 맞바뀐다.

const cell = (text, extra = {}) => ({ ...emptyCell(), text, ...extra })
const covered = (r, c) => ({ ...emptyCell(), mergedInto: { r, c } })
const g = (rows) => rows.map((row) => row.map((v) => (typeof v === 'string' ? cell(v) : v)))
const texts = (grid) => grid.map((row) => row.map((c) => c.text))

// 모든 병합이 앞뒤가 맞는지: 가려진 칸은 자기를 덮는 대표 칸을 가리키고, 대표 칸의 영역은 정확히 그 칸들로 채워져 있다.
function assertConsistent(grid) {
  const cols = grid[0].length
  for (const row of grid) expect(row.length).toBe(cols)
  for (let r = 0; r < grid.length; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = grid[r][c]
      if (x.mergedInto) {
        const o = grid[x.mergedInto.r]?.[x.mergedInto.c]
        expect(o, `(${r},${c}) 의 대표 칸이 없다`).toBeTruthy()
        expect(o.mergedInto).toBeNull()
        expect(r >= x.mergedInto.r && r < x.mergedInto.r + o.rowspan).toBe(true)
        expect(c >= x.mergedInto.c && c < x.mergedInto.c + o.colspan).toBe(true)
      } else {
        for (let dr = 0; dr < x.rowspan; dr += 1) {
          for (let dc = 0; dc < x.colspan; dc += 1) {
            if (dr === 0 && dc === 0) continue
            expect(grid[r + dr]?.[c + dc]?.mergedInto).toEqual({ r, c })
          }
        }
      }
    }
  }
}

describe('transposeGrid', () => {
  it('2x3 표가 3x2 표가 된다 (칸 (r,c) 가 (c,r) 로)', () => {
    const grid = g([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ])
    expect(texts(transposeGrid(grid))).toEqual([
      ['a', 'd'],
      ['b', 'e'],
      ['c', 'f'],
    ])
  })

  it('두 번 하면 원래대로 돌아온다', () => {
    const grid = g([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ])
    expect(texts(transposeGrid(transposeGrid(grid)))).toEqual(texts(grid))
  })

  it('정사각 표와 한 칸 표', () => {
    expect(texts(transposeGrid(g([['a', 'b'], ['c', 'd']])))).toEqual([['a', 'c'], ['b', 'd']])
    expect(texts(transposeGrid(g([['x']])))).toEqual([['x']])
  })

  it('한 줄 표(1행)는 한 열 표가 된다', () => {
    expect(texts(transposeGrid(g([['a', 'b', 'c']])))).toEqual([['a'], ['b'], ['c']])
  })

  it('빈 격자는 빈 격자', () => {
    expect(transposeGrid([])).toEqual([])
  })

  it('칸의 서식(색·굵기·정렬)이 칸을 따라간다', () => {
    const grid = g([[cell('a', { bg: '#f00', bold: true, align: 'center', color: '#0f0' }), 'b']])
    expect(transposeGrid(grid)[0][0]).toMatchObject({ text: 'a', bg: '#f00', bold: true, align: 'center', color: '#0f0' })
  })

  it('가로 병합은 세로 병합이 된다', () => {
    const grid = [
      [cell('X', { colspan: 2 }), covered(0, 0)],
      [cell('a'), cell('b')],
    ]
    const next = transposeGrid(grid)
    expect(next[0][0]).toMatchObject({ text: 'X', rowspan: 2, colspan: 1 })
    expect(next[1][0].mergedInto).toEqual({ r: 0, c: 0 })
    assertConsistent(next)
  })

  it('세로 병합은 가로 병합이 된다', () => {
    const grid = [
      [cell('Y', { rowspan: 3 }), cell('p')],
      [covered(0, 0), cell('q')],
      [covered(0, 0), cell('r')],
    ]
    const next = transposeGrid(grid)
    expect(next[0][0]).toMatchObject({ text: 'Y', colspan: 3, rowspan: 1 })
    expect(next[0][1].mergedInto).toEqual({ r: 0, c: 0 })
    expect(next[0][2].mergedInto).toEqual({ r: 0, c: 0 })
    assertConsistent(next)
  })

  it('2x2 병합과 다른 병합이 섞인 표도 앞뒤가 맞는다', () => {
    const grid = [
      [cell('A', { rowspan: 2, colspan: 2 }), covered(0, 0), cell('x')],
      [covered(0, 0), covered(0, 0), cell('y')],
      [cell('p'), cell('q', { colspan: 2 }), covered(2, 1)],
    ]
    const next = transposeGrid(grid)
    assertConsistent(next)
    expect(next[0][0]).toMatchObject({ text: 'A', rowspan: 2, colspan: 2 })
    expect(next[1][2]).toMatchObject({ text: 'q', rowspan: 2, colspan: 1 })
    expect(texts(transposeGrid(next))).toEqual(texts(grid))
  })

  it('행·열 방향 속성이 맞바뀐다 (rowbgcolor↔colbgcolor, rowcolor↔colcolor, width↔height)', () => {
    const grid = g([[cell('a', { extraAttrs: ['rowbgcolor=#fff', 'colcolor=#111', 'width=50px', 'nopad', 'tablewidth=300'] })]])
    expect(transposeGrid(grid)[0][0].extraAttrs).toEqual(['colbgcolor=#fff', 'rowcolor=#111', 'height=50px', 'nopad', 'tablewidth=300'])
  })

  it('표 전체 속성(table...)은 그대로 둔다', () => {
    const grid = g([[cell('a', { extraAttrs: ['tablebgcolor=#eee', 'tablewidth=100%', 'table align=center'] })]])
    expect(transposeGrid(grid)[0][0].extraAttrs).toEqual(['tablebgcolor=#eee', 'tablewidth=100%', 'table align=center'])
  })

  it('새 칸은 서로 다른 객체이고 원래 격자를 바꾸지 않는다', () => {
    const grid = g([['a', 'b']])
    const next = transposeGrid(grid)
    expect(next[0][0]).not.toBe(grid[0][0])
    expect(next[0][0].extraAttrs).not.toBe(grid[0][0].extraAttrs)
    expect(grid.length).toBe(1)
    expect(grid[0].length).toBe(2)
  })
})
