// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { inlineCodeLineRanges, inlineCodeRanges, splitByRanges } from '../../src/lib/inlineCode.js'

describe('inlineCodeRanges (한 줄 안의 글 속 코드 위치)', () => {
  it('코드가 없으면 빈 목록', () => {
    expect(inlineCodeRanges('그냥 글')).toEqual([])
    expect(inlineCodeRanges('')).toEqual([])
  })

  it('{{{ }}} 와 `백틱` 의 [시작, 끝) 위치를 준다', () => {
    const line = 'a {{{x*y}}} b `z` c'
    const ranges = inlineCodeRanges(line)
    expect(ranges.map(([s, e]) => line.slice(s, e))).toEqual(['{{{x*y}}}', '`z`'])
  })

  it('크기·색 표시({{{+1 }}}, {{{#색 }}})와 {{{#!...}}} 는 코드가 아니다', () => {
    expect(inlineCodeRanges('{{{+2 크게}}} {{{#f00 빨강}}} {{{#!wiki a}}}')).toEqual([])
  })

  it('빈 코드와 공백으로 둘러싸인 백틱 두 개는 코드가 아니다', () => {
    expect(inlineCodeRanges('a {{{ }}} b')).toEqual([])
    expect(inlineCodeRanges('Ctrl+` 와 Ctrl+Shift+`')).toEqual([])
  })

  it('겹치면 하나로 합친다 (백틱 안의 {{{ }}})', () => {
    const line = '`{{{a}}} b`'
    expect(inlineCodeRanges(line)).toEqual([[0, line.length]])
  })

  it('위치는 앞에서부터 정렬되어 있다', () => {
    const ranges = inlineCodeRanges('`b` {{{a}}}')
    expect(ranges[0][0]).toBeLessThan(ranges[1][0])
  })
})

describe('inlineCodeLineRanges (글 전체)', () => {
  it('줄 수가 같고, 코드 없는 줄은 빈 목록', () => {
    const out = inlineCodeLineRanges('a\n`b`\nc')
    expect(out).toHaveLength(3)
    expect(out[0]).toEqual([])
    expect(out[1]).toEqual([[0, 3]])
  })

  it('코드블록(```) 안의 줄은 글 속 코드로 치지 않는다', () => {
    const out = inlineCodeLineRanges('```\n`x`\n```\n`y`')
    expect(out.map((r) => r.length)).toEqual([0, 0, 0, 1])
  })

  it('윈도 줄바꿈(\\r)이 끝에 붙은 줄도 찾는다', () => {
    expect(inlineCodeLineRanges('`a`\r\nb')[0]).toEqual([[0, 3]])
  })
})

describe('splitByRanges (조각 나누기)', () => {
  it('범위가 없으면 조각 하나', () => {
    expect(splitByRanges('abc', 0, [])).toEqual([{ text: 'abc', code: false }])
  })

  it('조각을 모두 이으면 원래 글이고, 범위 안만 code 이다', () => {
    const pieces = splitByRanges('a`b`c', 0, [[1, 4]])
    expect(pieces.map((p) => p.text).join('')).toBe('a`b`c')
    expect(pieces.map((p) => p.code)).toEqual([false, true, false])
  })

  it('조각이 줄의 중간(offset)에서 시작해도 줄 기준 범위로 자른다', () => {
    const pieces = splitByRanges('b`c', 2, [[3, 6]]) // 전체 줄 'ab`c`d' 에서 2번째부터 'b`c', 코드는 3..6 -> 조각 안 1..3
    expect(pieces.map((p) => `${p.code ? 'C' : 'T'}:${p.text}`)).toEqual(['T:b', 'C:`c'])
  })

  it('범위가 조각 밖이면 건드리지 않는다', () => {
    expect(splitByRanges('abc', 10, [[0, 3]])).toEqual([{ text: 'abc', code: false }])
  })
})
