// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import {
  childPath,
  collectHoverCss,
  copyLiveState,
  elementAtPath,
  HOVER_CLASS,
  hoverRuleText,
  markHover,
  rebuildClone,
  rewriteHoverSelector,
} from '../../src/lib/magnifierDom.js'

// 돋보기의 화면(DOM) 쪽 규칙. 실제 DOM 이 없는 환경이라 필요한 속성만 흉내 낸 가짜 요소로 시험한다.
function el(tag, { children = [], value, scrollTop = 0, scrollLeft = 0, type } = {}) {
  const classes = new Set()
  const node = {
    tagName: tag.toUpperCase(),
    parentElement: null,
    children,
    value,
    type,
    scrollTop,
    scrollLeft,
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) },
    querySelectorAll() {
      const out = []
      const walk = (n) => {
        for (const c of n.children) {
          out.push(c)
          walk(c)
        }
      }
      walk(node)
      return out
    },
    cloneNode() {
      const copy = el(tag, { children: children.map((c) => c.cloneNode()), type })
      // cloneNode 는 현재 입력값·스크롤 위치를 가져오지 못한다(실제 DOM 과 같다).
      if (tag === 'textarea') copy.value = ''
      return copy
    },
  }
  for (const child of children) child.parentElement = node
  return node
}
const style = (cssText) => ({ cssText })

describe('rewriteHoverSelector', () => {
  it(':hover 를 복제본용 표시 클래스로 바꾼다', () => {
    expect(rewriteHoverSelector('.tree-item:hover')).toBe(`.tree-item.${HOVER_CLASS}`)
  })

  it('한 선택자 안의 :hover 가 여럿이어도 모두 바꾼다', () => {
    expect(rewriteHoverSelector('a:hover, .b:hover > .c:hover')).toBe(`a.${HOVER_CLASS}, .b.${HOVER_CLASS} > .c.${HOVER_CLASS}`)
  })

  it(':hover 가 없으면 그대로이다', () => {
    expect(rewriteHoverSelector('.tree-item.active')).toBe('.tree-item.active')
  })
})

describe('hoverRuleText', () => {
  it(':hover 규칙은 바꾼 선택자와 같은 본문으로 만든다', () => {
    const rule = { selectorText: 'button:hover', style: style('background: red;') }
    expect(hoverRuleText(rule)).toBe(`button.${HOVER_CLASS} { background: red; }`)
  })

  it(':hover 가 없는 규칙은 비운다', () => {
    expect(hoverRuleText({ selectorText: 'button', style: style('color: red;') })).toBe('')
  })

  it('@media 묶음 안의 :hover 규칙은 같은 조건으로 감싼다', () => {
    const rule = { conditionText: '(prefers-color-scheme: dark)', cssRules: [{ selectorText: 'a:hover', style: style('color: blue;') }] }
    expect(hoverRuleText(rule)).toBe(`@media (prefers-color-scheme: dark) {\na.${HOVER_CLASS} { color: blue; }\n}`)
  })

  it('묶음 안에 :hover 가 하나도 없으면 비운다', () => {
    const rule = { conditionText: '(min-width: 1px)', cssRules: [{ selectorText: 'a', style: style('color: blue;') }] }
    expect(hoverRuleText(rule)).toBe('')
  })

  it('선택자도 묶음도 아닌 규칙(@font-face 등)은 비운다', () => {
    expect(hoverRuleText({ style: style('src: url(x)') })).toBe('')
  })
})

describe('collectHoverCss', () => {
  it('모든 스타일시트에서 :hover 규칙만 모은다', () => {
    const doc = {
      styleSheets: [
        { cssRules: [{ selectorText: 'a:hover', style: style('x: 1;') }, { selectorText: 'a', style: style('y: 2;') }] },
        { cssRules: [{ selectorText: 'b:hover', style: style('z: 3;') }] },
      ],
    }
    expect(collectHoverCss(doc)).toBe(`a.${HOVER_CLASS} { x: 1; }\nb.${HOVER_CLASS} { z: 3; }`)
  })

  it('읽을 수 없는 스타일시트는 건너뛰고 나머지를 모은다', () => {
    const blocked = {
      get cssRules() {
        throw new Error('SecurityError')
      },
    }
    const doc = { styleSheets: [blocked, { cssRules: [{ selectorText: 'a:hover', style: style('x: 1;') }] }] }
    expect(collectHoverCss(doc)).toBe(`a.${HOVER_CLASS} { x: 1; }`)
  })

  it('스타일시트가 없으면 빈 글이다', () => {
    expect(collectHoverCss({ styleSheets: [] })).toBe('')
  })
})

describe('childPath / elementAtPath', () => {
  function tree() {
    const leaf = el('span')
    const second = el('p', { children: [el('i'), leaf] })
    const root = el('div', { children: [el('h1'), second] })
    return { root, second, leaf }
  }

  it('요소까지 몇 번째 자식들을 거치는지 돌려준다', () => {
    const { root, leaf, second } = tree()
    expect(childPath(leaf, root)).toEqual([1, 1])
    expect(childPath(second, root)).toEqual([1])
    expect(childPath(root, root)).toEqual([])
  })

  it('root 밖의 요소는 null 이다', () => {
    const { root } = tree()
    expect(childPath(el('div'), root)).toBeNull()
  })

  it('같은 길을 따라 복제본의 요소를 찾는다', () => {
    const { root, leaf } = tree()
    const clone = root.cloneNode()
    expect(elementAtPath(clone, childPath(leaf, root))).toBe(clone.children[1].children[1])
    expect(elementAtPath(clone, [])).toBe(clone)
  })

  it('길이 끊기면 null 이다', () => {
    const { root } = tree()
    expect(elementAtPath(root, [5])).toBeNull()
    expect(elementAtPath(root, [1, 9])).toBeNull()
  })
})

describe('markHover', () => {
  function pair() {
    const leafA = el('span')
    const sourceRoot = el('body', { children: [el('div', { children: [leafA, el('span')] }), el('aside')] })
    const cloneRoot = sourceRoot.cloneNode()
    return { sourceRoot, cloneRoot, leafA }
  }

  it('마우스가 올라간 요소의 복제본과 그 조상들에 표시를 붙인다(루트는 제외)', () => {
    const { sourceRoot, cloneRoot, leafA } = pair()
    const marked = markHover(cloneRoot, sourceRoot, leafA)
    const cloneLeaf = cloneRoot.children[0].children[0]
    expect(cloneLeaf.classList.contains(HOVER_CLASS)).toBe(true)
    expect(cloneRoot.children[0].classList.contains(HOVER_CLASS)).toBe(true)
    expect(cloneRoot.classList.contains(HOVER_CLASS)).toBe(false)
    expect(cloneRoot.children[0].children[1].classList.contains(HOVER_CLASS)).toBe(false)
    expect(marked).toHaveLength(2)
  })

  it('지난번 표시는 뗀다', () => {
    const { sourceRoot, cloneRoot, leafA } = pair()
    const first = markHover(cloneRoot, sourceRoot, leafA)
    markHover(cloneRoot, sourceRoot, sourceRoot.children[1], first)
    expect(cloneRoot.children[0].children[0].classList.contains(HOVER_CLASS)).toBe(false)
    expect(cloneRoot.children[0].classList.contains(HOVER_CLASS)).toBe(false)
    expect(cloneRoot.children[1].classList.contains(HOVER_CLASS)).toBe(true)
  })

  it('마우스가 앱 밖이거나 요소가 없으면 표시를 모두 떼고 빈 목록을 돌려준다', () => {
    const { sourceRoot, cloneRoot, leafA } = pair()
    const first = markHover(cloneRoot, sourceRoot, leafA)
    expect(markHover(cloneRoot, sourceRoot, null, first)).toEqual([])
    expect(cloneRoot.children[0].classList.contains(HOVER_CLASS)).toBe(false)
    expect(markHover(cloneRoot, sourceRoot, el('div'))).toEqual([])
  })
})

describe('copyLiveState', () => {
  it('입력 칸의 현재 글을 복제본에 채운다', () => {
    const source = el('div', { children: [el('textarea', { value: '현재 글' }), el('input', { value: 'abc', type: 'text' })] })
    const clone = source.cloneNode()
    expect(clone.children[0].value).toBe('')
    copyLiveState(source, clone)
    expect(clone.children[0].value).toBe('현재 글')
    expect(clone.children[1].value).toBe('abc')
  })

  it('체크 상자의 체크 상태를 채운다', () => {
    const source = el('div', { children: [el('input', { type: 'checkbox' })] })
    source.children[0].checked = true
    const clone = source.cloneNode()
    copyLiveState(source, clone)
    expect(clone.children[0].checked).toBe(true)
  })

  it('스크롤 위치를 채운다(0 이 아닐 때만)', () => {
    const source = el('div', { scrollTop: 40, children: [el('section', { scrollTop: 120, scrollLeft: 7 }), el('p')] })
    const clone = source.cloneNode()
    copyLiveState(source, clone)
    expect(clone.scrollTop).toBe(40)
    expect(clone.children[0].scrollTop).toBe(120)
    expect(clone.children[0].scrollLeft).toBe(7)
    expect(clone.children[1].scrollTop).toBe(0)
  })
})

describe('rebuildClone', () => {
  function body() {
    const app = el('div', { children: [el('textarea', { value: '쓰는 중' })] })
    const host = el('div')
    const script = el('script')
    return { app, host, script, source: el('body', { children: [app, script, host] }) }
  }

  it('body 의 자식을 복제해 stage 를 통째로 바꾸고, 돋보기 자신과 스크립트는 뺀다', () => {
    const { source, host } = body()
    let received = null
    const stage = { replaceChildren: (...nodes) => { received = nodes } }
    rebuildClone(source, stage, host)
    expect(received).toHaveLength(1)
    expect(received[0].tagName).toBe('DIV')
  })

  it('복제본에 현재 입력값을 채운다', () => {
    const { source, host } = body()
    let received = null
    rebuildClone(source, { replaceChildren: (...nodes) => { received = nodes } }, host)
    expect(received[0].children[0].value).toBe('쓰는 중')
  })
})
