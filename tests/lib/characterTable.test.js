// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { looksLikeCharacterDoc, parseCharacters } from '../../src/lib/characterTable.js'

const SAMPLE = [
  '[[분류:작품]]',
  '[[분류:작품/등장인물]]',
  '',
  '[목차]',
  '',
  '= 귀능 =',
  '특기:복사',
  '서장의 비서인 판다 혼혈. 완력 2위.',
  '078 긁적긁적',
  '106 통행금지 “잽싸게 꺼져주세요.”',
  '',
  '= 오수 =',
  '특기:마약',
  '스푼을 지원하는 스폰서.',
  '031 마약 치료 “공룡?! 공룡이 걸어다녀?”',
].join('\n')

describe('parseCharacters: 요청서의 샘플 형식', () => {
  const { characters, columns } = parseCharacters(SAMPLE)

  it('인물 두 명을 읽고 분류·목차 줄은 인물로 보지 않는다', () => {
    expect(characters.map((c) => c.name)).toEqual(['귀능', '오수'])
  })

  it('특기 속성, 비고(설명 첫 줄), 회차를 읽는다', () => {
    const [a, b] = characters
    expect(a.attrs).toEqual({ 특기: '복사' })
    expect(a.note).toBe('서장의 비서인 판다 혼혈. 완력 2위.')
    expect(a.episodes).toEqual([
      { no: 78, text: '긁적긁적' },
      { no: 106, text: '통행금지 “잽싸게 꺼져주세요.”' },
    ])
    expect(a.firstEpisode).toBe(78)
    expect(a.lastEpisode).toBe(106)
    expect(a.episodeCount).toBe(2)
    expect(b.firstEpisode).toBe(31)
  })

  it('속성 열 목록을 돌려준다', () => {
    expect(columns).toEqual(['특기'])
  })

  it('제목 줄의 위치(글자 위치·줄 번호)를 알려 준다', () => {
    const [a, b] = characters
    expect(SAMPLE.slice(a.offset, a.offset + 6)).toBe('= 귀능 =')
    expect(a.line).toBe(6)
    expect(SAMPLE.slice(b.offset, b.offset + 6)).toBe('= 오수 =')
  })
})

describe('parseCharacters: 경계 입력', () => {
  it('빈 글·공백만·잘못된 입력은 인물 없음', () => {
    for (const v of ['', '   \n\n', undefined, null]) {
      expect(parseCharacters(v)).toEqual({ characters: [], columns: [] })
    }
  })

  it('속성이 없는 인물은 empty 로 표시한다', () => {
    const { characters } = parseCharacters('= 가 =\n= 나 =\n특기:x')
    expect(characters[0].empty).toBe(true)
    expect(characters[0].attrs).toEqual({})
    expect(characters[1].empty).toBe(false)
  })

  it('이름이 ??? 인 인물은 unknownName 이고 중복으로 세지 않는다', () => {
    const { characters } = parseCharacters('= ??? =\n특기:a\n= ??? =\n특기:b')
    expect(characters.map((c) => c.unknownName)).toEqual([true, true])
    expect(characters.map((c) => c.duplicate)).toEqual([false, false])
  })

  it('같은 이름이 두 번 나오면 둘 다 duplicate', () => {
    const { characters } = parseCharacters('= 귀능 =\n특기:a\n= 오수 =\n특기:b\n= 귀능 =\n특기:c')
    expect(characters.map((c) => c.duplicate)).toEqual([true, false, true])
  })

  it('이름 줄에 각주·꺾쇠가 있어도 이름만 남긴다', () => {
    const { characters } = parseCharacters('= 〈귀능〉[* 별명] =\n특기:a')
    expect(characters[0].name).toBe('〈귀능〉')
  })

  it('같은 키가 두 번 나오면 값을 쉼표로 잇는다', () => {
    const { characters } = parseCharacters('= 가 =\n특기:복사\n특기:마약')
    expect(characters[0].attrs).toEqual({ 특기: '복사, 마약' })
  })

  it('전각 콜론도 속성으로 읽는다', () => {
    expect(parseCharacters('= 가 =\n특기：복사')['characters'][0].attrs).toEqual({ 특기: '복사' })
  })

  it('주소(https://)와 숫자로 시작하는 줄과 긴 문장은 속성이 아니다', () => {
    const { characters } = parseCharacters('= 가 =\nhttps://a.b/c\n3월: 시작\n이 문장은 키가 너무 길어서 속성이 아니라 설명입니다: 값')
    expect(characters[0].attrs).toEqual({})
    expect(characters[0].note).toBe('https://a.b/c')
  })

  it('회차 번호가 뒤바뀌어도 최소·최대로 구한다', () => {
    const { characters } = parseCharacters('= 가 =\n200 b\n010 a\n150 c')
    expect(characters[0].firstEpisode).toBe(10)
    expect(characters[0].lastEpisode).toBe(200)
    expect(characters[0].episodeCount).toBe(3)
  })

  it('두 자리 숫자로 시작하는 줄은 회차가 아니다', () => {
    const { characters } = parseCharacters('= 가 =\n12 개의 눈')
    expect(characters[0].episodes).toEqual([])
    expect(characters[0].note).toBe('12 개의 눈')
  })

  it('코드블록 안의 제목은 읽지 않는다', () => {
    const { characters } = parseCharacters('= 가 =\n특기:a\n```\n= 코드 =\n특기:z\n```')
    expect(characters.map((c) => c.name)).toEqual(['가'])
    expect(characters[0].attrs).toEqual({ 특기: 'a' })
  })

  it('CRLF 줄바꿈 글도 같은 위치로 읽는다', () => {
    const text = '= 가 =\r\n특기:a\r\n= 나 =\r\n특기:b'
    const { characters } = parseCharacters(text)
    expect(characters.map((c) => c.name)).toEqual(['가', '나'])
    expect(text.slice(characters[1].offset, characters[1].offset + 5)).toBe('= 나 =')
  })

  it('표 줄·목록·인용·태그 줄은 비고가 되지 않는다', () => {
    const { characters } = parseCharacters('= 가 =\n||a||b||\n* 목록\n> 인용\n#태그\n진짜 설명')
    expect(characters[0].note).toBe('진짜 설명')
  })
})

describe('parseCharacters: 소속(상위 제목)', () => {
  const text = '= 1부 =\n== 동맹 ==\n=== 가 ===\n특기:a\n=== 나 ===\n특기:b\n== 적 ==\n=== 다 ===\n특기:c\n= 2부 =\n== 라 ==\n특기:d'

  it('인물 위쪽의 제목들을 소속으로 붙인다', () => {
    const { characters } = parseCharacters(text)
    expect(characters.map((c) => [c.name, c.group])).toEqual([
      ['가', '1부 > 동맹'],
      ['나', '1부 > 동맹'],
      ['다', '1부 > 적'],
      ['라', '2부'],
    ])
  })

  it('아래에 더 작은 제목이 있는 제목은 인물이 아니라 소속이다', () => {
    const { characters } = parseCharacters(text)
    expect(characters.some((c) => c.name === '동맹' || c.name === '1부')).toBe(false)
  })

  it('소속이 없으면 빈 글', () => {
    expect(parseCharacters('= 가 =\n특기:a').characters[0].group).toBe('')
  })
})

describe('parseCharacters: 열 순서와 인물 문서 판별', () => {
  it('많이 쓰인 키가 앞에 온다', () => {
    const { columns } = parseCharacters('= 가 =\n나이:1\n특기:a\n= 나 =\n특기:b\n= 다 =\n특기:c')
    expect(columns).toEqual(['특기', '나이'])
  })

  it('인물 문서: 3명 이상이고 절반 이상이 속성·회차를 가질 때', () => {
    expect(looksLikeCharacterDoc(parseCharacters(SAMPLE))).toBe(false) // 2명뿐
    expect(looksLikeCharacterDoc(parseCharacters('= a =\n특기:1\n= b =\n특기:2\n= c =\n특기:3'))).toBe(true)
    expect(looksLikeCharacterDoc(parseCharacters('= a =\n= b =\n= c =\n= d =\n특기:x'))).toBe(false)
  })

  it('1,000명 문서도 한 번에 읽는다', () => {
    const lines = []
    for (let i = 0; i < 1000; i += 1) lines.push(`= 인물${i} =`, `특기:기술${i % 7}`, '설명 한 줄', `${String(100 + i).padStart(3, '0')} 제목 대사`)
    const start = performance.now()
    const { characters } = parseCharacters(lines.join('\n'))
    expect(characters).toHaveLength(1000)
    expect(performance.now() - start).toBeLessThan(1000)
  })
})
