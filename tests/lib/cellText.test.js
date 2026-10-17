// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { displayToStored, storedToDisplay } from '../../src/lib/cellText.js'

// 표 편집기의 넓은 "선택한 셀 내용" 칸: 칸 안 줄바꿈이 `4[br]4, 8` 이 아니라 실제 줄바꿈으로 보이고 쳐진다. 칸에 저장되는 글(문서 문법)은 그대로 [br] 이다.
describe('storedToDisplay', () => {
  it('[br] 을 실제 줄바꿈으로 보여 준다', () => {
    expect(storedToDisplay('4[br]4, 8')).toBe('4\n4, 8')
  })

  it('여러 개와 맨 앞·맨 뒤의 [br] 도 바꾼다', () => {
    expect(storedToDisplay('[br]a[br][br]b[br]')).toBe('\na\n\nb\n')
  })

  it('[br] 이 없으면 그대로다', () => {
    expect(storedToDisplay('가나다')).toBe('가나다')
    expect(storedToDisplay('')).toBe('')
  })

  it('다른 표시(굵게·밑줄·색)는 건드리지 않는다', () => {
    expect(storedToDisplay("'''굵게'''[br]__밑줄__ {{{#f00 색}}}")).toBe("'''굵게'''\n__밑줄__ {{{#f00 색}}}")
  })

  it('대문자 [BR] 이나 비슷한 글자는 [br] 이 아니므로 그대로 둔다 (뷰어도 [br] 만 줄바꿈이다)', () => {
    expect(storedToDisplay('a[BR]b [b r] [br')).toBe('a[BR]b [b r] [br')
  })

  it('글이 아닌 값(undefined, null)도 빈 글로 다룬다', () => {
    expect(storedToDisplay(undefined)).toBe('')
    expect(storedToDisplay(null)).toBe('')
  })
})

describe('displayToStored', () => {
  it('실제 줄바꿈을 [br] 로 저장한다', () => {
    expect(displayToStored('4\n4, 8')).toBe('4[br]4, 8')
  })

  it('윈도 줄바꿈(\\r\\n)도 [br] 하나로 바꾼다', () => {
    expect(displayToStored('a\r\nb')).toBe('a[br]b')
  })

  it('빈 줄은 [br] 이 겹쳐서 저장된다', () => {
    expect(displayToStored('a\n\nb')).toBe('a[br][br]b')
  })

  it('줄바꿈이 없으면 그대로다', () => {
    expect(displayToStored('가나다')).toBe('가나다')
    expect(displayToStored('')).toBe('')
  })

  it('보여 주기와 저장하기는 서로 되돌릴 수 있다 (왕복)', () => {
    for (const stored of ['4[br]4, 8', '[br]x', 'x[br]', 'a[br][br]b', '가', '']) {
      expect(displayToStored(storedToDisplay(stored))).toBe(stored)
    }
  })
})
