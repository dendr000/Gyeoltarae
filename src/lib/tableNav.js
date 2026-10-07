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

// Tab: 어느 열에서 눌러도 "아래 행의 첫 번째 셀". 마지막 행이면 새 행을 만들고 그 행의 첫 번째 셀.
export function tabTarget(grid, r) {
  const next = r + 1
  if (next >= grid.length) return { r: next, c: 0, addRow: true }
  return { r: next, c: firstVisibleColumn(grid[next]), addRow: false }
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
