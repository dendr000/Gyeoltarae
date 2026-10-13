import { describe, expect, it } from 'vitest'
import { columnLabel, formatStat, parseCellNumber, rangeLabel, rangeStats } from '../../src/lib/tableStats.js'

// 표 편집기의 상태 표시줄(고른 칸의 합계·평균 등) 계산. 셀 글자에서 숫자를 읽는 규칙과, 병합·헤더 행을 다루는 규칙을 지킨다.

const cell = (text, extra = {}) => ({ text, mergedInto: null, colspan: 1, rowspan: 1, ...extra })
const grid = (rows) => rows.map((row) => row.map((value) => (typeof value === 'object' ? value : cell(String(value)))))
const all = (g) => ({ r1: 0, r2: g.length - 1, c1: 0, c2: g[0].length - 1 })

describe('parseCellNumber - 숫자로 읽는 글', () => {
  it.each([
    ['12', 12],
    ['  7  ', 7],
    ['-3', -3],
    ['+4', 4],
    ['3.5', 3.5],
    ['.5', 0.5],
    ['0', 0],
    ['1,234', 1234],
    ['12,345,678.9', 12345678.9],
    ['-1,000', -1000],
    ['−5', -5], // 유니코드 마이너스
  ])('%s -> %s', (text, expected) => {
    expect(parseCellNumber(text)).toBe(expected)
  })

  it.each([
    ['₩500', 500],
    ['$ 12.5', 12.5],
    ['-₩300', -300],
    ['₩-300', -300],
    ['12%', 12], // % 는 그대로 12 (0.12 가 아님)
    ['3개', 3],
    ['500원', 500],
    ['1,200원', 1200],
    ['12kg', 12],
    ['5.5 점', 5.5],
    ['3호선', 3],
  ])('기호·단위가 붙어도 읽는다: %s -> %s', (text, expected) => {
    expect(parseCellNumber(text)).toBe(expected)
  })

  it.each([
    [''],
    ['   '],
    ['abc'],
    ['서울'],
    ['서울 3호선'], // 앞에 글이 있으면 숫자 칸이 아니다
    ['2024-01-05'],
    ['10:30'],
    ['010-1234-5678'],
    ['1.2.3'],
    ['1,23'],
    ['12,34,567'],
    ['1e5'],
    ['3 4'],
    ['-'],
    ['.'],
    ['₩'],
    ['--3'],
    ['+-3'],
    ['3개월분씩'], // 단위는 3글자까지 (4글자부터는 글)
  ])('숫자 칸이 아니다: %j', (text) => {
    expect(parseCellNumber(text)).toBeNull()
  })

  it('단위는 3글자까지 읽는다', () => {
    expect(parseCellNumber('3개월분')).toBe(3)
  })

  it('셀 안 줄바꿈 [br] 은 공백으로 본다', () => {
    expect(parseCellNumber('12[br]')).toBe(12)
    expect(parseCellNumber('1[br]2')).toBeNull()
  })

  it('글이 아닌 값이 와도 죽지 않는다', () => {
    expect(parseCellNumber(undefined)).toBeNull()
    expect(parseCellNumber(null)).toBeNull()
    expect(parseCellNumber(5)).toBeNull()
  })

  it('너무 큰 수(무한대)는 숫자로 읽지 않는다', () => {
    expect(parseCellNumber('9'.repeat(400))).toBeNull()
  })
})

describe('rangeStats - 고른 범위의 집계', () => {
  it('합계·평균·개수·최소·최대', () => {
    const g = grid([[10], [20], [30], [40]])
    expect(rangeStats(g, all(g))).toEqual({ selected: 4, filled: 4, count: 4, sum: 100, avg: 25, min: 10, max: 40, skippedHeader: false })
  })

  it('글자 칸과 빈 칸은 숫자 개수에서 빠지고, 칸 수에는 들어간다', () => {
    const g = grid([['이름'], ['5'], [''], ['x'], ['7']])
    const stats = rangeStats(g, all(g))
    expect(stats.selected).toBe(5)
    expect(stats.filled).toBe(4) // 빈 칸 하나만 비었다
    expect(stats.count).toBe(2)
    expect(stats.sum).toBe(12)
    expect(stats.avg).toBe(6)
  })

  it('숫자가 하나도 없으면 count 0 이고 sum 은 0, 평균·최소·최대는 null', () => {
    const g = grid([['가'], ['나']])
    expect(rangeStats(g, all(g))).toEqual({ selected: 2, filled: 2, count: 0, sum: 0, avg: null, min: null, max: null, skippedHeader: false })
  })

  it('음수와 소수', () => {
    const g = grid([['-5'], ['2.5'], ['10']])
    const stats = rangeStats(g, all(g))
    expect(stats.sum).toBe(7.5)
    expect(stats.min).toBe(-5)
    expect(stats.max).toBe(10)
  })

  it('0.1 + 0.2 처럼 이진 소수 오차가 합계에 남지 않는다', () => {
    const g = grid([['0.1'], ['0.2']])
    expect(rangeStats(g, all(g)).sum).toBe(0.3)
  })

  it('평균도 오차 없이 떨어진다 (0.1 0.2 0.3 -> 0.2)', () => {
    const g = grid([['0.1'], ['0.2'], ['0.3']])
    expect(rangeStats(g, all(g)).avg).toBe(0.2)
  })

  it('범위 밖의 칸은 세지 않는다 (가로 2열 x 세로 2행 중 일부만)', () => {
    const g = grid([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ])
    const stats = rangeStats(g, { r1: 1, r2: 2, c1: 1, c2: 2 })
    expect(stats.sum).toBe(5 + 6 + 8 + 9)
    expect(stats.count).toBe(4)
  })

  it('한 행, 한 열 범위', () => {
    const g = grid([
      [1, 2, 3],
      [4, 5, 6],
    ])
    expect(rangeStats(g, { r1: 0, r2: 0, c1: 0, c2: 2 }).sum).toBe(6)
    expect(rangeStats(g, { r1: 0, r2: 1, c1: 1, c2: 1 }).sum).toBe(7)
  })

  it('다른 칸에 가려진(병합된) 칸은 세지 않고, 병합한 칸은 한 번만 센다', () => {
    const g = grid([
      [cell('10', { colspan: 2 }), cell('', { mergedInto: { r: 0, c: 0 } })],
      [cell('1'), cell('2')],
    ])
    const stats = rangeStats(g, all(g))
    expect(stats.selected).toBe(3) // 병합 칸 1 + 아래 2
    expect(stats.sum).toBe(13)
    expect(stats.count).toBe(3)
  })

  it('병합에 가려진 칸의 글자는 무시한다 (남아 있는 글자가 있어도)', () => {
    const g = grid([[cell('10', { colspan: 2 }), cell('99', { mergedInto: { r: 0, c: 0 } })]])
    expect(rangeStats(g, all(g)).sum).toBe(10)
  })

  it('skipFirstRow 가 켜지면 맨 윗줄은 계산에서 뺀다 (헤더의 2024 같은 숫자가 합계를 흐리지 않게)', () => {
    const g = grid([[2024], [10], [20]])
    const stats = rangeStats(g, all(g), { skipFirstRow: true })
    expect(stats.sum).toBe(30)
    expect(stats.selected).toBe(2)
    expect(stats.skippedHeader).toBe(true)
  })

  it('skipFirstRow 인데 범위가 첫 줄을 포함하지 않으면 skippedHeader 는 false', () => {
    const g = grid([[2024], [10], [20]])
    const stats = rangeStats(g, { r1: 1, r2: 2, c1: 0, c2: 0 }, { skipFirstRow: true })
    expect(stats.skippedHeader).toBe(false)
    expect(stats.sum).toBe(30)
  })

  it('skipFirstRow 가 꺼져 있으면 첫 줄도 센다', () => {
    const g = grid([[2024], [10]])
    const stats = rangeStats(g, all(g))
    expect(stats.sum).toBe(2034)
    expect(stats.skippedHeader).toBe(false)
  })

  it('표 크기를 벗어난 범위여도 죽지 않는다', () => {
    const g = grid([[1, 2]])
    expect(rangeStats(g, { r1: 0, r2: 5, c1: 0, c2: 9 }).sum).toBe(3)
  })

  it('뒤바뀐 범위(r1 > r2)는 빈 범위로 본다', () => {
    const g = grid([[1], [2]])
    expect(rangeStats(g, { r1: 1, r2: 0, c1: 0, c2: 0 }).selected).toBe(0)
  })
})

describe('formatStat - 보여 줄 글자', () => {
  it('천 단위 쉼표', () => {
    expect(formatStat(1234567)).toBe('1,234,567')
  })

  it('소수는 6자리까지만, 뒤의 0 은 지운다', () => {
    expect(formatStat(10 / 3)).toBe('3.333333')
    expect(formatStat(2.5)).toBe('2.5')
    expect(formatStat(2)).toBe('2')
  })

  it('복사용(쉼표 없이)', () => {
    expect(formatStat(1234567.5, { grouping: false })).toBe('1234567.5')
  })

  it('-0 은 0 으로', () => {
    expect(formatStat(-0)).toBe('0')
  })

  it('숫자가 아니면 빈 글자', () => {
    expect(formatStat(null)).toBe('')
    expect(formatStat(NaN)).toBe('')
  })
})

describe('columnLabel / rangeLabel - 엑셀식 이름', () => {
  it('열 글자: A..Z, AA..', () => {
    expect([0, 1, 25, 26, 27, 51, 52, 701, 702].map(columnLabel)).toEqual(['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA', 'ZZ', 'AAA'])
  })

  it('한 칸은 B2, 여러 칸은 B2:D5', () => {
    expect(rangeLabel({ r1: 1, r2: 1, c1: 1, c2: 1 })).toBe('B2')
    expect(rangeLabel({ r1: 1, r2: 4, c1: 1, c2: 3 })).toBe('B2:D5')
  })
})
