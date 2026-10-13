import { describe, expect, it } from 'vitest'
import { emptyCell, regionHasMerge } from '../../src/lib/tableGrid.js'
import { adjacentDataCount, autoFill, canAutoFill, dragFillTarget, extendedRange } from '../../src/lib/tableAutoFill.js'

// 표 편집기 자동 채우기(채우기 핸들 끌기)를 격자에 적용하는 규칙. 이어 붙이는 글자 자체의 규칙은 fillSeries.test.js 에 있다.

const cell = (text, extra = {}) => ({ ...emptyCell(), text, ...extra })
const covered = (r, c) => ({ ...emptyCell(), mergedInto: { r, c } })
const g = (rows) => rows.map((row) => row.map((v) => (typeof v === 'string' ? cell(v) : v)))
const texts = (grid) => grid.map((row) => row.map((c) => c.text))
const colTexts = (grid, c = 0) => grid.map((row) => row[c].text)

describe('regionHasMerge', () => {
  it('병합이 없으면 false, 대표 칸이나 가려진 칸이 하나라도 있으면 true', () => {
    const grid = g([
      ['a', 'b'],
      ['c', 'd'],
    ])
    expect(regionHasMerge(grid, 0, 1, 0, 1)).toBe(false)
    grid[0][0] = cell('a', { colspan: 2 })
    grid[0][1] = covered(0, 0)
    expect(regionHasMerge(grid, 0, 1, 0, 1)).toBe(true)
    expect(regionHasMerge(grid, 1, 1, 0, 1)).toBe(false)
    expect(regionHasMerge(grid, 0, 0, 1, 1)).toBe(true)
  })

  it('표 밖이면 true (칸이 없으므로 막는 쪽)', () => {
    expect(regionHasMerge(g([['a']]), 0, 3, 0, 0)).toBe(true)
  })
})

describe('dragFillTarget - 끌어서 어느 쪽으로 몇 칸', () => {
  const range = { r1: 1, r2: 2, c1: 1, c2: 2 }
  const size = { rows: 10, cols: 10 }

  it('범위 아래로 끌면 아래로, 그 칸 수만큼', () => {
    expect(dragFillTarget(range, { r: 5, c: 2 }, size)).toEqual({ direction: 'down', count: 3 })
    expect(dragFillTarget(range, { r: 3, c: 1 }, size)).toEqual({ direction: 'down', count: 1 })
  })

  it('범위 오른쪽으로 끌면 오른쪽으로', () => {
    expect(dragFillTarget(range, { r: 1, c: 6 }, size)).toEqual({ direction: 'right', count: 4 })
  })

  it('대각선으로 끌면 더 멀리 간 쪽, 같으면 아래', () => {
    expect(dragFillTarget(range, { r: 6, c: 4 }, size)).toEqual({ direction: 'down', count: 4 })
    expect(dragFillTarget(range, { r: 3, c: 7 }, size)).toEqual({ direction: 'right', count: 5 })
    expect(dragFillTarget(range, { r: 4, c: 4 }, size)).toEqual({ direction: 'down', count: 2 })
  })

  it('범위 안으로 끌면 아무것도 안 한다', () => {
    expect(dragFillTarget(range, { r: 2, c: 2 }, size)).toBeNull()
    expect(dragFillTarget(range, { r: 1, c: 1 }, size)).toBeNull()
  })

  it('범위 위로 끌면 위로, 왼쪽으로 끌면 왼쪽으로 (거꾸로 채우기)', () => {
    const wide = { r1: 5, r2: 6, c1: 5, c2: 6 }
    expect(dragFillTarget(wide, { r: 2, c: 5 }, size)).toEqual({ direction: 'up', count: 3 })
    expect(dragFillTarget(wide, { r: 5, c: 1 }, size)).toEqual({ direction: 'left', count: 4 })
  })

  it('네 방향이 겹치면 가장 멀리 간 쪽, 같으면 아래 → 오른쪽 → 위 → 왼쪽 순', () => {
    const mid = { r1: 5, r2: 5, c1: 5, c2: 5 }
    expect(dragFillTarget(mid, { r: 1, c: 4 }, size)).toEqual({ direction: 'up', count: 4 })
    expect(dragFillTarget(mid, { r: 4, c: 1 }, size)).toEqual({ direction: 'left', count: 4 })
    expect(dragFillTarget(mid, { r: 3, c: 3 }, size)).toEqual({ direction: 'up', count: 2 }) // 위·왼쪽 같으면 위
    expect(dragFillTarget(mid, { r: 7, c: 7 }, size)).toEqual({ direction: 'down', count: 2 }) // 아래·오른쪽 같으면 아래
  })

  it('표 끝을 넘지 않게 칸 수를 줄인다', () => {
    expect(dragFillTarget(range, { r: 50, c: 2 }, { rows: 5, cols: 10 })).toEqual({ direction: 'down', count: 2 })
    expect(dragFillTarget(range, { r: 1, c: 50 }, { rows: 10, cols: 4 })).toEqual({ direction: 'right', count: 1 })
  })

  it('이미 표의 끝이면 null', () => {
    expect(dragFillTarget({ r1: 0, r2: 4, c1: 0, c2: 0 }, { r: 9, c: 0 }, { rows: 5, cols: 3 })).toBeNull()
    expect(dragFillTarget({ r1: 0, r2: 0, c1: 0, c2: 0 }, { r: 0, c: 0 }, size)).toBeNull() // 위·왼쪽 끝은 끌 곳이 없다
  })

  it('위·왼쪽으로는 표 가장자리까지만', () => {
    expect(dragFillTarget({ r1: 2, r2: 2, c1: 2, c2: 2 }, { r: -9, c: 2 }, size)).toEqual({ direction: 'up', count: 2 })
    expect(dragFillTarget({ r1: 2, r2: 2, c1: 1, c2: 1 }, { r: 2, c: -9 }, size)).toEqual({ direction: 'left', count: 1 })
  })
})

describe('autoFill - 아래로', () => {
  it('씨앗 두 칸의 규칙으로 아래 칸을 채운다 (1, 2 → 3, 4, 5)', () => {
    const grid = g([['1'], ['2'], [''], [''], ['']])
    const next = autoFill(grid, { r1: 0, r2: 1, c1: 0, c2: 0 }, 'down', 3)
    expect(colTexts(next)).toEqual(['1', '2', '3', '4', '5'])
  })

  it('씨앗이 한 칸이면 숫자는 복사, 글자 속 숫자는 이어 간다', () => {
    const grid = g([['7', '항목1'], ['', ''], ['', '']])
    const next = autoFill(grid, { r1: 0, r2: 0, c1: 0, c2: 1 }, 'down', 2)
    expect(colTexts(next, 0)).toEqual(['7', '7', '7'])
    expect(colTexts(next, 1)).toEqual(['항목1', '항목2', '항목3'])
  })

  it('Ctrl(invert)을 누르면 반대로 한다', () => {
    const grid = g([['7', '항목1'], ['', ''], ['', '']])
    const next = autoFill(grid, { r1: 0, r2: 0, c1: 0, c2: 1 }, 'down', 2, { invert: true })
    expect(colTexts(next, 0)).toEqual(['7', '8', '9'])
    expect(colTexts(next, 1)).toEqual(['항목1', '항목1', '항목1'])
  })

  it('고른 열마다 따로 규칙을 읽는다 (날짜와 요일)', () => {
    const grid = g([['2024-01-30', '금'], ['', ''], ['', ''], ['', '']])
    const next = autoFill(grid, { r1: 0, r2: 0, c1: 0, c2: 1 }, 'down', 3)
    expect(colTexts(next, 0)).toEqual(['2024-01-30', '2024-01-31', '2024-02-01', '2024-02-02'])
    expect(colTexts(next, 1)).toEqual(['금', '토', '일', '월'])
  })

  it('고른 열 밖의 칸은 그대로 둔다', () => {
    const grid = g([['1', 'x'], ['2', 'y'], ['', 'z']])
    const next = autoFill(grid, { r1: 0, r2: 1, c1: 0, c2: 0 }, 'down', 1)
    expect(colTexts(next, 1)).toEqual(['x', 'y', 'z'])
  })

  it('서식(배경색·글자색·굵기·정렬)은 씨앗 칸의 것을 순서대로 반복해서 복사한다', () => {
    const grid = g([
      [cell('a', { bg: '#ff0000', bold: true })],
      [cell('b', { bg: '#0000ff', align: 'center' })],
      [''],
      [''],
      [''],
    ])
    const next = autoFill(grid, { r1: 0, r2: 1, c1: 0, c2: 0 }, 'down', 3)
    expect(next[2][0]).toMatchObject({ text: 'a', bg: '#ff0000', bold: true })
    expect(next[3][0]).toMatchObject({ text: 'b', bg: '#0000ff', align: 'center' })
    expect(next[4][0]).toMatchObject({ text: 'a', bg: '#ff0000', bold: true })
  })

  it('대상 칸의 추가 속성(extraAttrs)은 유지한다', () => {
    const grid = g([['1'], ['2'], [cell('', { extraAttrs: ['nopad'] })]])
    const next = autoFill(grid, { r1: 0, r2: 1, c1: 0, c2: 0 }, 'down', 1)
    expect(next[2][0].extraAttrs).toEqual(['nopad'])
    expect(next[2][0].text).toBe('3')
  })

  it('원래 격자를 바꾸지 않는다', () => {
    const grid = g([['1'], ['2'], ['']])
    autoFill(grid, { r1: 0, r2: 1, c1: 0, c2: 0 }, 'down', 1)
    expect(colTexts(grid)).toEqual(['1', '2', ''])
  })
})

describe('autoFill - 오른쪽으로', () => {
  it('고른 행마다 따로 오른쪽으로 이어 간다', () => {
    const grid = g([
      ['1', '2', '', ''],
      ['월', '', '', ''],
    ])
    const next = autoFill(grid, { r1: 0, r2: 0, c1: 0, c2: 1 }, 'right', 2)
    expect(texts(next)[0]).toEqual(['1', '2', '3', '4'])
    const second = autoFill(grid, { r1: 1, r2: 1, c1: 0, c2: 0 }, 'right', 3)
    expect(texts(second)[1]).toEqual(['월', '화', '수', '목'])
  })

  it('여러 행을 골랐으면 행마다 독립이다', () => {
    const grid = g([
      ['1', '2', '', ''],
      ['10', '20', '', ''],
    ])
    const next = autoFill(grid, { r1: 0, r2: 1, c1: 0, c2: 1 }, 'right', 2)
    expect(texts(next)).toEqual([
      ['1', '2', '3', '4'],
      ['10', '20', '30', '40'],
    ])
  })
})

describe('autoFill - 위로·왼쪽으로 (거꾸로)', () => {
  it('위로: 씨앗 3, 4 → 위로 2, 1, 0 (가까운 칸부터)', () => {
    const grid = g([[''], [''], [''], ['3'], ['4']])
    const next = autoFill(grid, { r1: 3, r2: 4, c1: 0, c2: 0 }, 'up', 3)
    expect(colTexts(next)).toEqual(['0', '1', '2', '3', '4'])
  })

  it('위로: 요일·날짜도 거꾸로 이어 간다', () => {
    const rows = g([[''], [''], ['화']])
    expect(colTexts(autoFill(rows, { r1: 2, r2: 2, c1: 0, c2: 0 }, 'up', 2))).toEqual(['일', '월', '화'])
    const dates = g([[''], ['2024-03-01']])
    expect(colTexts(autoFill(dates, { r1: 1, r2: 1, c1: 0, c2: 0 }, 'up', 1))).toEqual(['2024-02-29', '2024-03-01'])
  })

  it('위로: 반복 씨앗은 이어 붙는 쪽부터 반복한다 (a, b 위로 → 위에서부터 b, a, b)', () => {
    const grid = g([[''], [''], [''], ['a'], ['b']])
    expect(colTexts(autoFill(grid, { r1: 3, r2: 4, c1: 0, c2: 0 }, 'up', 3))).toEqual(['b', 'a', 'b', 'a', 'b'])
  })

  it('왼쪽으로: 행마다 거꾸로 이어 간다', () => {
    const grid = g([['', '', '10', '20']])
    expect(texts(autoFill(grid, { r1: 0, r2: 0, c1: 2, c2: 3 }, 'left', 2))).toEqual([['-10', '0', '10', '20']])
  })

  it('위로: 서식은 이어 붙는 쪽 씨앗부터 반복해서 복사한다', () => {
    const grid = g([[''], [''], [cell('a', { bg: '#ff0000' })], [cell('b', { bg: '#0000ff' })]])
    const next = autoFill(grid, { r1: 2, r2: 3, c1: 0, c2: 0 }, 'up', 2)
    expect(next[1][0].bg).toBe('#0000ff') // 바로 위 칸은 이어 붙는 순서의 첫 씨앗(b)
    expect(next[0][0].bg).toBe('#ff0000')
  })

  it('canAutoFill: 표 위·왼쪽 밖으로 나가면 하지 않는다, 병합이 있으면 하지 않는다', () => {
    const grid = g([[''], ['1'], ['2']])
    expect(canAutoFill(grid, { r1: 1, r2: 2, c1: 0, c2: 0 }, 'up', 1)).toBe(true)
    expect(canAutoFill(grid, { r1: 1, r2: 2, c1: 0, c2: 0 }, 'up', 2)).toBe(false)
    expect(canAutoFill(grid, { r1: 1, r2: 2, c1: 0, c2: 0 }, 'left', 1)).toBe(false)
    const merged = g([[cell('x', { rowspan: 2 })], [covered(0, 0)], ['1']])
    expect(canAutoFill(merged, { r1: 2, r2: 2, c1: 0, c2: 0 }, 'up', 1)).toBe(false)
    expect(autoFill(grid, { r1: 1, r2: 2, c1: 0, c2: 0 }, 'up', 2)).toBe(grid)
  })
})

describe('adjacentDataCount - 핸들 더블클릭으로 채울 칸 수', () => {
  it('왼쪽 열의 데이터가 이어진 만큼', () => {
    const grid = g([
      ['가', '1'],
      ['나', ''],
      ['다', ''],
      ['', ''],
    ])
    expect(adjacentDataCount(grid, { r1: 0, r2: 0, c1: 1, c2: 1 })).toBe(2)
  })

  it('왼쪽에 데이터가 없으면 오른쪽 열을 본다', () => {
    const grid = g([
      ['1', '가'],
      ['', '나'],
      ['', ''],
    ])
    expect(adjacentDataCount(grid, { r1: 0, r2: 0, c1: 0, c2: 0 })).toBe(1)
  })

  it('옆 열의 씨앗 줄이 비어 있으면 그 열은 기준이 아니다 (0)', () => {
    const grid = g([
      ['', '1'],
      ['나', ''],
    ])
    expect(adjacentDataCount(grid, { r1: 0, r2: 0, c1: 1, c2: 1 })).toBe(0)
  })

  it('옆 열 데이터 중간의 빈 칸에서 멈춘다', () => {
    const grid = g([['a', '1'], ['b', ''], ['', ''], ['d', '']])
    expect(adjacentDataCount(grid, { r1: 0, r2: 0, c1: 1, c2: 1 })).toBe(1)
  })

  it('공백만 있는 칸은 빈 칸이다, 표 끝에서 멈춘다, 옆 열이 없으면 0', () => {
    const grid = g([['a', '1'], ['  ', ''], ['c', '']])
    expect(adjacentDataCount(grid, { r1: 0, r2: 0, c1: 1, c2: 1 })).toBe(0)
    expect(adjacentDataCount(g([['1']]), { r1: 0, r2: 0, c1: 0, c2: 0 })).toBe(0)
    const tail = g([['x', '1'], ['y', ''], ['z', '']])
    expect(adjacentDataCount(tail, { r1: 0, r2: 0, c1: 1, c2: 1 })).toBe(2)
  })

  it('여러 행을 골랐으면 고른 범위 아래부터 센다', () => {
    const grid = g([['a', '1'], ['b', '2'], ['c', ''], ['d', ''], ['', '']])
    expect(adjacentDataCount(grid, { r1: 0, r2: 1, c1: 1, c2: 1 })).toBe(2)
  })
})

describe('canAutoFill - 할 수 없는 경우', () => {
  it('병합이 씨앗이나 채울 자리에 있으면 하지 않고 같은 격자를 돌려준다', () => {
    const grid = g([['1'], ['2'], [''], [cell('x', { rowspan: 2 })], [covered(3, 0)]])
    const range = { r1: 0, r2: 1, c1: 0, c2: 0 }
    expect(canAutoFill(grid, range, 'down', 2)).toBe(false) // 채울 자리(3행)가 병합의 대표 칸
    expect(autoFill(grid, range, 'down', 2)).toBe(grid)
    // 병합에 닿기 전까지만이면 된다
    expect(canAutoFill(grid, range, 'down', 1)).toBe(true)
    // 씨앗 쪽에 병합이 있어도 안 된다
    const seedMerged = g([[cell('1', { colspan: 2 }), covered(0, 0)], ['2', '3'], ['', '']])
    expect(canAutoFill(seedMerged, { r1: 0, r2: 1, c1: 0, c2: 1 }, 'down', 1)).toBe(false)
  })

  it('표 밖으로 나가면 하지 않는다', () => {
    const grid = g([['1'], ['2'], ['']])
    expect(canAutoFill(grid, { r1: 0, r2: 1, c1: 0, c2: 0 }, 'down', 2)).toBe(false)
    expect(canAutoFill(grid, { r1: 0, r2: 1, c1: 0, c2: 0 }, 'right', 1)).toBe(false)
  })

  it('칸 수가 1 미만이거나 방향이 이상하면 하지 않는다', () => {
    const grid = g([['1', '2'], ['3', '4']])
    expect(canAutoFill(grid, { r1: 0, r2: 0, c1: 0, c2: 0 }, 'down', 0)).toBe(false)
    expect(canAutoFill(grid, { r1: 0, r2: 0, c1: 0, c2: 0 }, 'up', 1)).toBe(false)
  })
})

describe('extendedRange - 채운 뒤의 고른 범위', () => {
  it('아래·오른쪽으로 늘어난 범위', () => {
    const range = { r1: 1, r2: 2, c1: 0, c2: 1 }
    expect(extendedRange(range, 'down', 3)).toEqual({ r1: 1, r2: 5, c1: 0, c2: 1 })
    expect(extendedRange(range, 'right', 2)).toEqual({ r1: 1, r2: 2, c1: 0, c2: 3 })
  })

  it('위·왼쪽으로 늘어난 범위', () => {
    const range = { r1: 4, r2: 5, c1: 3, c2: 4 }
    expect(extendedRange(range, 'up', 2)).toEqual({ r1: 2, r2: 5, c1: 3, c2: 4 })
    expect(extendedRange(range, 'left', 3)).toEqual({ r1: 4, r2: 5, c1: 0, c2: 4 })
  })
})
