// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { nextFolderAfterClose, selectActiveSnippets } from '../../src/lib/snippetScope.js'

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
