// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { emptyCell } from '../../src/lib/tableGrid.js'
import { measurableCells, widestCellWidth } from '../../src/lib/tableWidest.js'

// 표 편집기 "열 너비" 패널의 "가장 긴 칸 기준": 표에서 글자가 가장 넓은 칸을 찾는 규칙. 글자의 실제 너비(px)는 화면에서 재므로
// 여기서는 재는 함수(measure)를 받아서 시험한다.
const cell = (text, extra = {}) => ({ ...emptyCell(), text, ...extra })
const grid = (rows) => rows.map((row) => row.map((value) => (typeof value === 'string' ? cell(value) : value)))
// 글자 수 x 10px, 굵으면 +5px — 시험용 흉내
const measure = (text, bold) => text.length * 10 + (bold ? 5 : 0)

describe('measurableCells', () => {
  it('글자가 있는 칸만 위치와 함께 모은다 (빈 칸 제외)', () => {
    const cells = measurableCells(grid([['x', ''], ['', '=']]), false)
    expect(cells.map(({ r, c, text }) => [r, c, text])).toEqual([[0, 0, 'x'], [1, 1, '=']])
  })

  it('앞뒤 공백만 있는 칸은 빈 칸으로 본다', () => {
    expect(measurableCells(grid([['  ', ' a ']]), false).map(({ text }) => text)).toEqual(['a'])
  })

  it('병합에 가려진 칸과 가로로 합친 칸은 뺀다 (너비가 여러 열에 걸쳐 있어서)', () => {
    const merged = [[cell('가로', { colspan: 2 }), { ...emptyCell(), mergedInto: { r: 0, c: 0 } }, cell('끝')]]
    expect(measurableCells(merged, false).map(({ text }) => text)).toEqual(['끝'])
  })

  it('세로로만 합친 칸은 포함한다 (한 열 안이므로)', () => {
    const g = [[cell('세로', { rowspan: 2 })], [{ ...emptyCell(), mergedInto: { r: 0, c: 0 } }]]
    expect(measurableCells(g, false).map(({ text }) => text)).toEqual(['세로'])
  })

  it('굵은 칸은 bold 로 표시한다 (칸 자체 굵게, 헤더 행 굵게)', () => {
    const g = grid([['제목', cell('굵게', { bold: true })], ['본문', '본문2']])
    const noHeader = measurableCells(g, false)
    expect(noHeader.map((x) => x.bold)).toEqual([false, true, false, false])
    const withHeader = measurableCells(g, true)
    expect(withHeader.map((x) => x.bold)).toEqual([true, true, false, false])
  })

  it('칸 안의 줄바꿈 글자는 [br] 로 바꾼 글을 돌려준다 (렌더링과 같게)', () => {
    expect(measurableCells(grid([['가\n나']]), false)[0].text).toBe('가[br]나')
  })

  it('빈 표여도 오류 없이 빈 목록이다', () => {
    expect(measurableCells([], false)).toEqual([])
    expect(measurableCells([[]], false)).toEqual([])
  })
})

describe('widestCellWidth', () => {
  it('가장 넓은 칸의 너비와 위치를 돌려준다', () => {
    const result = widestCellWidth(grid([['x', '=', '10'], ['저장공간의 이름', '대입', '값']]), false, measure)
    expect(result).toEqual({ width: 80, r: 1, c: 0 })
  })

  it('굵은 칸은 굵게 잰 너비로 겨룬다 (헤더 행)', () => {
    const result = widestCellWidth(grid([['abcd', 'abc'], ['abc', 'ab']]), true, (text, bold) => text.length * 10 + (bold ? 15 : 0))
    expect(result).toEqual({ width: 55, r: 0, c: 0 })
    expect(widestCellWidth(grid([['abcd', 'abc']]), true, (text, bold) => text.length * 10 + (bold ? 5 : 0)).width).toBe(45)
  })

  it('소수는 올려서 정수로 돌려준다 (잘리지 않게)', () => {
    expect(widestCellWidth(grid([['a']]), false, () => 33.2).width).toBe(34)
  })

  it('너비가 같으면 위(앞) 칸을 돌려준다', () => {
    expect(widestCellWidth(grid([['aa', 'bb']]), false, measure)).toEqual({ width: 20, r: 0, c: 0 })
  })

  it('글자가 있는 칸이 하나도 없으면 null 이다', () => {
    expect(widestCellWidth(grid([['', ' ']]), false, measure)).toBeNull()
    expect(widestCellWidth([], false, measure)).toBeNull()
  })

  it('재는 함수에 글, 굵기를 넘긴다', () => {
    const calls = []
    widestCellWidth(grid([['가', cell('나', { bold: true })]]), false, (text, bold) => {
      calls.push([text, bold])
      return 1
    })
    expect(calls).toEqual([['가', false], ['나', true]])
  })
})
