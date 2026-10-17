// Copyright (c) dendr000. MIT License.

// 표 편집기의 "구조 작업" 묶음 — 행·열 삽입 / 이동 / 복제, 아래·오른쪽으로 채우기, 정렬. 계산 규칙은 lib/tableGrid.js 와
// lib/tableSort.js 에 있고, 여기서는 그 결과를 격자(grid)에 반영하고 고른 범위·입력칸 포커스를 정리하며, 단추마다 켜질 수 있는지(enabled)와
// 안내 글(title)을 만든다. 모달(TableEditorModal.jsx)이 렌더링마다 부르는 순수한 함수이며 React 훅이 아니다.
//
// ctx: { grid, setGrid, range, isMultiCell, focusCell, setAnchor, setFocusCell, headerRow, setGridAndHeader }
//   range      - 고른 범위({ r1, r2, c1, c2 }, 끝 포함)
// 돌려주는 값: { insertAbove, insertBelow, insertLeft, insertRight, moveRowUp, moveRowDown, moveColumnLeft, moveColumnRight,
//   duplicateRow, duplicateColumn, fillDown, fillRight, transpose, sortAscending, sortDescending } — 각각 { enabled, title, run }.
//   run() 은 격자와 고른 범위를 바꾸고, 격자가 다시 그려진 뒤 입력칸에 포커스를 줄 칸({ r, c })을 돌려준다(없으면 null/undefined).
//   포커스 예약은 호출한 쪽(모달)이 한다.

import {
  canDuplicateColumns,
  canDuplicateRows,
  canFillDown,
  canFillRight,
  canMoveColumns,
  canMoveRows,
  duplicateColumns,
  duplicateRows,
  expandToMerges,
  fillDown,
  fillRight,
  insertColumn,
  insertIndexAfterColumn,
  insertIndexAfterRow,
  insertRow,
  moveColumns,
  moveRows,
  visibleCellAt,
} from '../lib/tableGrid.js'
import { canSortRows, sortRows, sortScope } from '../lib/tableSort.js'
import { transposeGrid } from '../lib/tableTranspose.js'
import { columnLabel } from '../lib/tableStats.js'

const MERGE_ROW_REASON = '세로 병합이 걸린 행이 있어 할 수 없습니다 (병합을 먼저 나누세요)'
const MERGE_COLUMN_REASON = '가로 병합이 걸린 열이 있어 할 수 없습니다 (병합을 먼저 나누세요)'
const MERGE_FILL_REASON = '병합된 칸이 들어 있어 채울 수 없습니다 (병합을 먼저 나누세요)'

function op(enabled, title, run) {
  return { enabled, title, run }
}

export function buildStructureOps(ctx) {
  const { grid, setGrid, range, isMultiCell, focusCell, setAnchor, setFocusCell, headerRow, setGridAndHeader } = ctx
  const rowCount = grid.length
  const colCount = grid[0]?.length ?? 0

  // 격자를 바꾸고 고른 범위를 정한다. 한 칸만 골랐던 경우에는 그 칸의 입력칸에 포커스를 돌려줄 자리를 반환한다(단추를 눌러 포커스를 잃었으므로).
  // 여러 칸을 골랐던 경우에는 포커스를 주지 않는다 — 입력칸이 포커스를 받으면 범위가 한 칸으로 줄어들기 때문이다.
  function apply(next, anchor, focus, { followFocus }) {
    setGrid(next)
    setAnchor(anchor)
    setFocusCell(focus)
    return followFocus ? visibleCellAt(next, focus.r, focus.c) : null
  }

  // ---- 삽입 --------------------------------------------------------------------------------------------------------
  // 위/왼쪽은 고른 범위의 첫 줄 앞에, 아래/오른쪽은 끝 줄 뒤에 한 줄을 끼운다. 범위가 병합 영역을 걸치고 있으면 병합 전체를 기준으로 해서
  // 병합 한가운데에 끼워 병합이 늘어나는 일이 없게 한다. 끼운 뒤에는 새 줄의 칸(같은 열/행 위치)을 골라 입력칸에 포커스를 준다.
  const ins = expandToMerges(grid, range)
  const insertRowAt = (index) => {
    const next = insertRow(grid, index)
    const target = visibleCellAt(next, index, focusCell.c)
    return apply(next, target, target, { followFocus: true })
  }
  const insertColumnAt = (index) => {
    const next = insertColumn(grid, index)
    const target = visibleCellAt(next, focusCell.r, index)
    return apply(next, target, target, { followFocus: true })
  }
  // 첫 행을 헤더로 쓰는 표에서 맨 윗줄 위에 끼우면 새 빈 행이 헤더가 되어 버리므로 막는다(아래에는 끼울 수 있다).
  const canInsertAbove = !(headerRow && ins.r1 === 0)

  // ---- 이동 --------------------------------------------------------------------------------------------------------
  // 고른 범위가 걸친 행(열) 블록을 한 칸 옮긴다. 이웃 행(열)이 블록 반대편으로 건너간다. 헤더 행은 움직이지도, 넘어가지도 않는다.
  const rowMin = headerRow ? 1 : 0
  function rowMoveReason(direction) {
    if (headerRow && range.r1 < 1) return '헤더 행은 옮길 수 없습니다'
    if (direction === -1 && range.r1 <= rowMin) return headerRow ? '헤더 행 위로는 옮길 수 없습니다' : '이미 맨 위 행입니다'
    if (direction === 1 && range.r2 >= rowCount - 1) return '이미 맨 아래 행입니다'
    return MERGE_ROW_REASON
  }
  function moveRowsBy(direction) {
    const next = moveRows(grid, range.r1, range.r2, direction, rowMin)
    return apply(
      next,
      { r: range.r1 + direction, c: range.c1 },
      { r: range.r2 + direction, c: range.c2 },
      { followFocus: !isMultiCell },
    )
  }
  function columnMoveReason(direction) {
    if (direction === -1 && range.c1 <= 0) return '이미 맨 왼쪽 열입니다'
    if (direction === 1 && range.c2 >= colCount - 1) return '이미 맨 오른쪽 열입니다'
    return MERGE_COLUMN_REASON
  }
  function moveColumnsBy(direction) {
    const next = moveColumns(grid, range.c1, range.c2, direction)
    return apply(
      next,
      { r: range.r1, c: range.c1 + direction },
      { r: range.r2, c: range.c2 + direction },
      { followFocus: !isMultiCell },
    )
  }

  // ---- 복제 --------------------------------------------------------------------------------------------------------
  // 고른 범위가 걸친 행(열)을 그대로 복제해서 바로 아래(오른쪽)에 끼우고, 복제본을 고른다.
  const rowCountSelected = range.r2 - range.r1 + 1
  const colCountSelected = range.c2 - range.c1 + 1
  function duplicateSelectedRows() {
    const next = duplicateRows(grid, range.r1, range.r2)
    return apply(
      next,
      { r: range.r2 + 1, c: range.c1 },
      { r: range.r2 + rowCountSelected, c: range.c2 },
      { followFocus: !isMultiCell },
    )
  }
  function duplicateSelectedColumns() {
    const next = duplicateColumns(grid, range.c1, range.c2)
    return apply(
      next,
      { r: range.r1, c: range.c2 + 1 },
      { r: range.r2, c: range.c2 + colCountSelected },
      { followFocus: !isMultiCell },
    )
  }

  // ---- 채우기 ------------------------------------------------------------------------------------------------------
  const canFillDownNow = canFillDown(grid, range)
  const canFillRightNow = canFillRight(grid, range)
  function fillDownReason() {
    if (range.r1 === range.r2 && range.r1 === 0) return '맨 윗줄 한 행만 골랐습니다. 둘째 줄 이하를 고르거나 두 행 이상을 고르세요'
    return MERGE_FILL_REASON
  }
  function fillRightReason() {
    if (range.c1 === range.c2 && range.c1 === 0) return '맨 왼쪽 열 하나만 골랐습니다. 둘째 열 이후를 고르거나 두 열 이상을 고르세요'
    return MERGE_FILL_REASON
  }

  // ---- 정렬 --------------------------------------------------------------------------------------------------------
  // 고른 범위의 첫 열을 기준으로 줄 전체를 정렬한다. 한 행(한 칸)만 골랐으면 표 전체 행, 여러 행을 골랐으면 그 행들만이고, 첫 행을
  // 헤더로 쓰는 표는 맨 윗줄을 뺀다. 세로 병합이 걸린 행이 있으면 정렬하지 않는다.
  const sortRange = sortScope(range, { headerRow, rowCount })
  const sortBlockedReason =
    sortRange.r2 - sortRange.r1 < 1
      ? '정렬할 행이 2개 이상 있어야 합니다'
      : !canSortRows(grid, sortRange.r1, sortRange.r2)
        ? '세로 병합이 걸린 행이 있어 정렬할 수 없습니다 (병합을 먼저 나누세요)'
        : null
  const sortBy = (descending) => setGrid((g) => sortRows(g, range.c1, sortRange.r1, sortRange.r2, { descending }))
  const sortTitle = (label) =>
    sortBlockedReason ??
    `${columnLabel(range.c1)}열 기준 ${label} 정렬 — ${sortRange.r1 + 1}~${sortRange.r2 + 1}행 (숫자 → 글자 → 빈 칸, 줄 전체가 함께 움직임)`

  // ---- 행·열 바꾸기(전치) ----------------------------------------------------------------------------------------------
  // 가로와 세로를 뒤집는다(규칙은 lib/tableTranspose.js). "첫 번째 행을 헤더로"는 맨 윗줄에만 굵게를 입히는 설정이라 뒤집으면 엉뚱한 줄이
  // 굵어지므로, 지금의 헤더 행을 칸의 굵게로 바꿔 두고(굵은 첫 열이 된다) 체크는 끈다.
  function transposeTable() {
    const base = headerRow ? grid.map((row, r) => (r === 0 ? row.map((cell) => ({ ...cell, bold: true })) : row)) : grid
    const next = transposeGrid(base)
    setGridAndHeader(next, false) // 되돌리기 한 단계로 격자와 헤더 체크를 함께 바꾼다
    setAnchor({ r: 0, c: 0 })
    setFocusCell({ r: 0, c: 0 })
    return visibleCellAt(next, 0, 0)
  }

  const canMoveUp = canMoveRows(grid, range.r1, range.r2, -1, rowMin)
  const canMoveDown = canMoveRows(grid, range.r1, range.r2, 1, rowMin)
  const canMoveLeft = canMoveColumns(grid, range.c1, range.c2, -1)
  const canMoveRight = canMoveColumns(grid, range.c1, range.c2, 1)
  const canDuplicateRow = canDuplicateRows(grid, range.r1, range.r2)
  const canDuplicateColumn = canDuplicateColumns(grid, range.c1, range.c2)

  return {
    insertAbove: op(
      canInsertAbove,
      canInsertAbove ? '위에 행 삽입 (고른 범위의 첫 행 위)' : '헤더 행 위에는 끼울 수 없습니다 (아래에 행 삽입을 쓰세요)',
      () => insertRowAt(ins.r1),
    ),
    insertBelow: op(true, '아래에 행 삽입 (고른 범위의 마지막 행 아래)', () => insertRowAt(ins.r2 + 1)),
    insertLeft: op(true, '왼쪽에 열 삽입 (고른 범위의 첫 열 왼쪽)', () => insertColumnAt(ins.c1)),
    insertRight: op(true, '오른쪽에 열 삽입 (고른 범위의 마지막 열 오른쪽)', () => insertColumnAt(ins.c2 + 1)),
    // 행·열마다 있는 "+" 단추: r 행 아래 / c 열 오른쪽에 하나 끼운다(병합이 걸친 행·열이면 병합 뒤). 고른 범위와 무관하다. 돌려주는 값은 run() 과 같다.
    insertRowAfter: (r) => insertRowAt(insertIndexAfterRow(grid, r)),
    insertColumnAfter: (c) => insertColumnAt(insertIndexAfterColumn(grid, c)),
    moveRowUp: op(canMoveUp, canMoveUp ? '고른 행을 위로 한 칸 이동' : rowMoveReason(-1), () => moveRowsBy(-1)),
    moveRowDown: op(canMoveDown, canMoveDown ? '고른 행을 아래로 한 칸 이동' : rowMoveReason(1), () => moveRowsBy(1)),
    moveColumnLeft: op(canMoveLeft, canMoveLeft ? '고른 열을 왼쪽으로 한 칸 이동' : columnMoveReason(-1), () => moveColumnsBy(-1)),
    moveColumnRight: op(canMoveRight, canMoveRight ? '고른 열을 오른쪽으로 한 칸 이동' : columnMoveReason(1), () => moveColumnsBy(1)),
    duplicateRow: op(
      canDuplicateRow,
      canDuplicateRow ? '고른 행 복제 (바로 아래에 같은 내용으로 끼움)' : MERGE_ROW_REASON,
      duplicateSelectedRows,
    ),
    duplicateColumn: op(
      canDuplicateColumn,
      canDuplicateColumn ? '고른 열 복제 (바로 오른쪽에 같은 내용으로 끼움)' : MERGE_COLUMN_REASON,
      duplicateSelectedColumns,
    ),
    fillDown: op(
      canFillDownNow,
      canFillDownNow ? '아래로 채우기 (Ctrl+D) — 고른 범위의 첫 행(한 행만 골랐으면 바로 위 행)을 아래 칸에 복사' : fillDownReason(),
      () => setGrid((g) => fillDown(g, range)),
    ),
    fillRight: op(
      canFillRightNow,
      canFillRightNow ? '오른쪽으로 채우기 — 고른 범위의 첫 열(한 열만 골랐으면 바로 왼쪽 열)을 오른쪽 칸에 복사' : fillRightReason(),
      () => setGrid((g) => fillRight(g, range)),
    ),
    transpose: op(
      rowCount > 0,
      headerRow
        ? '행과 열 바꾸기 — 가로와 세로를 뒤집습니다. 지금의 헤더 행은 굵은 첫 열이 되고 "첫 번째 행을 헤더로" 체크는 꺼집니다'
        : '행과 열 바꾸기 — 가로와 세로를 뒤집습니다 (한 번 더 누르면 원래대로)',
      transposeTable,
    ),
    sortAscending: op(sortBlockedReason === null, sortTitle('오름차순'), () => sortBy(false)),
    sortDescending: op(sortBlockedReason === null, sortTitle('내림차순'), () => sortBy(true)),
  }
}
