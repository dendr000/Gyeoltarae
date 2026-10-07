import { describe, expect, it } from 'vitest'
import { enterAcceptsSuggestion, findExactSnippetMatch, findSnippetQuery } from '../../src/lib/snippetMatch.js'

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

describe('findSnippetQuery — 이미 친 글자와 똑같이 되는 후보는 내지 않는다', () => {
  it('다 쳤고 확정해도 아무것도 안 바뀌는 후보(본문이 친 글자와 같음)는 목록에서 빠진다', () => {
    const exact = { category: 'SQL', title: 'NULL', content: 'NULL' }
    const longer = { category: 'SQL', title: 'NULLIF', content: 'NULLIF' }
    expect(findSnippetQuery('NULL', 4, [exact, longer])?.matches).toEqual([longer])
  })

  it('걸리는 후보가 전부 그런 것이면 팝업 자체가 없다', () => {
    expect(findSnippetQuery('SELECT', 6, [{ category: 'SQL', title: 'SELECT', content: 'SELECT' }])).toBeNull()
  })

  it('"NOT NULL" 을 다 쳤으면 끝의 "NULL" 로 NULLIF 를 찾지 않고 팝업을 닫는다', () => {
    const entries = [
      { category: 'SQL', title: 'NOT NULL', content: 'NOT NULL' },
      { category: 'SQL', title: 'NULL', content: 'NULL' },
      { category: 'SQL', title: 'NULLIF', content: 'NULLIF' },
    ]
    expect(findSnippetQuery('name VARCHAR(10) NOT NULL', 25, entries)).toBeNull()
  })

  it('아직 덜 친 키워드는 그대로 후보가 뜬다 ("NOT NU" → NOT NULL)', () => {
    const entries = [
      { category: 'SQL', title: 'NOT NULL', content: 'NOT NULL' },
      { category: 'SQL', title: 'NULLIF', content: 'NULLIF' },
    ]
    expect(findSnippetQuery('x NOT NU', 8, entries)?.matches.map((e) => e.title)).toEqual(['NOT NULL'])
  })

  it('소문자로 쳤으면 대문자 본문은 바뀌는 것이라 후보로 남는다', () => {
    const entry = { category: 'SQL', title: 'SELECT', content: 'SELECT' }
    expect(findSnippetQuery('select', 6, [entry])?.matches).toEqual([entry])
  })

  it('본문이 다르면(MYSQL → MySQL) 제목이 같아도 후보로 남는다', () => {
    const entry = { category: '영어', title: 'MYSQL', content: 'MySQL' }
    expect(findSnippetQuery('MYSQL', 5, [entry])?.matches).toEqual([entry])
  })

  it('{#} 커서 표시가 든 본문은 확정하면 글자가 바뀌므로 후보로 남는다', () => {
    const entry = { category: 'SQL', title: 'W', content: 'W{#}' }
    expect(findSnippetQuery('W', 1, [entry])?.matches).toEqual([entry])
  })
})

// 순서 목록(_순서.txt)에서 온 rank(작을수록 위)가 같은 앞글자의 후보 정렬에 쓰인다.
describe('findSnippetQuery — rank (순서 목록으로 SELECT 를 SET 보다 위로)', () => {
  const e = (title, rank) => ({ category: 'SQL', title, content: title, rank })
  const titles = (value, entries) => findSnippetQuery(value, value.length, entries)?.matches.map((m) => m.title)

  it('rank 가 작은(= 목록에서 위인) 후보가 짧은 제목보다 먼저 온다 — s 에서 SELECT 가 SET 보다 위', () => {
    const entries = [e('SET', 6), e('SUM', 35), e('SELECT', 0), e('SMALLINT', 70)]
    expect(titles('s', entries)).toEqual(['SELECT', 'SET', 'SUM', 'SMALLINT'])
  })

  it('rank 가 없는 후보(순서 목록에 없는 상용구)는 rank 있는 후보 뒤에서 예전처럼 짧은 순이다', () => {
    const entries = [e('SELECT', 0), { category: 'SQL', title: 'SX', content: 'SX' }, { category: 'SQL', title: 'SYSTEM', content: 'SYSTEM' }]
    expect(titles('s', entries)).toEqual(['SELECT', 'SX', 'SYSTEM'])
  })

  it('rank 가 전혀 없으면 예전 정렬과 똑같다 (짧은 제목 순)', () => {
    const entries = ['SELECT', 'SET', 'SUM'].map((t) => ({ category: 'SQL', title: t, content: t }))
    expect(titles('s', entries)).toEqual(['SET', 'SUM', 'SELECT'])
  })

  it('친 글자와 제목이 정확히 같은 후보는 rank 가 낮아도 맨 위다', () => {
    const entries = [e('SETS', 0), e('SET', 9)]
    expect(titles('set', entries)).toEqual(['SET', 'SETS'])
  })

  it('대소문자까지 같은 후보가 rank 보다 우선한다', () => {
    // MYSQL 이 rank 0(더 위)이어도, 소문자로 쳤으면 대소문자까지 같은 mysql 이 먼저
    const entries = [e('mysql', 9), e('MYSQL', 0)]
    expect(titles('mysq', entries)).toEqual(['mysql', 'MYSQL'])
    // 대문자로 쳤으면 MYSQL 이 먼저
    expect(titles('MYSQ', entries)).toEqual(['MYSQL', 'mysql'])
  })

  it('rank 가 같으면 짧은 순, 그다음 가나다순', () => {
    const entries = [e('SUBSTRING', 3), e('SUM', 3), e('SAVEPOINT', 3)]
    expect(titles('s', entries)).toEqual(['SUM', 'SAVEPOINT', 'SUBSTRING'])
  })
})

// 코드블록 안에서는 단어 "중간"(NAME 의 끝 E)부터 시작하는 글자로는 후보를 찾지 않는다.
// 예전에는 SELECT NAME 을 치면 끝의 "E" 한 글자로 END, ERD, ELSE ... 가 추천됐다.
describe('findSnippetQuery — wordStartOnly (코드에서 단어 중간부터는 찾지 않음)', () => {
  const kw = (...titles) => titles.map((title) => ({ category: 'SQL', title, content: title }))
  const KEYWORDS = kw('END', 'ELSE', 'ENUM', 'ENGINE', 'EXISTS', 'NOW', 'NULL', 'SELECT', 'ORDER BY')
  const query = (value, entries = KEYWORDS, options = { wordStartOnly: true }) =>
    findSnippetQuery(value, value.length, entries, options)

  it('NAME 을 치면 끝의 E 로 END 등을 추천하지 않는다 (스크린샷의 증상)', () => {
    expect(query('SELECT NAME')).toBeNull()
    expect(query('NAME')).toBeNull()
  })

  it('옵션을 끄면(코드블록 밖) 예전처럼 끝 글자로도 찾는다', () => {
    const titles = query('NAME', KEYWORDS, { wordStartOnly: false })?.matches.map((e) => e.title)
    expect(titles).toContain('END')
  })

  it('단어를 새로 시작하는 자리에서는 정상으로 찾는다 — 줄 맨 앞, 공백·괄호·점·쉼표 뒤', () => {
    expect(query('sel')?.matches.map((e) => e.title)).toEqual(['SELECT'])
    expect(query('SELECT * FROM t WHERE x IS sel')?.matches.map((e) => e.title)).toEqual(['SELECT'])
    expect(query('COUNT(sel')?.matches.map((e) => e.title)).toEqual(['SELECT'])
    expect(query('a, sel')?.matches.map((e) => e.title)).toEqual(['SELECT'])
    expect(query('t.nu')?.matches.map((e) => e.title)).toEqual(['NULL'])
  })

  it('밑줄이나 숫자 뒤에 이어진 글자(user_name, col1x)는 새 단어가 아니다', () => {
    expect(query('user_name')).toBeNull()
    expect(query('col1e')).toBeNull()
  })

  it('띄어쓰기가 든 키워드는 단어 시작에서부터 이어서 찾는다 ("order b" → ORDER BY)', () => {
    expect(query('SELECT 1 order b')?.matches.map((e) => e.title)).toEqual(['ORDER BY'])
  })

  it('한글도 단어 중간에서는 찾지 않고, 공백 뒤에서는 찾는다', () => {
    const entries = [{ category: '영어', title: '속성', content: '속성(property)' }]
    expect(query('이름속', entries)).toBeNull()
    expect(query('이름 속', entries)?.matches.map((e) => e.title)).toEqual(['속성'])
  })

  it('기호로 시작하는 상용구(->)는 글자 바로 뒤에서도 찾는다', () => {
    const entries = [{ category: '기호', title: '->', content: '→' }]
    expect(query('a->', entries)?.matches.map((e) => e.title)).toEqual(['->'])
  })

  it('다 친 키워드는 여전히 팝업이 없다 (wordStartOnly 와 함께)', () => {
    expect(query('SELECT')).toBeNull()
  })
})

describe('enterAcceptsSuggestion (Enter 가 추천 후보를 확정하는가)', () => {
  it('코드블록 밖에서는 예전처럼 Enter 가 확정한다', () => {
    expect(enterAcceptsSuggestion({ inCodeBlock: false, navigated: false })).toBe(true)
  })

  it('코드블록 안에서는 방향키로 고르지 않았다면 Enter 는 확정하지 않는다 (줄바꿈이 들어간다)', () => {
    expect(enterAcceptsSuggestion({ inCodeBlock: true, navigated: false })).toBe(false)
  })

  it('코드블록 안이어도 방향키로 후보를 골랐다면 Enter 가 확정한다', () => {
    expect(enterAcceptsSuggestion({ inCodeBlock: true, navigated: true })).toBe(true)
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
