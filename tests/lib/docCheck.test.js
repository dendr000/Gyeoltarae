// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { checkDocument, findMissingLinks } from '../../src/lib/docCheck.js'

const kinds = (text, opts) => checkDocument(text, opts).map((i) => i.kind)

describe('checkDocument: 문제가 없는 글', () => {
  it('빈 글·보통 글은 문제 없음', () => {
    expect(checkDocument('')).toEqual([])
    expect(checkDocument('== 제목 ==\n본문[* 각주] {{{#f00 빨강}}} `코드`\n\n```sql\nSELECT {{{ 1\n```\n')).toEqual([])
  })

  it('잘못된 입력도 오류 없이 빈 목록', () => {
    expect(checkDocument(undefined)).toEqual([])
    expect(checkDocument(null)).toEqual([])
  })
})

describe('checkDocument: 코드블록', () => {
  it('닫히지 않은 코드블록은 여는 줄을 가리킨다', () => {
    const issues = checkDocument('a\n```sql\nSELECT 1')
    expect(issues).toHaveLength(1)
    expect(issues[0].kind).toBe('codeblock-open')
    expect(issues[0].line).toBe(2)
    expect(issues[0].offset).toBe(2)
  })

  it('코드블록 안의 {{{ 나 [* 는 점검하지 않는다', () => {
    expect(kinds('```\n{{{ [* ' + String.raw`\(` + ' == x =\n```')).toEqual([])
  })
})

describe('checkDocument: {{{ }}}', () => {
  it('한 줄에서 짝이 맞으면 문제 없고, 글 속 코드 안의 {{{ 도 무시한다', () => {
    expect(kinds('{{{a}}} 와 `{{{` 와 {{{#f00 b}}}')).toEqual([])
  })

  it('여러 줄 블록이 짝이 맞으면 문제 없음', () => {
    expect(kinds('{{{#!folding 제목\n내용\n}}}')).toEqual([])
  })

  it('닫히지 않은 {{{ 는 그 자리를 가리킨다', () => {
    const issues = checkDocument('a\n{{{#!wiki 안\n내용')
    expect(issues.map((i) => i.kind)).toEqual(['brace-open'])
    expect(issues[0].line).toBe(2)
  })

  it('짝 없는 }}} 를 알린다', () => {
    const issues = checkDocument('내용\n}}}')
    expect(issues.map((i) => i.kind)).toEqual(['brace-close'])
    expect(issues[0].line).toBe(2)
  })

  it('중첩된 블록의 짝도 센다', () => {
    expect(kinds('{{{#!wiki\n{{{#!folding x\n내용\n}}}\n}}}')).toEqual([])
    expect(kinds('{{{#!wiki\n{{{#!folding x\n내용\n}}}')).toEqual(['brace-open'])
  })
})

describe('checkDocument: 각주', () => {
  it('닫히지 않은 각주를 알린다', () => {
    const issues = checkDocument('본문 [* 설명이 끝나지 않음\n다음 줄')
    expect(issues.map((i) => i.kind)).toEqual(['footnote-open'])
    expect(issues[0].line).toBe(1)
  })

  it('각주 안의 [[링크]] 와 [br] 은 각주를 닫은 것으로 보지 않고, 정상 각주는 문제 없다', () => {
    expect(kinds('가[* 설명 [[문서]] [br] 끝]나')).toEqual([])
    expect(kinds('가[* 설명 [[문서]] [br] 끝')).toEqual(['footnote-open'])
  })

  it('글 속 코드 안의 [* 는 무시한다', () => {
    expect(kinds('`[* 이건 코드`')).toEqual([])
  })
})

describe('checkDocument: 수식·제목', () => {
  it('닫히지 않은 수식 여는 표시(백슬래시+괄호)를 알린다', () => {
    expect(kinds(String.raw`수식 \(x_{i} 끝`)).toEqual(['math-open'])
    expect(kinds(String.raw`수식 \(x\) 와 \(y\)`)).toEqual([])
  })

  it('백슬래시 없는 일반 괄호(코드의 람다·함수 호출)는 수식으로 보지 않는다', () => {
    expect(kinds('std::thread t([&]() {')).toEqual([])
    expect(kinds('베히모스 크러시(Behemoth Crush')).toEqual([])
  })

  it('안내 글에는 백슬래시 괄호가 그대로 보인다', () => {
    const [issue] = checkDocument(String.raw`\(x`)
    expect(issue.message).toContain(String.raw`\(`)
  })

  it('양쪽 = 개수가 다른 제목 줄을 알린다', () => {
    expect(kinds('== 제목 =')).toEqual(['heading-mismatch'])
    expect(kinds('= 제목 ==')).toEqual(['heading-mismatch'])
    expect(kinds('== 제목 ==')).toEqual([])
    expect(kinds('==# 접힌 #==')).toEqual([])
  })

  it('= 로 시작하지 않는 줄과 표 줄은 제목으로 보지 않는다', () => {
    expect(kinds('a = b = c')).toEqual([])
    expect(kinds('|| = 값 = ||')).toEqual([])
  })
})

describe('checkDocument: 없는 문서 링크', () => {
  it('없는 링크가 글의 어느 줄에 있는지 가리킨다', () => {
    const issues = checkDocument('가\n[[없는문서]] 와 [[없는문서|별칭]]', { missingLinks: ['없는문서'] })
    expect(issues).toHaveLength(1)
    expect(issues[0].kind).toBe('link-missing')
    expect(issues[0].line).toBe(2)
    expect(issues[0].message).toContain('없는문서')
  })

  it('글에서 찾지 못해도 목록에는 남고 1줄로 가리킨다', () => {
    const issues = checkDocument('틀에서 온 링크', { missingLinks: ['숨은'] })
    expect(issues[0].line).toBe(1)
  })
})

describe('checkDocument: 정렬', () => {
  it('글의 앞쪽부터 정렬된다', () => {
    const issues = checkDocument('== 제목 =\n본문[* 열림\n}}}')
    expect(issues.map((i) => i.line)).toEqual([1, 2, 3])
  })
})

describe('findMissingLinks (그려진 html 에서)', () => {
  it('문서가 없는 링크의 대상 이름을 중복 없이 모은다', () => {
    const html =
      '<span class="wiki-link-missing" data-doc-target="가" title="x">가</span>' +
      '<span class="wiki-link-missing" data-doc-target="가" title="x">가</span>' +
      '<span class="wiki-link-missing" data-doc-target="A&amp;B" title="x">A&amp;B</span>' +
      '<a class="wiki-link" data-doc-target="있음">있음</a>'
    expect(findMissingLinks(html)).toEqual(['가', 'A&B'])
  })

  it('없으면 빈 목록', () => {
    expect(findMissingLinks('<p>글</p>')).toEqual([])
    expect(findMissingLinks('')).toEqual([])
  })
})

describe('checkDocument: 각주 안의 대괄호', () => {
  it('각주 안에 대괄호가 섞여도 정상으로 닫혔으면 알리지 않는다', () => {
    expect(kinds('가[* 구간 [1, 2) 입니다]나')).toEqual([])
    expect(kinds('가[* 배열 a[0] 과 [br] 줄바꿈]나')).toEqual([])
  })
})
