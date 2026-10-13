// Copyright (c) dendr000. MIT License.

// 표 편집기의 열 기준 행 정렬. 화면과 분리한 순수 함수라서 시험할 수 있다. 줄(행) 전체가 함께 움직이므로 한 열만 따로
// 정렬돼 데이터가 어긋나는 일이 없다. 받은 격자(grid)는 바꾸지 않는다.
//
// 비교 규칙(엑셀과 비슷하게): 숫자 → 글자 → 빈 칸 순이고 빈 칸은 오름·내림 모두 맨 아래다.
// - 숫자: 합계와 같은 읽기 규칙(tableStats.js 의 parseCellNumber — 쉼표·통화 기호·짧은 단위 허용)으로 크기를 비교한다.
// - 글자: 영문(대소문자 구분 없음) → 한글(가나다순). 글자 안의 숫자는 크기로 본다(item2 < item10).
//   한국어 로캘('ko')은 한글을 영문보다 앞에 두므로 엑셀 한국어판과 같은 영문 → 한글 순서를 위해 'en' 로캘을 쓴다.
// - 같은 값끼리는 원래 순서를 지킨다(내림차순에서도).

import { reorderRows, rowsAreIndependent } from './tableGrid.js'
import { parseCellNumber } from './tableStats.js'

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

const KIND_NUMBER = 0
const KIND_TEXT = 1
const KIND_BLANK = 2

function sortKey(grid, r, column) {
  let cell = grid[r]?.[column]
  // 가로 병합에 가려진 칸이면 그 병합의 대표 칸 글자로 비교한다.
  if (cell?.mergedInto) cell = grid[cell.mergedInto.r]?.[cell.mergedInto.c] ?? cell
  const raw = typeof cell?.text === 'string' ? cell.text.replace(/\[br\]/gi, ' ').trim() : ''
  if (raw === '') return { kind: KIND_BLANK }
  const value = parseCellNumber(raw)
  return value === null ? { kind: KIND_TEXT, text: raw } : { kind: KIND_NUMBER, value }
}

function compareAscending(a, b) {
  if (a.kind !== b.kind) return a.kind - b.kind
  return a.kind === KIND_NUMBER ? a.value - b.value : collator.compare(a.text, b.text)
}

// rowStart..rowEnd(끝 포함) 행을 정렬할 수 있는가. 세로 병합(rowspan)이 걸린 행이 있으면 그 행을 옮길 때 병합이 찢어지므로
// 정렬하지 않는다. 가로 병합(colspan)은 한 행 안에서 끝나므로 괜찮다.
export function canSortRows(grid, rowStart, rowEnd) {
  return rowsAreIndependent(grid, rowStart, rowEnd)
}

// 고른 범위 기준으로 정렬할 행의 범위({ r1, r2 }). 한 행만 골랐으면(한 칸 포함) 표 전체 행이고, 여러 행을 골랐으면 그 행들만이다.
// 첫 행을 헤더로 쓰는 표는 맨 윗줄을 뺀다. r2 - r1 < 1 이면 정렬할 행이 모자란 것이다.
export function sortScope(range, { headerRow, rowCount }) {
  let { r1, r2 } = range
  if (r1 === r2) {
    r1 = 0
    r2 = rowCount - 1
  }
  if (headerRow && r1 === 0) r1 = 1
  return { r1, r2 }
}

// 열 column 의 값으로 rowStart..rowEnd 행을 정렬한 새 격자. 정렬할 수 없으면(범위 이상, 세로 병합) 받은 격자를 그대로 돌려준다.
export function sortRows(grid, column, rowStart, rowEnd, { descending = false } = {}) {
  if (!canSortRows(grid, rowStart, rowEnd)) return grid

  const keyed = []
  for (let r = rowStart; r <= rowEnd; r += 1) keyed.push({ r, key: sortKey(grid, r, column) })
  keyed.sort((a, b) => {
    // 빈 칸은 오름·내림 모두 맨 아래.
    if (a.key.kind === KIND_BLANK || b.key.kind === KIND_BLANK) {
      return (a.key.kind === KIND_BLANK ? 1 : 0) - (b.key.kind === KIND_BLANK ? 1 : 0)
    }
    const order = compareAscending(a.key, b.key)
    return descending ? -order : order
  })

  // 정렬 범위의 행에는 세로 병합이 없으므로, 가려진 칸은 같은 행의 대표 칸을 가리킨다. 행이 옮겨졌으니 가리키는 행도 바꾼다(reorderRows).
  return reorderRows(grid, rowStart, keyed.map(({ r }) => r))
}
