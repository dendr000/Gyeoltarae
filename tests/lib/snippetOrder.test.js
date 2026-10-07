import { describe, expect, it } from 'vitest'
import { SNIPPET_ORDER_FILE, parseSnippetOrder } from '../../src/lib/snippetOrder.js'

describe('parseSnippetOrder (폴더의 순서 목록 파일 읽기)', () => {
  it('파일 이름은 _순서.txt 다', () => {
    expect(SNIPPET_ORDER_FILE).toBe('_순서.txt')
  })

  it('한 줄에 제목 하나, 위에 있을수록 앞 순서(0부터)다', () => {
    const order = parseSnippetOrder('SELECT\nFROM\nWHERE\n')
    expect(order.get('SELECT')).toBe(0)
    expect(order.get('FROM')).toBe(1)
    expect(order.get('WHERE')).toBe(2)
  })

  it('목록에 없는 제목은 undefined 다', () => {
    expect(parseSnippetOrder('SELECT').get('FROM')).toBeUndefined()
  })

  it('빈 줄과 # 으로 시작하는 줄(설명)은 건너뛰고 순서 번호도 세지 않는다', () => {
    const order = parseSnippetOrder('# 자주 쓰는 순서\n\nSELECT\n\n# 중간 설명\nFROM\n')
    expect(order.get('SELECT')).toBe(0)
    expect(order.get('FROM')).toBe(1)
    expect(order.size).toBe(2)
  })

  it('줄 앞뒤 공백은 지우지만 제목 안의 공백(ORDER BY)은 그대로 둔다', () => {
    const order = parseSnippetOrder('  ORDER BY  \n\tGROUP BY\t')
    expect(order.get('ORDER BY')).toBe(0)
    expect(order.get('GROUP BY')).toBe(1)
  })

  it('윈도우 줄바꿈(CRLF)과 맨 앞 BOM 도 처리한다', () => {
    const order = parseSnippetOrder('﻿SELECT\r\nFROM\r\n')
    expect(order.get('SELECT')).toBe(0)
    expect(order.get('FROM')).toBe(1)
  })

  it('같은 제목이 두 번 나오면 먼저 나온 순서가 이긴다', () => {
    const order = parseSnippetOrder('SELECT\nFROM\nSELECT')
    expect(order.get('SELECT')).toBe(0)
    expect(order.size).toBe(2)
  })

  it('대소문자를 구분한다 (select 와 SELECT 는 다른 제목)', () => {
    const order = parseSnippetOrder('SELECT')
    expect(order.get('select')).toBeUndefined()
  })

  it('빈 문자열·undefined·공백뿐인 내용은 빈 목록이다', () => {
    expect(parseSnippetOrder('').size).toBe(0)
    expect(parseSnippetOrder(undefined).size).toBe(0)
    expect(parseSnippetOrder('  \n\n').size).toBe(0)
  })
})
