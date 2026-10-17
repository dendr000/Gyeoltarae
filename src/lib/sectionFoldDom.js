// Copyright (c) dendr000. MIT License.

// 뷰어 문단 접기의 화면(DOM) 쪽 규칙. 제목 요소(.wiki-foldable)의 data-folded 가 접힘 상태이고, 접힌 제목 바로 뒤의 .wiki-section-body 는
// CSS 가 숨긴다. 요소의 일부 속성만 쓰므로 실제 DOM 없이 가짜 요소로 시험할 수 있다(tests/lib/sectionFoldDom.test.js).
const FOLDED_ATTR = 'data-folded'

export function isFolded(heading) {
  return heading.getAttribute(FOLDED_ATTR) === 'true'
}

// 접힘 상태를 뒤집고 새 상태를 돌려준다.
export function toggleFold(heading) {
  const next = !isFolded(heading)
  heading.setAttribute(FOLDED_ATTR, String(next))
  return next
}

// 클릭한 요소가 접을 수 있는 제목 안이면 그 제목을, 제목 안의 링크·단추면 null 을 돌려준다(링크는 제 일을 하게 둔다).
export function findFoldHeading(target) {
  if (!target?.closest) return null
  if (target.closest('a, button')) return null
  return target.closest('.wiki-foldable')
}

// 어떤 요소가 접힌 구역 안에 있어서 숨겨져 있으면 그 구역들을 모두 편다(목차·[[문서#제목]] 이동이 숨은 곳으로 가는 경우). 요소 자신이 제목이면
// 그 제목은 접혀 있어도 보이므로 펴지 않는다. 실제로 편 제목들을 안쪽부터 돌려준다.
export function unfoldAncestors(element) {
  const changed = []
  let node = element
  while (node?.parentElement) {
    const parent = node.parentElement
    if (parent.classList?.contains('wiki-section-body')) {
      const heading = parent.previousElementSibling
      if (heading && isFolded(heading)) {
        heading.setAttribute(FOLDED_ATTR, 'false')
        changed.push(heading)
      }
    }
    node = parent
  }
  return changed
}

// 글이 다시 그려져 모든 제목이 처음 상태로 돌아갔을 때, 사용자가 정해 둔 상태(id -> 접힘 여부)를 다시 입힌다.
export function applyFoldOverrides(root, overrides) {
  if (!root || !overrides || overrides.size === 0) return
  for (const heading of root.querySelectorAll('.wiki-foldable')) {
    if (overrides.has(heading.id)) heading.setAttribute(FOLDED_ATTR, String(overrides.get(heading.id)))
  }
}
