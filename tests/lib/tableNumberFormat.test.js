import { describe, expect, it } from 'vitest'
import { emptyCell } from '../../src/lib/tableGrid.js'
import { formatNumbersInRange, formatNumberText } from '../../src/lib/tableNumberFormat.js'

// 표 편집기 숫자 서식: 천 단위 쉼표, 소수 자릿수, 통화 기호, 뒤 글자(%, 원 등)를 칸의 글자에 직접 적용한다(문서에는 글자로 남는다).
// 옵션: { grouping: 'keep' | 'add' | 'remove', decimals: null(그대로) | 0..6, currency: 'keep' | 'none' | 기호, suffix: 'keep' | 'none' | 글자 }

const KEEP = { grouping: 'keep', decimals: null, currency: 'keep', suffix: 'keep' }
const fmt = (text, options) => formatNumberText(text, { ...KEEP, ...options })

const cell = (text, extra = {}) => ({ ...emptyCell(), text, ...extra })
const g = (rows) => rows.map((row) => row.map((v) => (typeof v === 'string' ? cell(v) : v)))
const texts = (grid) => grid.map((row) => row.map((c) => c.text))

describe('formatNumberText - 천 단위 쉼표', () => {
  it('넣기', () => {
    expect(fmt('1234567', { grouping: 'add' })).toBe('1,234,567')
    expect(fmt('1234567.891', { grouping: 'add' })).toBe('1,234,567.891')
    expect(fmt('999', { grouping: 'add' })).toBe('999')
    expect(fmt('-1234', { grouping: 'add' })).toBe('-1,234')
  })

  it('빼기', () => {
    expect(fmt('1,234,567', { grouping: 'remove' })).toBe('1234567')
    expect(fmt('₩1,500원', { grouping: 'remove' })).toBe('₩1500원')
  })

  it('그대로: 쉼표가 있으면 있는 대로, 없으면 없는 대로', () => {
    expect(fmt('1,234', { decimals: 1 })).toBe('1,234.0')
    expect(fmt('1234', { decimals: 1 })).toBe('1234.0')
  })
})

describe('formatNumberText - 소수 자릿수', () => {
  it('자릿수를 맞춘다 (반올림, 모자라면 0 을 채움)', () => {
    expect(fmt('3.14159', { decimals: 2 })).toBe('3.14')
    expect(fmt('3', { decimals: 2 })).toBe('3.00')
    expect(fmt('2.5', { decimals: 0 })).toBe('3')
    expect(fmt('1234.5678', { decimals: 3 })).toBe('1234.568')
  })

  it('5 에서 올림 (1.005 → 1.01, 이진 소수 오차에 속지 않음)', () => {
    expect(fmt('1.005', { decimals: 2 })).toBe('1.01')
    expect(fmt('0.285', { decimals: 2 })).toBe('0.29')
    expect(fmt('2.675', { decimals: 2 })).toBe('2.68')
  })

  it('음수 반올림, 0 으로 떨어지면 부호를 없앤다', () => {
    expect(fmt('-1.005', { decimals: 2 })).toBe('-1.01')
    expect(fmt('-0.001', { decimals: 2 })).toBe('0.00')
  })

  it('큰 수와 0', () => {
    expect(fmt('123456789012', { grouping: 'add', decimals: 1 })).toBe('123,456,789,012.0')
    expect(fmt('0', { decimals: 2 })).toBe('0.00')
  })

  it('그대로(null) 이면 원래 자릿수를 유지한다', () => {
    expect(fmt('2.50', { grouping: 'add' })).toBe('2.50')
  })
})

describe('formatNumberText - 통화 기호와 뒤 글자', () => {
  it('통화 기호를 붙이거나 바꾸거나 뺀다', () => {
    expect(fmt('1500', { currency: '₩' })).toBe('₩1500')
    expect(fmt('$12.5', { currency: '€' })).toBe('€12.5')
    expect(fmt('₩500', { currency: 'none' })).toBe('500')
  })

  it('뒤 글자를 붙이거나 바꾸거나 뺀다', () => {
    expect(fmt('12', { suffix: '%' })).toBe('12%')
    expect(fmt('500원', { suffix: '개' })).toBe('500개')
    expect(fmt('12%', { suffix: 'none' })).toBe('12')
  })

  it('그대로면 원래 기호·글자를 유지한다', () => {
    expect(fmt('₩1500원', { grouping: 'add' })).toBe('₩1,500원')
  })

  it('음수는 기호 앞에 부호를 둔다', () => {
    expect(fmt('-300', { currency: '₩' })).toBe('-₩300')
    expect(fmt('₩-300', { grouping: 'keep', decimals: 1 })).toBe('-₩300.0')
  })

  it('조합', () => {
    expect(fmt('1234567.891', { grouping: 'add', decimals: 2, currency: '₩', suffix: '원' })).toBe('₩1,234,567.89원')
  })
})

describe('formatNumberText - 바꾸지 않는 것', () => {
  it('숫자 칸이 아니면 null', () => {
    expect(fmt('서울', { grouping: 'add' })).toBeNull()
    expect(fmt('', { grouping: 'add' })).toBeNull()
    expect(fmt('2024-01-05', { grouping: 'add' })).toBeNull()
    expect(fmt('서울 3호선', { suffix: '%' })).toBeNull()
  })

  it('앞에 0 이 붙은 코드 번호(007)는 건드리지 않는다', () => {
    expect(fmt('007', { grouping: 'add' })).toBeNull()
    expect(fmt('007', { decimals: 2 })).toBeNull()
  })

  it('모든 옵션이 그대로면 null (아무것도 하지 않는다)', () => {
    expect(fmt('1,234')).toBeNull()
  })
})

describe('formatNumbersInRange', () => {
  const sample = () =>
    g([
      ['연도', '매출'],
      ['2024', '1234567'],
      ['2025', '98765.4321'],
      ['합계', ''],
    ])

  it('범위 안의 숫자 칸을 서식에 맞게 바꾸고 바꾼 칸 수를 알려 준다', () => {
    const { grid, count } = formatNumbersInRange(sample(), null, { ...KEEP, grouping: 'add', decimals: 0 })
    expect(count).toBe(4)
    expect(texts(grid)).toEqual([
      ['연도', '매출'],
      ['2,024', '1,234,567'],
      ['2,025', '98,765'],
      ['합계', ''],
    ])
  })

  it('skipFirstRow 가 켜지면 맨 윗줄은 건드리지 않는다 (헤더의 연도 숫자)', () => {
    const grid = g([
      ['2024', '2025'],
      ['1000', '2000'],
    ])
    const result = formatNumbersInRange(grid, null, { ...KEEP, grouping: 'add' }, { skipFirstRow: true })
    expect(texts(result.grid)).toEqual([['2024', '2025'], ['1,000', '2,000']])
    expect(result.count).toBe(2)
  })

  it('범위(scope)를 주면 그 안의 칸만', () => {
    const grid = g([
      ['1000', '2000'],
      ['3000', '4000'],
    ])
    const { grid: next, count } = formatNumbersInRange(grid, { r1: 1, r2: 1, c1: 0, c2: 1 }, { ...KEEP, grouping: 'add' })
    expect(count).toBe(2)
    expect(texts(next)).toEqual([['1000', '2000'], ['3,000', '4,000']])
  })

  it('이미 그 서식이면 바꾼 칸으로 세지 않고 같은 칸 객체를 유지한다', () => {
    const grid = g([['1,000', '2000']])
    const { grid: next, count } = formatNumbersInRange(grid, null, { ...KEEP, grouping: 'add' })
    expect(count).toBe(1)
    expect(next[0][0]).toBe(grid[0][0])
  })

  it('병합에 가려진 칸은 건너뛴다', () => {
    const grid = [[cell('1000', { colspan: 2 }), { ...emptyCell(), text: '5000', mergedInto: { r: 0, c: 0 } }]]
    const { grid: next, count } = formatNumbersInRange(grid, null, { ...KEEP, grouping: 'add' })
    expect(count).toBe(1)
    expect(next[0][1].text).toBe('5000')
  })

  it('칸의 서식(색·굵기)은 그대로고, 원래 격자는 바뀌지 않는다', () => {
    const grid = [[cell('1000', { bg: '#ff0000', bold: true })]]
    const { grid: next } = formatNumbersInRange(grid, null, { ...KEEP, grouping: 'add' })
    expect(next[0][0]).toMatchObject({ text: '1,000', bg: '#ff0000', bold: true })
    expect(grid[0][0].text).toBe('1000')
  })

  it('바꿀 것이 없으면 같은 격자를 돌려준다', () => {
    const grid = g([['가', '나']])
    const result = formatNumbersInRange(grid, null, { ...KEEP, grouping: 'add' })
    expect(result.grid).toBe(grid)
    expect(result.count).toBe(0)
  })
})
