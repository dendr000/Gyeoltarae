// Copyright (c) dendr000. MIT License.

// 표 편집기의 줄무늬 행(번갈아 배경색)과 열 너비. 둘 다 칸의 서식으로 문서에 남는다(줄무늬는 칸의 배경색, 열 너비는 칸의 `<width=120px>` 속성).
// 화면과 분리한 순수 함수라서 시험할 수 있다. 받은 격자는 바꾸지 않고, 바꿀 것이 없으면 같은 격자를 돌려준다.

function validScope(scope) {
  return scope.r1 <= scope.r2 && scope.c1 <= scope.c2
}

// 줄무늬: scope({ r1, r2, c1, c2 }, 끝 포함)의 행을 한 줄 걸러 color 로 칠한다. startWith: 'first' 는 범위의 첫 행부터, 'second' 는 둘째 행부터.
// 헤더 행을 뺄지는 호출한 쪽이 scope 로 정한다(r1 을 1 로). 병합에 가려진 칸은 칠하지 않고, 칠하는 줄의 기존 배경색은 덮어쓴다.
export function stripeRows(grid, scope, color, { startWith = 'first' } = {}) {
  if (!validScope(scope)) return grid
  const phase = startWith === 'second' ? 1 : 0
  let painted = 0
  const next = grid.map((row, r) => {
    if (r < scope.r1 || r > scope.r2 || (r - scope.r1) % 2 !== phase) return row
    return row.map((cell, c) => {
      if (c < scope.c1 || c > scope.c2 || cell.mergedInto) return cell
      painted += 1
      return { ...cell, bg: color }
    })
  })
  return painted === 0 ? grid : next
}

// 줄무늬 해제: scope 안에서 배경색이 color 와 같은(대소문자 무시) 칸의 배경색을 지운다. 다른 색은 남긴다.
export function clearStripes(grid, scope, color) {
  if (!validScope(scope)) return grid
  const target = color.toLowerCase()
  let cleared = 0
  const next = grid.map((row, r) => {
    if (r < scope.r1 || r > scope.r2) return row
    return row.map((cell, c) => {
      if (c < scope.c1 || c > scope.c2 || typeof cell.bg !== 'string' || cell.bg.toLowerCase() !== target) return cell
      cleared += 1
      return { ...cell, bg: '' }
    })
  })
  return cleared === 0 ? grid : next
}

// ---- 열 너비 ----------------------------------------------------------------------------------------------------------

// 입력칸의 값과 단위를 `120px` / `30%` 로 만든다. 파서가 읽을 수 있는 범위(정수, px 1~9999, % 1~100)만 허용하고 소수는 반올림한다. 아니면 null.
export function normalizeWidth(value, unit) {
  if (unit !== 'px' && unit !== '%') return null
  const number = Math.round(Number(String(value).trim()))
  const max = unit === '%' ? 100 : 9999
  if (!Number.isFinite(number) || number < 1 || number > max) return null
  return `${number}${unit}`
}

const WIDTH_TOKEN = /^width=(\d{1,4})(px|%)?$/

// 열 너비를 붙일 수 있는 칸 — 병합에 가려지지 않았고 가로로 합쳐지지도 않은 칸(합쳐진 칸의 너비는 어느 열의 것인지 알 수 없다).
function widthCellRows(grid, c) {
  const rows = []
  for (let r = 0; r < grid.length; r += 1) {
    const cell = grid[r][c]
    if (cell && !cell.mergedInto && cell.colspan === 1) rows.push(r)
  }
  return rows
}

// 열 c 의 지금 너비 { value, unit }. 맨 위에서부터 처음 만나는 width 속성을 읽고(단위가 없으면 px), 없으면 null.
export function getColumnWidth(grid, c) {
  for (const r of widthCellRows(grid, c)) {
    for (const token of grid[r][c].extraAttrs ?? []) {
      const match = WIDTH_TOKEN.exec(token)
      if (match) return { value: Number(match[1]), unit: match[2] ?? 'px' }
    }
  }
  return null
}

// 열 c1..c2 의 너비를 width(`120px` 같은 normalizeWidth 결과, null 이면 지움)로 정한 { grid, changed }. changed 는 실제로 바뀐 열 수다.
// 같은 열의 다른 칸에 있던 width 는 지우고, 맨 위의 붙일 수 있는 칸 한 곳에만 둔다(다른 속성은 건드리지 않는다).
export function setColumnWidth(grid, c1, c2, width) {
  const next = grid.map((row) => row.slice())
  let changed = 0
  for (let c = c1; c <= c2; c += 1) {
    const rows = widthCellRows(grid, c)
    if (rows.length === 0) continue
    const withWidth = rows.filter((r) => (grid[r][c].extraAttrs ?? []).some((token) => token.startsWith('width=')))
    // 이미 원하는 상태: 지우려는데 width 가 없거나, 맨 위 칸 한 곳에만 같은 값이 있다.
    const widthTokens = withWidth.flatMap((r) => grid[r][c].extraAttrs.filter((token) => token.startsWith('width=')))
    const alreadySet =
      width === null
        ? withWidth.length === 0
        : withWidth.length === 1 && withWidth[0] === rows[0] && widthTokens.length === 1 && widthTokens[0] === `width=${width}`
    if (alreadySet) continue
    changed += 1
    for (const r of withWidth) {
      next[r][c] = { ...next[r][c], extraAttrs: next[r][c].extraAttrs.filter((token) => !token.startsWith('width=')) }
    }
    if (width !== null) {
      const top = next[rows[0]][c]
      next[rows[0]][c] = { ...top, extraAttrs: [...(top.extraAttrs ?? []), `width=${width}`] }
    }
  }
  return changed === 0 ? { grid, changed: 0 } : { grid: next, changed }
}
