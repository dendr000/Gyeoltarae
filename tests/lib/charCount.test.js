// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { countChars, formatCount } from '../../src/lib/charCount.js'

// 글자 수: 공백·특수문자·한자를 모두 포함해 문자 하나를 1자로 센다. 기본은 줄바꿈을 세지 않고(기본 글자 수), 설정에서 켜면 줄바꿈도 1자로 센다
// (줄바꿈 포함 글자 수). 바이트 수나 토큰 수는 쓰지 않는다.
describe('countChars (기본: 줄바꿈 제외)', () => {
  it('빈 글은 0자다', () => {
    expect(countChars('')).toBe(0)
    expect(countChars(undefined)).toBe(0)
    expect(countChars(null)).toBe(0)
  })

  it('한글·영문·숫자는 한 글자씩 센다', () => {
    expect(countChars('가나다')).toBe(3)
    expect(countChars('abc')).toBe(3)
    expect(countChars('가a1')).toBe(3)
  })

  it('공백도 1자로 센다 (앞뒤·연속 공백, 탭, 전각 공백 모두)', () => {
    expect(countChars('가 나')).toBe(3)
    expect(countChars('  ')).toBe(2)
    expect(countChars('\t')).toBe(1)
    expect(countChars('가　나')).toBe(3)
  })

  it('특수문자·기호도 1자씩이다', () => {
    expect(countChars('#→·/&()')).toBe(7)
    expect(countChars("'''굵게'''")).toBe(8)
  })

  it('한자도 1자씩이다', () => {
    expect(countChars('漢字')).toBe(2)
  })

  it('줄바꿈은 세지 않는다 (줄바꿈 \\n, 윈도 줄바꿈 \\r\\n, 낱개 \\r 모두)', () => {
    expect(countChars('a\nb')).toBe(2)
    expect(countChars('가\n\n나')).toBe(2)
    expect(countChars('가\n')).toBe(1)
    expect(countChars('a\r\nb\r\nc')).toBe(3)
    expect(countChars('a\rb')).toBe(2)
  })

  it('줄바꿈뿐인 글은 0자다', () => {
    expect(countChars('\n\n')).toBe(0)
    expect(countChars('\r\n')).toBe(0)
  })

  it('이모지·확장 한자처럼 코드 두 칸을 쓰는 문자도 1자로 센다 (자바스크립트 length 와 다르다)', () => {
    expect('😀'.length).toBe(2)
    expect(countChars('😀')).toBe(1)
    expect(countChars('𠮷')).toBe(1)
    expect(countChars('가😀나')).toBe(3)
  })

  it('자모가 풀어 쓰인 한글(NFD)도 완성된 글자 1자로 센다', () => {
    expect(countChars('한')).toBe(1)
    expect(countChars('한'.normalize('NFD'))).toBe(1)
  })

  it('긴 글도 센다 (한 줄 9자 x 41줄 = 369자, 줄바꿈은 세지 않음)', () => {
    const text = Array.from({ length: 41 }, () => '123456789').join('\n')
    expect(countChars(text)).toBe(41 * 9)
  })

  it('글이 아닌 값(숫자 등)은 글로 바꿔서 센다', () => {
    expect(countChars(12345)).toBe(5)
  })
})

describe('countChars (includeNewlines: 줄바꿈 포함)', () => {
  const withNewlines = (text) => countChars(text, { includeNewlines: true })

  it('줄바꿈도 1자로 센다 (여러 줄이면 줄 사이마다 1자)', () => {
    expect(withNewlines('a\nb')).toBe(3)
    expect(withNewlines('가\n\n나')).toBe(4)
    expect(withNewlines('가\n')).toBe(2)
  })

  it('윈도 줄바꿈(CRLF)도 줄바꿈 1자로 센다', () => {
    expect(withNewlines('a\r\nb')).toBe(3)
    expect(withNewlines('a\r\nb\r\nc')).toBe(5)
  })

  it('긴 글: 한 줄 9자 x 41줄 + 줄바꿈 40자 = 409자', () => {
    const text = Array.from({ length: 41 }, () => '123456789').join('\n')
    expect(withNewlines(text)).toBe(41 * 9 + 40)
  })

  it('줄바꿈이 없는 글은 기본과 같다', () => {
    expect(withNewlines('가나다 漢字 😀')).toBe(countChars('가나다 漢字 😀'))
  })

  it('includeNewlines 를 false 로 주면 기본과 같다', () => {
    expect(countChars('a\nb', { includeNewlines: false })).toBe(2)
  })

  it('빈 글은 0자다', () => {
    expect(withNewlines('')).toBe(0)
    expect(withNewlines(null)).toBe(0)
  })
})

describe('formatCount', () => {
  it('천 단위 쉼표를 붙인다', () => {
    expect(formatCount(1065)).toBe('1,065')
    expect(formatCount(409)).toBe('409')
    expect(formatCount(0)).toBe('0')
    expect(formatCount(1234567)).toBe('1,234,567')
  })
})
