// Copyright (c) dendr000. MIT License.

// 표 편집기 자동 채우기(엑셀의 채우기 핸들 끌기)를 격자에 적용하는 규칙. 화면과 분리한 순수 함수라서 시험할 수 있다.
// 이어 붙일 글자 자체의 규칙은 fillSeries.js 에 있다. 고른 범위(range = { r1, r2, c1, c2 })가 씨앗이고, 핸들을 그 아래(오른쪽)로 끌어서
// 늘린 칸들이 채워진다. 아래로 끌면 고른 열마다, 오른쪽으로 끌면 고른 행마다 따로 규칙을 읽는다.
// 받은 격자는 바꾸지 않는다.

import { continueSeries } from './fillSeries.js'
import { regionHasMerge } from './tableGrid.js'

// 핸들을 hover({ r, c }) 칸까지 끌었을 때 어느 쪽으로 몇 칸 채우는가: { direction: 'down' | 'right', count } 또는 null.
// 고른 범위의 아래·오른쪽으로 끌었을 때만 채운다(위·왼쪽·범위 안은 null). 대각선이면 범위에서 더 멀리 간 쪽이고, 같으면 아래다.
// size = { rows, cols } — 표 끝을 넘지 않게 칸 수를 줄인다.
export function dragFillTarget(range, hover, size) {
  const down = hover.r - range.r2
  const right = hover.c - range.c2
  if (down <= 0 && right <= 0) return null
  if (down >= right) {
    const count = Math.min(down, size.rows - 1 - range.r2)
    return count > 0 ? { direction: 'down', count } : null
  }
  const count = Math.min(right, size.cols - 1 - range.c2)
  return count > 0 ? { direction: 'right', count } : null
}

// 채운 뒤의 고른 범위(씨앗 + 새로 채운 칸).
export function extendedRange(range, direction, count) {
  return direction === 'down' ? { ...range, r2: range.r2 + count } : { ...range, c2: range.c2 + count }
}

// 씨앗과 채울 칸이 표 안에 있고 병합이 없을 때만 채울 수 있다.
export function canAutoFill(grid, range, direction, count) {
  if (count < 1) return false
  if (direction === 'down') {
    return range.r2 + count < grid.length && !regionHasMerge(grid, range.r1, range.r2 + count, range.c1, range.c2)
  }
  if (direction === 'right') {
    const cols = grid[0]?.length ?? 0
    return range.c2 + count < cols && !regionHasMerge(grid, range.r1, range.r2, range.c1, range.c2 + count)
  }
  return false
}

// 새로 채운 칸의 글자는 이어 붙인 값, 서식(배경색·글자색·굵기·정렬)은 씨앗 칸의 것을 순서대로 반복해서 복사한다. 칸의 병합·추가 속성
// (extraAttrs)은 대상 칸의 것을 그대로 둔다. 할 수 없으면 받은 격자를 그대로 돌려준다. options.invert: Ctrl 을 누른 채 끈 경우.
export function autoFill(grid, range, direction, count, { invert = false } = {}) {
  if (!canAutoFill(grid, range, direction, count)) return grid
  const next = grid.map((row) => row.slice())
  const style = (source) => ({ bg: source.bg, color: source.color, align: source.align, bold: source.bold })

  if (direction === 'down') {
    for (let c = range.c1; c <= range.c2; c += 1) {
      const seedCells = []
      for (let r = range.r1; r <= range.r2; r += 1) seedCells.push(grid[r][c])
      const values = continueSeries(seedCells.map((cell) => cell.text ?? ''), count, { invert })
      for (let k = 0; k < count; k += 1) {
        const target = range.r2 + 1 + k
        next[target][c] = { ...grid[target][c], text: values[k], ...style(seedCells[k % seedCells.length]) }
      }
    }
  } else {
    for (let r = range.r1; r <= range.r2; r += 1) {
      const seedCells = []
      for (let c = range.c1; c <= range.c2; c += 1) seedCells.push(grid[r][c])
      const values = continueSeries(seedCells.map((cell) => cell.text ?? ''), count, { invert })
      for (let k = 0; k < count; k += 1) {
        const target = range.c2 + 1 + k
        next[r][target] = { ...grid[r][target], text: values[k], ...style(seedCells[k % seedCells.length]) }
      }
    }
  }
  return next
}
