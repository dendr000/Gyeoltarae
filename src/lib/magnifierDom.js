// Copyright (c) dendr000. MIT License.

// 돋보기의 화면(DOM) 쪽 규칙. 돋보기는 앱 화면을 통째로 복제해(그림이 아니라 요소 복제라서 글자가 선명하다) 키워 보여 준다.
// 복제본은 shadow DOM 안에 둔다 — 그래야 document.querySelector 같은 앱의 검색에 복제본의 요소가 섞이지 않는다.
// 요소의 일부 속성만 쓰는 함수는 가짜 요소로 시험할 수 있다(tests/lib/magnifierDom.test.js).

// 마우스가 올라간 요소(와 그 조상)에 복제본이 붙이는 표시. 앱 CSS 의 :hover 규칙을 이 표시로 바꿔 복제본에도 적용한다.
export const HOVER_CLASS = 'mag-hover'

// CSS 선택자의 :hover 를 복제본용 표시 클래스로 바꾼다. 복제본은 마우스가 닿지 않아(pointer-events 없음) 진짜 :hover 가 안 걸리기 때문이다.
export function rewriteHoverSelector(selectorText) {
  return selectorText.replaceAll(':hover', `.${HOVER_CLASS}`)
}

// 규칙 하나를 복제본용 CSS 글로 만든다. :hover 가 없는 규칙은 빈 글이다. @media·@supports 같은 묶음 안의 규칙도 같게 바꾼다.
export function hoverRuleText(rule) {
  if (rule.selectorText !== undefined) {
    if (!rule.selectorText.includes(':hover')) return ''
    return `${rewriteHoverSelector(rule.selectorText)} { ${rule.style.cssText} }`
  }
  if (rule.cssRules && rule.conditionText !== undefined) {
    const inner = Array.from(rule.cssRules).map(hoverRuleText).join('\n')
    if (!inner) return ''
    const keyword = rule.constructor?.name === 'CSSSupportsRule' ? '@supports' : '@media'
    return `${keyword} ${rule.conditionText} {\n${inner}\n}`
  }
  return ''
}

// 문서의 모든 스타일시트에서 :hover 규칙만 골라 복제본용 CSS 글을 만든다. 읽을 수 없는 스타일시트(다른 출처)는 건너뛴다.
export function collectHoverCss(doc) {
  const parts = []
  for (const sheet of Array.from(doc.styleSheets)) {
    let rules
    try {
      rules = Array.from(sheet.cssRules)
    } catch {
      continue
    }
    for (const rule of rules) {
      const text = hoverRuleText(rule)
      if (text) parts.push(text)
    }
  }
  return parts.join('\n')
}

// 요소가 root 안에서 몇 번째 자식들을 거쳐 닿는지(위에서 아래 순서). root 밖이면 null.
export function childPath(element, root) {
  const path = []
  let node = element
  while (node && node !== root) {
    const parent = node.parentElement
    if (!parent) return null
    path.unshift(Array.prototype.indexOf.call(parent.children, node))
    node = parent
  }
  return node === root ? path : null
}

// childPath 의 반대. 복제본 root 에서 같은 길을 따라가 요소를 찾는다. 길이 끊기면 null.
export function elementAtPath(root, path) {
  let node = root
  for (const index of path) {
    node = node?.children?.[index]
    if (!node) return null
  }
  return node
}

// 복제본에서 마우스가 올라간 요소와 그 조상들에 HOVER_CLASS 를 붙이고, 지난번 표시는 뗀다. 붙인 요소 목록을 돌려준다(다음에 뗄 때 넘긴다).
export function markHover(cloneRoot, sourceRoot, hitElement, previous = []) {
  for (const element of previous) element.classList?.remove(HOVER_CLASS)
  const path = hitElement ? childPath(hitElement, sourceRoot) : null
  const target = path ? elementAtPath(cloneRoot, path) : null
  const marked = []
  for (let node = target; node && node !== cloneRoot; node = node.parentElement) {
    node.classList.add(HOVER_CLASS)
    marked.push(node)
  }
  return marked
}

// 복제본은 cloneNode 로 만들어 현재 입력값·스크롤 위치가 빠져 있다. 원본과 복제본(같은 모양)을 같은 순서로 걸으며 채운다. 복제본은 문서에 붙은 뒤여야 스크롤이 먹는다.
export function copyLiveState(sourceRoot, cloneRoot) {
  const sourceNodes = [sourceRoot, ...sourceRoot.querySelectorAll('*')]
  const cloneNodes = [cloneRoot, ...cloneRoot.querySelectorAll('*')]
  const count = Math.min(sourceNodes.length, cloneNodes.length)
  for (let i = 0; i < count; i += 1) {
    const from = sourceNodes[i]
    const to = cloneNodes[i]
    const tag = from.tagName
    if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') {
      if (to.value !== from.value) to.value = from.value
      if (tag === 'INPUT' && (from.type === 'checkbox' || from.type === 'radio')) to.checked = from.checked
    }
    if (from.scrollTop) to.scrollTop = from.scrollTop
    if (from.scrollLeft) to.scrollLeft = from.scrollLeft
  }
}

// 앱 화면(body 의 자식들)을 복제해 stage 안을 통째로 바꾼다. skip 에 든 요소와 스크립트는 복제하지 않는다.
export function rebuildClone(sourceBody, stage, skip) {
  const pairs = []
  for (const child of Array.from(sourceBody.children)) {
    if (child === skip || child.tagName === 'SCRIPT') continue
    pairs.push([child, child.cloneNode(true)])
  }
  stage.replaceChildren(...pairs.map(([, copy]) => copy))
  for (const [from, to] of pairs) copyLiveState(from, to)
}

// 스타일 노드(<style>, <link rel=stylesheet>)를 복제해 shadow 안에 넣을 준비를 한다.
export function cloneStyleNodes(doc) {
  return Array.from(doc.querySelectorAll('style, link[rel="stylesheet"]')).map((node) => node.cloneNode(true))
}
