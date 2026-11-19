// Copyright (c) dendr000. MIT License.

// 본문 [목차] 상자(<details class="wiki-toc">)의 접힘 상태 — 사용자가 접거나 편 상태를 문서별로 기억해 두었다가, 글이 다시 그려질 때마다 다시 입힌다.
// 요소의 일부 속성만 쓰므로 실제 DOM 없이 가짜 요소로 시험할 수 있다(tests/lib/tocFoldDom.test.js).
const TOC_SELECTOR = 'details.wiki-toc'

// 이벤트 대상이 목차 상자이면 그 요소를, 아니면 null.
export function findTocDetails(target) {
  if (!target || typeof target.closest !== 'function') return null
  return target.closest(TOC_SELECTOR)
}

// 기억한 상태(open: true 펼침, false 접힘)를 root 안의 모든 목차 상자에 입힌다. 기억한 것이 없으면(undefined) 글에 적힌 처음 상태(펼침)를 그대로 둔다.
export function applyTocOpen(root, open) {
  if (!root || open === undefined) return
  for (const details of root.querySelectorAll(TOC_SELECTOR)) {
    if (details.open !== open) details.open = open
  }
}
