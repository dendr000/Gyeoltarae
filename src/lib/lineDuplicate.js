// Copyright (c) dendr000. MIT License.

// Ctrl+D — 현재 줄(선택했으면 선택에 걸친 줄 전체)을 바로 아래에 복제한다. MySQL Workbench 같은 코드 편집기의
// "줄 복제"와 같고, 처음에는 코드블록 안에서만 됐지만 지금은 문서 어디서나(문단·표·목록·제목·코드블록) 된다.
// 화면(textarea)과 분리한 순수 함수라서 시험할 수 있다.
import { openCodeFenceAt } from './codeFence.js'

// 돌려주는 값: { insertAt, insertText, selStart, selEnd }
//   insertAt     - 복제본을 끼워 넣을 자리(원래 마지막 줄의 끝)
//   insertText   - 끼워 넣을 글(줄바꿈 + 복제할 줄들)
//   selStart/End - 끼워 넣은 뒤 커서·선택이 있어야 할 자리(복제본의 같은 위치)
// null 이면 아무것도 하지 않는다:
//   빈 문서이거나, 복제하면 코드블록(```) 구조가 깨질 때. 줄들을 지나는 사이 "코드블록 안/밖" 상태가 달라지면(여는 줄만,
//   닫는 줄만, 블록 안과 닫는 줄을 함께) 복제본이 블록을 닫거나 열어 버리므로 하지 않는다. 블록 한 덩어리(여는 줄~닫는 줄)를
//   통째로 고른 경우나 블록 안의 일반 줄은 상태가 그대로라서 복제된다.
export function duplicateLinesEdit(value, selStart, selEnd) {
  if (value === '') return null

  const blockStart = value.lastIndexOf('\n', selStart - 1) + 1
  // 선택이 다음 줄 맨 앞에서 끝나면(줄 전체를 선택한 흔한 경우) 그 다음 줄은 복제 대상이 아니다.
  const lastCharPos = selEnd > selStart && value[selEnd - 1] === '\n' ? selEnd - 1 : selEnd
  const lineEndIdx = value.indexOf('\n', lastCharPos)
  const blockEnd = lineEndIdx === -1 ? value.length : lineEndIdx

  // 줄 끝이 CRLF 면 \r 은 줄 내용이 아니라 줄바꿈의 일부다 — 복제본도 같은 줄바꿈으로 이어 붙인다.
  const crlf = value[blockEnd - 1] === '\r'
  const textEnd = crlf ? blockEnd - 1 : blockEnd
  const block = value.slice(blockStart, textEnd)

  // 복제할 줄들의 앞과 뒤에서 열려 있는 코드블록이 같아야 한다(둘 다 없거나, 같은 블록 안).
  const lines = value.split('\n')
  const firstLine = value.slice(0, blockStart).split('\n').length - 1
  const lineAfter = firstLine + block.split(/\r?\n/).length
  const before = openCodeFenceAt(lines, firstLine)
  const after = openCodeFenceAt(lines, lineAfter)
  if ((before?.ticks ?? 0) !== (after?.ticks ?? 0)) return null

  const newline = crlf ? '\r\n' : '\n'
  const insertText = newline + block
  const shift = insertText.length // 복제본은 원래 줄들보다 이만큼 뒤에 있다
  return {
    insertAt: textEnd,
    insertText,
    selStart: selStart + shift,
    selEnd: selEnd + shift,
  }
}
