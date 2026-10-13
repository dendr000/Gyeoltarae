// Copyright (c) dendr000. MIT License.

// 표 편집기의 찾아 바꾸기. 화면과 분리한 순수 함수라서 시험할 수 있다. 문서 편집기의 찾기(Ctrl+F)와 같은 규칙이다:
// 대소문자를 구분하지 않고, 입력한 글자를 그대로(정규식 특수문자도 그냥 글자로) 찾는다.
// grid 는 표 편집기의 2차원 셀 배열({ text, mergedInto, ... }). 다른 칸의 병합에 가려진 칸(mergedInto)은 입력칸이 없으므로
// 찾지도 바꾸지도 않는다. scope({ r1, r2, c1, c2 }, 끝 포함)를 주면 그 범위 안의 칸만 다루고, null 이면 표 전체다.
// 받은 격자는 바꾸지 않는다.

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function inScope(r, c, scope) {
  return !scope || (r >= scope.r1 && r <= scope.r2 && c >= scope.c1 && c <= scope.c2)
}

function searchable(cell, r, c, scope) {
  return Boolean(cell) && !cell.mergedInto && typeof cell.text === 'string' && inScope(r, c, scope)
}

// 찾은 곳 전부: [{ r, c, start, end }] — 칸을 위→아래, 왼쪽→오른쪽 순서로 훑고, 한 칸 안에서는 앞에서부터 겹치지 않게 센다.
export function findInGrid(grid, query, scope = null) {
  if (!query) return []
  const matches = []
  for (let r = 0; r < grid.length; r += 1) {
    for (let c = 0; c < grid[r].length; c += 1) {
      const cell = grid[r][c]
      if (!searchable(cell, r, c, scope) || cell.text === '') continue
      const pattern = new RegExp(escapeRegExp(query), 'gi')
      let found = pattern.exec(cell.text)
      while (found !== null) {
        matches.push({ r, c, start: found.index, end: found.index + found[0].length })
        found = pattern.exec(cell.text)
      }
    }
  }
  return matches
}

// match 한 곳만 replacement 로 바꾼 새 격자(다른 칸은 같은 객체로 남는다).
export function replaceMatchInGrid(grid, match, replacement) {
  return grid.map((row, r) =>
    r !== match.r
      ? row
      : row.map((cell, c) => (c === match.c ? { ...cell, text: cell.text.slice(0, match.start) + replacement + cell.text.slice(match.end) } : cell)),
  )
}

// 모든 곳을 바꾼 { grid, count }. 바꿀 곳이 없으면 받은 격자를 그대로 돌려준다. replacement 의 $ 같은 기호는 그대로 들어간다.
export function replaceAllInGrid(grid, query, replacement, scope = null) {
  if (!query) return { grid, count: 0 }
  let count = 0
  const next = grid.map((row, r) =>
    row.map((cell, c) => {
      if (!searchable(cell, r, c, scope)) return cell
      let replaced = 0
      const text = cell.text.replace(new RegExp(escapeRegExp(query), 'gi'), () => {
        replaced += 1
        return replacement
      })
      if (replaced === 0) return cell
      count += replaced
      return { ...cell, text }
    }),
  )
  return count === 0 ? { grid, count: 0 } : { grid: next, count }
}

// 바꾼 뒤 다음으로 갈 매치: (r, c, offset) 자리 바로 뒤(또는 그 자리)의 첫 매치. 전부 앞에 있으면 처음으로 돌아간다. 매치가 없으면 -1.
export function matchIndexAtOrAfter(matches, r, c, offset) {
  if (matches.length === 0) return -1
  const index = matches.findIndex((m) => m.r > r || (m.r === r && (m.c > c || (m.c === c && m.start >= offset))))
  return index === -1 ? 0 : index
}
