import { describe, expect, it } from 'vitest'
import { parseCellNumber, parseCellNumberParts } from '../../src/lib/tableStats.js'

// 칸의 글을 숫자의 "부분"(값, 통화 기호, 뒤 단위, 소수 자릿수, 쉼표 여부)으로 나누어 읽는다. 숫자 서식이 원래 모양을 알아야 해서 쓴다.

describe('parseCellNumberParts', () => {
  it('기호 없는 숫자', () => {
    expect(parseCellNumberParts('1234')).toEqual({ value: 1234, currency: '', suffix: '', decimals: 0, grouped: false, padded: false })
    expect(parseCellNumberParts('3.14')).toEqual({ value: 3.14, currency: '', suffix: '', decimals: 2, grouped: false, padded: false })
  })

  it('쉼표 여부와 소수 자릿수', () => {
    expect(parseCellNumberParts('1,234,567.5')).toMatchObject({ value: 1234567.5, grouped: true, decimals: 1 })
    expect(parseCellNumberParts('.5')).toMatchObject({ value: 0.5, decimals: 1 })
    expect(parseCellNumberParts('2.50')).toMatchObject({ value: 2.5, decimals: 2 })
  })

  it('통화 기호와 뒤 단위', () => {
    expect(parseCellNumberParts('₩1,500')).toMatchObject({ value: 1500, currency: '₩', suffix: '', grouped: true })
    expect(parseCellNumberParts('$ 12.5')).toMatchObject({ value: 12.5, currency: '$' })
    expect(parseCellNumberParts('12%')).toMatchObject({ value: 12, suffix: '%' })
    expect(parseCellNumberParts('500원')).toMatchObject({ value: 500, suffix: '원' })
    expect(parseCellNumberParts('5.5 점')).toMatchObject({ value: 5.5, suffix: '점' })
  })

  it('음수는 값의 부호로 돌려준다 (기호 앞뒤 어느 쪽에 써도)', () => {
    expect(parseCellNumberParts('-3')).toMatchObject({ value: -3 })
    expect(parseCellNumberParts('-₩300')).toMatchObject({ value: -300, currency: '₩' })
    expect(parseCellNumberParts('₩-300')).toMatchObject({ value: -300, currency: '₩' })
    expect(parseCellNumberParts('−5')).toMatchObject({ value: -5 })
  })

  it('앞에 0 이 붙은 정수(007)는 padded 로 알린다 (코드 번호일 수 있다)', () => {
    expect(parseCellNumberParts('007')).toMatchObject({ value: 7, padded: true })
    expect(parseCellNumberParts('0')).toMatchObject({ padded: false })
    expect(parseCellNumberParts('0.5')).toMatchObject({ padded: false })
    expect(parseCellNumberParts('10')).toMatchObject({ padded: false })
  })

  it('숫자 칸이 아니면 null', () => {
    for (const text of ['', 'abc', '서울 3호선', '2024-01-05', '1,23', '--3', undefined, null, 5]) {
      expect(parseCellNumberParts(text)).toBeNull()
    }
  })

  it('parseCellNumber 와 값이 같다', () => {
    for (const text of ['12', '-3', '1,234', '₩500', '12%', '3개', '.5', '서울', '']) {
      const parts = parseCellNumberParts(text)
      expect(parseCellNumber(text)).toBe(parts === null ? null : parts.value)
    }
  })
})
