import { describe, expect, it } from 'vitest'
import {
  buildScopeWordIndex,
  extractWords,
  scopeOfPath,
  withWholeTop,
  wordCandidates,
} from '../../src/lib/scopeWords.js'

const ROOT = 'D:/WikiDesk'
const doc = (content) => ({ content })

describe('extractWords (영어 단어 뽑기)', () => {
  it('영문자로 시작하는 3글자 이상 단어를 뽑는다', () => {
    expect(extractWords('CREATE TABLE emp (employee_id INT);')).toEqual(['CREATE', 'TABLE', 'emp', 'employee_id', 'INT'])
  })

  it('2글자 이하, 숫자로 시작하는 것, 한글은 뽑지 않는다', () => {
    expect(extractWords('ab 12abc 한글word 가나다')).toEqual(['word'])
  })

  it('위키 링크·분류, 틀, 표 속성 태그, 주소 안의 글자는 단어로 세지 않는다', () => {
    const text = '[[분류:ddazua]] [[문서Name|표시Text]] {{틀:Template}} <bgcolor=#fff> https://example.com/path Real'
    expect(extractWords(text)).toEqual(['Real'])
  })

  it('코드블록 안의 단어도 뽑는다', () => {
    expect(extractWords('```sql\nSELECT name\n```')).toEqual(['sql', 'SELECT', 'name'])
  })

  it('빈 글이나 없는 값은 빈 목록', () => {
    expect(extractWords('')).toEqual([])
    expect(extractWords(undefined)).toEqual([])
  })
})

describe('scopeOfPath (문서의 범위)', () => {
  it('두 번째 단계 폴더 안의 문서는 "최상위/두번째" 가 범위', () => {
    expect(scopeOfPath(`${ROOT}/강의/따즈아/01 가/문서.md`, ROOT)).toEqual({ top: '강의', scope: '강의/따즈아' })
    expect(scopeOfPath(`${ROOT}/웹툰/멸망 이후의 세계/문서.md`, ROOT)).toEqual({ top: '웹툰', scope: '웹툰/멸망 이후의 세계' })
  })

  it('최상위 폴더 바로 아래의 문서는 그 최상위 폴더가 범위', () => {
    expect(scopeOfPath(`${ROOT}/강의/문서.md`, ROOT)).toEqual({ top: '강의', scope: '강의' })
  })

  it('루트 바로 아래의 문서와 루트 밖의 문서는 범위가 없다 (null)', () => {
    expect(scopeOfPath(`${ROOT}/문서.md`, ROOT)).toBeNull()
    expect(scopeOfPath('E:/다른곳/강의/따즈아/문서.md', ROOT)).toBeNull()
    expect(scopeOfPath(`${ROOT}2/강의/따즈아/문서.md`, ROOT)).toBeNull()
  })

  it('역슬래시 경로와 끝의 구분자도 받는다', () => {
    expect(scopeOfPath('D:\\WikiDesk\\강의\\따즈아\\문서.md', 'D:\\WikiDesk\\')).toEqual({ top: '강의', scope: '강의/따즈아' })
  })
})

describe('buildScopeWordIndex + wordCandidates', () => {
  const searchIndex = {
    [`${ROOT}/강의/따즈아/A.md`]: doc('CREATE TABLE emp; create index'),
    [`${ROOT}/강의/따즈아/B.md`]: doc('CREATE VIEW'),
    [`${ROOT}/강의/다른강의/C.md`]: doc('Alpha Beta'),
    [`${ROOT}/웹툰/작품/D.md`]: doc('Webtoon'),
    [`${ROOT}/루트문서.md`]: doc('RootOnly'),
  }
  const index = buildScopeWordIndex(searchIndex, ROOT)
  const titles = (items) => items.map((i) => i.title).sort()

  it('같은 범위의 다른 문서에서 쓴 단어가 후보가 된다 (문서 B 를 쓸 때 문서 A 의 단어)', () => {
    const items = wordCandidates(index, { currentPath: `${ROOT}/강의/따즈아/B.md`, root: ROOT })
    expect(titles(items)).toEqual(['CREATE', 'TABLE', 'emp', 'index'])
  })

  it('이 문서에서만 나온 단어(VIEW)는 후보에서 뺀다', () => {
    const items = wordCandidates(index, { currentPath: `${ROOT}/강의/따즈아/B.md`, root: ROOT })
    expect(titles(items)).not.toContain('VIEW')
  })

  it('다른 범위의 단어는 뜨지 않는다 (기본: 두 번째 단계 폴더 안만)', () => {
    const items = wordCandidates(index, { currentPath: `${ROOT}/강의/따즈아/B.md`, root: ROOT })
    expect(titles(items)).not.toContain('Alpha')
    expect(titles(items)).not.toContain('Webtoon')
  })

  it('최상위 폴더 전체 모으기를 켜면 같은 최상위 폴더의 다른 두 번째 폴더 단어도 뜬다', () => {
    const items = wordCandidates(index, { currentPath: `${ROOT}/강의/따즈아/B.md`, root: ROOT, wholeTops: ['강의'] })
    expect(titles(items)).toContain('Alpha')
    expect(titles(items)).toContain('Beta')
    expect(titles(items)).not.toContain('Webtoon') // 다른 최상위 폴더는 여전히 안 섞인다
  })

  it('전체 모으기는 최상위 폴더마다 따로 켠다', () => {
    const items = wordCandidates(index, { currentPath: `${ROOT}/강의/따즈아/B.md`, root: ROOT, wholeTops: ['웹툰'] })
    expect(titles(items)).not.toContain('Alpha')
  })

  it('대소문자가 다른 같은 단어는 하나로 묶고 가장 많이 쓴 모양으로 보인다', () => {
    const si = {
      [`${ROOT}/강의/따즈아/A.md`]: doc('create CREATE create'),
      [`${ROOT}/강의/따즈아/B.md`]: doc('x'),
    }
    const items = wordCandidates(buildScopeWordIndex(si, ROOT), { currentPath: `${ROOT}/강의/따즈아/B.md`, root: ROOT })
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('create')
    expect(items[0].freq).toBe(3)
  })

  it('횟수가 같으면 사전순(대문자 먼저)', () => {
    const si = {
      [`${ROOT}/강의/따즈아/A.md`]: doc('create CREATE'),
      [`${ROOT}/강의/따즈아/B.md`]: doc('x'),
    }
    const items = wordCandidates(buildScopeWordIndex(si, ROOT), { currentPath: `${ROOT}/강의/따즈아/B.md`, root: ROOT })
    expect(items[0].title).toBe('CREATE')
  })

  it('후보는 상용구 후보와 같은 모양에 word: true, freq 가 있다', () => {
    const [item] = wordCandidates(index, { currentPath: `${ROOT}/강의/따즈아/B.md`, root: ROOT }).filter((i) => i.title === 'CREATE')
    expect(item).toMatchObject({ title: 'CREATE', content: 'CREATE', word: true, freq: 3, category: '단어(강의/따즈아)' })
  })

  it('excludeLower 에 있는 단어(같은 이름의 상용구가 있음)는 뺀다', () => {
    const items = wordCandidates(index, {
      currentPath: `${ROOT}/강의/따즈아/B.md`,
      root: ROOT,
      excludeLower: new Set(['create']),
    })
    expect(titles(items)).not.toContain('CREATE')
  })

  it('루트 바로 아래의 문서를 쓸 때와 범위에 문서가 없을 때는 빈 목록', () => {
    expect(wordCandidates(index, { currentPath: `${ROOT}/루트문서.md`, root: ROOT })).toEqual([])
    expect(wordCandidates(index, { currentPath: `${ROOT}/새폴더/하위/X.md`, root: ROOT })).toEqual([])
    expect(wordCandidates(null, { currentPath: `${ROOT}/강의/따즈아/B.md`, root: ROOT })).toEqual([])
    expect(wordCandidates(index, { currentPath: null, root: ROOT })).toEqual([])
  })

  it('루트 바로 아래 문서의 단어는 어느 범위에도 들어가지 않는다', () => {
    const all = wordCandidates(index, { currentPath: `${ROOT}/강의/따즈아/B.md`, root: ROOT, wholeTops: ['강의'] })
    expect(titles(all)).not.toContain('RootOnly')
  })
})

describe('withWholeTop', () => {
  it('켜면 목록에 더하고 끄면 뺀다 (원래 목록은 그대로)', () => {
    const base = ['강의']
    expect(withWholeTop(base, '웹툰', true)).toEqual(['강의', '웹툰'])
    expect(withWholeTop(base, '강의', false)).toEqual([])
    expect(withWholeTop(base, '강의', true)).toEqual(['강의'])
    expect(base).toEqual(['강의'])
  })
})
