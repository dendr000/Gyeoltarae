// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { findSnippetQuery } from '../../src/lib/snippetMatch.js'
import { folderGrammar, scopeSnippetsToContext, snippetContextAt } from '../../src/lib/snippetLanguage.js'

const e = (category, title, content = title, extra = {}) => ({ category, title, content, ...extra })
const titles = (list) => list.map((x) => `${x.category}/${x.title}`)

describe('folderGrammar — 폴더 이름이 언어 이름인가', () => {
  it('언어 이름이면 그 언어의 문법표를 돌려준다 (대소문자·별명 무시)', () => {
    expect(folderGrammar('C++')).toBe('cpp')
    expect(folderGrammar('Java')).toBe('java')
    expect(folderGrammar('java')).toBe('java')
    expect(folderGrammar('Python')).toBe('python')
    expect(folderGrammar('HTML')).toBe('xml')
    expect(folderGrammar('C#')).toBe('csharp')
    expect(folderGrammar('C')).toBe('c')
    expect(folderGrammar('SQL')).toBe('sql')
  })

  it('언어가 아닌 폴더는 null 이다', () => {
    for (const name of ['공통', '영어', '템플릿', '기호', '무협', '단어(강의/따즈아)']) {
      expect(folderGrammar(name), name).toBeNull()
    }
  })
})

describe('snippetContextAt — 커서가 있는 자리', () => {
  const doc = ['본문 글', '```C++', 'int x;', '```', '다시 글', '```', '언어 없는 블록', '```', '```Foobar', '모르는 언어', '```'].join('\n')
  const at = (text) => snippetContextAt(doc, doc.indexOf(text) + text.length)

  it('글(코드블록 밖)이면 null', () => {
    expect(at('본문 글')).toBeNull()
    expect(at('다시 글')).toBeNull()
  })

  it('언어가 적힌 코드블록 안이면 그 언어의 문법표', () => {
    expect(at('int x;')).toEqual({ grammar: 'cpp' })
  })

  it('언어를 안 적은 블록과 모르는 언어 블록은 grammar 가 null (코드블록 안이긴 하다)', () => {
    expect(at('언어 없는 블록')).toEqual({ grammar: null })
    expect(at('모르는 언어')).toEqual({ grammar: null })
  })

  it('블록이 닫힌 뒤에는 다시 글이다', () => {
    expect(snippetContextAt('```java\nint x;\n```\n글', 22)).toBeNull()
  })

  it('문서 맨 앞(pos 0)에서도 오류 없이 null', () => {
    expect(snippetContextAt('글', 0)).toBeNull()
  })
})

describe('scopeSnippetsToContext — 어느 폴더의 상용구를 쓰나', () => {
  const entries = [
    e('공통', '감사'),
    e('Java', 'public'),
    e('C#', 'public'),
    e('C++', 'public'),
    e('SQL', 'SELECT'),
    e('영어', 'ERD'),
  ]

  it('글에서는 언어 폴더를 빼고 나머지만 쓴다', () => {
    expect(titles(scopeSnippetsToContext(entries, null))).toEqual(['공통/감사', '영어/ERD'])
  })

  it('Java 블록에서는 Java 폴더와 언어가 아닌 폴더만 쓴다 (C#, C++ 의 같은 이름은 안 뜬다)', () => {
    expect(titles(scopeSnippetsToContext(entries, { grammar: 'java' }))).toEqual(['공통/감사', 'Java/public', '영어/ERD'])
  })

  it('MySQL·Oracle 블록은 SQL 문법이라 SQL 폴더를 쓴다', () => {
    expect(titles(scopeSnippetsToContext(entries, { grammar: 'sql' }))).toContain('SQL/SELECT')
  })

  it('언어를 모르는 블록(grammar null)에서는 언어 폴더를 쓰지 않는다', () => {
    expect(titles(scopeSnippetsToContext(entries, { grammar: null }))).toEqual(['공통/감사', '영어/ERD'])
  })

  it('같은 배열로 다시 부르면 같은 결과 배열을 돌려준다 (키 입력마다 다시 계산하지 않는다)', () => {
    const first = scopeSnippetsToContext(entries, { grammar: 'java' })
    expect(scopeSnippetsToContext(entries, { grammar: 'java' })).toBe(first)
  })

  it('문서에서 모은 영어 단어는 같은 제목의 상용구가 있으면 뺀다', () => {
    const list = [e('SQL', 'CREATE'), e('단어(강의)', 'create', 'create', { word: true }), e('단어(강의)', 'orders', 'orders', { word: true })]
    expect(titles(scopeSnippetsToContext(list, { grammar: 'sql' }))).toEqual(['SQL/CREATE', '단어(강의)/orders'])
    // 글에서는 SQL 폴더가 빠지므로 CREATE 단어가 그대로 남는다
    expect(titles(scopeSnippetsToContext(list, null))).toEqual(['단어(강의)/create', '단어(강의)/orders'])
  })

  it('빈 목록이어도 오류 없이 빈 목록', () => {
    expect(scopeSnippetsToContext([], null)).toEqual([])
  })
})

describe('findSnippetQuery — 코드블록 언어의 폴더가 위에 온다 (grammar 옵션)', () => {
  const entries = [e('공통', 'public_note'), e('Java', 'public'), e('Java', 'publish')]

  it('언어 폴더 → 언어와 상관없는 폴더 순이다', () => {
    const ctx = findSnippetQuery('pub', 3, entries, { wordStartOnly: true, grammar: 'java' })
    expect(titles(ctx.matches)).toEqual(['Java/public', 'Java/publish', '공통/public_note'])
  })

  it('grammar 를 안 주면 예전 정렬 그대로다 (짧은 제목 먼저)', () => {
    const ctx = findSnippetQuery('pub', 3, entries, { wordStartOnly: true })
    expect(titles(ctx.matches)[0]).toBe('Java/public')
  })

  it('_순서.txt 순위가 있어도 그 언어의 폴더가 먼저다', () => {
    const ranked = [e('공통', 'public_note', 'public_note', { rank: 0 }), e('Java', 'public')]
    const ctx = findSnippetQuery('pub', 3, ranked, { wordStartOnly: true, grammar: 'java' })
    expect(titles(ctx.matches)).toEqual(['Java/public', '공통/public_note'])
  })
})

describe('findSnippetQuery — 코드블록에서는 다 친 단어(int)도 후보 맨 위에 남는다', () => {
  const cpp = (title, content = title, extra = {}) => e('C++', title, content, extra)
  const run = (typed, entries, options = { wordStartOnly: true, grammar: 'cpp' }) =>
    findSnippetQuery(typed, typed.length, entries, options)

  it('int 를 다 쳐도 int 가 맨 위에 있고 int8_t 같은 긴 이름이 뒤따른다 (순서 목록에 있을 때)', () => {
    const entries = [cpp('int8_t'), cpp('int16_t'), cpp('int', 'int', { rank: 3 })]
    expect(run('int', entries).matches.map((m) => m.title)).toEqual(['int', 'int8_t', 'int16_t'])
  })

  it('순서 목록에 없어도 정확히 같은 단어가 먼저다', () => {
    const entries = [cpp('int8_t'), cpp('int')]
    expect(run('int', entries).matches.map((m) => m.title)).toEqual(['int', 'int8_t'])
  })

  it('걸리는 후보가 다 친 단어 하나뿐이면 팝업을 닫는다 (예전과 같음)', () => {
    expect(run('int', [cpp('int')])).toBeNull()
  })

  it('글(코드블록 밖)에서는 예전처럼 다 친 단어를 빼고 긴 이름만 보여 준다', () => {
    const entries = [e('공통', 'int8_t'), e('공통', 'int')]
    expect(run('int', entries, { wordStartOnly: false }).matches.map((m) => m.title)).toEqual(['int8_t'])
  })

  it('NOT NULL 을 다 쳤을 때 끝의 NULL 로 NULLIF 를 찾지 않는다 (코드블록에서도)', () => {
    const sql = (title) => e('SQL', title)
    expect(findSnippetQuery('NOT NULL', 8, [sql('NOT NULL'), sql('NULL'), sql('NULLIF')], { wordStartOnly: true, grammar: 'sql' })).toBeNull()
  })

  it('한두 글자만 쳤을 때 단어가 틀 줄임말보다 위에 온다 (in → int, include 가 incio 위)', () => {
    const entries = [cpp('incio', '#include <iostream>'), cpp('incvec', '#include <vector>'), cpp('inline'), cpp('int')]
    const titlesOf = run('in', entries).matches.map((m) => m.title)
    expect(titlesOf.slice(0, 2).sort()).toEqual(['inline', 'int'])
    expect(titlesOf.slice(2).sort()).toEqual(['incio', 'incvec'])
  })

  it('순서 목록에 있는 틀은 단어보다 위에 둘 수 있다', () => {
    const entries = [cpp('fori', 'for (int i...)', { rank: 0 }), cpp('format')]
    expect(run('for', entries).matches.map((m) => m.title)).toEqual(['fori', 'format'])
  })
})
