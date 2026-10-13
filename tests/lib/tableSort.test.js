import { describe, expect, it } from 'vitest'
import { emptyCell } from '../../src/lib/tableGrid.js'
import { canSortRows, sortRows, sortScope } from '../../src/lib/tableSort.js'

// 표 편집기의 열 기준 행 정렬. 줄(행) 전체가 함께 움직이고, 숫자 → 글자 → 빈 칸 순이며, 병합이 걸린 행은 정렬하지 않는다.

const cell = (text, extra = {}) => ({ ...emptyCell(), text, ...extra })
const covered = (r, c) => ({ ...emptyCell(), mergedInto: { r, c } })
// 한 열짜리 표: 각 행이 [값] 하나
const col = (...values) => values.map((value) => [cell(value)])
const colTexts = (grid, c = 0) => grid.map((row) => row[c].text)

describe('sortRows - 숫자', () => {
  it('오름차순은 글자 순서가 아니라 숫자 크기 순서다 (9 < 10 < 100)', () => {
    const g = col('10', '9', '100', '2')
    expect(colTexts(sortRows(g, 0, 0, 3))).toEqual(['2', '9', '10', '100'])
  })

  it('내림차순', () => {
    const g = col('10', '9', '100', '2')
    expect(colTexts(sortRows(g, 0, 0, 3, { descending: true }))).toEqual(['100', '10', '9', '2'])
  })

  it('음수·소수·쉼표·단위가 붙은 숫자도 크기로 비교한다 (합계와 같은 숫자 읽기 규칙)', () => {
    const g = col('1,200원', '-5', '3.5', '900원')
    expect(colTexts(sortRows(g, 0, 0, 3))).toEqual(['-5', '3.5', '900원', '1,200원'])
  })
})

describe('sortRows - 글자', () => {
  it('가나다순', () => {
    const g = col('다', '가', '나')
    expect(colTexts(sortRows(g, 0, 0, 2))).toEqual(['가', '나', '다'])
  })

  it('영문은 대소문자를 구분하지 않고, 같으면 원래 순서를 지킨다', () => {
    const g = col('b', 'A', 'a', 'B')
    expect(colTexts(sortRows(g, 0, 0, 3))).toEqual(['A', 'a', 'b', 'B'])
  })

  it('영문이 한글보다 앞이다 (엑셀 한국어판과 같음)', () => {
    const g = col('가', 'A', '나', 'b')
    expect(colTexts(sortRows(g, 0, 0, 3))).toEqual(['A', 'b', '가', '나'])
  })

  it('글자 안의 숫자는 크기로 본다 (item2 < item10)', () => {
    const g = col('item10', 'item2', 'item1')
    expect(colTexts(sortRows(g, 0, 0, 2))).toEqual(['item1', 'item2', 'item10'])
  })

  it('날짜 꼴 글자는 앞에서부터 크기로 비교한다', () => {
    const g = col('2024-02-01', '2023-12-31', '2024-01-05')
    expect(colTexts(sortRows(g, 0, 0, 2))).toEqual(['2023-12-31', '2024-01-05', '2024-02-01'])
  })

  it('내림차순에서도 같은 값은 원래 순서를 지킨다', () => {
    const g = [
      [cell('a'), cell('1')],
      [cell('A'), cell('2')],
      [cell('b'), cell('3')],
    ]
    expect(colTexts(sortRows(g, 0, 0, 2, { descending: true }), 1)).toEqual(['3', '1', '2'])
  })
})

describe('sortRows - 섞인 열과 빈 칸', () => {
  it('오름차순: 숫자 → 글자 → 빈 칸', () => {
    const g = col('나', '5', '', '가', '1')
    expect(colTexts(sortRows(g, 0, 0, 4))).toEqual(['1', '5', '가', '나', ''])
  })

  it('내림차순: 글자 → 숫자 → 빈 칸 (빈 칸은 어느 쪽이든 맨 아래)', () => {
    const g = col('나', '5', '', '가', '1')
    expect(colTexts(sortRows(g, 0, 0, 4, { descending: true }))).toEqual(['나', '가', '5', '1', ''])
  })

  it('공백만 있는 칸도 빈 칸이다', () => {
    const g = col('  ', '3', '1')
    expect(colTexts(sortRows(g, 0, 0, 2))).toEqual(['1', '3', '  '])
  })

  it('셀 안 줄바꿈 [br] 은 공백으로 본다 ("12[br]" 는 숫자 12)', () => {
    const g = col('20', '12[br]', '3')
    expect(colTexts(sortRows(g, 0, 0, 2))).toEqual(['3', '12[br]', '20'])
  })

  it('[br] 만 있는 칸은 빈 칸이라 맨 아래로 간다', () => {
    const g = col('[br]', 'a', '3')
    expect(colTexts(sortRows(g, 0, 0, 2))).toEqual(['3', 'a', '[br]'])
    expect(colTexts(sortRows(g, 0, 0, 2, { descending: true }))).toEqual(['a', '3', '[br]'])
  })
})

describe('sortRows - 행 전체가 함께 움직인다', () => {
  const g = () => [
    [cell('이름'), cell('점수')],
    [cell('철수', { bg: '#ff0000' }), cell('80')],
    [cell('영희', { bold: true, align: 'center' }), cell('95')],
    [cell('민수', { color: '#00ff00' }), cell('70')],
  ]

  it('점수 열(1) 기준 내림차순: 이름·색·굵기가 점수를 따라간다', () => {
    const next = sortRows(g(), 1, 1, 3, { descending: true })
    expect(next.map((row) => row[0].text)).toEqual(['이름', '영희', '철수', '민수'])
    expect(next[1][0]).toMatchObject({ bold: true, align: 'center' })
    expect(next[2][0].bg).toBe('#ff0000')
    expect(next[3][0].color).toBe('#00ff00')
  })

  it('범위 밖의 행은 제자리다 (머리글 행, 아래 행)', () => {
    const next = sortRows(g(), 1, 1, 2) // 1~2행만
    expect(next.map((row) => row[0].text)).toEqual(['이름', '철수', '영희', '민수'])
    const reverse = sortRows(g(), 1, 1, 2, { descending: true })
    expect(reverse.map((row) => row[0].text)).toEqual(['이름', '영희', '철수', '민수'])
  })

  it('원래 격자를 바꾸지 않는다', () => {
    const original = g()
    sortRows(original, 1, 1, 3)
    expect(original.map((row) => row[0].text)).toEqual(['이름', '철수', '영희', '민수'])
  })

  it('이미 정렬돼 있으면 순서가 그대로다', () => {
    const next = sortRows(g(), 1, 1, 3, { descending: false })
    expect(next.map((row) => row[1].text)).toEqual(['점수', '70', '80', '95'])
    expect(sortRows(next, 1, 1, 3).map((row) => row[1].text)).toEqual(['점수', '70', '80', '95'])
  })

  it('기준 열은 열마다 다르다 (이름 열로 정렬)', () => {
    const next = sortRows(g(), 0, 1, 3)
    expect(next.slice(1).map((row) => row[0].text)).toEqual(['민수', '영희', '철수'])
  })
})

describe('sortRows - 가로 병합은 괜찮다', () => {
  it('가로 병합이 있는 행도 대표 칸 글자를 기준으로 정렬되고, 가려진 칸의 가리킴이 새 행을 향한다', () => {
    const g = [
      [cell('b', { colspan: 2 }), covered(0, 0)],
      [cell('a'), cell('x')],
    ]
    const next = sortRows(g, 0, 0, 1)
    expect(colTexts(next)).toEqual(['a', 'b'])
    expect(next[1][0].colspan).toBe(2)
    expect(next[1][1].mergedInto).toEqual({ r: 1, c: 0 })
  })

  it('기준 열의 칸이 가로 병합에 가려져 있으면 대표 칸 글자로 비교한다', () => {
    const g = [
      [cell('0', { colspan: 2 }), covered(0, 0)],
      [cell('x'), cell('1')],
    ]
    // 열 1 기준: 첫 행은 가려진 칸 → 대표 칸의 '0'(둘째 행의 '1' 보다 작음) → 첫 행이 앞에 남는다.
    // 대표 칸 글자를 안 읽으면 가려진 칸이 빈 칸으로 보여 첫 행이 맨 아래로 가 버린다.
    const next = sortRows(g, 1, 0, 1)
    expect(next.map((row) => row[0].text)).toEqual(['0', 'x'])
  })
})

describe('canSortRows / 세로 병합', () => {
  const rowspanGrid = () => [
    [cell('A', { rowspan: 2 }), cell('3')],
    [covered(0, 0), cell('1')],
    [cell('b'), cell('2')],
  ]

  it('범위 안에 세로 병합이 있으면 정렬할 수 없다', () => {
    expect(canSortRows(rowspanGrid(), 0, 2)).toBe(false)
  })

  it('세로 병합이 범위의 일부 행에 걸쳐도 정렬할 수 없다', () => {
    expect(canSortRows(rowspanGrid(), 1, 2)).toBe(false) // 가려진 칸이 범위 안, 대표 칸은 범위 밖
    expect(canSortRows(rowspanGrid(), 0, 0)).toBe(false)
  })

  it('세로 병합이 없는 행만 고르면 정렬할 수 있다', () => {
    expect(canSortRows(rowspanGrid(), 2, 2)).toBe(true)
    const plain = col('b', 'a')
    expect(canSortRows(plain, 0, 1)).toBe(true)
  })

  it('가로 병합만 있으면 정렬할 수 있다', () => {
    const g = [
      [cell('a', { colspan: 2 }), covered(0, 0)],
      [cell('b'), cell('c')],
    ]
    expect(canSortRows(g, 0, 1)).toBe(true)
  })

  it('정렬할 수 없으면 sortRows 는 격자를 그대로 돌려준다', () => {
    const g = rowspanGrid()
    expect(sortRows(g, 1, 0, 2)).toBe(g)
  })

  it('범위가 비정상이면 정렬할 수 없다', () => {
    expect(canSortRows(col('a', 'b'), 1, 0)).toBe(false)
    expect(canSortRows(col('a', 'b'), 0, 9)).toBe(false)
    expect(canSortRows(col('a', 'b'), -1, 1)).toBe(false)
  })
})

describe('sortScope - 어느 행을 정렬하나', () => {
  it('한 칸(또는 한 행)만 골랐으면 표 전체 행', () => {
    expect(sortScope({ r1: 2, r2: 2, c1: 1, c2: 1 }, { headerRow: false, rowCount: 5 })).toEqual({ r1: 0, r2: 4 })
    expect(sortScope({ r1: 2, r2: 2, c1: 0, c2: 3 }, { headerRow: false, rowCount: 5 })).toEqual({ r1: 0, r2: 4 })
  })

  it('여러 행을 골랐으면 그 행들만', () => {
    expect(sortScope({ r1: 1, r2: 3, c1: 0, c2: 0 }, { headerRow: false, rowCount: 5 })).toEqual({ r1: 1, r2: 3 })
  })

  it('첫 행이 헤더면 맨 윗줄은 뺀다', () => {
    expect(sortScope({ r1: 2, r2: 2, c1: 1, c2: 1 }, { headerRow: true, rowCount: 5 })).toEqual({ r1: 1, r2: 4 })
    expect(sortScope({ r1: 0, r2: 4, c1: 1, c2: 1 }, { headerRow: true, rowCount: 5 })).toEqual({ r1: 1, r2: 4 })
  })

  it('헤더여도 범위가 첫 줄을 포함하지 않으면 그대로', () => {
    expect(sortScope({ r1: 2, r2: 3, c1: 0, c2: 0 }, { headerRow: true, rowCount: 5 })).toEqual({ r1: 2, r2: 3 })
  })

  it('헤더가 아니면 맨 윗줄도 정렬한다', () => {
    expect(sortScope({ r1: 0, r2: 4, c1: 0, c2: 0 }, { headerRow: false, rowCount: 5 })).toEqual({ r1: 0, r2: 4 })
  })

  it('행이 하나뿐인 표는 정렬할 행이 없다 (r2 < r1 + 1)', () => {
    const scope = sortScope({ r1: 0, r2: 0, c1: 0, c2: 0 }, { headerRow: true, rowCount: 1 })
    expect(scope.r2 - scope.r1).toBeLessThan(1)
  })
})
