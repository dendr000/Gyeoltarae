import { describe, expect, it } from 'vitest'
import { moveToLineEdge } from '../../src/lib/lineEdge.js'

const doc = 'abc\ndefg\n\nhi'
// 줄 시작 위치: abc=0, defg=4, 빈 줄=9, hi=10

describe('moveToLineEdge (Alt+←/→ 줄 처음/끝)', () => {
  it('줄 중간에서 줄 처음으로', () => {
    expect(moveToLineEdge(doc, 6, 6, 'none', 'start', false)).toEqual({ start: 4, end: 4, direction: 'none' })
  })

  it('줄 중간에서 줄 끝으로', () => {
    expect(moveToLineEdge(doc, 5, 5, 'none', 'end', false)).toEqual({ start: 8, end: 8, direction: 'none' })
  })

  it('이미 줄 처음이면 그대로 (앞 줄로 넘어가지 않는다)', () => {
    expect(moveToLineEdge(doc, 4, 4, 'none', 'start', false).start).toBe(4)
  })

  it('이미 줄 끝이면 그대로 (다음 줄로 넘어가지 않는다)', () => {
    expect(moveToLineEdge(doc, 8, 8, 'none', 'end', false).start).toBe(8)
  })

  it('문서 맨 앞/맨 끝', () => {
    expect(moveToLineEdge(doc, 0, 0, 'none', 'start', false).start).toBe(0)
    expect(moveToLineEdge(doc, doc.length, doc.length, 'none', 'end', false).start).toBe(doc.length)
  })

  it('맨 앞이 줄바꿈인 문서에서도 맨 앞은 0', () => {
    expect(moveToLineEdge('\nabc', 0, 0, 'none', 'start', false).start).toBe(0)
  })

  it('빈 줄에서는 시작과 끝이 같다', () => {
    expect(moveToLineEdge(doc, 9, 9, 'none', 'start', false).start).toBe(9)
    expect(moveToLineEdge(doc, 9, 9, 'none', 'end', false).start).toBe(9)
  })

  it('Shift: 커서에서 줄 끝까지 선택 (앞쪽이 기준)', () => {
    expect(moveToLineEdge(doc, 5, 5, 'none', 'end', true)).toEqual({ start: 5, end: 8, direction: 'forward' })
  })

  it('Shift: 커서에서 줄 처음까지 선택 (뒤쪽이 기준)', () => {
    expect(moveToLineEdge(doc, 6, 6, 'none', 'start', true)).toEqual({ start: 4, end: 6, direction: 'backward' })
  })

  it('Shift: 이미 앞으로 선택 중이면 기준은 시작점, 움직이는 끝만 옮긴다', () => {
    // 5~6 선택(앞으로) 에서 줄 끝으로
    expect(moveToLineEdge(doc, 5, 6, 'forward', 'end', true)).toEqual({ start: 5, end: 8, direction: 'forward' })
  })

  it('Shift: 뒤로 선택 중이면 기준은 끝점이다', () => {
    // 5~6 을 뒤로(커서가 5) 선택 중에 줄 처음으로 -> 4~6 뒤로
    expect(moveToLineEdge(doc, 5, 6, 'backward', 'start', true)).toEqual({ start: 4, end: 6, direction: 'backward' })
  })

  it('Shift: 기준점을 넘어가면 방향이 뒤집힌다', () => {
    // 6~7 앞으로 선택(기준 6, 커서 7) 에서 줄 처음으로 -> 4~6 뒤로
    expect(moveToLineEdge(doc, 6, 7, 'forward', 'start', true)).toEqual({ start: 4, end: 6, direction: 'backward' })
  })

  it('Shift 없이 선택이 있으면 움직이는 쪽 끝에서 접어서 이동한다', () => {
    expect(moveToLineEdge(doc, 5, 6, 'forward', 'end', false)).toEqual({ start: 8, end: 8, direction: 'none' })
  })
})
