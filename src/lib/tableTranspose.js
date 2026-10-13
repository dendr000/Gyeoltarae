// Copyright (c) dendr000. MIT License.

// 표 편집기의 행·열 바꾸기(전치) — 가로와 세로를 뒤집는다. 화면과 분리한 순수 함수라서 시험할 수 있다. 받은 격자는 바꾸지 않는다.
// 칸 (r, c) 가 (c, r) 로 가고, 병합은 가로↔세로가 서로 바뀐다(가로로 2칸 합친 칸은 세로로 2칸 합친 칸이 된다). 가려진 칸이 가리키는
// 대표 칸의 자리도 같이 뒤집힌다. 행·열 방향이 있는 속성도 맞바뀐다: rowbgcolor↔colbgcolor, rowcolor↔colcolor, width↔height.
// 표 전체 속성(tablewidth 등 table... 로 시작하는 것)과 그 밖의 속성은 그대로 둔다.

const SWAPPED_ATTRS = [
  ['rowbgcolor=', 'colbgcolor='],
  ['rowcolor=', 'colcolor='],
  ['width=', 'height='],
]

function swapAxisToken(token) {
  for (const [a, b] of SWAPPED_ATTRS) {
    if (token.startsWith(a)) return b + token.slice(a.length)
    if (token.startsWith(b)) return a + token.slice(b.length)
  }
  return token
}

export function transposeGrid(grid) {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => {
      const cell = grid[r][c]
      return {
        ...cell,
        colspan: cell.rowspan,
        rowspan: cell.colspan,
        mergedInto: cell.mergedInto ? { r: cell.mergedInto.c, c: cell.mergedInto.r } : null,
        extraAttrs: (cell.extraAttrs ?? []).map(swapAxisToken),
      }
    }),
  )
}
