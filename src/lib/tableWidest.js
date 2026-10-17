// Copyright (c) dendr000. MIT License.

// 표 편집기 "열 너비" 패널의 "가장 긴 칸 기준": 표에서 글자가 가장 넓은 칸을 찾는 규칙. 글자의 실제 너비(px)는 화면에서 재야 하므로(글꼴·굵기에 따라
// 다르다) 재는 함수(measure)를 받는다. 화면과 분리한 순수 함수라서 시험할 수 있다.

// 너비를 잴 칸 목록 [{ r, c, text, bold }]. 글자가 없는 칸, 다른 칸의 병합에 가려진 칸, 가로로 합친 칸(너비가 여러 열에 걸쳐 있어서 한 열의
// 너비를 알 수 없다)은 뺀다. 세로로만 합친 칸은 한 열 안이므로 넣는다. 첫 행을 헤더로 쓰면(headerRow) 그 행은 굵게 그려지므로 bold 다.
// 칸 안의 줄바꿈 글자는 렌더링과 같게 [br] 로 바꿔 돌려준다.
export function measurableCells(grid, headerRow) {
  const cells = []
  grid.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell.mergedInto || cell.colspan > 1) return
      const text = cell.text.trim()
      if (text === '') return
      cells.push({ r, c, text: text.replace(/\r?\n/g, '[br]'), bold: Boolean(cell.bold) || (headerRow && r === 0) })
    })
  })
  return cells
}

// 가장 넓은 칸의 { width, r, c }. width 는 올림한 정수 px 다. 너비가 같으면 위(앞) 칸이다. 잴 칸이 없으면 null.
export function widestCellWidth(grid, headerRow, measure) {
  let best = null
  for (const { r, c, text, bold } of measurableCells(grid, headerRow)) {
    const width = Math.ceil(measure(text, bold))
    if (best === null || width > best.width) best = { width, r, c }
  }
  return best
}
