// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { applyTocOpen, findTocDetails } from '../../src/lib/tocFoldDom.js'

// 본문 [목차] 상자(<details class="wiki-toc">)를 접고 편 상태를 문서별로 기억하는 규칙. 실제 DOM 이 없는 환경이라 가짜 요소로 시험한다.
const toc = (open = true) => ({ open, matches: () => true })
const root = (...items) => ({ querySelectorAll: (sel) => (sel === 'details.wiki-toc' ? items : []) })

describe('applyTocOpen', () => {
  it('기억한 상태(접힘)를 모든 목차 상자에 입힌다', () => {
    const a = toc(true)
    const b = toc(true)
    applyTocOpen(root(a, b), false)
    expect([a.open, b.open]).toEqual([false, false])
  })

  it('기억한 상태(펼침)도 입힌다', () => {
    const a = toc(false)
    applyTocOpen(root(a), true)
    expect(a.open).toBe(true)
  })

  it('기억한 것이 없으면(undefined) 글에 적힌 처음 상태를 그대로 둔다', () => {
    const a = toc(true)
    applyTocOpen(root(a), undefined)
    expect(a.open).toBe(true)
  })

  it('root 가 없어도 오류가 나지 않는다', () => {
    expect(() => applyTocOpen(null, false)).not.toThrow()
  })
})

describe('findTocDetails', () => {
  it('이벤트 대상이 목차 상자이면 그 요소를 돌려준다', () => {
    const el = { closest: (sel) => (sel === 'details.wiki-toc' ? el : null) }
    expect(findTocDetails(el)).toBe(el)
  })

  it('목차 상자가 아니면 null', () => {
    expect(findTocDetails({ closest: () => null })).toBeNull()
    expect(findTocDetails(null)).toBeNull()
    expect(findTocDetails({})).toBeNull()
  })
})
