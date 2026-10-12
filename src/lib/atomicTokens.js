// Copyright (c) dendr000. MIT License.

// "한 덩어리"로 다룰 글 — 방향키로 한 번에 건너뛰고 Backspace/Delete 로 한 번에 지우는 것:
//  - 굵게 표시 `'''` (정확히 따옴표 3개가 이어진 것만)
//  - 줄 맨 앞 들여쓰기 공백(들여쓰기 한 칸 = 공백 4칸, VS Code 의 탭 칸 이동과 같다)
// textarea 는 글자 하나씩만 움직이므로, 편집기가 키를 가로채서 이 계산 결과대로 움직인다. 화면과 분리한 순수 함수라
// 시험할 수 있다. 마우스로 `'''` 사이를 클릭해 커서를 놓는 것은 막을 수 없다.
import { INDENT_UNIT } from './indentUnit.js'

const BOLD = "'''"

// start 에서 시작하는 `'''` 가 정확히 3개짜리 덩어리인가 — 앞뒤에 따옴표가 더 붙어 있으면(이탤릭 `''`
// 과 이어진 `'''''`, 따옴표 4개 등) 어디까지가 굵게 표시인지 모호해서 덩어리로 보지 않는다.
function isBoldTokenAt(value, start) {
  return value.startsWith(BOLD, start) && value[start - 1] !== "'" && value[start + BOLD.length] !== "'"
}

// pos 에서 dir(-1 왼쪽, 1 오른쪽)으로 한 덩어리 움직인 새 위치. 한 글자만 움직이는 경우(기본 동작과 같은
// 경우)와 해당 없는 경우는 null — 호출한 쪽이 평소 키 동작을 그대로 둔다.
//   tokens: false 면 `'''` 는 덩어리로 보지 않는다(코드블록 안 등).
export function atomicStep(value, pos, dir, { tokens = true } = {}) {
  if (tokens) {
    if (dir === 1 && isBoldTokenAt(value, pos)) return pos + BOLD.length
    if (dir === -1 && pos >= BOLD.length && isBoldTokenAt(value, pos - BOLD.length)) return pos - BOLD.length
  }

  const lineStart = pos === 0 ? 0 : value.lastIndexOf('\n', pos - 1) + 1
  const before = value.slice(lineStart, pos)
  if (!/^ *$/.test(before)) return null // 줄 맨 앞 들여쓰기 안에 있을 때만
  const col = before.length

  let target
  if (dir === -1) {
    if (col === 0) return null
    target = lineStart + Math.floor((col - 1) / INDENT_UNIT) * INDENT_UNIT
  } else {
    let end = pos
    while (value[end] === ' ') end += 1
    if (end === pos) return null
    target = Math.min(lineStart + (Math.floor(col / INDENT_UNIT) + 1) * INDENT_UNIT, end)
  }
  return Math.abs(target - pos) > 1 ? target : null
}

// Backspace(dir -1)/Delete(dir 1)가 지울 범위 { from, to }. 한 덩어리가 아니면 null.
export function atomicDeleteRange(value, pos, dir, options) {
  const target = atomicStep(value, pos, dir, options)
  if (target === null) return null
  return { from: Math.min(pos, target), to: Math.max(pos, target) }
}
