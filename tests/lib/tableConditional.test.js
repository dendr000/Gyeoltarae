import { describe, expect, it } from 'vitest'
import { emptyCell } from '../../src/lib/tableGrid.js'
import { applyRuleStyle, clearRuleStyle, isRuleReady, matchRule } from '../../src/lib/tableConditional.js'

// 표 편집기 조건부 색: "0보다 작으면 빨강" 같은 규칙에 맞는 칸을 찾아 배경색·글자색·굵게를 한꺼번에 입힌다. 입힌 색은 칸의 서식으로 문서에 남는다
// (값이 바뀌어도 자동으로 다시 칠해지지는 않는다). 규칙: { kind, a, b } — a, b 는 입력칸의 글자.

const cell = (text, extra = {}) => ({ ...emptyCell(), text, ...extra })
const g = (rows) => rows.map((row) => row.map((v) => (typeof v === 'string' ? cell(v) : v)))
const keys = (cells) => cells.map(({ r, c }) => `${r}:${c}`)

// 한 열짜리 표
const col = (...values) => g(values.map((v) => [v]))
const match = (grid, rule, scope = null, options) => keys(matchRule(grid, rule, scope, options))

describe('숫자 비교', () => {
  const grid = col('-5', '0', '10', '100', '서울', '')

  it('보다 큼 / 크거나 같음', () => {
    expect(match(grid, { kind: 'gt', a: '10' })).toEqual(['3:0'])
    expect(match(grid, { kind: 'gte', a: '10' })).toEqual(['2:0', '3:0'])
  })

  it('보다 작음 / 작거나 같음', () => {
    expect(match(grid, { kind: 'lt', a: '0' })).toEqual(['0:0'])
    expect(match(grid, { kind: 'lte', a: '0' })).toEqual(['0:0', '1:0'])
  })

  it('같음 / 같지 않음 (숫자 칸끼리만, 글자·빈 칸은 해당 없음)', () => {
    expect(match(grid, { kind: 'eq', a: '10' })).toEqual(['2:0'])
    expect(match(grid, { kind: 'neq', a: '10' })).toEqual(['0:0', '1:0', '3:0'])
  })

  it('사이 (양 끝 포함, 순서가 뒤바뀌어도 된다)', () => {
    expect(match(grid, { kind: 'between', a: '0', b: '10' })).toEqual(['1:0', '2:0'])
    expect(match(grid, { kind: 'between', a: '10', b: '0' })).toEqual(['1:0', '2:0'])
  })

  it('쉼표·단위가 붙은 숫자도 크기로 비교한다', () => {
    const money = col('1,500원', '900원', '₩2,000')
    expect(match(money, { kind: 'gte', a: '1,000' })).toEqual(['0:0', '2:0'])
  })

  it('기준 값이 숫자가 아니면 아무것도 맞지 않는다', () => {
    expect(match(grid, { kind: 'gt', a: 'abc' })).toEqual([])
    expect(match(grid, { kind: 'between', a: '1', b: '' })).toEqual([])
  })

  it('소수·음수 기준', () => {
    expect(match(col('0.5', '-0.5', '1'), { kind: 'gt', a: '-0.5' })).toEqual(['0:0', '2:0'])
  })
})

describe('글자·빈 칸', () => {
  const grid = col('Apple', '사과 주스', '배', '', '  ', '10')

  it('글자 포함 (대소문자 구분 없음)', () => {
    expect(match(grid, { kind: 'contains', a: 'apple' })).toEqual(['0:0'])
    expect(match(grid, { kind: 'contains', a: '사과' })).toEqual(['1:0'])
    expect(match(grid, { kind: 'contains', a: '1' })).toEqual(['5:0'])
  })

  it('찾을 글자가 비어 있으면 아무것도 맞지 않는다', () => {
    expect(match(grid, { kind: 'contains', a: '' })).toEqual([])
  })

  it('비어 있음 / 비어 있지 않음 (공백만 있는 칸도 빈 칸)', () => {
    expect(match(grid, { kind: 'empty' })).toEqual(['3:0', '4:0'])
    expect(match(grid, { kind: 'notEmpty' })).toEqual(['0:0', '1:0', '2:0', '5:0'])
  })
})

describe('최댓값·최솟값·중복', () => {
  it('최댓값, 최솟값 (같은 값이 여럿이면 모두)', () => {
    const grid = col('3', '9', '1', '9', '글자', '1')
    expect(match(grid, { kind: 'max' })).toEqual(['1:0', '3:0'])
    expect(match(grid, { kind: 'min' })).toEqual(['2:0', '5:0'])
  })

  it('숫자 칸이 없으면 최댓값도 없다', () => {
    expect(match(col('가', '나'), { kind: 'max' })).toEqual([])
  })

  it('최댓값은 범위 안에서만 본다', () => {
    const grid = col('100', '5', '7')
    expect(match(grid, { kind: 'max' }, { r1: 1, r2: 2, c1: 0, c2: 0 })).toEqual(['2:0'])
  })

  it('중복된 값 (앞뒤 공백·대소문자 무시, 빈 칸은 제외)', () => {
    const grid = col('a', 'A ', 'b', 'c', 'b', '', '')
    expect(match(grid, { kind: 'duplicate' })).toEqual(['0:0', '1:0', '2:0', '4:0'])
  })
})

describe('범위·헤더·병합', () => {
  const grid = g([
    ['점수', '메모'],
    ['5', 'x'],
    ['50', 'y'],
  ])

  it('범위를 주면 그 안의 칸만', () => {
    expect(match(grid, { kind: 'gt', a: '1' }, { r1: 2, r2: 2, c1: 0, c2: 1 })).toEqual(['2:0'])
  })

  it('skipFirstRow 가 켜지면 맨 윗줄은 건너뛴다', () => {
    expect(match(grid, { kind: 'notEmpty' }, null, { skipFirstRow: true })).toEqual(['1:0', '1:1', '2:0', '2:1'])
    expect(match(grid, { kind: 'notEmpty' }, null, { skipFirstRow: false }).length).toBe(6)
  })

  it('병합에 가려진 칸은 건너뛴다', () => {
    const merged = [[cell('10', { colspan: 2 }), { ...emptyCell(), text: '99', mergedInto: { r: 0, c: 0 } }]]
    expect(match(merged, { kind: 'gt', a: '0' })).toEqual(['0:0'])
  })
})

describe('isRuleReady - 입력이 충분한가', () => {
  it('숫자 비교는 숫자 기준 값이 있어야 한다', () => {
    expect(isRuleReady({ kind: 'gt', a: '10' })).toBe(true)
    expect(isRuleReady({ kind: 'gt', a: '' })).toBe(false)
    expect(isRuleReady({ kind: 'gt', a: 'x' })).toBe(false)
    expect(isRuleReady({ kind: 'between', a: '1', b: '' })).toBe(false)
    expect(isRuleReady({ kind: 'between', a: '1', b: '5' })).toBe(true)
  })

  it('글자 포함은 글자가 있어야 한다', () => {
    expect(isRuleReady({ kind: 'contains', a: '가' })).toBe(true)
    expect(isRuleReady({ kind: 'contains', a: '  ' })).toBe(false)
  })

  it('입력이 필요 없는 규칙은 늘 준비됐다', () => {
    for (const kind of ['empty', 'notEmpty', 'max', 'min', 'duplicate']) expect(isRuleReady({ kind })).toBe(true)
  })

  it('모르는 규칙은 준비되지 않았다', () => {
    expect(isRuleReady({ kind: 'unknown' })).toBe(false)
    expect(matchRule(col('1'), { kind: 'unknown' }, null)).toEqual([])
  })
})

describe('applyRuleStyle / clearRuleStyle', () => {
  const grid = () => g([['a', 'b'], ['c', 'd']])

  it('주어진 칸에만 지정한 서식을 입힌다 (지정하지 않은 항목은 그대로)', () => {
    const base = grid()
    base[0][0] = cell('a', { color: '#111111', bold: true })
    const next = applyRuleStyle(base, [{ r: 0, c: 0 }, { r: 1, c: 1 }], { bg: '#ffd6d6' })
    expect(next[0][0]).toMatchObject({ bg: '#ffd6d6', color: '#111111', bold: true })
    expect(next[1][1]).toMatchObject({ bg: '#ffd6d6', color: '', bold: false })
    expect(next[0][1]).toBe(base[0][1])
  })

  it('글자색·굵게', () => {
    const next = applyRuleStyle(grid(), [{ r: 0, c: 1 }], { color: '#c0392b', bold: true })
    expect(next[0][1]).toMatchObject({ color: '#c0392b', bold: true, bg: '' })
  })

  it('굵게가 false·undefined 이면 굵기를 바꾸지 않는다', () => {
    const base = grid()
    base[0][0] = cell('a', { bold: true })
    expect(applyRuleStyle(base, [{ r: 0, c: 0 }], { bg: '#eee', bold: false })[0][0].bold).toBe(true)
  })

  it('칸이 없으면 같은 격자를 돌려준다', () => {
    const base = grid()
    expect(applyRuleStyle(base, [], { bg: '#fff' })).toBe(base)
  })

  it('원래 격자를 바꾸지 않는다', () => {
    const base = grid()
    applyRuleStyle(base, [{ r: 0, c: 0 }], { bg: '#fff', color: '#000', bold: true })
    expect(base[0][0]).toMatchObject({ bg: '', color: '', bold: false })
  })

  it('지우기: 배경색·글자색·굵게를 모두 지운다', () => {
    const base = grid()
    base[0][0] = cell('a', { bg: '#f00', color: '#0f0', bold: true })
    const next = clearRuleStyle(base, [{ r: 0, c: 0 }])
    expect(next[0][0]).toMatchObject({ text: 'a', bg: '', color: '', bold: false })
  })

  it('지우기: 칸이 없으면 같은 격자', () => {
    const base = grid()
    expect(clearRuleStyle(base, [])).toBe(base)
  })
})
