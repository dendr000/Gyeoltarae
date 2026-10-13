import { describe, expect, it } from 'vitest'
import { emptyCell } from '../../src/lib/tableGrid.js'
import { clearStripes, getColumnWidth, normalizeWidth, setColumnWidth, stripeRows } from '../../src/lib/tableStyle.js'

// 표 편집기의 줄무늬 행(번갈아 배경색)과 열 너비. 둘 다 칸의 서식(bg, extraAttrs 의 width=...)으로 문서에 남는다.

const cell = (text, extra = {}) => ({ ...emptyCell(), text, ...extra })
const covered = (r, c) => ({ ...emptyCell(), mergedInto: { r, c } })
const g = (rows) => rows.map((row) => row.map((v) => (typeof v === 'string' ? cell(v) : v)))
const bgs = (grid) => grid.map((row) => row.map((c) => c.bg))
const widths = (grid) => grid.map((row) => row.map((c) => c.extraAttrs.filter((t) => t.startsWith('width='))))

const five = () => g([['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']])
const ALL = { r1: 0, r2: 4, c1: 0, c2: 1 }

describe('stripeRows - 줄무늬 행', () => {
  it('첫 줄부터 한 줄 걸러 배경색을 입힌다', () => {
    const next = stripeRows(five(), ALL, '#eeeeee', { startWith: 'first' })
    expect(bgs(next)).toEqual([['#eeeeee', '#eeeeee'], ['', ''], ['#eeeeee', '#eeeeee'], ['', ''], ['#eeeeee', '#eeeeee']])
  })

  it('둘째 줄부터', () => {
    const next = stripeRows(five(), ALL, '#eeeeee', { startWith: 'second' })
    expect(bgs(next)).toEqual([['', ''], ['#eeeeee', '#eeeeee'], ['', ''], ['#eeeeee', '#eeeeee'], ['', '']])
  })

  it('줄 순서는 범위의 첫 행부터 센다 (헤더를 뺀 범위)', () => {
    const next = stripeRows(five(), { r1: 1, r2: 4, c1: 0, c2: 1 }, '#ddd', { startWith: 'first' })
    expect(bgs(next)).toEqual([['', ''], ['#ddd', '#ddd'], ['', ''], ['#ddd', '#ddd'], ['', '']])
  })

  it('범위의 열만 칠한다', () => {
    const next = stripeRows(five(), { r1: 0, r2: 4, c1: 1, c2: 1 }, '#ddd')
    expect(bgs(next)[0]).toEqual(['', '#ddd'])
  })

  it('이미 있던 다른 칸의 서식과 글자는 건드리지 않는다', () => {
    const grid = five()
    grid[1][0] = cell('c', { bg: '#ff0000', bold: true })
    const next = stripeRows(grid, ALL, '#ddd')
    expect(next[1][0]).toBe(grid[1][0]) // 칠하지 않는 줄은 같은 칸
    expect(next[0][0]).toMatchObject({ text: 'a', bg: '#ddd' })
  })

  it('칠하는 줄의 기존 배경색은 덮어쓴다', () => {
    const grid = five()
    grid[0][0] = cell('a', { bg: '#ff0000', bold: true })
    const next = stripeRows(grid, ALL, '#ddd')
    expect(next[0][0]).toMatchObject({ bg: '#ddd', bold: true })
  })

  it('병합에 가려진 칸은 칠하지 않는다', () => {
    const grid = [[cell('a', { colspan: 2 }), covered(0, 0)], [cell('b'), cell('c')]]
    const next = stripeRows(grid, { r1: 0, r2: 1, c1: 0, c2: 1 }, '#ddd')
    expect(next[0][0].bg).toBe('#ddd')
    expect(next[0][1].bg).toBe('')
  })

  it('원래 격자를 바꾸지 않는다', () => {
    const grid = five()
    stripeRows(grid, ALL, '#ddd')
    expect(bgs(grid).flat().every((bg) => bg === '')).toBe(true)
  })

  it('칠할 칸이 없으면 같은 격자를 돌려준다', () => {
    const grid = five()
    expect(stripeRows(grid, { r1: 3, r2: 2, c1: 0, c2: 1 }, '#ddd')).toBe(grid)
  })
})

describe('clearStripes - 줄무늬 해제', () => {
  it('범위 안에서 그 색의 배경만 지운다 (다른 색은 남김, 대소문자 무시)', () => {
    let grid = stripeRows(five(), ALL, '#EEEEEE', { startWith: 'first' })
    grid[1][0] = cell('c', { bg: '#ff0000' })
    const next = clearStripes(grid, ALL, '#eeeeee')
    expect(bgs(next)).toEqual([['', ''], ['#ff0000', ''], ['', ''], ['', ''], ['', '']])
  })

  it('범위 밖은 그대로', () => {
    const grid = stripeRows(five(), ALL, '#ddd')
    const next = clearStripes(grid, { r1: 0, r2: 1, c1: 0, c2: 1 }, '#ddd')
    expect(bgs(next)[2]).toEqual(['#ddd', '#ddd'])
    expect(bgs(next)[0]).toEqual(['', ''])
  })

  it('지울 것이 없으면 같은 격자', () => {
    const grid = five()
    expect(clearStripes(grid, ALL, '#ddd')).toBe(grid)
  })
})

describe('normalizeWidth', () => {
  it('정수와 단위를 한 글자로', () => {
    expect(normalizeWidth('120', 'px')).toBe('120px')
    expect(normalizeWidth(' 30 ', '%')).toBe('30%')
    expect(normalizeWidth('99.6', 'px')).toBe('100px') // 소수는 반올림
  })

  it('범위를 벗어나거나 숫자가 아니면 null (px 1~9999, % 1~100)', () => {
    for (const [value, unit] of [['', 'px'], ['abc', 'px'], ['0', 'px'], ['-5', 'px'], ['10000', 'px'], ['101', '%'], ['5', 'em']]) {
      expect(normalizeWidth(value, unit)).toBeNull()
    }
    expect(normalizeWidth('9999', 'px')).toBe('9999px')
    expect(normalizeWidth('100', '%')).toBe('100%')
  })
})

describe('getColumnWidth / setColumnWidth - 열 너비', () => {
  it('설정하면 그 열의 맨 위 칸에 width= 토큰이 붙는다', () => {
    const { grid, changed } = setColumnWidth(five(), 1, 1, '120px')
    expect(changed).toBe(1)
    expect(widths(grid)[0]).toEqual([[], ['width=120px']])
    expect(widths(grid).slice(1).flat().flat()).toEqual([])
  })

  it('여러 열에 한꺼번에', () => {
    const { grid, changed } = setColumnWidth(five(), 0, 1, '30%')
    expect(changed).toBe(2)
    expect(widths(grid)[0]).toEqual([['width=30%'], ['width=30%']])
  })

  it('다시 설정하면 값을 바꾸고, 같은 열의 다른 칸에 있던 width 는 지운다 (한 곳에만 둠)', () => {
    const grid = five()
    grid[3][1] = cell('h', { extraAttrs: ['width=50px', 'nopad'] })
    const { grid: next } = setColumnWidth(grid, 1, 1, '200px')
    expect(widths(next)[0][1]).toEqual(['width=200px'])
    expect(next[3][1].extraAttrs).toEqual(['nopad']) // 다른 속성은 유지
  })

  it('지우기(null): 그 열의 모든 width 를 지운다', () => {
    const grid = setColumnWidth(five(), 1, 1, '80px').grid
    const { grid: next, changed } = setColumnWidth(grid, 1, 1, null)
    expect(changed).toBe(1)
    expect(widths(next).flat().flat()).toEqual([])
  })

  it('이미 같은 상태면 changed 0 이고 같은 격자', () => {
    const grid = setColumnWidth(five(), 1, 1, '80px').grid
    const same = setColumnWidth(grid, 1, 1, '80px')
    expect(same.changed).toBe(0)
    expect(same.grid).toBe(grid)
    const none = setColumnWidth(five(), 0, 0, null)
    expect(none.changed).toBe(0)
  })

  it('맨 위 칸이 병합에 걸려 있으면 그 아래의 첫 병합 안 된 칸에 붙인다', () => {
    const grid = [
      [cell('X', { colspan: 2 }), covered(0, 0)],
      [cell('a'), cell('b')],
    ]
    const { grid: next } = setColumnWidth(grid, 1, 1, '60px')
    expect(next[0][1].extraAttrs).toEqual([])
    expect(next[1][1].extraAttrs).toEqual(['width=60px'])
  })

  it('붙일 수 있는 칸이 하나도 없는 열은 건너뛴다', () => {
    const grid = [[cell('X', { colspan: 2 }), covered(0, 0)]]
    const result = setColumnWidth(grid, 0, 1, '60px')
    expect(result.changed).toBe(0)
    expect(result.grid).toBe(grid)
  })

  it('getColumnWidth: 읽어서 { value, unit } 로 돌려준다 (단위 없는 값은 px)', () => {
    const grid = five()
    expect(getColumnWidth(grid, 0)).toBeNull()
    grid[2][0] = cell('e', { extraAttrs: ['width=45'] })
    expect(getColumnWidth(grid, 0)).toEqual({ value: 45, unit: 'px' })
    grid[0][1] = cell('b', { extraAttrs: ['width=30%'] })
    expect(getColumnWidth(grid, 1)).toEqual({ value: 30, unit: '%' })
  })

  it('원래 격자를 바꾸지 않는다', () => {
    const grid = five()
    setColumnWidth(grid, 0, 1, '100px')
    expect(widths(grid).flat().flat()).toEqual([])
  })
})
