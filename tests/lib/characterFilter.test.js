// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { parseCharacters } from '../../src/lib/characterTable.js'
import { attrValueCounts, filterCharacters, sortCharacters, splitAttrValue, toWikiTable } from '../../src/lib/characterFilter.js'

const TEXT = [
  '= 귀능 =',
  '특기:복사',
  '판다 혼혈.',
  '078 a',
  '106 b',
  '= 오수 =',
  '특기:마약, 복사',
  '스폰서.',
  '031 c',
  '= 하늘 =',
  '소속:서장',
  '비서.',
  '= 나비 =',
  '특기:요리',
  '300 d',
].join('\n')
const { characters } = parseCharacters(TEXT)
const names = (list) => list.map((c) => c.name)

describe('splitAttrValue·attrValueCounts', () => {
  it('쉼표·가운뎃점·슬래시로 나누고 빈 조각은 버린다', () => {
    expect(splitAttrValue('복사, 마약 / 요리·검,, ')).toEqual(['복사', '마약', '요리', '검'])
    expect(splitAttrValue(undefined)).toEqual([])
  })

  it('값별 인물 수를 많은 순으로 센다', () => {
    expect(attrValueCounts(characters, '특기')).toEqual([
      { value: '복사', count: 2 },
      { value: '마약', count: 1 },
      { value: '요리', count: 1 },
    ])
  })

  it('한 인물이 같은 값을 두 번 가져도 한 번만 센다', () => {
    const c = parseCharacters('= a =\n특기:복사, 복사').characters
    expect(attrValueCounts(c, '특기')).toEqual([{ value: '복사', count: 1 }])
  })
})

describe('filterCharacters', () => {
  it('필터가 없으면 전부', () => {
    expect(filterCharacters(characters)).toHaveLength(4)
    expect(filterCharacters(characters, { query: '  ', attrs: { 특기: [] } })).toHaveLength(4)
  })

  it('글자 검색은 이름·속성 값·비고를 대소문자 없이 찾는다', () => {
    expect(names(filterCharacters(characters, { query: '귀' }))).toEqual(['귀능'])
    expect(names(filterCharacters(characters, { query: '마약' }))).toEqual(['오수'])
    expect(names(filterCharacters(characters, { query: '스폰' }))).toEqual(['오수'])
  })

  it('속성 칩: 같은 키 안은 하나라도 맞으면, 키끼리는 모두 맞아야 통과', () => {
    expect(names(filterCharacters(characters, { attrs: { 특기: ['복사'] } }))).toEqual(['귀능', '오수'])
    expect(names(filterCharacters(characters, { attrs: { 특기: ['복사', '요리'] } }))).toEqual(['귀능', '오수', '나비'])
    expect(names(filterCharacters(characters, { attrs: { 특기: ['복사'], 소속: ['서장'] } }))).toEqual([])
  })

  it('회차 범위: 범위 안에 등장하는 회차가 하나라도 있는 인물', () => {
    expect(names(filterCharacters(characters, { episodeFrom: 100, episodeTo: 200 }))).toEqual(['귀능'])
    expect(names(filterCharacters(characters, { episodeFrom: 200 }))).toEqual(['나비'])
    expect(names(filterCharacters(characters, { episodeTo: 50 }))).toEqual(['오수'])
  })

  it('회차 범위가 거꾸로여도(시작>끝) 뒤집어 읽고, 회차 없는 인물은 범위를 걸면 빠진다', () => {
    expect(names(filterCharacters(characters, { episodeFrom: 200, episodeTo: 100 }))).toEqual(['귀능'])
    expect(names(filterCharacters(characters, { episodeFrom: 0 }))).not.toContain('하늘')
  })

  it('숫자가 아닌 회차 입력은 걸지 않은 것으로 본다', () => {
    expect(filterCharacters(characters, { episodeFrom: 'abc', episodeTo: '' })).toHaveLength(4)
  })

  it('여러 조건은 모두 맞아야 한다', () => {
    expect(names(filterCharacters(characters, { query: '오', attrs: { 특기: ['복사'] }, episodeTo: 50 }))).toEqual(['오수'])
  })
})

describe('sortCharacters', () => {
  it('이름 오름·내림, 원본은 그대로', () => {
    const before = names(characters)
    expect(names(sortCharacters(characters, 'name'))).toEqual(['귀능', '나비', '오수', '하늘'])
    expect(names(sortCharacters(characters, 'name', 'desc'))[0]).toBe('하늘')
    expect(names(characters)).toEqual(before)
  })

  it('첫 회차 숫자순, 값 없는 인물은 오름·내림 모두 맨 뒤', () => {
    expect(names(sortCharacters(characters, 'first'))).toEqual(['오수', '귀능', '나비', '하늘'])
    expect(names(sortCharacters(characters, 'first', 'desc'))).toEqual(['나비', '귀능', '오수', '하늘'])
  })

  it('속성 키로 정렬하고 속성이 없는 인물은 뒤', () => {
    expect(names(sortCharacters(characters, '특기')).slice(-1)).toEqual(['하늘'])
  })

  it('같은 값이면 문서 순서를 지킨다', () => {
    expect(names(sortCharacters(characters, 'count', 'asc'))).toEqual(['하늘', '오수', '나비', '귀능'])
  })

  it('order 로 문서 순서로 되돌린다', () => {
    expect(names(sortCharacters(sortCharacters(characters, 'name'), 'order'))).toEqual(names(characters))
  })
})

describe('toWikiTable', () => {
  it('머리글 줄과 인물 줄을 위키 표 글자로 만든다', () => {
    const table = toWikiTable(characters.slice(0, 1), ['특기'])
    expect(table.split('\n')).toEqual(['||=이름=||=특기=||=첫 회차=||=마지막 회차=||', '||귀능||복사||78||106||'])
  })

  it('소속이 하나라도 있으면 소속 열을 넣는다', () => {
    const c = parseCharacters('= 1부 =\n== 가 ==\n특기:a').characters
    expect(toWikiTable(c, ['특기']).split('\n')[0]).toBe('||=이름=||=소속=||=특기=||=첫 회차=||=마지막 회차=||')
  })

  it('칸 안의 | 와 줄바꿈은 표를 깨므로 바꾼다', () => {
    const c = [{ name: 'a|b', group: '', attrs: { 특기: 'x\ny' }, firstEpisode: null, lastEpisode: null }]
    expect(toWikiTable(c, ['특기']).split('\n')[1]).toBe('||a/b||x y||||||')
  })

  it('인물이 없으면 머리글 줄만', () => {
    expect(toWikiTable([], ['특기'])).toBe('||=이름=||=특기=||=첫 회차=||=마지막 회차=||')
  })
})
