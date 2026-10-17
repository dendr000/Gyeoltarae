// Copyright (c) dendr000. MIT License.

// 뷰어 문단 접기: 제목과 그 아래 내용(다음 같은 급 이상의 제목 앞까지)을 구역으로 묶는다. 화면과 분리한 순수 함수라서 시험할 수 있다.
// 입력 항목은 일반 블록의 html 문자열이거나 제목 { heading: true, level, build(foldable) } 이다. build 는 제목의 html 을 만드는 함수로,
// 아래 내용이 하나라도 있어서 접을 수 있을 때만 foldable 이 true 다(내용이 없는 제목은 누를 곳이 없다).
// 출력은 html 문자열 목록이다. 제목 바로 뒤에 <div class="wiki-section-body"> 로 그 구역의 내용을 감싸고, 하위 제목(더 큰 숫자)은 윗 구역 안에 들어간다.
export const SECTION_BODY_OPEN = '<div class="wiki-section-body">'

export function wrapSections(items) {
  const out = []
  const open = [] // 열려 있는 구역: { level, slot(출력 안 제목 자리), item, bodyOpen }

  function closeTop() {
    const section = open.pop()
    if (section.bodyOpen) out.push('</div>')
    out[section.slot] = section.item.build(section.bodyOpen)
  }

  function ensureBody(section) {
    if (section.bodyOpen) return
    out.push(SECTION_BODY_OPEN)
    section.bodyOpen = true
  }

  for (const item of items) {
    if (typeof item === 'string') {
      if (open.length > 0) ensureBody(open[open.length - 1])
      out.push(item)
      continue
    }
    while (open.length > 0 && open[open.length - 1].level >= item.level) closeTop()
    if (open.length > 0) ensureBody(open[open.length - 1])
    open.push({ level: item.level, slot: out.length, item, bodyOpen: false })
    out.push('')
  }
  while (open.length > 0) closeTop()
  return out
}
