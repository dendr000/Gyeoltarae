import { describe, expect, it } from 'vitest'
import { emptyCell, expandToMerges, insertColumn, insertRow, visibleCellAt } from '../../src/lib/tableGrid.js'

// 표 편집기의 행·열 중간 삽입. 병합 셀을 지나가는 자리에 끼워 넣어도 병합이 깨지지 않아야 한다.
// 셀: { text, colspan, rowspan, mergedInto }. 병합의 대표 칸(왼쪽 위)은 colspan/rowspan 을 갖고, 가려진 칸은
// mergedInto: { r, c } 로 대표 칸을 가리킨다.

const cell = (text, extra = {}) => ({ ...emptyCell(), text, ...extra })
const covered = (r, c) => ({ ...emptyCell(), mergedInto: { r, c } })
const texts = (grid) => grid.map((row) => row.map((c) => c.text))

// 모든 병합이 앞뒤가 맞는지: 가려진 칸은 자기를 덮는 대표 칸을 가리키고, 대표 칸의 영역은 정확히 그 칸들로 채워져 있다.
function assertConsistent(grid) {
  const cols = grid[0].length
  for (const row of grid) expect(row.length).toBe(cols)
  for (let r = 0; r < grid.length; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const g = grid[r][c]
      if (g.mergedInto) {
        const o = grid[g.mergedInto.r]?.[g.mergedInto.c]
        expect(o, `(${r},${c}) 의 대표 칸이 없다`).toBeTruthy()
        expect(o.mergedInto, `(${r},${c}) 의 대표 칸이 또 다른 칸에 가려져 있다`).toBeNull()
        expect(r >= g.mergedInto.r && r < g.mergedInto.r + o.rowspan).toBe(true)
        expect(c >= g.mergedInto.c && c < g.mergedInto.c + o.colspan).toBe(true)
      } else {
        for (let dr = 0; dr < g.rowspan; dr += 1) {
          for (let dc = 0; dc < g.colspan; dc += 1) {
            if (dr === 0 && dc === 0) continue
            const inner = grid[r + dr]?.[c + dc]
            expect(inner?.mergedInto, `(${r},${c}) 병합 영역 안 (${r + dr},${c + dc}) 이 가리키지 않는다`).toEqual({ r, c })
          }
        }
      }
    }
  }
}

const plain = () => [
  [cell('a'), cell('b'), cell('c')],
  [cell('d'), cell('e'), cell('f')],
  [cell('g'), cell('h'), cell('i')],
]

describe('insertRow - 병합이 없는 표', () => {
  it('맨 위·중간·맨 아래에 빈 행을 끼운다', () => {
    expect(texts(insertRow(plain(), 0))).toEqual([['', '', ''], ['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']])
    expect(texts(insertRow(plain(), 1))).toEqual([['a', 'b', 'c'], ['', '', ''], ['d', 'e', 'f'], ['g', 'h', 'i']])
    expect(texts(insertRow(plain(), 3))).toEqual([['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i'], ['', '', '']])
  })

  it('범위를 벗어난 위치는 맨 위·맨 아래로 맞춘다', () => {
    expect(insertRow(plain(), -5)[0].map((c) => c.text)).toEqual(['', '', ''])
    expect(insertRow(plain(), 99)[3].map((c) => c.text)).toEqual(['', '', ''])
  })

  it('원래 표를 바꾸지 않는다', () => {
    const g = plain()
    insertRow(g, 1)
    expect(g.length).toBe(3)
    expect(texts(g)).toEqual([['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']])
  })

  it('새 칸은 서로 다른 객체다 (한 칸을 고쳐도 다른 칸이 따라 바뀌지 않게)', () => {
    const row = insertRow(plain(), 1)[1]
    expect(row[0]).not.toBe(row[1])
    expect(row[0].extraAttrs).not.toBe(row[1].extraAttrs)
  })

  it('다른 칸의 글자·색·굵기는 그대로 남는다', () => {
    const g = plain()
    g[1][1] = cell('e', { bg: '#ff0000', color: '#00ff00', bold: true, align: 'center', extraAttrs: ['nopad'] })
    const next = insertRow(g, 1)
    expect(next[2][1]).toEqual(g[1][1])
  })

  it('새 행은 병합이 없는 일반 칸이다', () => {
    for (const c of insertRow(plain(), 1)[1]) {
      expect(c).toEqual(emptyCell())
    }
  })
})

describe('insertRow - 병합 셀이 있는 표', () => {
  // 0: [A(세로 2) , b]
  // 1: [ (가려짐) , c]
  // 2: [d        , e]
  const rowspanGrid = () => [
    [cell('A', { rowspan: 2 }), cell('b')],
    [covered(0, 0), cell('c')],
    [cell('d'), cell('e')],
  ]

  it('세로 병합의 한가운데에 끼우면 병합이 한 칸 늘어난다', () => {
    const next = insertRow(rowspanGrid(), 1)
    expect(next[0][0].rowspan).toBe(3)
    expect(next[1][0].mergedInto).toEqual({ r: 0, c: 0 })
    expect(next[1][1].mergedInto).toBeNull() // 병합 밖의 칸은 일반 빈 칸
    expect(next[1][1].text).toBe('')
    expect(texts(next)[2]).toEqual(['', 'c'])
    assertConsistent(next)
  })

  it('병합의 맨 위(대표 칸 바로 위)에 끼우면 병합은 그대로 아래로 밀린다', () => {
    const next = insertRow(rowspanGrid(), 0)
    expect(next[1][0].rowspan).toBe(2)
    expect(next[0][0].mergedInto).toBeNull()
    expect(next[2][0].mergedInto).toEqual({ r: 1, c: 0 }) // 가려진 칸이 가리키는 대표 칸의 위치도 한 칸 내려감
    assertConsistent(next)
  })

  it('병합의 바로 아래에 끼우면 병합은 그대로다', () => {
    const next = insertRow(rowspanGrid(), 2)
    expect(next[0][0].rowspan).toBe(2)
    expect(next[2].every((c) => c.mergedInto === null)).toBe(true)
    assertConsistent(next)
  })

  it('가로 병합만 있는 행 사이에 끼워도 영향이 없다', () => {
    const g = [
      [cell('A', { colspan: 2 }), covered(0, 0)],
      [cell('b'), cell('c')],
    ]
    const next = insertRow(g, 1)
    expect(next[0][0].colspan).toBe(2)
    expect(next[1].every((c) => c.mergedInto === null)).toBe(true)
    assertConsistent(next)
  })

  it('2x2 병합 한가운데에 끼우면 두 열이 모두 병합에 포함된다', () => {
    const g = [
      [cell('A', { rowspan: 2, colspan: 2 }), covered(0, 0), cell('x')],
      [covered(0, 0), covered(0, 0), cell('y')],
      [cell('p'), cell('q'), cell('z')],
    ]
    const next = insertRow(g, 1)
    expect(next[0][0].rowspan).toBe(3)
    expect(next[1][0].mergedInto).toEqual({ r: 0, c: 0 })
    expect(next[1][1].mergedInto).toEqual({ r: 0, c: 0 })
    expect(next[1][2].mergedInto).toBeNull()
    assertConsistent(next)
  })

  it('끼운 자리 아래에 있는 병합의 가리킴이 모두 한 칸씩 내려간다', () => {
    const g = [
      [cell('a'), cell('b')],
      [cell('X', { rowspan: 2 }), cell('c')],
      [covered(1, 0), cell('d')],
    ]
    const next = insertRow(g, 1)
    expect(next[2][0].rowspan).toBe(2)
    expect(next[3][0].mergedInto).toEqual({ r: 2, c: 0 })
    assertConsistent(next)
  })

  it('같은 자리에 두 번 끼워도 병합이 유지된다', () => {
    const once = insertRow(rowspanGrid(), 1)
    const twice = insertRow(once, 1)
    expect(twice[0][0].rowspan).toBe(4)
    assertConsistent(twice)
  })

  it('원래 병합 표를 바꾸지 않는다', () => {
    const g = rowspanGrid()
    insertRow(g, 1)
    expect(g[0][0].rowspan).toBe(2)
    expect(g.length).toBe(3)
  })
})

describe('insertColumn - 병합이 없는 표', () => {
  it('맨 왼쪽·중간·맨 오른쪽에 빈 열을 끼운다', () => {
    expect(texts(insertColumn(plain(), 0))).toEqual([['', 'a', 'b', 'c'], ['', 'd', 'e', 'f'], ['', 'g', 'h', 'i']])
    expect(texts(insertColumn(plain(), 2))).toEqual([['a', 'b', '', 'c'], ['d', 'e', '', 'f'], ['g', 'h', '', 'i']])
    expect(texts(insertColumn(plain(), 3))).toEqual([['a', 'b', 'c', ''], ['d', 'e', 'f', ''], ['g', 'h', 'i', '']])
  })

  it('범위를 벗어난 위치는 맨 왼쪽·맨 오른쪽으로 맞춘다', () => {
    expect(insertColumn(plain(), -3)[0].map((c) => c.text)).toEqual(['', 'a', 'b', 'c'])
    expect(insertColumn(plain(), 77)[0].map((c) => c.text)).toEqual(['a', 'b', 'c', ''])
  })

  it('원래 표를 바꾸지 않고, 새 칸은 서로 다른 객체다', () => {
    const g = plain()
    const next = insertColumn(g, 1)
    expect(g[0].length).toBe(3)
    expect(next[0][1]).not.toBe(next[1][1])
    expect(next[0][1]).toEqual(emptyCell())
  })
})

describe('insertColumn - 병합 셀이 있는 표', () => {
  // 0: [A(가로 2), 가려짐, b]
  // 1: [c        , d     , e]
  const colspanGrid = () => [
    [cell('A', { colspan: 2 }), covered(0, 0), cell('b')],
    [cell('c'), cell('d'), cell('e')],
  ]

  it('가로 병합의 한가운데에 끼우면 병합이 한 칸 늘어난다', () => {
    const next = insertColumn(colspanGrid(), 1)
    expect(next[0][0].colspan).toBe(3)
    expect(next[0][1].mergedInto).toEqual({ r: 0, c: 0 })
    expect(next[1][1].mergedInto).toBeNull()
    assertConsistent(next)
  })

  it('병합의 왼쪽 가장자리에 끼우면 병합은 오른쪽으로 밀릴 뿐이다', () => {
    const next = insertColumn(colspanGrid(), 0)
    expect(next[0][1].colspan).toBe(2)
    expect(next[0][2].mergedInto).toEqual({ r: 0, c: 1 })
    assertConsistent(next)
  })

  it('병합의 오른쪽 바로 옆에 끼우면 병합은 그대로다', () => {
    const next = insertColumn(colspanGrid(), 2)
    expect(next[0][0].colspan).toBe(2)
    assertConsistent(next)
  })

  it('세로 병합이 있는 열 사이에 끼워도 영향이 없다', () => {
    const g = [
      [cell('A', { rowspan: 2 }), cell('b')],
      [covered(0, 0), cell('c')],
    ]
    const next = insertColumn(g, 1)
    expect(next[0][0].rowspan).toBe(2)
    expect(next[0][1].mergedInto).toBeNull()
    assertConsistent(next)
  })

  it('2x2 병합 한가운데에 끼우면 두 행이 모두 병합에 포함된다', () => {
    const g = [
      [cell('A', { rowspan: 2, colspan: 2 }), covered(0, 0), cell('x')],
      [covered(0, 0), covered(0, 0), cell('y')],
    ]
    const next = insertColumn(g, 1)
    expect(next[0][0].colspan).toBe(3)
    expect(next[0][1].mergedInto).toEqual({ r: 0, c: 0 })
    expect(next[1][1].mergedInto).toEqual({ r: 0, c: 0 })
    assertConsistent(next)
  })

  it('끼운 자리 오른쪽에 있는 병합의 가리킴이 모두 한 칸씩 밀린다', () => {
    const g = [
      [cell('a'), cell('X', { colspan: 2 }), covered(0, 1)],
      [cell('b'), cell('c'), cell('d')],
    ]
    const next = insertColumn(g, 1)
    expect(next[0][2].colspan).toBe(2)
    expect(next[0][3].mergedInto).toEqual({ r: 0, c: 2 })
    assertConsistent(next)
  })

  it('행과 열을 번갈아 끼워도 병합이 유지된다', () => {
    let g = [
      [cell('A', { rowspan: 2, colspan: 2 }), covered(0, 0), cell('x')],
      [covered(0, 0), covered(0, 0), cell('y')],
      [cell('p'), cell('q'), cell('z')],
    ]
    g = insertRow(g, 1)
    g = insertColumn(g, 1)
    g = insertRow(g, 3)
    g = insertColumn(g, 0)
    assertConsistent(g)
    // 대표 칸은 맨 왼쪽 열을 끼우며 (0,1) 로 밀렸고, 한가운데에 끼운 행·열로 3x3 이 됐다.
    // 병합 바로 아래(행 3)에 끼운 행은 병합을 늘리지 않는다.
    expect(g[0][1].rowspan).toBe(3)
    expect(g[0][1].colspan).toBe(3)
  })
})

describe('visibleCellAt - 다른 칸에 가려진 자리는 대표 칸으로', () => {
  const g = [
    [cell('A', { rowspan: 2 }), cell('b')],
    [covered(0, 0), cell('c')],
  ]

  it('가려지지 않은 칸은 그 자리를 그대로', () => {
    expect(visibleCellAt(g, 1, 1)).toEqual({ r: 1, c: 1 })
    expect(visibleCellAt(g, 0, 0)).toEqual({ r: 0, c: 0 })
  })

  it('가려진 칸은 대표 칸의 자리를', () => {
    expect(visibleCellAt(g, 1, 0)).toEqual({ r: 0, c: 0 })
  })

  it('표 밖의 자리는 가장 가까운 칸으로 맞춘다', () => {
    expect(visibleCellAt(g, 9, 9)).toEqual({ r: 1, c: 1 })
    expect(visibleCellAt(g, -1, -1)).toEqual({ r: 0, c: 0 })
  })
})

describe('emptyCell', () => {
  it('부를 때마다 새 객체와 새 배열을 준다', () => {
    const a = emptyCell()
    const b = emptyCell()
    expect(a).not.toBe(b)
    expect(a.extraAttrs).not.toBe(b.extraAttrs)
    expect(a).toEqual({ text: '', bg: '', color: '', align: '', bold: false, colspan: 1, rowspan: 1, mergedInto: null, extraAttrs: [] })
  })
})

describe('expandToMerges - 고른 범위를 걸친 병합 영역까지 넓힌다', () => {
  // 0: [A(2x2), 가려짐, x]
  // 1: [가려짐 , 가려짐, y]
  // 2: [p      , q    , z]
  const g = () => [
    [cell('A', { rowspan: 2, colspan: 2 }), covered(0, 0), cell('x')],
    [covered(0, 0), covered(0, 0), cell('y')],
    [cell('p'), cell('q'), cell('z')],
  ]

  it('병합이 없는 범위는 그대로', () => {
    expect(expandToMerges(g(), { r1: 2, r2: 2, c1: 0, c2: 2 })).toEqual({ r1: 2, r2: 2, c1: 0, c2: 2 })
    expect(expandToMerges(g(), { r1: 0, r2: 1, c1: 2, c2: 2 })).toEqual({ r1: 0, r2: 1, c1: 2, c2: 2 })
  })

  it('대표 칸만 골라도 병합 전체로 넓어진다', () => {
    expect(expandToMerges(g(), { r1: 0, r2: 0, c1: 0, c2: 0 })).toEqual({ r1: 0, r2: 1, c1: 0, c2: 1 })
  })

  it('가려진 칸만 골라도 대표 칸까지 포함해 병합 전체로 넓어진다', () => {
    expect(expandToMerges(g(), { r1: 1, r2: 1, c1: 1, c2: 1 })).toEqual({ r1: 0, r2: 1, c1: 0, c2: 1 })
  })

  it('병합의 일부와 바깥 칸을 함께 골라도 병합 전체가 들어온다', () => {
    expect(expandToMerges(g(), { r1: 1, r2: 2, c1: 1, c2: 2 })).toEqual({ r1: 0, r2: 2, c1: 0, c2: 2 })
  })

  it('넓어진 범위가 또 다른 병합에 걸치면 연쇄로 넓어진다', () => {
    const chain = [
      [cell('A', { colspan: 2 }), covered(0, 0), cell('x')],
      [cell('b'), cell('B', { colspan: 2, rowspan: 1 }), covered(1, 1)],
    ]
    // (0,0)~(0,1) 을 고르면 A 만 들어오고, (0,1)~(1,1) 을 고르면 A 와 B 가 모두 들어온다
    expect(expandToMerges(chain, { r1: 0, r2: 0, c1: 0, c2: 0 })).toEqual({ r1: 0, r2: 0, c1: 0, c2: 1 })
    expect(expandToMerges(chain, { r1: 0, r2: 1, c1: 1, c2: 1 })).toEqual({ r1: 0, r2: 1, c1: 0, c2: 2 })
  })

  it('원래 범위 객체를 바꾸지 않는다', () => {
    const range = { r1: 0, r2: 0, c1: 0, c2: 0 }
    expandToMerges(g(), range)
    expect(range).toEqual({ r1: 0, r2: 0, c1: 0, c2: 0 })
  })
})
