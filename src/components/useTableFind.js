// Copyright (c) dendr000. MIT License.

// 표 편집기 찾아 바꾸기의 상태와 동작(규칙은 lib/tableFind.js). 찾은 곳으로 가는 것은 입력칸에 포커스를 주지 않고 그 칸을 "고른 칸"으로
// 만들 뿐이라서 포커스는 찾기 입력칸에 그대로 남는다 — 그래야 Enter 를 계속 눌러 다음으로 갈 수 있다.
import { useState } from 'react'
import { findInGrid, matchIndexAtOrAfter, replaceAllInGrid, replaceMatchInGrid } from '../lib/tableFind.js'

// ctx: { grid, setGrid, range, isMultiCell, setAnchor, setFocusCell, scrollCellIntoView(r, c) }
export function useTableFind({ grid, setGrid, range, isMultiCell, setAnchor, setFocusCell, scrollCellIntoView }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  // 찾을 범위. null 이면 표 전체. "선택 범위만"을 켠 순간의 범위를 붙잡아 둔다 — 찾은 칸으로 이동할 때마다 고른 범위가 바뀌어도 범위가
  // 따라 줄어들지 않게.
  const [scope, setScope] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [message, setMessage] = useState('')
  const [focusToken, setFocusToken] = useState(0) // 이미 열려 있을 때 다시 열기를 눌러도 찾기 입력칸으로 포커스를 돌려주려고

  const matches = open ? findInGrid(grid, query, scope) : []
  const current = matches.length === 0 ? -1 : Math.min(currentIndex, matches.length - 1)

  function goTo(index, list) {
    const match = list[index]
    if (!match) return
    setCurrentIndex(index)
    setAnchor({ r: match.r, c: match.c })
    setFocusCell({ r: match.r, c: match.c })
    scrollCellIntoView(match.r, match.c)
  }

  // 여러 칸을 골라 둔 채 열면 그 범위 안에서만 찾는다(엑셀과 같음). 찾을 글자를 치면 첫 일치 칸으로 가면서 고른 범위가 한 칸으로 줄어들기
  // 때문에, 범위는 여는 순간 붙잡아 둔다. 한 칸만 골랐으면 표 전체이고, 이미 열려 있으면 가진 범위를 그대로 둔다. 체크로 끌 수 있다.
  function openBar(prefill = '') {
    const nextScope = isMultiCell ? { r1: range.r1, r2: range.r2, c1: range.c1, c2: range.c2 } : scope
    setOpen(true)
    setScope(nextScope)
    setFocusToken((token) => token + 1)
    if (prefill) {
      setQuery(prefill)
      setMessage('')
      const list = findInGrid(grid, prefill, nextScope)
      goTo(matchIndexAtOrAfter(list, range.r1, range.c1, 0), list)
    }
  }

  function closeBar() {
    setOpen(false)
    setScope(null)
    setMessage('')
  }

  function changeQuery(text) {
    setQuery(text)
    setMessage('')
    const list = findInGrid(grid, text, scope)
    const index = matchIndexAtOrAfter(list, range.r1, range.c1, 0)
    if (index !== -1) goTo(index, list)
    else setCurrentIndex(0)
  }

  function next() {
    if (matches.length === 0) return
    goTo((current + 1) % matches.length, matches)
  }

  function prev() {
    if (matches.length === 0) return
    goTo((current - 1 + matches.length) % matches.length, matches)
  }

  // 지금 고른 한 곳만 바꾼다. 바꾼 뒤에는 그 자리 바로 뒤의 다음 매치로 간다(바꾼 글자 안에 찾는 글자가 들어 있어도 제자리를 맴돌지 않는다).
  function replaceOne() {
    if (current === -1) return
    const match = matches[current]
    const nextGrid = replaceMatchInGrid(grid, match, replacement)
    setGrid(nextGrid)
    setMessage('1곳을 바꿨습니다')
    const list = findInGrid(nextGrid, query, scope)
    const index = matchIndexAtOrAfter(list, match.r, match.c, match.start + replacement.length)
    if (index !== -1) goTo(index, list)
    else setCurrentIndex(0)
  }

  function replaceEverything() {
    const { grid: nextGrid, count } = replaceAllInGrid(grid, query, replacement, scope)
    if (count === 0) return
    setGrid(nextGrid)
    setCurrentIndex(0)
    setMessage(`${count}곳을 바꿨습니다`)
  }

  // "선택 범위만": 열 때 붙잡은 범위가 있으면 끄고(표 전체로), 없으면 지금 고른 범위로 켠다. 한 칸만 골랐을 때는 켤 수 없다.
  function toggleScope() {
    setMessage('')
    setCurrentIndex(0)
    if (scope) setScope(null)
    else if (isMultiCell) setScope({ r1: range.r1, r2: range.r2, c1: range.c1, c2: range.c2 })
  }

  const matchCells = new Set(matches.map((m) => `${m.r}:${m.c}`))
  const currentCell = current === -1 ? null : `${matches[current].r}:${matches[current].c}`

  return {
    open,
    query,
    replacement,
    scope,
    canScope: isMultiCell,
    matches,
    current,
    message,
    focusToken,
    matchCells,
    currentCell,
    openBar,
    closeBar,
    changeQuery,
    setReplacement,
    next,
    prev,
    replaceOne,
    replaceEverything,
    toggleScope,
  }
}
