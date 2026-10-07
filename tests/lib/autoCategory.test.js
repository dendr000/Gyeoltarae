import { describe, expect, it } from 'vitest'
import {
  AUTO_CATEGORY_FILE,
  fillCategoryTags,
  formatKeywordInput,
  matchKeywords,
  parseKeywordInput,
  relativeSegments,
} from '../../src/lib/autoCategory.js'
import { DDAZUA_TEMPLATE } from '../helpers/ddazuaTemplate.js'

// 사용자가 든 예: 폴더 '01 올인원 DBMS!! 설계부터 운영까지!!', 문서 '04 외래키와 Join', 읽을 글자 DBMS·외래키
const FOLDER = '01 올인원 DBMS!! 설계부터 운영까지!!'
const DOC = '04 외래키와 Join'

describe('parseKeywordInput (입력칸의 글 → 읽어들일 글자 목록)', () => {
  it('쉼표로 나눈다', () => {
    expect(parseKeywordInput('DBMS, 외래키, Join')).toEqual(['DBMS', '외래키', 'Join'])
  })

  it('줄바꿈·세미콜론·전각 쉼표(，)·가운뎃점 쉼표(、)로도 나눈다', () => {
    expect(parseKeywordInput('DBMS\n외래키;Join，정렬、집계')).toEqual(['DBMS', '외래키', 'Join', '정렬', '집계'])
  })

  it('앞뒤 공백을 지우되 글자 안의 공백(Group by)은 그대로 둔다', () => {
    expect(parseKeywordInput('  Group by  ,  DBMS ')).toEqual(['Group by', 'DBMS'])
  })

  it('빈 항목과 중복(같은 글자)은 버린다', () => {
    expect(parseKeywordInput('DBMS,, ,DBMS,외래키,')).toEqual(['DBMS', '외래키'])
  })

  it('비었거나 공백뿐이면 빈 목록', () => {
    expect(parseKeywordInput('')).toEqual([])
    expect(parseKeywordInput('  \n , ; ')).toEqual([])
    expect(parseKeywordInput(undefined)).toEqual([])
  })
})

describe('formatKeywordInput (목록 → 입력칸의 글)', () => {
  it('쉼표와 공백으로 이어 붙인다', () => {
    expect(formatKeywordInput(['DBMS', '외래키'])).toBe('DBMS, 외래키')
  })

  it('parse 와 format 이 서로 되돌린다', () => {
    const keywords = ['DBMS', '외래키', 'Group by']
    expect(parseKeywordInput(formatKeywordInput(keywords))).toEqual(keywords)
  })

  it('빈 목록·없음은 빈 글', () => {
    expect(formatKeywordInput([])).toBe('')
    expect(formatKeywordInput(undefined)).toBe('')
  })
})

describe('relativeSegments (설정이 있는 폴더 아래 ~ 문서가 놓일 폴더까지의 폴더 이름들)', () => {
  it('설정 폴더 바로 아래 폴더', () => {
    expect(relativeSegments('/ws/강의/따즈아', `/ws/강의/따즈아/${FOLDER}`)).toEqual([FOLDER])
  })

  it('더 깊은 폴더는 위에서 아래 순서로 모두', () => {
    expect(relativeSegments('/ws/따즈아', '/ws/따즈아/가/나/다')).toEqual(['가', '나', '다'])
  })

  it('문서가 설정 폴더 자신에 놓이면 빈 목록 (설정 폴더 이름 자체는 읽지 않는다)', () => {
    expect(relativeSegments('/ws/따즈아', '/ws/따즈아')).toEqual([])
  })

  it('Windows 경로(역슬래시)와 섞여 있어도 된다', () => {
    expect(relativeSegments('D:\\WikiDesk\\강의\\따즈아', `D:\\WikiDesk\\강의\\따즈아\\${FOLDER}`)).toEqual([FOLDER])
    expect(relativeSegments('D:\\WikiDesk\\강의\\따즈아', `D:/WikiDesk/강의/따즈아/${FOLDER}`)).toEqual([FOLDER])
  })

  it('끝의 슬래시가 있어도 된다', () => {
    expect(relativeSegments('/ws/따즈아/', '/ws/따즈아/가/')).toEqual(['가'])
  })

  it('이름이 앞부분만 같은 다른 폴더(따즈아2)는 하위가 아니라서 빈 목록', () => {
    expect(relativeSegments('/ws/따즈아', '/ws/따즈아2/가')).toEqual([])
  })
})

describe('matchKeywords (이름에서 읽어들일 글자 찾기)', () => {
  it('폴더 이름에서 DBMS, 문서 이름에서 외래키를 찾는다 (사용자가 든 예)', () => {
    expect(matchKeywords(['DBMS', '외래키'], [FOLDER, DOC])).toEqual(['DBMS', '외래키'])
  })

  it('문서 이름에 읽을 글자가 없으면 폴더에서 찾은 것만', () => {
    expect(matchKeywords(['DBMS', '외래키'], [FOLDER, '05 정렬과 그룹화'])).toEqual(['DBMS'])
  })

  it('목록에 없는 글자(Join)는 이름에 있어도 분류가 되지 않는다', () => {
    expect(matchKeywords(['DBMS'], [FOLDER, DOC])).toEqual(['DBMS'])
  })

  it('대소문자를 가리지 않고 찾지만, 분류에는 목록에 적은 글자 그대로 쓴다', () => {
    expect(matchKeywords(['dbms', 'JOIN'], [FOLDER, DOC])).toEqual(['dbms', 'JOIN'])
  })

  it('순서는 이름의 순서(폴더 → 문서)이고, 한 이름 안에서는 목록의 순서다', () => {
    expect(matchKeywords(['외래키', 'DBMS'], [FOLDER, DOC])).toEqual(['DBMS', '외래키'])
    expect(matchKeywords(['Join', '외래키'], ['x', DOC])).toEqual(['Join', '외래키'])
  })

  it('같은 글자가 여러 이름에서 걸려도 한 번만', () => {
    expect(matchKeywords(['DBMS'], [FOLDER, 'DBMS 입문'])).toEqual(['DBMS'])
  })

  it('정규식 특수문자가 든 글자(C++)도 그냥 글자로 찾는다', () => {
    expect(matchKeywords(['C++', 'a.b'], ['01 C++ 기초', 'axb'])).toEqual(['C++'])
  })

  it('일부 글자만 이름에 들어 있어도(부분 일치) 찾는다', () => {
    expect(matchKeywords(['외래'], [DOC])).toEqual(['외래'])
  })

  it('읽을 글자가 없거나 이름이 없으면 빈 목록', () => {
    expect(matchKeywords([], [FOLDER, DOC])).toEqual([])
    expect(matchKeywords(['DBMS'], [])).toEqual([])
  })
})

describe('fillCategoryTags (비어 있는 [[분류:]] 칸을 채우기)', () => {
  it('따즈아 기본 내용의 빈 칸 둘을 위에서부터 차례로 채운다 — 사용자가 든 결과 그대로', () => {
    const filled = fillCategoryTags(DDAZUA_TEMPLATE, ['DBMS', '외래키'])
    expect(filled.split('\n').slice(0, 4)).toEqual(['[[분류:ddazua]]', '[[분류:DBMS]]', '[[분류:외래키]]', '[목차]'])
    // 분류 줄 말고는 아무것도 바뀌지 않는다
    expect(filled.split('\n').slice(4)).toEqual(DDAZUA_TEMPLATE.split('\n').slice(4))
  })

  it('찾은 게 하나면 둘째 빈 칸은 그대로 남는다 (직접 채우면 됨)', () => {
    const filled = fillCategoryTags(DDAZUA_TEMPLATE, ['DBMS'])
    expect(filled.split('\n').slice(0, 4)).toEqual(['[[분류:ddazua]]', '[[분류:DBMS]]', '[[분류:]]', '[목차]'])
  })

  it('빈 칸보다 찾은 게 많으면 분류 줄 묶음 바로 뒤에 새 줄로 넣는다', () => {
    const filled = fillCategoryTags(DDAZUA_TEMPLATE, ['A', 'B', 'C'])
    expect(filled.split('\n').slice(0, 5)).toEqual(['[[분류:ddazua]]', '[[분류:A]]', '[[분류:B]]', '[[분류:C]]', '[목차]'])
  })

  it('기본 내용([[분류:]] 한 줄)에서는 첫 글자가 그 칸을 채우고 나머지는 뒤에 이어 붙는다', () => {
    expect(fillCategoryTags('[[분류:]]\n', ['A'])).toBe('[[분류:A]]\n')
    expect(fillCategoryTags('[[분류:]]\n', ['A', 'B'])).toBe('[[분류:A]]\n[[분류:B]]\n')
  })

  it('이미 적혀 있는 분류(ddazua)와 같은 글자는 다시 넣지 않는다', () => {
    const filled = fillCategoryTags(DDAZUA_TEMPLATE, ['ddazua', 'DBMS'])
    expect(filled.split('\n').slice(0, 3)).toEqual(['[[분류:ddazua]]', '[[분류:DBMS]]', '[[분류:]]'])
  })

  it('분류 줄이 하나도 없는 내용(글양식)은 맨 끝에 붙인다', () => {
    expect(fillCategoryTags('본문\n', ['A', 'B'])).toBe('본문\n\n[[분류:A]]\n[[분류:B]]\n')
  })

  it('넣을 게 없으면 내용을 그대로 돌려준다', () => {
    expect(fillCategoryTags(DDAZUA_TEMPLATE, [])).toBe(DDAZUA_TEMPLATE)
    expect(fillCategoryTags('본문', [])).toBe('본문')
  })

  it('분류 이름에 $ 같은 특수 글자가 있어도 글자 그대로 들어간다', () => {
    expect(fillCategoryTags('[[분류:]]\n', ['$&특수'])).toBe('[[분류:$&특수]]\n')
  })

  it('[[분류:이름|출력명]] 처럼 출력명이 붙은 기존 분류도 이미 있는 것으로 본다', () => {
    expect(fillCategoryTags('[[분류:DBMS|디비]]\n[[분류:]]\n', ['DBMS', 'X'])).toBe('[[분류:DBMS|디비]]\n[[분류:X]]\n')
  })
})

describe('설정 파일 이름', () => {
  it('폴더 안의 숨김 파일이다', () => {
    expect(AUTO_CATEGORY_FILE).toBe('.wikidesk-auto-category.json')
  })
})
