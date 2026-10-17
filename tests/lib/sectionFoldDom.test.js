// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { applyFoldOverrides, findFoldHeading, isFolded, toggleFold, unfoldAncestors } from '../../src/lib/sectionFoldDom.js'

// 뷰어 문단 접기의 화면(DOM) 쪽 규칙. 실제 DOM 이 없는 환경이라 필요한 속성만 흉내 낸 가짜 요소로 시험한다.
function el(tag, { id = '', classes = [], folded, parent = null } = {}) {
  const attrs = {}
  if (folded !== undefined) attrs['data-folded'] = String(folded)
  const node = {
    tagName: tag.toUpperCase(),
    id,
    parentElement: parent,
    previousElementSibling: null,
    classList: { contains: (c) => classes.includes(c) },
    getAttribute: (k) => attrs[k] ?? null,
    setAttribute: (k, v) => {
      attrs[k] = String(v)
    },
    closest(selector) {
      for (let n = node; n; n = n.parentElement) {
        if (selector.split(',').some((s) => matches(n, s.trim()))) return n
      }
      return null
    },
  }
  return node
}
function matches(n, s) {
  if (s === 'a' || s === 'button') return n.tagName === s.toUpperCase()
  if (s === '.wiki-foldable') return n.classList.contains('wiki-foldable')
  return false
}
// heading + body 한 쌍을 만든다. body 는 같은 부모 아래에 있다.
function section(id, { folded = false, parent = null } = {}) {
  const heading = el('h2', { id, classes: ['wiki-foldable'], folded, parent })
  const body = el('div', { classes: ['wiki-section-body'], parent })
  body.previousElementSibling = heading
  return { heading, body }
}

describe('isFolded / toggleFold', () => {
  it('data-folded 가 "true" 일 때만 접힌 것이다', () => {
    expect(isFolded(el('h2', { folded: true }))).toBe(true)
    expect(isFolded(el('h2', { folded: false }))).toBe(false)
    expect(isFolded(el('h2'))).toBe(false)
  })

  it('toggleFold 는 상태를 뒤집고 새 상태를 돌려준다', () => {
    const heading = el('h2', { folded: true })
    expect(toggleFold(heading)).toBe(false)
    expect(isFolded(heading)).toBe(false)
    expect(toggleFold(heading)).toBe(true)
    expect(isFolded(heading)).toBe(true)
  })
})

describe('findFoldHeading', () => {
  it('제목 글자를 눌렀으면 그 제목을 돌려준다', () => {
    const { heading } = section('h-a')
    const text = el('span', { parent: heading })
    expect(findFoldHeading(text)).toBe(heading)
    expect(findFoldHeading(heading)).toBe(heading)
  })

  it('제목 안의 링크·단추를 눌렀으면 접지 않는다 (null)', () => {
    const { heading } = section('h-a')
    const link = el('a', { parent: heading })
    const inner = el('span', { parent: link })
    expect(findFoldHeading(link)).toBeNull()
    expect(findFoldHeading(inner)).toBeNull()
  })

  it('접을 수 있는 제목이 아닌 곳(일반 글)을 눌렀으면 null 이다', () => {
    expect(findFoldHeading(el('p'))).toBeNull()
  })
})

describe('unfoldAncestors', () => {
  it('찾는 요소를 감싼 접힌 구역을 모두 펴고, 편 제목들을 안쪽부터 돌려준다', () => {
    const outer = section('h-outer', { folded: true })
    const inner = section('h-inner', { folded: true, parent: outer.body })
    const target = el('p', { parent: inner.body })
    const changed = unfoldAncestors(target)
    expect(changed).toEqual([inner.heading, outer.heading])
    expect(isFolded(outer.heading)).toBe(false)
    expect(isFolded(inner.heading)).toBe(false)
  })

  it('이미 펴진 구역은 건드리지 않고 목록에도 넣지 않는다', () => {
    const outer = section('h-outer', { folded: false })
    const target = el('p', { parent: outer.body })
    expect(unfoldAncestors(target)).toEqual([])
  })

  it('찾는 요소가 제목 자신이면 그 제목은 펴지 않는다 (제목은 접혀도 보이므로)', () => {
    const outer = section('h-outer', { folded: true })
    const own = section('h-own', { folded: true, parent: outer.body })
    const changed = unfoldAncestors(own.heading)
    expect(changed).toEqual([outer.heading])
    expect(isFolded(own.heading)).toBe(true)
  })

  it('구역 밖 요소는 아무것도 바꾸지 않는다', () => {
    expect(unfoldAncestors(el('p'))).toEqual([])
    expect(unfoldAncestors(null)).toEqual([])
  })
})

describe('applyFoldOverrides', () => {
  const rootWith = (headings) => ({ querySelectorAll: (selector) => (selector === '.wiki-foldable' ? headings : []) })

  it('사용자가 정해 둔 접힘 상태를 id 로 찾아 다시 입힌다', () => {
    const a = el('h2', { id: 'h-a', classes: ['wiki-foldable'], folded: true })
    const b = el('h2', { id: 'h-b', classes: ['wiki-foldable'], folded: false })
    applyFoldOverrides(rootWith([a, b]), new Map([['h-a', false], ['h-b', true]]))
    expect(isFolded(a)).toBe(false)
    expect(isFolded(b)).toBe(true)
  })

  it('정해 둔 적 없는 제목은 글에 적힌 처음 상태 그대로다', () => {
    const a = el('h2', { id: 'h-a', classes: ['wiki-foldable'], folded: true })
    applyFoldOverrides(rootWith([a]), new Map())
    expect(isFolded(a)).toBe(true)
  })

  it('받은 값이 없거나 루트가 없어도 오류 없이 지나간다', () => {
    expect(() => applyFoldOverrides(null, new Map())).not.toThrow()
    expect(() => applyFoldOverrides(rootWith([]), undefined)).not.toThrow()
  })
})
