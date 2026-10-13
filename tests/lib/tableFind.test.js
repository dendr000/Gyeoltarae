import { describe, expect, it } from 'vitest'
import { emptyCell } from '../../src/lib/tableGrid.js'
import { findInGrid, matchIndexAtOrAfter, replaceAllInGrid, replaceMatchInGrid } from '../../src/lib/tableFind.js'

// 표 편집기의 찾아 바꾸기. 문서 편집기의 찾기(Ctrl+F)와 같은 규칙: 대소문자 구분 없음, 일반 글자 매치(정규식 아님).

const cell = (text, extra = {}) => ({ ...emptyCell(), text, ...extra })
const covered = (r, c, text = '') => ({ ...emptyCell(), text, mergedInto: { r, c } })
const g = (rows) => rows.map((row) => row.map((v) => (typeof v === 'string' ? cell(v) : v)))
const texts = (grid) => grid.map((row) => row.map((c) => c.text))

describe('findInGrid', () => {
  it('칸을 위→아래, 왼쪽→오른쪽 순서로 훑어 위치를 돌려준다', () => {
    const grid = g([
      ['사과 맛', '배'],
      ['귤', '사과'],
    ])
    expect(findInGrid(grid, '사과')).toEqual([
      { r: 0, c: 0, start: 0, end: 2 },
      { r: 1, c: 1, start: 0, end: 2 },
    ])
  })

  it('한 칸 안의 여러 번 나온 것을 모두 찾는다', () => {
    const grid = g([['ab ab ab']])
    expect(findInGrid(grid, 'ab').map((m) => m.start)).toEqual([0, 3, 6])
  })

  it('겹치는 것은 앞에서부터 겹치지 않게 센다 (aaa 에서 aa 는 한 번)', () => {
    expect(findInGrid(g([['aaa']]), 'aa')).toEqual([{ r: 0, c: 0, start: 0, end: 2 }])
    expect(findInGrid(g([['aaaa']]), 'aa').length).toBe(2)
  })

  it('대소문자를 구분하지 않는다', () => {
    expect(findInGrid(g([['Apple APPLE apple']]), 'apple').length).toBe(3)
  })

  it('정규식 특수문자는 그냥 글자다', () => {
    const grid = g([['a.b', 'a+b', '(x)', '[br]', 'a*']])
    expect(findInGrid(grid, 'a.b').length).toBe(1)
    expect(findInGrid(grid, '.').length).toBe(1)
    expect(findInGrid(grid, '+').length).toBe(1)
    expect(findInGrid(grid, '(x)').length).toBe(1)
    expect(findInGrid(grid, '[br]').length).toBe(1)
    expect(findInGrid(grid, '*').length).toBe(1)
  })

  it('빈 찾을 글자는 아무것도 찾지 않는다', () => {
    expect(findInGrid(g([['a']]), '')).toEqual([])
  })

  it('찾는 글자가 없으면 빈 배열', () => {
    expect(findInGrid(g([['a', 'b']]), 'z')).toEqual([])
  })

  it('병합에 가려진 칸은 건너뛴다 (남아 있는 글자가 있어도)', () => {
    const grid = [[cell('사과', { colspan: 2 }), covered(0, 0, '사과 숨김')]]
    expect(findInGrid(grid, '사과')).toEqual([{ r: 0, c: 0, start: 0, end: 2 }])
  })

  it('범위(scope)를 주면 그 안의 칸만 찾는다', () => {
    const grid = g([
      ['x', 'x', 'x'],
      ['x', 'x', 'x'],
      ['x', 'x', 'x'],
    ])
    const found = findInGrid(grid, 'x', { r1: 1, r2: 2, c1: 1, c2: 2 })
    expect(found.map((m) => [m.r, m.c])).toEqual([
      [1, 1],
      [1, 2],
      [2, 1],
      [2, 2],
    ])
  })

  it('범위가 null 이면 표 전체', () => {
    expect(findInGrid(g([['x', 'x']]), 'x', null).length).toBe(2)
  })

  it('글자가 아닌 칸(undefined)이 섞여도 죽지 않는다', () => {
    const grid = [[{ ...emptyCell(), text: undefined }, cell('x')]]
    expect(findInGrid(grid, 'x').length).toBe(1)
  })
})

describe('replaceMatchInGrid - 한 곳만 바꾸기', () => {
  it('그 위치의 글자만 바꾼다', () => {
    const grid = g([['ab ab']])
    const next = replaceMatchInGrid(grid, { r: 0, c: 0, start: 3, end: 5 }, 'XYZ')
    expect(texts(next)).toEqual([['ab XYZ']])
  })

  it('원래 격자를 바꾸지 않고, 다른 칸은 그대로(같은 객체)다', () => {
    const grid = g([['a', 'b']])
    const next = replaceMatchInGrid(grid, { r: 0, c: 0, start: 0, end: 1 }, 'Q')
    expect(grid[0][0].text).toBe('a')
    expect(next[0][1]).toBe(grid[0][1])
  })

  it('빈 글자로 바꾸면 지워진다', () => {
    const next = replaceMatchInGrid(g([['abc']]), { r: 0, c: 0, start: 1, end: 2 }, '')
    expect(texts(next)).toEqual([['ac']])
  })

  it('칸의 서식은 그대로다', () => {
    const grid = [[cell('abc', { bg: '#ff0000', bold: true })]]
    const next = replaceMatchInGrid(grid, { r: 0, c: 0, start: 0, end: 1 }, 'Z')
    expect(next[0][0]).toMatchObject({ text: 'Zbc', bg: '#ff0000', bold: true })
  })
})

describe('replaceAllInGrid - 모두 바꾸기', () => {
  it('모든 칸의 모든 곳을 바꾸고 바꾼 횟수를 알려 준다', () => {
    const grid = g([
      ['사과 사과', '배'],
      ['사과', '귤'],
    ])
    const { grid: next, count } = replaceAllInGrid(grid, '사과', '딸기')
    expect(count).toBe(3)
    expect(texts(next)).toEqual([['딸기 딸기', '배'], ['딸기', '귤']])
  })

  it('대소문자 구분 없이 바꾼다', () => {
    const { grid: next, count } = replaceAllInGrid(g([['Apple apple APPLE']]), 'apple', 'X')
    expect(count).toBe(3)
    expect(texts(next)).toEqual([['X X X']])
  })

  it('바꿀 글자 안의 $ 같은 기호는 그대로 들어간다', () => {
    const { grid: next } = replaceAllInGrid(g([['a']]), 'a', '$& $1 $$')
    expect(texts(next)).toEqual([['$& $1 $$']])
  })

  it('찾을 글자를 포함한 글자로 바꿔도 한 번씩만 바뀐다', () => {
    const { grid: next, count } = replaceAllInGrid(g([['a a']]), 'a', 'aa')
    expect(count).toBe(2)
    expect(texts(next)).toEqual([['aa aa']])
  })

  it('빈 글자로 바꾸면 모두 지운다', () => {
    const { grid: next, count } = replaceAllInGrid(g([['a-b-c']]), '-', '')
    expect(count).toBe(2)
    expect(texts(next)).toEqual([['abc']])
  })

  it('찾는 글자가 없으면 같은 격자를 그대로 돌려주고 횟수 0', () => {
    const grid = g([['a']])
    const result = replaceAllInGrid(grid, 'z', 'y')
    expect(result.count).toBe(0)
    expect(result.grid).toBe(grid)
  })

  it('빈 찾을 글자는 아무것도 하지 않는다', () => {
    const grid = g([['a']])
    expect(replaceAllInGrid(grid, '', 'y')).toEqual({ grid, count: 0 })
  })

  it('범위를 주면 그 안만 바꾼다', () => {
    const grid = g([
      ['x', 'x'],
      ['x', 'x'],
    ])
    const { grid: next, count } = replaceAllInGrid(grid, 'x', 'y', { r1: 1, r2: 1, c1: 0, c2: 1 })
    expect(count).toBe(2)
    expect(texts(next)).toEqual([['x', 'x'], ['y', 'y']])
  })

  it('병합에 가려진 칸은 바꾸지 않는다', () => {
    const grid = [[cell('x', { colspan: 2 }), covered(0, 0, 'x')]]
    const { grid: next, count } = replaceAllInGrid(grid, 'x', 'y')
    expect(count).toBe(1)
    expect(next[0][0].text).toBe('y')
    expect(next[0][1].text).toBe('x')
  })

  it('원래 격자를 바꾸지 않는다', () => {
    const grid = g([['a']])
    replaceAllInGrid(grid, 'a', 'b')
    expect(grid[0][0].text).toBe('a')
  })

  it('바꾸지 않은 칸은 같은 객체로 남는다', () => {
    const grid = g([['a', 'b']])
    const { grid: next } = replaceAllInGrid(grid, 'a', 'z')
    expect(next[0][1]).toBe(grid[0][1])
  })
})

describe('matchIndexAtOrAfter - 바꾼 뒤 다음으로 갈 매치', () => {
  const matches = [
    { r: 0, c: 0, start: 0, end: 1 },
    { r: 0, c: 0, start: 5, end: 6 },
    { r: 1, c: 2, start: 0, end: 1 },
  ]

  it('주어진 칸·위치 바로 뒤(또는 그 자리)의 첫 매치', () => {
    expect(matchIndexAtOrAfter(matches, 0, 0, 0)).toBe(0)
    expect(matchIndexAtOrAfter(matches, 0, 0, 1)).toBe(1)
    expect(matchIndexAtOrAfter(matches, 0, 0, 6)).toBe(2)
    expect(matchIndexAtOrAfter(matches, 1, 0, 0)).toBe(2)
  })

  it('전부 앞에 있으면 처음으로 돌아간다', () => {
    expect(matchIndexAtOrAfter(matches, 5, 0, 0)).toBe(0)
  })

  it('매치가 없으면 -1', () => {
    expect(matchIndexAtOrAfter([], 0, 0, 0)).toBe(-1)
  })
})
