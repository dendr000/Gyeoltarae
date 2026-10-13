import { describe, expect, it } from 'vitest'
import {
  canDuplicateColumns,
  canDuplicateRows,
  canFillDown,
  canFillRight,
  canMoveColumns,
  canMoveRows,
  columnsAreIndependent,
  duplicateColumns,
  duplicateRows,
  emptyCell,
  fillDown,
  fillRight,
  moveColumns,
  moveRows,
  rowsAreIndependent,
} from '../../src/lib/tableGrid.js'

// 표 편집기의 행·열 이동, 복제, 아래/오른쪽으로 채우기(엑셀의 Ctrl+D / Ctrl+R). 병합 셀이 있어도 병합이 깨지지 않아야 한다.
// 셀: { text, colspan, rowspan, mergedInto }. 병합의 대표 칸(왼쪽 위)은 colspan/rowspan 을 갖고, 가려진 칸은
// mergedInto: { r, c } 로 대표 칸을 가리킨다.

const cell = (text, extra = {}) => ({ ...emptyCell(), text, ...extra })
const covered = (r, c) => ({ ...emptyCell(), mergedInto: { r, c } })
const texts = (grid) => grid.map((row) => row.map((c) => c.text))
const colTexts = (grid, c = 0) => grid.map((row) => row[c].text)

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

describe('rowsAreIndependent / columnsAreIndependent - 병합이 줄을 가로지르지 않는가', () => {
  it('병합이 없으면 독립이다', () => {
    expect(rowsAreIndependent(plain(), 0, 2)).toBe(true)
    expect(columnsAreIndependent(plain(), 0, 2)).toBe(true)
  })

  it('가로 병합만 있으면 행은 독립이지만 그 열들은 독립이 아니다', () => {
    const g = [
      [cell('a', { colspan: 2 }), covered(0, 0), cell('c')],
      [cell('d'), cell('e'), cell('f')],
    ]
    expect(rowsAreIndependent(g, 0, 1)).toBe(true)
    expect(columnsAreIndependent(g, 0, 1)).toBe(false)
    expect(columnsAreIndependent(g, 1, 1)).toBe(false) // 가려진 칸의 대표 칸이 다른 열
    expect(columnsAreIndependent(g, 2, 2)).toBe(true)
  })

  it('세로 병합만 있으면 열은 독립이지만 그 행들은 독립이 아니다', () => {
    const g = [
      [cell('a', { rowspan: 2 }), cell('b')],
      [covered(0, 0), cell('c')],
      [cell('d'), cell('e')],
    ]
    expect(columnsAreIndependent(g, 0, 1)).toBe(true)
    expect(rowsAreIndependent(g, 0, 0)).toBe(false)
    expect(rowsAreIndependent(g, 1, 1)).toBe(false)
    expect(rowsAreIndependent(g, 2, 2)).toBe(true)
  })

  it('표 밖의 줄은 독립이 아니다', () => {
    expect(rowsAreIndependent(plain(), 0, 5)).toBe(false)
    expect(columnsAreIndependent(plain(), 0, 5)).toBe(false)
  })
})

describe('moveRows - 행 위/아래로 이동', () => {
  it('한 행을 위로: 바로 위 행과 자리를 바꾼다', () => {
    expect(texts(moveRows(plain(), 1, 1, -1))).toEqual([['d', 'e', 'f'], ['a', 'b', 'c'], ['g', 'h', 'i']])
  })

  it('한 행을 아래로', () => {
    expect(texts(moveRows(plain(), 1, 1, 1))).toEqual([['a', 'b', 'c'], ['g', 'h', 'i'], ['d', 'e', 'f']])
  })

  it('여러 행(블록)을 한 칸 아래로: 블록 아래 행이 블록 위로 올라온다', () => {
    const g = [[cell('a')], [cell('b')], [cell('c')], [cell('d')]]
    expect(colTexts(moveRows(g, 0, 1, 1))).toEqual(['c', 'a', 'b', 'd'])
    expect(colTexts(moveRows(g, 1, 2, -1))).toEqual(['b', 'c', 'a', 'd'])
  })

  it('맨 위에서 위로, 맨 아래에서 아래로는 움직일 수 없고 같은 격자를 돌려준다', () => {
    const g = plain()
    expect(canMoveRows(g, 0, 0, -1)).toBe(false)
    expect(moveRows(g, 0, 0, -1)).toBe(g)
    expect(canMoveRows(g, 2, 2, 1)).toBe(false)
    expect(moveRows(g, 2, 2, 1)).toBe(g)
  })

  it('minRow 보다 앞의 행(헤더)은 움직이지도, 넘어가지도 못한다', () => {
    const g = plain()
    expect(canMoveRows(g, 1, 1, -1, 1)).toBe(false) // 헤더(0) 위로 못 올라감
    expect(canMoveRows(g, 0, 0, 1, 1)).toBe(false) // 헤더 자체를 못 내림
    expect(canMoveRows(g, 2, 2, -1, 1)).toBe(true) // 헤더 아래끼리는 가능
    expect(texts(moveRows(g, 2, 2, -1, 1))).toEqual([['a', 'b', 'c'], ['g', 'h', 'i'], ['d', 'e', 'f']])
  })

  it('원래 격자를 바꾸지 않는다', () => {
    const g = plain()
    moveRows(g, 1, 1, -1)
    expect(texts(g)).toEqual([['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']])
  })

  it('행의 서식(색·굵기)이 글자를 따라간다', () => {
    const g = plain()
    g[1][0] = cell('d', { bg: '#ff0000', bold: true })
    const next = moveRows(g, 1, 1, -1)
    expect(next[0][0]).toMatchObject({ text: 'd', bg: '#ff0000', bold: true })
  })

  it('가로 병합이 있는 행도 옮길 수 있고 가려진 칸의 가리킴이 새 행을 향한다', () => {
    const g = [
      [cell('a'), cell('b')],
      [cell('X', { colspan: 2 }), covered(1, 0)],
    ]
    const next = moveRows(g, 1, 1, -1)
    expect(next[0][0].colspan).toBe(2)
    expect(next[0][1].mergedInto).toEqual({ r: 0, c: 0 })
    assertConsistent(next)
  })

  it('세로 병합이 걸린 행이 위치를 바꾸는 줄에 들어 있으면 움직일 수 없다', () => {
    const g = [
      [cell('a'), cell('b')],
      [cell('X', { rowspan: 2 }), cell('c')],
      [covered(1, 0), cell('d')],
      [cell('e'), cell('f')],
    ]
    expect(canMoveRows(g, 0, 0, 1)).toBe(false) // 옮길 줄 0 과 맞바꿀 줄 1 에 병합 대표 칸
    expect(canMoveRows(g, 3, 3, -1)).toBe(false) // 맞바꿀 줄 2 에 가려진 칸
    expect(canMoveRows(g, 1, 1, 1)).toBe(false)
  })

  it('병합이 위치를 바꾸는 줄 밖에 있으면 움직일 수 있고 병합은 그대로다', () => {
    const g = [
      [cell('a'), cell('b')],
      [cell('c'), cell('d')],
      [cell('X', { rowspan: 2 }), cell('e')],
      [covered(2, 0), cell('f')],
    ]
    const next = moveRows(g, 0, 0, 1)
    expect(colTexts(next, 1)).toEqual(['d', 'b', 'e', 'f'])
    expect(next[2][0].rowspan).toBe(2)
    assertConsistent(next)
  })

  it('이상한 범위·방향은 움직일 수 없다', () => {
    const g = plain()
    expect(canMoveRows(g, 2, 1, 1)).toBe(false)
    expect(canMoveRows(g, -1, 0, 1)).toBe(false)
    expect(canMoveRows(g, 0, 9, 1)).toBe(false)
    expect(canMoveRows(g, 0, 0, 0)).toBe(false)
    expect(canMoveRows(g, 0, 0, 2)).toBe(false)
  })
})

describe('moveColumns - 열 왼쪽/오른쪽으로 이동', () => {
  it('한 열을 왼쪽으로', () => {
    expect(texts(moveColumns(plain(), 1, 1, -1))).toEqual([['b', 'a', 'c'], ['e', 'd', 'f'], ['h', 'g', 'i']])
  })

  it('한 열을 오른쪽으로', () => {
    expect(texts(moveColumns(plain(), 1, 1, 1))).toEqual([['a', 'c', 'b'], ['d', 'f', 'e'], ['g', 'i', 'h']])
  })

  it('여러 열(블록)을 한 칸 오른쪽으로', () => {
    const g = [[cell('a'), cell('b'), cell('c'), cell('d')]]
    expect(texts(moveColumns(g, 0, 1, 1))).toEqual([['c', 'a', 'b', 'd']])
    expect(texts(moveColumns(g, 1, 2, -1))).toEqual([['b', 'c', 'a', 'd']])
  })

  it('맨 왼쪽에서 왼쪽으로, 맨 오른쪽에서 오른쪽으로는 움직일 수 없다', () => {
    const g = plain()
    expect(canMoveColumns(g, 0, 0, -1)).toBe(false)
    expect(moveColumns(g, 0, 0, -1)).toBe(g)
    expect(canMoveColumns(g, 2, 2, 1)).toBe(false)
  })

  it('원래 격자를 바꾸지 않는다', () => {
    const g = plain()
    moveColumns(g, 1, 1, 1)
    expect(texts(g)).toEqual([['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']])
  })

  it('세로 병합이 든 열도 옮길 수 있고 가려진 칸의 가리킴이 새 열을 향한다', () => {
    const g = [
      [cell('a'), cell('X', { rowspan: 2 })],
      [cell('b'), covered(0, 1)],
    ]
    const next = moveColumns(g, 1, 1, -1)
    expect(next[0][0].rowspan).toBe(2)
    expect(next[1][0].mergedInto).toEqual({ r: 0, c: 0 })
    assertConsistent(next)
  })

  it('가로 병합이 걸린 열이 위치를 바꾸는 줄에 들어 있으면 움직일 수 없다', () => {
    const g = [
      [cell('a'), cell('X', { colspan: 2 }), covered(0, 1)],
      [cell('b'), cell('c'), cell('d')],
    ]
    expect(canMoveColumns(g, 0, 0, 1)).toBe(false)
    expect(canMoveColumns(g, 2, 2, -1)).toBe(false)
  })

  it('병합이 위치를 바꾸는 열 밖에 있으면 움직일 수 있다', () => {
    const g = [
      [cell('a'), cell('b'), cell('X', { colspan: 2 }), covered(0, 2)],
      [cell('c'), cell('d'), cell('e'), cell('f')],
    ]
    const next = moveColumns(g, 0, 0, 1)
    expect(texts(next)[1]).toEqual(['d', 'c', 'e', 'f'])
    assertConsistent(next)
  })
})

describe('duplicateRows - 행 복제 (바로 아래에 같은 내용)', () => {
  it('한 행을 복제하면 그 아래에 같은 행이 생긴다', () => {
    expect(texts(duplicateRows(plain(), 1, 1))).toEqual([['a', 'b', 'c'], ['d', 'e', 'f'], ['d', 'e', 'f'], ['g', 'h', 'i']])
  })

  it('여러 행을 복제하면 블록 전체가 그 블록 아래에 생긴다', () => {
    const g = [[cell('a')], [cell('b')], [cell('c')]]
    expect(colTexts(duplicateRows(g, 0, 1))).toEqual(['a', 'b', 'a', 'b', 'c'])
  })

  it('서식(색·굵기·정렬)도 복제되고, 복제본은 원본과 다른 객체다', () => {
    const g = plain()
    g[0][0] = cell('a', { bg: '#00ff00', bold: true, align: 'right', extraAttrs: ['nopad'] })
    const next = duplicateRows(g, 0, 0)
    expect(next[1][0]).toMatchObject({ text: 'a', bg: '#00ff00', bold: true, align: 'right', extraAttrs: ['nopad'] })
    expect(next[1][0]).not.toBe(next[0][0])
    expect(next[1][0].extraAttrs).not.toBe(next[0][0].extraAttrs)
  })

  it('가로 병합이 있는 행을 복제하면 복제본도 같은 병합이고 가리킴이 복제본 행을 향한다', () => {
    const g = [
      [cell('X', { colspan: 2 }), covered(0, 0)],
      [cell('b'), cell('c')],
    ]
    const next = duplicateRows(g, 0, 0)
    expect(next[1][0].colspan).toBe(2)
    expect(next[1][1].mergedInto).toEqual({ r: 1, c: 0 })
    assertConsistent(next)
  })

  it('복제한 줄 아래에 있는 병합의 가리킴이 밀린다', () => {
    const g = [
      [cell('a'), cell('b')],
      [cell('X', { rowspan: 2 }), cell('c')],
      [covered(1, 0), cell('d')],
    ]
    const next = duplicateRows(g, 0, 0)
    expect(next[2][0].rowspan).toBe(2)
    expect(next[3][0].mergedInto).toEqual({ r: 2, c: 0 })
    assertConsistent(next)
  })

  it('세로 병합이 걸린 행은 복제할 수 없고 같은 격자를 돌려준다', () => {
    const g = [
      [cell('X', { rowspan: 2 }), cell('c')],
      [covered(0, 0), cell('d')],
    ]
    expect(canDuplicateRows(g, 0, 0)).toBe(false)
    expect(canDuplicateRows(g, 1, 1)).toBe(false)
    expect(duplicateRows(g, 0, 1)).toBe(g)
  })

  it('원래 격자를 바꾸지 않는다', () => {
    const g = plain()
    duplicateRows(g, 1, 1)
    expect(g.length).toBe(3)
  })

  it('이상한 범위는 복제할 수 없다', () => {
    expect(canDuplicateRows(plain(), 2, 1)).toBe(false)
    expect(canDuplicateRows(plain(), 0, 9)).toBe(false)
  })
})

describe('duplicateColumns - 열 복제 (바로 오른쪽에 같은 내용)', () => {
  it('한 열을 복제하면 그 오른쪽에 같은 열이 생긴다', () => {
    expect(texts(duplicateColumns(plain(), 1, 1))).toEqual([['a', 'b', 'b', 'c'], ['d', 'e', 'e', 'f'], ['g', 'h', 'h', 'i']])
  })

  it('여러 열을 복제하면 블록 전체가 그 블록 오른쪽에 생긴다', () => {
    const g = [[cell('a'), cell('b'), cell('c')]]
    expect(texts(duplicateColumns(g, 0, 1))).toEqual([['a', 'b', 'a', 'b', 'c']])
  })

  it('서식도 복제되고 복제본은 다른 객체다', () => {
    const g = plain()
    g[0][1] = cell('b', { color: '#123456', bold: true })
    const next = duplicateColumns(g, 1, 1)
    expect(next[0][2]).toMatchObject({ text: 'b', color: '#123456', bold: true })
    expect(next[0][2]).not.toBe(next[0][1])
  })

  it('세로 병합이 있는 열을 복제하면 복제본도 같은 병합이고 가리킴이 복제본 열을 향한다', () => {
    const g = [
      [cell('X', { rowspan: 2 }), cell('b')],
      [covered(0, 0), cell('c')],
    ]
    const next = duplicateColumns(g, 0, 0)
    expect(next[0][1].rowspan).toBe(2)
    expect(next[1][1].mergedInto).toEqual({ r: 0, c: 1 })
    assertConsistent(next)
  })

  it('복제한 열 오른쪽에 있는 병합의 가리킴이 밀린다', () => {
    const g = [
      [cell('a'), cell('X', { colspan: 2 }), covered(0, 1)],
      [cell('b'), cell('c'), cell('d')],
    ]
    const next = duplicateColumns(g, 0, 0)
    expect(next[0][2].colspan).toBe(2)
    expect(next[0][3].mergedInto).toEqual({ r: 0, c: 2 })
    assertConsistent(next)
  })

  it('가로 병합이 걸린 열은 복제할 수 없다', () => {
    const g = [
      [cell('X', { colspan: 2 }), covered(0, 0)],
      [cell('b'), cell('c')],
    ]
    expect(canDuplicateColumns(g, 0, 0)).toBe(false)
    expect(canDuplicateColumns(g, 1, 1)).toBe(false)
    expect(duplicateColumns(g, 0, 1)).toBe(g)
  })
})

describe('fillDown / fillRight - 아래로·오른쪽으로 채우기 (엑셀의 Ctrl+D / Ctrl+R)', () => {
  const styled = () => [
    [cell('위', { bg: '#ff0000', color: '#00ff00', bold: true, align: 'center' }), cell('1')],
    [cell('아래1'), cell('2')],
    [cell('아래2'), cell('3')],
  ]

  it('여러 행을 골랐으면 첫 행을 나머지 행에 복사한다', () => {
    const next = fillDown(styled(), { r1: 0, r2: 2, c1: 0, c2: 1 })
    expect(colTexts(next, 0)).toEqual(['위', '위', '위'])
    expect(colTexts(next, 1)).toEqual(['1', '1', '1'])
  })

  it('글자뿐 아니라 배경색·글자색·굵기·정렬도 복사한다', () => {
    const next = fillDown(styled(), { r1: 0, r2: 2, c1: 0, c2: 0 })
    expect(next[2][0]).toMatchObject({ text: '위', bg: '#ff0000', color: '#00ff00', bold: true, align: 'center' })
  })

  it('고른 열만 채우고 나머지 열은 그대로다', () => {
    const next = fillDown(styled(), { r1: 0, r2: 2, c1: 0, c2: 0 })
    expect(colTexts(next, 1)).toEqual(['1', '2', '3'])
  })

  it('한 행만 골랐으면 바로 위 행에서 복사한다', () => {
    const next = fillDown(styled(), { r1: 1, r2: 1, c1: 0, c2: 1 })
    expect(colTexts(next, 0)).toEqual(['위', '위', '아래2'])
    expect(colTexts(next, 1)).toEqual(['1', '1', '3'])
  })

  it('맨 윗줄 한 행만 골랐으면 복사할 윗줄이 없어 아무것도 안 한다', () => {
    const g = styled()
    expect(canFillDown(g, { r1: 0, r2: 0, c1: 0, c2: 1 })).toBe(false)
    expect(fillDown(g, { r1: 0, r2: 0, c1: 0, c2: 1 })).toBe(g)
  })

  it('대상 칸의 병합·추가 속성은 건드리지 않는다 (extraAttrs 유지)', () => {
    const g = styled()
    g[1][0] = cell('아래1', { extraAttrs: ['nopad'] })
    const next = fillDown(g, { r1: 0, r2: 1, c1: 0, c2: 0 })
    expect(next[1][0].extraAttrs).toEqual(['nopad'])
    expect(next[1][0].text).toBe('위')
  })

  it('병합된 칸이 들어 있으면 채우지 않는다', () => {
    const g = [
      [cell('a', { colspan: 2 }), covered(0, 0)],
      [cell('b'), cell('c')],
    ]
    expect(canFillDown(g, { r1: 0, r2: 1, c1: 0, c2: 1 })).toBe(false)
    expect(fillDown(g, { r1: 0, r2: 1, c1: 0, c2: 1 })).toBe(g)
    // 병합이 없는 열만 고르면 괜찮다
    const g2 = [
      [cell('a', { colspan: 2 }), covered(0, 0), cell('z')],
      [cell('b'), cell('c'), cell('y')],
    ]
    expect(canFillDown(g2, { r1: 0, r2: 1, c1: 2, c2: 2 })).toBe(true)
  })

  it('병합의 대표 칸이 고른 범위 밖에 있어도 범위 안의 가려진 칸이 있으면 채우지 않는다 (fillDown)', () => {
    const g = [
      [cell('X', { rowspan: 3 }), cell('a')],
      [covered(0, 0), cell('b')],
      [covered(0, 0), cell('c')],
      [cell('d'), cell('e')],
    ]
    // 2~3행의 0열: 2행은 위쪽 병합에 가려진 칸, 대표 칸(0행)은 범위 밖
    expect(canFillDown(g, { r1: 2, r2: 3, c1: 0, c2: 0 })).toBe(false)
    expect(fillDown(g, { r1: 2, r2: 3, c1: 0, c2: 0 })).toBe(g)
    // 1열은 병합과 무관하므로 채울 수 있다
    expect(canFillDown(g, { r1: 2, r2: 3, c1: 1, c2: 1 })).toBe(true)
  })

  it('병합의 대표 칸이 고른 범위 밖에 있어도 범위 안의 가려진 칸이 있으면 채우지 않는다 (fillRight)', () => {
    const g = [
      [cell('X', { colspan: 3 }), covered(0, 0), covered(0, 0)],
      [cell('a'), cell('b'), cell('c')],
    ]
    expect(canFillRight(g, { r1: 0, r2: 0, c1: 1, c2: 2 })).toBe(false)
    expect(canFillRight(g, { r1: 1, r2: 1, c1: 1, c2: 2 })).toBe(true)
  })

  it('mergedInto 가 null 이 아니라 아예 없는(undefined) 칸도 병합 없는 칸으로 본다', () => {
    const g = [
      [{ text: '가', colspan: 1, rowspan: 1 }, { text: '나', colspan: 1, rowspan: 1 }],
      [{ text: '', colspan: 1, rowspan: 1 }, { text: '', colspan: 1, rowspan: 1 }],
    ]
    expect(canFillDown(g, { r1: 0, r2: 1, c1: 0, c2: 1 })).toBe(true)
    expect(texts(fillDown(g, { r1: 0, r2: 1, c1: 0, c2: 1 }))).toEqual([['가', '나'], ['가', '나']])
  })

  it('원래 격자를 바꾸지 않는다', () => {
    const g = styled()
    fillDown(g, { r1: 0, r2: 2, c1: 0, c2: 1 })
    expect(colTexts(g, 0)).toEqual(['위', '아래1', '아래2'])
  })

  it('여러 열을 골랐으면 첫 열을 나머지 열에 복사한다 (fillRight)', () => {
    const g = [[cell('가', { bold: true }), cell('나'), cell('다')]]
    const next = fillRight(g, { r1: 0, r2: 0, c1: 0, c2: 2 })
    expect(texts(next)).toEqual([['가', '가', '가']])
    expect(next[0][2].bold).toBe(true)
  })

  it('fillRight: 한 열만 골랐으면 바로 왼쪽 열에서 복사한다', () => {
    const g = [
      [cell('가'), cell('나'), cell('다')],
      [cell('라'), cell('마'), cell('바')],
    ]
    const next = fillRight(g, { r1: 0, r2: 1, c1: 1, c2: 1 })
    expect(texts(next)).toEqual([['가', '가', '다'], ['라', '라', '바']])
  })

  it('fillRight: 맨 왼쪽 열 하나만 골랐으면 아무것도 안 한다', () => {
    const g = plain()
    expect(canFillRight(g, { r1: 0, r2: 2, c1: 0, c2: 0 })).toBe(false)
    expect(fillRight(g, { r1: 0, r2: 2, c1: 0, c2: 0 })).toBe(g)
  })

  it('fillRight: 병합이 든 칸이 있으면 채우지 않는다', () => {
    const g = [
      [cell('a'), cell('X', { rowspan: 2 })],
      [cell('b'), covered(0, 1)],
    ]
    expect(canFillRight(g, { r1: 0, r2: 1, c1: 0, c2: 1 })).toBe(false)
  })
})
