// Copyright (c) dendr000. MIT License.

// 표 편집기의 격자(grid) 구조를 바꾸는 순수 함수. 화면과 분리해서 시험할 수 있다.
// grid 는 2차원 셀 배열이다. 병합한 칸의 대표 칸(왼쪽 위)만 colspan/rowspan 을 갖고, 대표 칸이 덮는 나머지 칸은
// 입력칸이 없는 "가려진 칸"으로 mergedInto: { r, c } 에 대표 칸의 자리를 들고 있다. 모든 행의 길이는 같다.
// 아래 함수들은 받은 격자를 바꾸지 않고 새 격자를 돌려준다.

export function emptyCell() {
  return { text: '', bg: '', color: '', align: '', bold: false, colspan: 1, rowspan: 1, mergedInto: null, extraAttrs: [] }
}

function coveredCell(r, c) {
  return { ...emptyCell(), mergedInto: { r, c } }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

// index 번째 행 "앞"에 빈 행을 끼운다(index 가 행 수와 같으면 맨 아래). 엑셀처럼, 세로 병합의 한가운데에 끼우면 그 병합이
// 한 칸 늘어나고 새 행의 해당 칸들은 병합에 가려진 칸이 된다. 병합의 맨 위나 바로 아래에 끼우면 병합은 그대로다.
export function insertRow(grid, index) {
  const cols = grid[0]?.length ?? 0
  const at = clamp(index, 0, grid.length)

  // 끼운 자리 이후의 대표 칸을 가리키던 칸은 가리키는 행을 하나 내린다. 칸은 모두 복사해서 원래 격자를 건드리지 않는다.
  const rows = grid.map((row) =>
    row.map((cell) =>
      cell.mergedInto && cell.mergedInto.r >= at
        ? { ...cell, mergedInto: { r: cell.mergedInto.r + 1, c: cell.mergedInto.c } }
        : { ...cell },
    ),
  )

  const added = Array.from({ length: cols }, emptyCell)
  for (let r = 0; r < at; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const origin = rows[r][c]
      if (origin.mergedInto || origin.rowspan <= 1) continue
      if (r + origin.rowspan - 1 < at) continue // 이 병합은 끼운 자리 위에서 끝난다
      origin.rowspan += 1
      for (let dc = 0; dc < origin.colspan && c + dc < cols; dc += 1) added[c + dc] = coveredCell(r, c)
    }
  }

  rows.splice(at, 0, added)
  return rows
}

// index 번째 열 "앞"에 빈 열을 끼운다(열 수와 같으면 맨 오른쪽). 가로 병합의 한가운데에 끼우면 그 병합이 한 칸 늘어난다.
export function insertColumn(grid, index) {
  const cols = grid[0]?.length ?? 0
  const at = clamp(index, 0, cols)

  const rows = grid.map((row) =>
    row.map((cell) =>
      cell.mergedInto && cell.mergedInto.c >= at
        ? { ...cell, mergedInto: { r: cell.mergedInto.r, c: cell.mergedInto.c + 1 } }
        : { ...cell },
    ),
  )

  const added = Array.from({ length: rows.length }, emptyCell)
  for (let r = 0; r < rows.length; r += 1) {
    for (let c = 0; c < at; c += 1) {
      const origin = rows[r][c]
      if (origin.mergedInto || origin.colspan <= 1) continue
      if (c + origin.colspan - 1 < at) continue // 이 병합은 끼운 자리 왼쪽에서 끝난다
      origin.colspan += 1
      for (let dr = 0; dr < origin.rowspan && r + dr < rows.length; dr += 1) added[r + dr] = coveredCell(r, c)
    }
  }

  return rows.map((row, r) => [...row.slice(0, at), added[r], ...row.slice(at)])
}

// (r, c) 자리의 입력칸이 있는 칸의 자리. 다른 칸의 병합에 가려진 자리면 그 병합의 대표 칸 자리를 돌려준다.
// 표 밖의 자리는 가장 가까운 칸으로 맞춘다. 키보드 포커스를 줄 칸을 정할 때 쓴다(가려진 칸에는 입력칸이 없다).
export function visibleCellAt(grid, r, c) {
  if (grid.length === 0) return { r: 0, c: 0 }
  const row = clamp(r, 0, grid.length - 1)
  const col = clamp(c, 0, (grid[row]?.length ?? 1) - 1)
  const cell = grid[row]?.[col]
  return cell?.mergedInto ? { r: cell.mergedInto.r, c: cell.mergedInto.c } : { r: row, c: col }
}

// 고른 범위({ r1, r2, c1, c2 }, 끝 포함)가 병합 영역을 일부만 걸치고 있으면 그 병합 전체가 들어오도록 넓힌다. 넓어진 범위가
// 또 다른 병합에 걸치면 더 넓어진다. "아래에 행 삽입" 처럼 범위의 가장자리를 기준으로 하는 동작이 병합 한가운데에 걸리지 않게 한다.
export function expandToMerges(grid, range) {
  let { r1, r2, c1, c2 } = range
  let changed = true
  while (changed) {
    changed = false
    for (let r = r1; r <= r2; r += 1) {
      for (let c = c1; c <= c2; c += 1) {
        const cell = grid[r]?.[c]
        if (!cell) continue
        const origin = cell.mergedInto ?? { r, c }
        const originCell = grid[origin.r]?.[origin.c]
        if (!originCell) continue
        const endRow = origin.r + originCell.rowspan - 1
        const endCol = origin.c + originCell.colspan - 1
        if (origin.r < r1) { r1 = origin.r; changed = true }
        if (endRow > r2) { r2 = endRow; changed = true }
        if (origin.c < c1) { c1 = origin.c; changed = true }
        if (endCol > c2) { c2 = endCol; changed = true }
      }
    }
  }
  return { r1, r2, c1, c2 }
}
