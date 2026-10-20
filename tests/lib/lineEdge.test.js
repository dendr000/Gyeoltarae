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

// 들여쓰기가 있는 줄: Alt+← 는 줄 맨 앞(들여쓰기 앞)이 아니라 글자의 맨 앞(들여쓰기를 지난 첫 글자)으로 간다. 이미 거기 있으면 줄 맨 앞(들여쓰기 앞)으로 번갈아 간다(VS Code 의 Home 과 같음).
describe('moveToLineEdge - 들여쓰기가 있는 줄에서 Alt+← (글자의 맨 앞)', () => {
  const code = 'switch (choice) {\n\tcase 1:\n\t\tresultMsg = aMsg;\n    break;'
  const caseLine = code.indexOf('\tcase 1:')
  const resultLine = code.indexOf('\t\tresultMsg')
  const breakLine = code.indexOf('    break;')

  it('줄 중간에서 누르면 들여쓰기(탭)를 지난 첫 글자 앞으로 간다', () => {
    expect(moveToLineEdge(code, caseLine + 5, caseLine + 5, 'none', 'start', false).start).toBe(caseLine + 1)
  })

  it('탭 두 칸 들여쓴 줄도 첫 글자 앞으로 간다', () => {
    expect(moveToLineEdge(code, resultLine + 10, resultLine + 10, 'none', 'start', false).start).toBe(resultLine + 2)
  })

  it('공백 들여쓰기도 같다 (공백 4칸)', () => {
    expect(moveToLineEdge(code, breakLine + 7, breakLine + 7, 'none', 'start', false).start).toBe(breakLine + 4)
  })

  it('들여쓰기 안(줄 맨 앞과 첫 글자 사이)에 커서가 있어도 첫 글자 앞으로 간다', () => {
    expect(moveToLineEdge(code, breakLine + 2, breakLine + 2, 'none', 'start', false).start).toBe(breakLine + 4)
  })

  it('이미 첫 글자 앞이면 줄 맨 앞(들여쓰기 앞)으로 간다 — 다시 누르면 번갈아', () => {
    expect(moveToLineEdge(code, caseLine + 1, caseLine + 1, 'none', 'start', false).start).toBe(caseLine)
    expect(moveToLineEdge(code, caseLine, caseLine, 'none', 'start', false).start).toBe(caseLine + 1)
  })

  it('들여쓰기가 없는 줄은 예전과 같다 (줄 맨 앞)', () => {
    expect(moveToLineEdge(code, 6, 6, 'none', 'start', false).start).toBe(0)
    expect(moveToLineEdge(code, 0, 0, 'none', 'start', false).start).toBe(0)
  })

  it('공백만 있는 줄은 줄 끝이 첫 글자 자리다 — 다시 누르면 줄 맨 앞', () => {
    const blank = 'a\n    \nb'
    const lineStart = 2
    expect(moveToLineEdge(blank, lineStart + 2, lineStart + 2, 'none', 'start', false).start).toBe(lineStart + 4)
    expect(moveToLineEdge(blank, lineStart + 4, lineStart + 4, 'none', 'start', false).start).toBe(lineStart)
  })

  it('Shift+Alt+← 도 같은 자리까지 선택한다', () => {
    expect(moveToLineEdge(code, caseLine + 6, caseLine + 6, 'none', 'start', true)).toEqual({ start: caseLine + 1, end: caseLine + 6, direction: 'backward' })
  })

  it('Alt+→(줄 끝)는 들여쓰기와 상관없이 그대로다', () => {
    expect(moveToLineEdge(code, caseLine + 2, caseLine + 2, 'none', 'end', false).start).toBe(caseLine + '\tcase 1:'.length)
  })

  it('글자 앞에 공백이 아닌 다른 글자(* 같은 목록 표시)가 있으면 그 글자 앞이 첫 글자다', () => {
    const list = '  * 항목'
    expect(moveToLineEdge(list, 6, 6, 'none', 'start', false).start).toBe(2)
  })

  it('윈도 줄바꿈(CRLF) 문서에서도 같다', () => {
    const crlf = 'a\r\n\tb\r\n'
    expect(moveToLineEdge(crlf, 5, 5, 'none', 'start', false).start).toBe(4)
  })
})
