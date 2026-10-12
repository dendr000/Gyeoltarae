import { describe, expect, it } from 'vitest'
import { lineIndexAt, shiftMarks, toggleMark } from '../../src/lib/lineMarks.js'

describe('shiftMarks (문서를 고쳐도 표시가 같은 글에 붙어 있게)', () => {
  it('줄 수가 그대로인 고침(글자 입력)에서는 표시를 건드리지 않는다', () => {
    const marks = [1, 3]
    expect(shiftMarks(marks, 'a\nb\nc\nd', 'a\nbX\nc\nd')).toBe(marks)
  })

  it('표시가 없으면 그대로', () => {
    const marks = []
    expect(shiftMarks(marks, 'a', 'a\nb')).toBe(marks)
  })

  it('표시된 줄 위에 새 줄이 생기면 표시가 아래로 밀린다', () => {
    expect(shiftMarks([2], 'a\nb\nc\nd', 'a\nNEW\nb\nc\nd')).toEqual([3])
  })

  it('표시된 줄 아래에 새 줄이 생기면 표시는 그대로', () => {
    expect(shiftMarks([1], 'a\nb\nc', 'a\nb\nNEW\nc')).toEqual([1])
  })

  it('표시된 줄의 맨 앞에서 Enter 를 쳐 위에 빈 줄이 생기면 표시가 그 글을 따라 내려간다', () => {
    expect(shiftMarks([1], 'a\nabc\nz', 'a\n\nabc\nz')).toEqual([2])
  })

  it('표시된 줄을 Enter 로 나누면 앞쪽 조각에 표시가 남는다', () => {
    expect(shiftMarks([1], 'a\nabcdef\nz', 'a\nabc\ndef\nz')).toEqual([1])
  })

  it('표시된 줄 아래의 줄들은 나뉜 만큼 밀린다', () => {
    expect(shiftMarks([2], 'a\nabcdef\nz', 'a\nabc\ndef\nz')).toEqual([3])
  })

  it('줄을 지우면 그 줄의 표시는 사라지고 아래 표시는 위로 올라온다', () => {
    expect(shiftMarks([1, 3], 'a\nb\nc\nd', 'a\nc\nd')).toEqual([2])
  })

  it('Backspace 로 아래 줄이 합쳐지면 위 줄의 표시는 남고 합쳐진 아래 줄의 표시는 사라진다', () => {
    expect(shiftMarks([1, 2, 3], 'a\nb\nc\nd', 'a\nbc\nd')).toEqual([1, 2])
  })

  it('같은 내용의 줄이 반복돼도 지워진 줄의 표시만 사라진다 (앞·뒤 비교 구간이 겹치지 않는다)', () => {
    expect(shiftMarks([1], 'a\na', 'a')).toEqual([])
    expect(shiftMarks([0], 'a\na', 'a')).toEqual([0])
    expect(shiftMarks([2], 'x\nx\nx', 'x\nx')).toEqual([])
  })

  it('붙여넣기로 여러 줄이 생기면 그 뒤 표시가 줄 수만큼 밀린다', () => {
    expect(shiftMarks([3], 'a\nb\nc\nd', 'a\nb\nx\ny\nz\nc\nd')).toEqual([6])
  })

  it('문서 전체를 지우면 표시도 모두 사라진다', () => {
    expect(shiftMarks([0, 2], 'a\nb\nc', '')).toEqual([])
  })

  it('원래 목록은 바꾸지 않는다', () => {
    const marks = [2]
    shiftMarks(marks, 'a\nb\nc', 'a\nNEW\nb\nc')
    expect(marks).toEqual([2])
  })
})

describe('toggleMark', () => {
  it('없으면 더하고(오름차순) 있으면 뺀다', () => {
    expect(toggleMark([1, 5], 3)).toEqual([1, 3, 5])
    expect(toggleMark([1, 3, 5], 3)).toEqual([1, 5])
    expect(toggleMark([], 0)).toEqual([0])
  })

  it('원래 목록은 바꾸지 않는다', () => {
    const marks = [1]
    toggleMark(marks, 2)
    expect(marks).toEqual([1])
  })
})

describe('lineIndexAt (세로 위치의 줄 찾기)', () => {
  // 줄 시작 위치: 24, 48, 120 (둘째 줄이 3줄 높이로 접힘), 144
  const tops = [24, 48, 120, 144]
  const topOf = (i) => tops[i]

  it('줄 시작과 그 줄 안쪽 위치는 그 줄', () => {
    expect(lineIndexAt(4, topOf, 24)).toBe(0)
    expect(lineIndexAt(4, topOf, 47)).toBe(0)
    expect(lineIndexAt(4, topOf, 48)).toBe(1)
    expect(lineIndexAt(4, topOf, 119)).toBe(1)
    expect(lineIndexAt(4, topOf, 120)).toBe(2)
  })

  it('마지막 줄 아래는 마지막 줄 번호를 돌려준다 (끝 판정은 부른 쪽이 줄 높이로 한다)', () => {
    expect(lineIndexAt(4, topOf, 999)).toBe(3)
  })

  it('첫 줄 시작보다 위(위쪽 여백)이면 null', () => {
    expect(lineIndexAt(4, topOf, 10)).toBeNull()
  })

  it('줄이 하나도 없으면 null', () => {
    expect(lineIndexAt(0, topOf, 30)).toBeNull()
  })

  it('줄이 많아도 맞는 줄을 찾는다', () => {
    const many = Array.from({ length: 1000 }, (_, i) => 24 + i * 24)
    expect(lineIndexAt(1000, (i) => many[i], 24 + 500 * 24 + 5)).toBe(500)
    expect(lineIndexAt(1000, (i) => many[i], 24 + 999 * 24 + 23)).toBe(999)
  })
})
