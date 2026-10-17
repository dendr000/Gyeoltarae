// Copyright (c) dendr000. MIT License.
import { isCodeFenceClose, matchCodeFenceOpen } from './codeFence.js'

// 편집 모드의 제목 줄 강조: 어느 줄이 제목 줄인지 판단한다(화면과 분리한 순수 함수라서 시험할 수 있다).
// 모양은 wikiParser.js 의 제목 규칙과 같다: =제목= ~ ======제목====== , ==# 제목 #== (처음부터 접힌 제목)도 제목이다.
// 코드블록(```) 안의 줄은 제목처럼 생겨도(예: ================) 제목이 아니므로 강조하지 않는다 — 뷰어도 코드로 그린다.
const HEADING_LINE_RE = /^[ \t]*(={1,6})[ \t]*(.+?)[ \t]*\1[ \t]*$/

// text 의 각 줄이 제목 줄이면 true 인 배열을 돌려준다(줄 수는 text.split('\n') 과 같다).
export function headingLineFlags(text) {
  let open = null // 열려 있는 코드블록의 여는 줄 정보({ ticks, lang }), 없으면 null
  return text.split('\n').map((rawLine) => {
    const line = rawLine.replace(/\r$/, '')
    if (open !== null) {
      if (isCodeFenceClose(line, open.ticks)) open = null
      return false
    }
    open = matchCodeFenceOpen(line)
    if (open !== null) return false
    return HEADING_LINE_RE.test(line)
  })
}
