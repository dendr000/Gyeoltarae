import { describe, expect, it } from 'vitest'
import { findExactSnippetMatch, findSnippetQuery } from '../../src/lib/snippetMatch.js'

const snip = (title, category = '공통', content = '') => ({ category, title, content })

describe('findExactSnippetMatch (스페이스 자동 치환 · Alt+Enter)', () => {
  it('대소문자를 구분한다 — mysql 은 MYSQL 상용구에 걸리지 않는다', () => {
    const entries = [snip('MYSQL')]
    expect(findExactSnippetMatch('mysql', 5, entries)).toBeNull()
    expect(findExactSnippetMatch('MYSQL', 5, entries)?.matches).toEqual(entries)
  })

  it('MYSQL 과 mysql 이 따로 있으면 친 글자와 대소문자가 같은 쪽만 걸린다', () => {
    const upper = snip('MYSQL', '공통', '대문자 본문')
    const lower = snip('mysql', '공통', '소문자 본문')
    expect(findExactSnippetMatch('mysql', 5, [upper, lower])?.matches).toEqual([lower])
    expect(findExactSnippetMatch('MYSQL', 5, [upper, lower])?.matches).toEqual([upper])
  })

  it('치환할 범위는 커서 앞의 단축어 글자 수만큼이다', () => {
    const match = findExactSnippetMatch('앞글자 MYSQL', 9, [snip('MYSQL')])
    expect(match).toMatchObject({ start: 4, end: 9 })
  })

  it('길이가 다른 후보가 동시에 걸리면 가장 긴 것이 이긴다', () => {
    const short = snip('SQL')
    const long = snip('MYSQL')
    expect(findExactSnippetMatch('MYSQL', 5, [short, long])?.matches).toEqual([long])
  })

  it('카테고리만 다른 같은 단축어는 모두 돌려준다 (호출부가 고르게 한다)', () => {
    const a = snip('MYSQL', 'A')
    const b = snip('MYSQL', 'B')
    expect(findExactSnippetMatch('MYSQL', 5, [a, b])?.matches).toEqual([a, b])
  })

  it('커서가 있는 줄만 본다', () => {
    expect(findExactSnippetMatch('MYSQL\n다른 줄', 9, [snip('MYSQL')])).toBeNull()
  })

  it('빈 줄·등록된 상용구 없음은 null', () => {
    expect(findExactSnippetMatch('   ', 3, [snip('MYSQL')])).toBeNull()
    expect(findExactSnippetMatch('MYSQL', 5, [])).toBeNull()
  })
})

describe('findSnippetQuery (타이핑 중 추천 팝업)', () => {
  it('대소문자를 가리지 않고 앞부분이 같은 상용구를 찾는다', () => {
    const entries = [snip('MySQL')]
    expect(findSnippetQuery('my', 2, entries)?.matches).toEqual(entries)
    expect(findSnippetQuery('MY', 2, entries)?.matches).toEqual(entries)
  })

  it('대소문자까지 같은 후보를 앞에 보여 준다', () => {
    const upper = snip('MYSQL')
    const lower = snip('mysql')
    expect(findSnippetQuery('mysql', 5, [upper, lower])?.matches).toEqual([lower, upper])
    expect(findSnippetQuery('MYSQL', 5, [lower, upper])?.matches).toEqual([upper, lower])
  })

  it('대소문자 일치 우선은 길이 정렬보다 앞선다', () => {
    const exactCase = snip('mysql-long')
    const otherCase = snip('MYSQL')
    expect(findSnippetQuery('mysql', 5, [otherCase, exactCase])?.matches[0]).toBe(exactCase)
  })

  it('일치 구간은 가장 긴 접미사부터 찾고, 시작 위치를 돌려준다', () => {
    const query = findSnippetQuery('앞 설명 mys', 8, [snip('mysql')])
    expect(query).toMatchObject({ start: 5, end: 8 })
  })

  it('맞는 게 없으면 null', () => {
    expect(findSnippetQuery('zzz', 3, [snip('mysql')])).toBeNull()
    expect(findSnippetQuery('mys', 3, [])).toBeNull()
  })
})
