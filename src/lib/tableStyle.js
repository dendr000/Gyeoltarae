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

// ---- 열 너비·행 높이 ----------------------------------------------------------------------------------------------------
// 크기는 칸의 `<width=120px>` / `<height=40px>` 속성으로 남는다. 한 열(행)의 크기는 그 줄의 "붙일 수 있는 칸" 가운데 맨 위(맨 왼쪽) 한 곳에만 둔다.

function normalizeSize(value, unit, max) {
  if (unit !== 'px' && unit !== '%') return null
  const number = Math.round(Number(String(value).trim()))
  if (!Number.isFinite(number) || number < 1 || number > max) return null
  return `${number}${unit}`
}

// 입력칸의 값과 단위를 `120px` / `30%` 로 만든다. 파서가 읽을 수 있는 범위(정수, px 1~9999, % 1~100)만 허용하고 소수는 반올림한다. 아니면 null.
export function normalizeWidth(value, unit) {
  return normalizeSize(value, unit, unit === '%' ? 100 : 9999)
}

// 행 높이는 px 만(표 높이 대비 %는 뜻이 없다). 정수 1~9999, 소수는 반올림. 아니면 null.
export function normalizeHeight(value) {
  return normalizeSize(value, 'px', 9999)
}

const TOKEN = { width: /^width=(\d{1,4})(px|%)?$/, height: /^height=(\d{1,4})(px|%)?$/ }

// 크기를 붙일 수 있는 칸의 자리 [[r, c], ...]. axis 'column': 열 index 의 칸들(위→아래), 'row': 행 index 의 칸들(왼쪽→오른쪽).
// 병합에 가려지지 않고, 그 방향으로 합쳐지지도 않은 칸만(합쳐진 칸의 크기는 어느 줄의 것인지 알 수 없다).
function sizeCells(grid, axis, index) {
  const cells = []
  if (axis === 'column') {
    for (let r = 0; r < grid.length; r += 1) {
      const cell = grid[r][index]
      if (cell && !cell.mergedInto && cell.colspan === 1) cells.push([r, index])
    }
  } else {
    for (let c = 0; c < (grid[index]?.length ?? 0); c += 1) {
      const cell = grid[index][c]
      if (cell && !cell.mergedInto && cell.rowspan === 1) cells.push([index, c])
    }
  }
  return cells
}

function readSize(grid, axis, index, kind) {
  for (const [r, c] of sizeCells(grid, axis, index)) {
    for (const token of grid[r][c].extraAttrs ?? []) {
      const match = TOKEN[kind].exec(token)
      if (match) return { value: Number(match[1]), unit: match[2] ?? 'px' }
    }
  }
  return null
}

// from..to 줄의 크기를 size(`120px` 같은 normalize* 결과, null 이면 지움)로 정한 { grid, changed }. changed 는 실제로 바뀐 줄 수다.
// 같은 줄의 다른 칸에 있던 같은 종류의 속성은 지우고 맨 위(왼쪽) 붙일 수 있는 칸 한 곳에만 둔다. 다른 속성은 건드리지 않는다.
function writeSize(grid, axis, from, to, kind, size) {
  const next = grid.map((row) => row.slice())
  const prefix = `${kind}=`
  let changed = 0
  for (let index = from; index <= to; index += 1) {
    const cells = sizeCells(grid, axis, index)
    if (cells.length === 0) continue
    const withSize = cells.filter(([r, c]) => (grid[r][c].extraAttrs ?? []).some((token) => token.startsWith(prefix)))
    const sizeTokens = withSize.flatMap(([r, c]) => grid[r][c].extraAttrs.filter((token) => token.startsWith(prefix)))
    // 이미 원하는 상태: 지우려는데 속성이 없거나, 맨 위(왼쪽) 칸 한 곳에만 같은 값이 있다.
    const alreadySet =
      size === null
        ? withSize.length === 0
        : withSize.length === 1 && withSize[0][0] === cells[0][0] && withSize[0][1] === cells[0][1] && sizeTokens.length === 1 && sizeTokens[0] === `${prefix}${size}`
    if (alreadySet) continue
    changed += 1
    for (const [r, c] of withSize) {
      next[r][c] = { ...next[r][c], extraAttrs: next[r][c].extraAttrs.filter((token) => !token.startsWith(prefix)) }
    }
    if (size !== null) {
      const [r, c] = cells[0]
      next[r][c] = { ...next[r][c], extraAttrs: [...(next[r][c].extraAttrs ?? []), `${prefix}${size}`] }
    }
  }
  return changed === 0 ? { grid, changed: 0 } : { grid: next, changed }
}

// 열 c 의 지금 너비 { value, unit }. 맨 위에서부터 처음 만나는 width 속성을 읽고(단위가 없으면 px), 없으면 null.
export function getColumnWidth(grid, c) {
  return readSize(grid, 'column', c, 'width')
}

// 열 c1..c2 의 너비를 width 로 정한 { grid, changed }.
export function setColumnWidth(grid, c1, c2, width) {
  return writeSize(grid, 'column', c1, c2, 'width', width)
}

// 행 r 의 지금 높이 { value, unit }. 없으면 null.
export function getRowHeight(grid, r) {
  return readSize(grid, 'row', r, 'height')
}

// 행 r1..r2 의 높이를 height 로 정한 { grid, changed }.
export function setRowHeight(grid, r1, r2, height) {
  return writeSize(grid, 'row', r1, r2, 'height', height)
}
