// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import {
  disabledAllExcept,
  nextFolderAfterClose,
  selectActiveSnippets,
  selectEnabledSnippets,
  withFolderEnabled,
} from '../../src/lib/snippetScope.js'

const entries = [
  { title: 'a', category: '공통' },
  { title: 'b', category: '무협' },
  { title: 'c', category: '무협' },
  { title: 'd', category: '현대' },
]
const titles = (list) => list.map((e) => e.title)

describe('selectActiveSnippets — 에디터에서 실제로 쓰이는 상용구', () => {
  it("'전체' 면 모든 폴더의 상용구를 쓴다", () => {
    expect(titles(selectActiveSnippets(entries, '전체'))).toEqual(['a', 'b', 'c', 'd'])
  })

  it("특정 폴더면 그 폴더와 '공통' 폴더의 상용구만 쓴다", () => {
    expect(titles(selectActiveSnippets(entries, '무협'))).toEqual(['a', 'b', 'c'])
  })

  it('폴더에 상용구가 하나도 없어도(새로 만든 빈 폴더) 공통 상용구는 계속 쓴다', () => {
    expect(titles(selectActiveSnippets(entries, '판타지'))).toEqual(['a'])
  })

  it('목록이 비어 있어도 오류 없이 빈 목록을 돌려준다', () => {
    expect(selectActiveSnippets([], '무협')).toEqual([])
  })
})

describe('nextFolderAfterClose — 모달을 닫은 뒤의 활성 폴더', () => {
  it("복귀 설정이 켜져 있으면 어느 폴더였든 '전체' 가 된다", () => {
    expect(nextFolderAfterClose('무협', true)).toBe('전체')
  })

  it('복귀 설정이 꺼져 있으면 고른 폴더가 그대로다', () => {
    expect(nextFolderAfterClose('무협', false)).toBe('무협')
  })

  it("이미 '전체' 면 설정과 상관없이 '전체' 다", () => {
    expect(nextFolderAfterClose('전체', true)).toBe('전체')
    expect(nextFolderAfterClose('전체', false)).toBe('전체')
  })
})

describe('selectEnabledSnippets — 폴더별 "자동 추천에 쓰기" 체크', () => {
  it('체크를 푼 폴더가 없으면 모두 그대로 쓴다 (기본)', () => {
    expect(titles(selectEnabledSnippets(entries, []))).toEqual(['a', 'b', 'c', 'd'])
    expect(titles(selectEnabledSnippets(entries, undefined))).toEqual(['a', 'b', 'c', 'd'])
  })

  it('체크를 푼 폴더의 상용구만 빠진다', () => {
    expect(titles(selectEnabledSnippets(entries, ['무협']))).toEqual(['a', 'd'])
  })

  it("'공통' 폴더도 똑같이 끌 수 있다", () => {
    expect(titles(selectEnabledSnippets(entries, ['공통']))).toEqual(['b', 'c', 'd'])
  })

  it('모두 끄면 빈 목록이다', () => {
    expect(selectEnabledSnippets(entries, ['공통', '무협', '현대'])).toEqual([])
  })

  it('없는 폴더 이름이 섞여 있어도 오류 없이 무시한다', () => {
    expect(titles(selectEnabledSnippets(entries, ['사라진폴더']))).toEqual(['a', 'b', 'c', 'd'])
  })

  it('활성 폴더 범위와 같이 쓰면 둘 다 통과한 것만 남는다', () => {
    const scoped = selectActiveSnippets(entries, '무협')
    expect(titles(selectEnabledSnippets(scoped, ['공통']))).toEqual(['b', 'c'])
  })
})

describe('withFolderEnabled · disabledAllExcept — 체크 목록 바꾸기', () => {
  it('끄면 목록에 더해지고, 다시 켜면 빠진다 (원래 목록은 바뀌지 않는다)', () => {
    const before = ['무협']
    expect(withFolderEnabled(before, '현대', false)).toEqual(['무협', '현대'])
    expect(withFolderEnabled(['무협', '현대'], '무협', true)).toEqual(['현대'])
    expect(before).toEqual(['무협'])
  })

  it('이미 꺼진 폴더를 또 끄면 중복되지 않는다', () => {
    expect(withFolderEnabled(['무협'], '무협', false)).toEqual(['무협'])
  })

  it('"이것만" 은 고른 폴더를 뺀 나머지를 전부 끈 목록이다', () => {
    expect(disabledAllExcept(['공통', '무협', '현대'], '무협')).toEqual(['공통', '현대'])
  })
})
