// Copyright (c) dendr000. MIT License.

// 표 편집기 자동 채우기(엑셀의 채우기 핸들 끌기)를 격자에 적용하는 규칙. 화면과 분리한 순수 함수라서 시험할 수 있다.
// 이어 붙일 글자 자체의 규칙은 fillSeries.js 에 있다. 고른 범위(range = { r1, r2, c1, c2 })가 씨앗이고, 핸들을 그 위·아래·왼쪽·오른쪽으로
// 끌어서 늘린 칸들이 채워진다. 아래·위로 끌면 고른 열마다, 오른쪽·왼쪽으로 끌면 고른 행마다 따로 규칙을 읽는다. 위·왼쪽으로 끌면 거꾸로 이어 간다.
// 받은 격자는 바꾸지 않는다.

import { continueSeries } from './fillSeries.js'
import { regionHasMerge } from './tableGrid.js'

// 핸들을 hover({ r, c }) 칸까지 끌었을 때 어느 쪽으로 몇 칸 채우는가: { direction: 'down' | 'right' | 'up' | 'left', count } 또는 null.
// 범위 안이면 null. 여러 방향으로 벗어났으면 범위에서 가장 멀리 간 쪽이고, 같으면 아래 → 오른쪽 → 위 → 왼쪽 순이다.
// size = { rows, cols } — 표 가장자리를 넘지 않게 칸 수를 줄이고, 줄인 뒤 0 이면 null.
export function dragFillTarget(range, hover, size) {
  const candidates = [
    { direction: 'down', distance: hover.r - range.r2, room: size.rows - 1 - range.r2 },
    { direction: 'right', distance: hover.c - range.c2, room: size.cols - 1 - range.c2 },
    { direction: 'up', distance: range.r1 - hover.r, room: range.r1 },
    { direction: 'left', distance: range.c1 - hover.c, room: range.c1 },
  ].filter((candidate) => candidate.distance > 0)
  if (candidates.length === 0) return null
  // 가장 멀리 간 방향(같으면 앞에 있는 쪽)
  const best = candidates.reduce((a, b) => (b.distance > a.distance ? b : a))
  const count = Math.min(best.distance, best.room)
  return count > 0 ? { direction: best.direction, count } : null
}

// 채운 뒤의 고른 범위(씨앗 + 새로 채운 칸).
export function extendedRange(range, direction, count) {
  if (direction === 'down') return { ...range, r2: range.r2 + count }
  if (direction === 'right') return { ...range, c2: range.c2 + count }
  if (direction === 'up') return { ...range, r1: range.r1 - count }
  return { ...range, c1: range.c1 - count }
}

// 씨앗와 채울 칸이 표 안에 있고 병합이 없을 때만 채울 수 있다.
export function canAutoFill(grid, range, direction, count) {
  if (count < 1) return false
  const cols = grid[0]?.length ?? 0
  if (direction === 'down') return range.r2 + count < grid.length && !regionHasMerge(grid, range.r1, range.r2 + count, range.c1, range.c2)
  if (direction === 'right') return range.c2 + count < cols && !regionHasMerge(grid, range.r1, range.r2, range.c1, range.c2 + count)
  if (direction === 'up') return range.r1 - count >= 0 && !regionHasMerge(grid, range.r1 - count, range.r2, range.c1, range.c2)
  if (direction === 'left') return range.c1 - count >= 0 && !regionHasMerge(grid, range.r1, range.r2, range.c1 - count, range.c2)
  return false
}

// 핸들을 두 번 눌렀을 때(더블클릭) 아래로 채울 칸 수 — 엑셀처럼 이웃한 열의 데이터가 이어진 곳까지다. 고른 범위 왼쪽 열을 먼저, 없으면 오른쪽 열을
// 본다. 그 열에서 고른 범위의 마지막 행에 글자가 있고, 그 아래로 글자가 이어진 칸 수를 센다(빈 칸이나 표 끝에서 멈춤). 기준이 없으면 0.
export function adjacentDataCount(grid, range) {
  const cols = grid[0]?.length ?? 0
  const filled = (r, c) => {
    const cell = grid[r]?.[c]
    return Boolean(cell) && !cell.mergedInto && typeof cell.text === 'string' && cell.text.trim() !== ''
  }
  for (const c of [range.c1 - 1, range.c2 + 1]) {
    if (c < 0 || c >= cols || !filled(range.r2, c)) continue
    let count = 0
    while (filled(range.r2 + 1 + count, c)) count += 1
    if (count > 0) return count
  }
  return 0
}

// 새로 채운 칸의 글자는 이어 붙인 값, 서식(배경색·글자색·굵기·정렬)은 씨앗 칸의 것을 이어 붙는 순서대로 반복해서 복사한다. 칸의 병합·추가 속성
// (extraAttrs)은 대상 칸의 것을 그대로 둔다. 할 수 없으면 받은 격자를 그대로 돌려준다. options.invert: Ctrl 을 누른 채 끈 경우.
export function autoFill(grid, range, direction, count, { invert = false } = {}) {
  if (!canAutoFill(grid, range, direction, count)) return grid
  const next = grid.map((row) => row.slice())
  const backward = direction === 'up' || direction === 'left'
  const style = (source) => ({ bg: source.bg, color: source.color, align: source.align, bold: source.bold })

  // 한 줄(열 또는 행)을 채운다. seedCells 는 문서 순서(위→아래, 왼쪽→오른쪽), place(k, 값) 은 k 번째로 가까운 칸에 쓴다.
  const fillLine = (seedCells, place) => {
    const values = continueSeries(seedCells.map((cell) => cell.text ?? ''), count, { invert, backward })
    const order = backward ? [...seedCells].reverse() : seedCells // 이어 붙는 쪽 씨앗부터
    for (let k = 0; k < count; k += 1) place(k, values[k], style(order[k % order.length]))
  }

  if (direction === 'down' || direction === 'up') {
    for (let c = range.c1; c <= range.c2; c += 1) {
      const seedCells = []
      for (let r = range.r1; r <= range.r2; r += 1) seedCells.push(grid[r][c])
      fillLine(seedCells, (k, text, formatting) => {
        const target = direction === 'down' ? range.r2 + 1 + k : range.r1 - 1 - k
        next[target][c] = { ...grid[target][c], text, ...formatting }
      })
    }
  } else {
    for (let r = range.r1; r <= range.r2; r += 1) {
      const seedCells = []
      for (let c = range.c1; c <= range.c2; c += 1) seedCells.push(grid[r][c])
      fillLine(seedCells, (k, text, formatting) => {
        const target = direction === 'right' ? range.c2 + 1 + k : range.c1 - 1 - k
        next[r][target] = { ...grid[r][target], text, ...formatting }
      })
    }
  }
  return next
}
