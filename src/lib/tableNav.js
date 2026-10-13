// Copyright (c) dendr000. MIT License.

// 표 편집기의 셀 안에서 Tab·Enter 를 눌렀을 때 어느 셀로 갈지. 화면과 분리한 순수 함수라서 시험할 수
// 있다. grid 는 편집기의 2차원 셀 배열 — 셀은 { rowspan, colspan, mergedInto } 를 가지며, 다른 셀의
// 병합에 가려진 칸은 mergedInto 가 있고 화면에 입력칸(<input>)이 없다.
//
// 돌려주는 값: { r, c, addRow } — 이동할 셀의 위치. addRow 가 true 면 그 행은 아직 없으니 호출한
// 쪽이 행을 하나 추가(맨 아래)한 뒤에 그 칸으로 가야 한다.

// 한 행에서 입력칸이 있는(= 병합에 가려지지 않은) 첫 번째 열.
function firstVisibleColumn(row) {
  const index = row.findIndex((cell) => !cell.mergedInto)
  return index === -1 ? 0 : index
}

// Tab: 같은 행에서 오른쪽의 다음 셀(병합에 가려진 칸은 건너뜀). 행의 마지막 셀이면 "아래 행의 첫 번째
// 셀" — 예전에는 여기서 행 끝의 삭제 버튼 [−] 으로 포커스가 갔다. 마지막 행의 마지막 셀이면 새 행을 만들고
// 그 행의 첫 번째 셀. (처음에는 "어느 열에서 눌러도 아래 행 첫 셀"로 잘못 만들었다가, 오른쪽에 셀이 있는데도
// 아래로 내려간다는 지적을 받고 이 규칙으로 고쳤다.)
export function tabTarget(grid, r, c) {
  const row = grid[r] ?? []
  for (let next = c + 1; next < row.length; next += 1) {
    if (!row[next].mergedInto) return { r, c: next, addRow: false }
  }
  const nextRow = r + 1
  if (nextRow >= grid.length) return { r: nextRow, c: 0, addRow: true }
  return { r: nextRow, c: firstVisibleColumn(grid[nextRow]), addRow: false }
}

// Shift+Tab: Tab 의 반대 — 같은 행에서 왼쪽의 이전 셀(가려진 칸은 건너뜀), 행의 첫 번째 셀이면 윗 행의 마지막
// 셀. 표의 맨 처음 셀이면 null(호출한 쪽이 평소 포커스 이동에 맡긴다). 새 행은 만들지 않는다.
export function shiftTabTarget(grid, r, c) {
  const row = grid[r] ?? []
  for (let prev = c - 1; prev >= 0; prev -= 1) {
    if (!row[prev].mergedInto) return { r, c: prev }
  }
  if (r === 0) return null
  const prevRow = grid[r - 1]
  let last = prevRow.length - 1
  while (last > 0 && prevRow[last].mergedInto) last -= 1
  return { r: r - 1, c: last }
}

// Enter: 같은 열의 바로 아래 셀. 세로로 병합된 셀(rowspan)에서는 병합이 끝난 다음 행으로 간다(병합된
// 칸들은 같은 셀이라 한 칸씩 내려가면 제자리다). 아래 칸이 다른 셀의 병합에 가려져 있으면 그 칸을 덮고
// 있는 셀(화면에 보이는 셀)로 간다. 마지막 행이면 새 행을 만들고 같은 열로 간다.
export function enterTarget(grid, r, c) {
  const span = Math.max(1, grid[r]?.[c]?.rowspan ?? 1)
  const next = r + span
  if (next >= grid.length) return { r: next, c, addRow: true }
  const below = grid[next][c]
  if (below?.mergedInto) return { r: below.mergedInto.r, c: below.mergedInto.c, addRow: false }
  return { r: next, c, addRow: false }
}

// 방향키: 칸 입력창 안에서 화살표로 칸 사이를 이동할 때 갈 칸. direction 은 'up' | 'down' | 'left' | 'right'.
// 병합을 고려한다 — 가로로 병합된 칸(colspan)에서 오른쪽으로 가면 병합이 끝난 다음 칸으로, 세로로 병합된 칸(rowspan)에서 아래로 가면 병합이
// 끝난 다음 행으로 간다. 가려진 칸으로 가게 되면 그 칸을 덮고 있는 대표 칸(화면에 입력창이 있는 칸)으로 간다. 표 끝이면 null — 호출한 쪽이
// 평소 동작(입력창 안의 커서 이동)에 맡긴다. 새 행은 만들지 않는다(Tab·Enter 와 다르다).
export function arrowTarget(grid, r, c, direction) {
  const here = grid[r]?.[c]
  if (!here) return null
  let target
  if (direction === 'right') target = { r, c: c + Math.max(1, here.colspan ?? 1) }
  else if (direction === 'left') target = { r, c: c - 1 }
  else if (direction === 'down') target = { r: r + Math.max(1, here.rowspan ?? 1), c }
  else if (direction === 'up') target = { r: r - 1, c }
  else return null

  const cell = grid[target.r]?.[target.c]
  if (!cell) return null
  return cell.mergedInto ? { r: cell.mergedInto.r, c: cell.mergedInto.c } : target
}
