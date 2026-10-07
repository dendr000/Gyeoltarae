// Copyright (c) dendr000. MIT License.

// 코드블록 안에서 Ctrl+D — 현재 줄(선택했으면 선택에 걸친 줄 전체)을 바로 아래에 복제한다. MySQL
// Workbench 같은 코드 편집기의 "줄 복제"와 같다. 화면(textarea)과 분리한 순수 함수라서 시험할 수 있다.
import { isInCodeFenceAt, matchCodeFenceOpen } from './codeFence.js'

// 돌려주는 값: { insertAt, insertText, selStart, selEnd }
//   insertAt     - 복제본을 끼워 넣을 자리(원래 마지막 줄의 끝)
//   insertText   - 끼워 넣을 글(줄바꿈 + 복제할 줄들)
//   selStart/End - 끼워 넣은 뒤 커서·선택이 있어야 할 자리(복제본의 같은 위치)
// null 이면 아무것도 하지 않는다(= 호출한 쪽이 평소 Ctrl+D 동작을 그대로 둔다):
//   코드블록 밖이거나, 복제할 줄에 ``` 줄(여는 줄·닫는 줄)이 하나라도 있을 때.
export function duplicateLinesEdit(value, selStart, selEnd) {
  if (value === '') return null
  if (!isInCodeFenceAt(value, selStart)) return null

  const blockStart = value.lastIndexOf('\n', selStart - 1) + 1
  // 선택이 다음 줄 맨 앞에서 끝나면(줄 전체를 선택한 흔한 경우) 그 다음 줄은 복제 대상이 아니다.
  const lastCharPos = selEnd > selStart && value[selEnd - 1] === '\n' ? selEnd - 1 : selEnd
  const lineEndIdx = value.indexOf('\n', lastCharPos)
  const blockEnd = lineEndIdx === -1 ? value.length : lineEndIdx

  // 줄 끝이 CRLF 면 \r 은 줄 내용이 아니라 줄바꿈의 일부다 — 복제본도 같은 줄바꿈으로 이어 붙인다.
  const crlf = value[blockEnd - 1] === '\r'
  const textEnd = crlf ? blockEnd - 1 : blockEnd
  const block = value.slice(blockStart, textEnd)

  // ``` 줄이 끼어 있으면 복제하지 않는다 — 복제하면 코드블록이 깨진다.
  if (block.split(/\r?\n/).some((line) => matchCodeFenceOpen(line) !== null)) return null

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
