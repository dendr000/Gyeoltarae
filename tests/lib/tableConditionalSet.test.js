import { describe, expect, it } from 'vitest'
import { emptyCell } from '../../src/lib/tableGrid.js'
import { applyRuleSet, clearRuleSet, matchRuleSet } from '../../src/lib/tableConditional.js'

// 조건부 색의 여러 조건: 규칙 목록을 위에서부터 차례로 적용한다. 각 규칙은 { kind, a, b, bg, color, bold }. 맞는 칸은 처음 표의 글자로 판단하고(색을
// 입혀도 글자는 그대로), 같은 칸에 여러 규칙이 맞으면 뒤의 규칙이 같은 항목(배경색·글자색)을 덮어쓴다. 입력이 모자라거나 칠할 것이 없는 규칙은 건너뛴다.

const cell = (text, extra = {}) => ({ ...emptyCell(), text, ...extra })
const col = (...values) => values.map((v) => [cell(v)])
const bgs = (grid) => grid.map((row) => row[0].bg)
const colors = (grid) => grid.map((row) => row[0].color)

const RED = { kind: 'lt', a: '0', bg: '#ffd6d6', color: '', bold: false }
const GREEN = { kind: 'gte', a: '100', bg: '#d6ffd6', color: '', bold: false }

describe('matchRuleSet', () => {
  it('규칙마다 맞는 칸과, 합친(중복 없는) 칸을 돌려준다', () => {
    const grid = col('-5', '50', '100', '200')
    const { perRule, union } = matchRuleSet(grid, [RED, GREEN], null)
    expect(perRule.map((cells) => cells.length)).toEqual([1, 2])
    expect(union.map(({ r }) => r)).toEqual([0, 2, 3])
  })

  it('합친 목록은 규칙 순서와 상관없이 위→아래 순서다 (뒤 규칙이 앞쪽 행에 맞아도)', () => {
    const grid = col('-5', '50', '100')
    const { union } = matchRuleSet(grid, [GREEN, RED], null)
    expect(union.map(({ r }) => r)).toEqual([0, 2])
  })

  it('두 규칙에 같이 맞는 칸은 합친 목록에 한 번만 나온다', () => {
    const grid = col('5', '-3')
    const { union } = matchRuleSet(grid, [{ kind: 'notEmpty', bg: '#eee' }, { kind: 'lt', a: '0', bg: '#fcc' }], null)
    expect(union.map(({ r }) => r)).toEqual([0, 1])
  })

  it('준비되지 않은 규칙(입력이 모자람)은 맞는 칸이 없다', () => {
    const { perRule } = matchRuleSet(col('1'), [{ kind: 'gt', a: '', bg: '#eee' }], null)
    expect(perRule).toEqual([[]])
  })

  it('범위와 헤더 제외 옵션을 따른다', () => {
    const grid = col('-9', '-8', '-7')
    expect(matchRuleSet(grid, [RED], { r1: 1, r2: 2, c1: 0, c2: 0 }).union.length).toBe(2)
    expect(matchRuleSet(grid, [RED], null, { skipFirstRow: true }).union.length).toBe(2)
  })
})

describe('applyRuleSet', () => {
  it('여러 규칙을 한꺼번에 적용한다', () => {
    const grid = col('-5', '50', '100')
    const { grid: next, applied } = applyRuleSet(grid, [RED, GREEN], null)
    expect(bgs(next)).toEqual(['#ffd6d6', '', '#d6ffd6'])
    expect(applied).toBe(2)
  })

  it('같은 칸에 여러 규칙이 맞으면 뒤의 규칙이 같은 항목을 덮어쓴다', () => {
    const grid = col('150')
    const rules = [
      { kind: 'gte', a: '100', bg: '#aaaaaa', color: '', bold: false },
      { kind: 'gte', a: '120', bg: '#bbbbbb', color: '#ff0000', bold: false },
    ]
    const { grid: next } = applyRuleSet(grid, rules, null)
    expect(next[0][0]).toMatchObject({ bg: '#bbbbbb', color: '#ff0000' })
  })

  it('서로 다른 항목은 겹쳐서 모두 남는다 (앞 규칙은 배경, 뒤 규칙은 글자색·굵게)', () => {
    const grid = col('150')
    const rules = [
      { kind: 'gte', a: '100', bg: '#aaaaaa', color: '', bold: false },
      { kind: 'gte', a: '120', bg: '', color: '#ff0000', bold: true },
    ]
    expect(applyRuleSet(grid, rules, null).grid[0][0]).toMatchObject({ bg: '#aaaaaa', color: '#ff0000', bold: true })
  })

  it('입력이 모자라거나 칠할 것이 없는 규칙은 건너뛴다 (applied 에 세지 않음)', () => {
    const grid = col('-5')
    const rules = [
      { kind: 'lt', a: '', bg: '#fcc', color: '', bold: false }, // 입력 없음
      { kind: 'lt', a: '0', bg: '', color: '', bold: false }, // 칠할 것 없음
      RED,
    ]
    const { grid: next, applied } = applyRuleSet(grid, rules, null)
    expect(applied).toBe(1)
    expect(bgs(next)).toEqual(['#ffd6d6'])
  })

  it('맞는 칸이 하나도 없으면 같은 격자를 돌려주고 applied 0', () => {
    const grid = col('5')
    const result = applyRuleSet(grid, [RED], null)
    expect(result.grid).toBe(grid)
    expect(result.applied).toBe(0)
  })

  it('앞 규칙이 입힌 색은 뒤 규칙의 판단에 영향이 없다 (글자로만 판단)', () => {
    const grid = col('-5')
    const rules = [RED, { kind: 'lt', a: '0', bg: '', color: '#cc0000', bold: false }]
    expect(colors(applyRuleSet(grid, rules, null).grid)).toEqual(['#cc0000'])
  })

  it('범위 밖과 원래 격자는 바뀌지 않는다', () => {
    const grid = col('-5', '-6')
    const { grid: next } = applyRuleSet(grid, [RED], { r1: 0, r2: 0, c1: 0, c2: 0 })
    expect(bgs(next)).toEqual(['#ffd6d6', ''])
    expect(bgs(grid)).toEqual(['', ''])
  })
})

describe('clearRuleSet', () => {
  it('모든 규칙에 맞는 칸의 배경색·글자색·굵게를 지운다', () => {
    const grid = col('-5', '50', '100')
    const painted = applyRuleSet(grid, [RED, GREEN], null).grid
    const { grid: cleared, cleared: count } = clearRuleSet(painted, [RED, GREEN], null)
    expect(bgs(cleared)).toEqual(['', '', ''])
    expect(count).toBe(2)
  })

  it('맞는 칸이 없으면 같은 격자', () => {
    const grid = col('5')
    expect(clearRuleSet(grid, [RED], null).grid).toBe(grid)
  })
})
