// Copyright (c) dendr000. MIT License.
import { parseWikiText } from '../lib/wikiParser.js'

// 표 칸 하나가 뷰어에서 한 줄로 그려질 때 필요한 너비(px, 칸 안쪽 여백·테두리 포함)를 잰다. 칸의 글을 실제 표 문법으로 렌더링해서 화면 밖에 숨긴 표에
// 넣고 너비를 읽으므로 글꼴·굵기·글자 종류(한글/영문)가 그대로 반영된다. 다 쓰면 dispose() 로 숨긴 요소를 치운다.
// 계산 규칙(어느 칸이 가장 넓은가)은 lib/tableWidest.js 에 있다.
export function createCellMeasure() {
  const host = document.createElement('div')
  host.className = 'wiki-rendered'
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden;pointer-events:none;width:max-content;'
  document.body.appendChild(host)

  function measure(text, bold) {
    // 표 문법에서 | 는 칸 나눔이라 편집기가 문법을 만들 때와 같게 전각 막대로 바꾼다. 굵은 칸은 굵게 그려서 잰다.
    const inner = (bold ? `'''${text}'''` : text).replace(/\|/g, '｜')
    host.innerHTML = parseWikiText(`||${inner}||`).html
    for (const cell of host.querySelectorAll('td, th')) cell.style.whiteSpace = 'nowrap'
    const table = host.querySelector('table')
    return table ? table.getBoundingClientRect().width : 0
  }

  return { measure, dispose: () => host.remove() }
}
