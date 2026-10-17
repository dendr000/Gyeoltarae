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

// 행·열마다 있는 "+" 단추가 끼울 자리. r 행 "아래"(c 열 "오른쪽")에 끼우되, 그 행(열)이 병합에 걸쳐 있으면 병합 전체의 뒤로 미뤄서
// 병합 한가운데에 끼워 병합이 늘어나는 일이 없게 한다(툴바의 "아래에 행 삽입" 과 같은 규칙). 돌려주는 값은 insertRow / insertColumn 에 넘기는 index 다.
export function insertIndexAfterRow(grid, r) {
  const lastCol = Math.max((grid[0]?.length ?? 1) - 1, 0)
  return expandToMerges(grid, { r1: r, r2: r, c1: 0, c2: lastCol }).r2 + 1
}

export function insertIndexAfterColumn(grid, c) {
  return expandToMerges(grid, { r1: 0, r2: Math.max(grid.length - 1, 0), c1: c, c2: c }).c2 + 1
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

// ---------------------------------------------------------------------------------------------------------------------
// 행·열 이동, 복제, 아래/오른쪽으로 채우기. 병합이 줄을 가로지르면 줄을 옮기거나 복제할 때 병합이 찢어지므로, 그런 줄은
// 움직이지 않는다("독립이 아니다"). 가로 병합(colspan)은 한 행 안에서 끝나므로 행 이동·복제에는 걸림돌이 아니고, 세로 병합
// (rowspan)은 한 열 안에서 끝나므로 열 이동·복제에는 걸림돌이 아니다.

// 행 r1..r2 가 서로 독립인가 — 세로 병합(rowspan)이 걸려 있지 않은가(대표 칸도, 가려진 칸도 없어야 한다). 표 밖이면 false.
export function rowsAreIndependent(grid, r1, r2) {
  if (!(r1 >= 0 && r1 <= r2 && r2 < grid.length)) return false
  for (let r = r1; r <= r2; r += 1) {
    for (const cell of grid[r]) {
      if (cell.rowspan > 1) return false
      if (cell.mergedInto && cell.mergedInto.r !== r) return false
    }
  }
  return true
}

// 열 c1..c2 가 서로 독립인가 — 가로 병합(colspan)이 걸려 있지 않은가. 표 밖이면 false.
export function columnsAreIndependent(grid, c1, c2) {
  const cols = grid[0]?.length ?? 0
  if (!(c1 >= 0 && c1 <= c2 && c2 < cols)) return false
  for (const row of grid) {
    for (let c = c1; c <= c2; c += 1) {
      const cell = row[c]
      if (cell.colspan > 1) return false
      if (cell.mergedInto && cell.mergedInto.c !== c) return false
    }
  }
  return true
}

// grid 의 rowStart 번째 행부터 order(옛 행 번호들) 순서로 다시 놓은 새 격자. 가려진 칸이 가리키는 행 번호를 새 자리로 고친다.
// 호출하기 전에 rowsAreIndependent 로 병합이 안 걸렸는지 확인해야 한다(정렬·이동이 같이 쓴다).
export function reorderRows(grid, rowStart, order) {
  const rows = grid.map((row) => row.map((cell) => ({ ...cell })))
  order.forEach((from, i) => {
    const to = rowStart + i
    rows[to] = grid[from].map((cell) => (cell.mergedInto ? { ...cell, mergedInto: { r: to, c: cell.mergedInto.c } } : { ...cell }))
  })
  return rows
}

// reorderRows 의 열 버전.
export function reorderColumns(grid, colStart, order) {
  return grid.map((row) => {
    const next = row.map((cell) => ({ ...cell }))
    order.forEach((from, i) => {
      const to = colStart + i
      const cell = row[from]
      next[to] = cell.mergedInto ? { ...cell, mergedInto: { r: cell.mergedInto.r, c: to } } : { ...cell }
    })
    return next
  })
}

function range(from, to) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}

// 행 r1..r2(블록)를 한 칸 위(direction -1)나 아래(+1)로 옮길 수 있는가. 블록과 자리를 바꾸는 이웃 행이 모두 독립이어야 한다.
// minRow 보다 앞의 행(첫 행을 헤더로 쓰는 표의 헤더)은 옮기지도, 넘어가지도 않는다.
export function canMoveRows(grid, r1, r2, direction, minRow = 0) {
  if (direction !== -1 && direction !== 1) return false
  if (!(r1 >= minRow && r1 <= r2 && r2 < grid.length)) return false
  const from = direction === -1 ? r1 - 1 : r1
  const to = direction === -1 ? r2 : r2 + 1
  if (from < minRow || to >= grid.length) return false
  return rowsAreIndependent(grid, from, to)
}

// 행 블록을 한 칸 옮긴 새 격자. 옮길 수 없으면 받은 격자를 그대로 돌려준다. 블록 위(아래)의 이웃 행이 블록 반대편으로 건너간다.
export function moveRows(grid, r1, r2, direction, minRow = 0) {
  if (!canMoveRows(grid, r1, r2, direction, minRow)) return grid
  if (direction === -1) return reorderRows(grid, r1 - 1, [...range(r1, r2), r1 - 1])
  return reorderRows(grid, r1, [r2 + 1, ...range(r1, r2)])
}

// moveRows 의 열 버전(왼쪽 -1, 오른쪽 +1).
export function canMoveColumns(grid, c1, c2, direction) {
  if (direction !== -1 && direction !== 1) return false
  const cols = grid[0]?.length ?? 0
  if (!(c1 >= 0 && c1 <= c2 && c2 < cols)) return false
  const from = direction === -1 ? c1 - 1 : c1
  const to = direction === -1 ? c2 : c2 + 1
  if (from < 0 || to >= cols) return false
  return columnsAreIndependent(grid, from, to)
}

export function moveColumns(grid, c1, c2, direction) {
  if (!canMoveColumns(grid, c1, c2, direction)) return grid
  if (direction === -1) return reorderColumns(grid, c1 - 1, [...range(c1, c2), c1 - 1])
  return reorderColumns(grid, c1, [c2 + 1, ...range(c1, c2)])
}

function copyCell(cell, mergedInto) {
  return { ...cell, mergedInto, extraAttrs: [...(cell.extraAttrs ?? [])] }
}

// 행 r1..r2 를 복제해서 r2 바로 아래에 끼운 새 격자(복제본은 r2+1 부터). 세로 병합이 걸린 행이면 받은 격자를 그대로 돌려준다.
export function canDuplicateRows(grid, r1, r2) {
  return rowsAreIndependent(grid, r1, r2)
}

export function duplicateRows(grid, r1, r2) {
  if (!canDuplicateRows(grid, r1, r2)) return grid
  const count = r2 - r1 + 1
  let next = grid
  // 독립인 행들이라 r2 아래 경계는 어떤 병합도 가로지르지 않는다 — 끼워 넣은 행은 모두 평범한 빈 행이다.
  for (let i = 0; i < count; i += 1) next = insertRow(next, r2 + 1)
  for (let i = 0; i < count; i += 1) {
    const to = r2 + 1 + i
    next[to] = grid[r1 + i].map((cell) => copyCell(cell, cell.mergedInto ? { r: to, c: cell.mergedInto.c } : null))
  }
  return next
}

// 열 r1..r2 의 열 버전(복제본은 c2+1 부터).
export function canDuplicateColumns(grid, c1, c2) {
  return columnsAreIndependent(grid, c1, c2)
}

export function duplicateColumns(grid, c1, c2) {
  if (!canDuplicateColumns(grid, c1, c2)) return grid
  const count = c2 - c1 + 1
  let next = grid
  for (let i = 0; i < count; i += 1) next = insertColumn(next, c2 + 1)
  for (let r = 0; r < grid.length; r += 1) {
    for (let i = 0; i < count; i += 1) {
      const to = c2 + 1 + i
      const cell = grid[r][c1 + i]
      next[r][to] = copyCell(cell, cell.mergedInto ? { r: cell.mergedInto.r, c: to } : null)
    }
  }
  return next
}

function hasMerge(cell) {
  return !cell || cell.colspan > 1 || cell.rowspan > 1 || Boolean(cell.mergedInto)
}

// 채울 때 옮기는 것: 글자와 서식. 칸의 병합·추가 속성(extraAttrs)은 대상 칸의 것을 그대로 둔다.
function copyContent(target, source) {
  return { ...target, text: source.text, bg: source.bg, color: source.color, align: source.align, bold: source.bold }
}

// 아래로 채우기(엑셀의 Ctrl+D): 여러 행을 골랐으면 첫 행을 나머지 행에, 한 행만 골랐으면 바로 위 행을 그 행에 복사한다.
// 맨 윗줄 한 행만 골랐거나 병합된 칸이 들어 있으면 하지 않는다(받은 격자를 그대로 돌려준다).
export function canFillDown(grid, { r1, r2, c1, c2 }) {
  const source = r1 < r2 ? r1 : r1 - 1
  if (source < 0 || r1 > r2 || r2 >= grid.length || c1 > c2) return false
  for (let r = source; r <= r2; r += 1) {
    for (let c = c1; c <= c2; c += 1) if (hasMerge(grid[r][c])) return false
  }
  return true
}

export function fillDown(grid, selection) {
  if (!canFillDown(grid, selection)) return grid
  const { r1, r2, c1, c2 } = selection
  const source = r1 < r2 ? r1 : r1 - 1
  const next = grid.map((row) => row.slice())
  for (let r = source + 1; r <= r2; r += 1) {
    for (let c = c1; c <= c2; c += 1) next[r][c] = copyContent(grid[r][c], grid[source][c])
  }
  return next
}

// 오른쪽으로 채우기(엑셀의 Ctrl+R): fillDown 의 가로 버전.
export function canFillRight(grid, { r1, r2, c1, c2 }) {
  const cols = grid[0]?.length ?? 0
  const source = c1 < c2 ? c1 : c1 - 1
  if (source < 0 || c1 > c2 || c2 >= cols || r1 > r2 || r2 >= grid.length) return false
  for (let r = r1; r <= r2; r += 1) {
    for (let c = source; c <= c2; c += 1) if (hasMerge(grid[r][c])) return false
  }
  return true
}

export function fillRight(grid, selection) {
  if (!canFillRight(grid, selection)) return grid
  const { r1, r2, c1, c2 } = selection
  const source = c1 < c2 ? c1 : c1 - 1
  const next = grid.map((row) => row.slice())
  for (let r = r1; r <= r2; r += 1) {
    for (let c = source + 1; c <= c2; c += 1) next[r][c] = copyContent(grid[r][c], grid[r][source])
  }
  return next
}

// r1..r2 행, c1..c2 열 영역에 병합된 칸(대표 칸이든 가려진 칸이든)이 하나라도 있는가. 영역이 표 밖으로 나가도 true(칸이 없으므로 막는 쪽).
export function regionHasMerge(grid, r1, r2, c1, c2) {
  for (let r = r1; r <= r2; r += 1) {
    for (let c = c1; c <= c2; c += 1) if (hasMerge(grid[r]?.[c])) return true
  }
  return false
}
