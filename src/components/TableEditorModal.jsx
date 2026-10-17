import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BoxSelect,
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eraser,
  Copy,
  ClipboardPaste,
  TableCellsMerge,
  TableCellsSplit,
} from 'lucide-react'
import { ColorPicker } from './ColorPicker.jsx'
import { parseWikiText } from '../lib/wikiParser.js'
import { arrowTarget, enterTarget, shiftTabTarget, tabTarget } from '../lib/tableNav.js'
import { columnLabel, formatStat, rangeLabel, rangeStats } from '../lib/tableStats.js'
import { emptyCell, regionHasMerge } from '../lib/tableGrid.js'
import { buildStructureOps } from './tableStructureOps.js'
import { TableStructureToolbar } from './TableStructureToolbar.jsx'
import { TableFindBar } from './TableFindBar.jsx'
import { useTableFind } from './useTableFind.js'
import { useAutoFillDrag } from './useAutoFillDrag.js'
import { useGridHistory } from './useGridHistory.js'
import { TableEditorHelp } from './TableEditorHelp.jsx'
import { BOLD_MARK, UNDERLINE_MARK, toggleInlineMark } from '../lib/tableInline.js'
import { TableFormatPanels } from './TableFormatPanels.jsx'
import { useTableFormat } from './useTableFormat.js'

const ARROW_DIRECTIONS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }

function emptyGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, emptyCell))
}

function cloneGrid(g) {
  return g.map((row) => row.map((cell) => ({ ...cell })))
}

// Undoes one merge group back to plain 1x1 cells — used both for an
// explicit "나누기" and to normalize any merge a new merge/row/column
// removal would otherwise cut through. Mutates `grid` in place; callers
// always pass a fresh clone.
function splitGroupAt(grid, r, c) {
  const origin = grid[r][c].mergedInto ?? { r, c }
  const originCell = grid[origin.r][origin.c]
  const { colspan, rowspan } = originCell
  for (let dr = 0; dr < rowspan; dr += 1) {
    for (let dc = 0; dc < colspan; dc += 1) {
      const rr = origin.r + dr
      const cc = origin.c + dc
      if (!grid[rr]?.[cc]) continue
      grid[rr][cc] =
        dr === 0 && dc === 0
          ? { ...originCell, colspan: 1, rowspan: 1, mergedInto: null }
          : emptyCell()
    }
  }
}

// Splits every merge group that overlaps the given rectangle at all (not
// just ones fully inside it) — merging or deleting a row/column through
// part of an existing merge would otherwise leave a dangling span.
function splitIntersecting(grid, r1, c1, r2, c2) {
  const origins = new Set()
  for (let r = 0; r < grid.length; r += 1) {
    for (let c = 0; c < grid[r].length; c += 1) {
      const cell = grid[r][c]
      const origin = cell.mergedInto ?? { r, c }
      const originCell = grid[origin.r][origin.c]
      if (originCell.colspan === 1 && originCell.rowspan === 1) continue
      const rEnd = origin.r + originCell.rowspan - 1
      const cEnd = origin.c + originCell.colspan - 1
      if (origin.r <= r2 && rEnd >= r1 && origin.c <= c2 && cEnd >= c1) {
        origins.add(`${origin.r},${origin.c}`)
      }
    }
  }
  for (const key of origins) {
    const [r, c] = key.split(',').map(Number)
    splitGroupAt(grid, r, c)
  }
}

// Literal "|" would break ||cell||cell|| syntax so it's swapped for a
// visually identical full-width bar when generating markup.
function sanitizeCell(text) {
  return text.replace(/\|/g, '｜')
}

function buildCellMarkup(cell, isHeaderRow) {
  let inner = sanitizeCell(cell.text.trim())
  // isHeaderRow (row 0 with the "첫 번째 행을 헤더로" checkbox) and
  // cell.bold (an individual cell parsed from a standalone '''...''' — see
  // EditorPane.jsx's extractPlainCells) are two independent reasons a cell
  // ends up bold; either one is enough, and they must not double-wrap.
  if (isHeaderRow || cell.bold) inner = `'''${inner}'''`
  if (cell.color) inner = `{{{${cell.color} ${inner}}}}`

  const attrs = []
  if (cell.colspan > 1) attrs.push(`<-${cell.colspan}>`)
  if (cell.rowspan > 1) attrs.push(`<|${cell.rowspan}>`)
  if (cell.align === 'center') attrs.push('<:>')
  else if (cell.align === 'left') attrs.push('<(>')
  else if (cell.align === 'right') attrs.push('<)>')
  if (cell.bg) attrs.push(`<bgcolor=${cell.bg}>`)
  // Attribute tokens this editor doesn't model but the cell originally had
  // (colbgcolor/colcolor/rowbgcolor/nopad, any <table ...=...> table-wide
  // attribute, etc.) — carried through verbatim so editing one thing about
  // a real namu wiki table (adding an align, say) doesn't silently destroy
  // everything else about it. See extractPlainCells for where these are
  // captured.
  for (const token of cell.extraAttrs ?? []) attrs.push(`<${token}>`)

  return attrs.join('') + inner
}

// A row entirely covered by rowspans from earlier rows has no cells of its
// own left to write — namu wiki (and this app's own table parser) expects
// no line at all there, not an empty "||||", so such rows are just skipped.
function buildMarkup(grid, headerRow) {
  return grid
    .map((row, r) => {
      const cells = row.filter((cell) => !cell.mergedInto)
      if (cells.length === 0) return null
      return `||${cells.map((cell) => buildCellMarkup(cell, r === 0 && headerRow)).join('||')}||`
    })
    .filter((line) => line !== null)
    .join('\n')
}

function normalizeRange(a, b) {
  return {
    r1: Math.min(a.r, b.r),
    r2: Math.max(a.r, b.r),
    c1: Math.min(a.c, b.c),
    c2: Math.max(a.c, b.c),
  }
}

export function TableEditorModal({ initialRows, initialHeaderRow, onCancel, onConfirm }) {
  // 격자와 헤더 설정은 되돌리기·다시 실행 기록과 함께 든다(규칙은 lib/gridHistory.js, 훅은 useGridHistory.js).
  const [seed] = useState(() => ({ grid: initialRows ?? emptyGrid(2, 2), headerRow: initialHeaderRow ?? true }))
  const { grid, headerRow, setGrid, setHeaderRow, setGridAndHeader, undo, redo, canUndo, canRedo } = useGridHistory(seed.grid, seed.headerRow)
  const [anchorRaw, setAnchor] = useState({ r: 0, c: 0 })
  const [focusRaw, setFocusCell] = useState({ r: 0, c: 0 })
  // 되돌리기로 표가 줄어들 수 있으므로 고른 칸은 항상 표 안으로 맞춘다.
  const clampCell = (cell) => ({ r: Math.min(cell.r, grid.length - 1), c: Math.min(cell.c, (grid[0]?.length ?? 1) - 1) })
  const anchor = clampCell(anchorRaw)
  const focusCell = clampCell(focusRaw)
  const clipboardRef = useRef(null) // full-fidelity {text,bg,color,align} grid for in-app paste

  const range = normalizeRange(anchor, focusCell)
  const isMultiCell = range.r1 !== range.r2 || range.c1 !== range.c2
  const inRange = (r, c) => r >= range.r1 && r <= range.r2 && c >= range.c1 && c <= range.c2

  const selectCell = (r, c, shiftKey) => {
    if (shiftKey) {
      setFocusCell({ r, c })
    } else {
      setAnchor({ r, c })
      setFocusCell({ r, c })
    }
  }

  // 행 번호·열 글자·왼쪽 위 모서리를 누르면 그 줄/열/표 전체가 범위로 잡힌다(상태 표시줄의 합계·평균을 한 줄 단위로 보려고).
  const selectRow = (r) => {
    setAnchor({ r, c: 0 })
    setFocusCell({ r, c: (grid[0]?.length ?? 1) - 1 })
  }
  const selectColumn = (c) => {
    setAnchor({ r: 0, c })
    setFocusCell({ r: grid.length - 1, c })
  }
  const selectAll = () => {
    setAnchor({ r: 0, c: 0 })
    setFocusCell({ r: grid.length - 1, c: (grid[0]?.length ?? 1) - 1 })
  }

  const updateCell = (r, c, patch) => {
    // 같은 칸에 글자를 이어서 치는 것은 되돌리기 한 단계로 묶는다.
    setGrid((g) => g.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? { ...cell, ...patch } : cell)) : row)), { coalesce: patch.text === undefined ? undefined : `cell:${r}:${c}` })
  }

  const updateRange = (patch) => {
    setGrid((g) =>
      g.map((row, ri) => (ri >= range.r1 && ri <= range.r2 ? row.map((cell, ci) => (ci >= range.c1 && ci <= range.c2 ? { ...cell, ...patch } : cell)) : row)),
    )
  }

  const addRow = () => setGrid((g) => [...g, Array.from({ length: g[0]?.length ?? 2 }, emptyCell)])

  // 셀 안에서의 키 이동(Tab·Enter, 규칙은 lib/tableNav.js). 셀마다 입력칸을 ref 로 들고 있다가 포커스를 준다.
  // 새 행으로 가야 할 때는 행을 만든 직후에는 입력칸이 아직 없으므로, 갈 자리를 기억해 뒀다가 grid 가
  // 다시 그려진 뒤(아래 useEffect)에 포커스를 준다.
  const inputRefs = useRef({})
  const pendingFocusRef = useRef(null)
  // 글자 서식 단축키(applyInlineMark)로 글이 바뀐 뒤, 다시 그려진 입력칸에 원래 선택(씌운 글자)을 되돌려 이어서 누를 수 있게 한다.
  const pendingSelectionRef = useRef(null)
  useEffect(() => {
    const pending = pendingSelectionRef.current
    if (!pending) return
    pendingSelectionRef.current = null
    if (pending.element.isConnected) pending.element.setSelectionRange(pending.start, pending.end)
  })

  function focusCellInput(r, c) {
    const input = inputRefs.current[`${r}:${c}`]
    if (!input) return false
    input.focus()
    // 글이 있으면 커서를 맨 뒤에 둔다 — 이어서 바로 쓰거나 고칠 수 있게(전체 선택은 실수로 덮어쓰기 쉬움).
    input.setSelectionRange(input.value.length, input.value.length)
    return true
  }

  function goToCell(target) {
    if (target.addRow) {
      pendingFocusRef.current = { r: target.r, c: target.c }
      addRow()
    } else {
      focusCellInput(target.r, target.c)
    }
  }

  useEffect(() => {
    const pending = pendingFocusRef.current
    if (pending && focusCellInput(pending.r, pending.c)) pendingFocusRef.current = null
  }, [grid])

  // Tab → 오른쪽 셀(행의 끝이면 아래 행의 첫 번째 셀, 마지막 행이면 새 행). Shift+Tab → 그 반대(왼쪽 셀, 행의
  // 처음이면 윗 행의 마지막 셀). Enter → 바로 아래 셀(없으면 새 행). Shift+Enter → 셀 안 줄바꿈 [br].
  // 한글 조합 중(isComposing)의 Enter 는 글자를 확정하는 키라서 이동하지 않는다. Ctrl/Alt 가 든 조합은
  // 건드리지 않는다.
  function handleCellKeyDown(e, r, c) {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.ctrlKey || e.metaKey || e.altKey) return
    // 방향키: 위·아래는 늘 다른 칸으로, 왼쪽·오른쪽은 입력창 안의 커서가 글자의 맨 앞·맨 뒤에 있을 때만 다른 칸으로 간다(글자 사이를 움직이는
    // 평소 동작을 해치지 않게). Shift 가 든 조합은 글자 선택이라 건드리지 않는다. 표 끝이면 평소 동작에 맡긴다.
    const arrow = ARROW_DIRECTIONS[e.key]
    if (arrow && !e.shiftKey) {
      const input = e.currentTarget
      const collapsed = input.selectionStart === input.selectionEnd
      const atEdge = arrow === 'left' ? input.selectionStart === 0 : arrow === 'right' ? input.selectionStart === input.value.length : true
      const target = collapsed && atEdge ? arrowTarget(grid, r, c, arrow) : null
      if (target) {
        e.preventDefault()
        goToCell(target)
        // 오른쪽으로 들어온 칸은 글자의 맨 앞에, 왼쪽·위·아래는 맨 뒤에 커서를 둔다(방금 지나온 쪽에서 이어 가도록).
        if (arrow === 'right') inputRefs.current[`${target.r}:${target.c}`]?.setSelectionRange(0, 0)
      }
      return
    }
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      // execCommand 로 넣어야 입력칸의 되돌리기(Ctrl+Z)가 이어진다 — EditorPane.jsx 의 replaceRange 와 같은 이유.
      document.execCommand('insertText', false, '[br]')
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      goToCell(enterTarget(grid, r, c))
    } else if (e.key === 'Tab') {
      const target = e.shiftKey ? shiftTabTarget(grid, r, c) : tabTarget(grid, r, c)
      if (!target) return // 표의 맨 처음 셀에서 Shift+Tab: 평소 포커스 이동에 맡긴다
      e.preventDefault()
      goToCell(target)
    }
  }
  const addColumn = () => setGrid((g) => g.map((row) => [...row, emptyCell()]))

  // 구조 작업(삽입·이동·복제·채우기·정렬): tableStructureOps.js 가 격자와 고른 범위를 보고 단추별 켜짐·안내 글·동작을 만든다.
  const ops = buildStructureOps({ grid, setGrid, range, isMultiCell, focusCell, setAnchor, setFocusCell, headerRow, setGridAndHeader })
  // 단추·단축키로 동작을 실행하고, 동작이 돌려준 칸이 있으면 격자가 다시 그려진 뒤 그 입력칸에 포커스를 준다(위의 useEffect).
  const runOp = (op) => {
    const focusTarget = op.run()
    if (focusTarget) pendingFocusRef.current = focusTarget
  }

  // 찾아 바꾸기(Ctrl+F, 규칙은 lib/tableFind.js). 찾은 칸은 입력칸에 포커스를 주지 않고 "고른 칸"으로만 만들며, 화면에 보이게 스크롤한다.
  const scrollCellIntoView = (r, c) => inputRefs.current[`${r}:${c}`]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  const find = useTableFind({ grid, setGrid, range, isMultiCell, setAnchor, setFocusCell, scrollCellIntoView })

  // 자동 채우기(채우기 핸들 끌기, 규칙은 lib/fillSeries.js·tableAutoFill.js): 고른 범위의 오른쪽 아래 칸에 핸들이 붙는다. 범위에 병합이 걸려 있으면 채울 수 없으므로 핸들을 숨긴다.
  const fillDrag = useAutoFillDrag({ grid, setGrid, range, setAnchor, setFocusCell })
  const showFillHandle = !regionHasMerge(grid, range.r1, range.r2, range.c1, range.c2)

  // 서식 패널(숫자 서식·조건부 색·열 너비·줄무늬, 규칙은 lib/tableNumberFormat.js·tableConditional.js·tableStyle.js).
  const format = useTableFormat({ grid, setGrid, range, isMultiCell, headerRow })

  // Removing a row/column first splits any merge it would cut through (so
  // no cell is left with a dangling span), then remaps the mergedInto
  // pointers of every merge group past the removed index, since those
  // origins shift by one.
  const removeRow = (r) => {
    setGrid((g) => {
      if (g.length <= 1) return g
      const next = cloneGrid(g)
      splitIntersecting(next, r, 0, r, (next[0]?.length ?? 1) - 1)
      return next
        .filter((_, i) => i !== r)
        .map((row) =>
          row.map((cell) =>
            cell.mergedInto && cell.mergedInto.r > r
              ? { ...cell, mergedInto: { ...cell.mergedInto, r: cell.mergedInto.r - 1 } }
              : cell,
          ),
        )
    })
    setAnchor((s) => (s.r === r ? { r: 0, c: 0 } : s.r > r ? { ...s, r: s.r - 1 } : s))
    setFocusCell((s) => (s.r === r ? { r: 0, c: 0 } : s.r > r ? { ...s, r: s.r - 1 } : s))
  }
  const removeColumn = (c) => {
    setGrid((g) => {
      if ((g[0]?.length ?? 0) <= 1) return g
      const next = cloneGrid(g)
      splitIntersecting(next, 0, c, next.length - 1, c)
      return next.map((row) =>
        row
          .filter((_, i) => i !== c)
          .map((cell) =>
            cell.mergedInto && cell.mergedInto.c > c
              ? { ...cell, mergedInto: { ...cell.mergedInto, c: cell.mergedInto.c - 1 } }
              : cell,
          ),
      )
    })
    setAnchor((s) => (s.c === c ? { r: 0, c: 0 } : s.c > c ? { ...s, c: s.c - 1 } : s))
    setFocusCell((s) => (s.c === c ? { r: 0, c: 0 } : s.c > c ? { ...s, c: s.c - 1 } : s))
  }

  // Merge always normalizes the target range first (splitting any merge
  // group it partially overlaps), so the result is never an inconsistent
  // partial overlap — only the top-left cell's content/style survives.
  const mergeSelection = () => {
    if (!isMultiCell) return
    setGrid((g) => {
      const next = cloneGrid(g)
      splitIntersecting(next, range.r1, range.c1, range.r2, range.c2)
      const topLeft = next[range.r1][range.c1]
      for (let r = range.r1; r <= range.r2; r += 1) {
        for (let c = range.c1; c <= range.c2; c += 1) {
          next[r][c] =
            r === range.r1 && c === range.c1
              ? { ...topLeft, colspan: range.c2 - range.c1 + 1, rowspan: range.r2 - range.r1 + 1, mergedInto: null }
              : { ...emptyCell(), mergedInto: { r: range.r1, c: range.c1 } }
        }
      }
      return next
    })
    setAnchor({ r: range.r1, c: range.c1 })
    setFocusCell({ r: range.r1, c: range.c1 })
  }

  const splitSelection = () => {
    setGrid((g) => {
      const next = cloneGrid(g)
      splitIntersecting(next, range.r1, range.c1, range.r2, range.c2)
      return next
    })
  }

  const canSplit = (() => {
    for (let r = range.r1; r <= range.r2; r += 1) {
      for (let c = range.c1; c <= range.c2; c += 1) {
        const cell = grid[r]?.[c]
        if (cell && (cell.mergedInto || cell.colspan > 1 || cell.rowspan > 1)) return true
      }
    }
    return false
  })()

  function ensureGridSize(rows, cols) {
    setGrid((g) => {
      let next = g
      if (next.length < rows) {
        next = [...next, ...Array.from({ length: rows - next.length }, () => Array.from({ length: next[0]?.length ?? cols }, emptyCell))]
      }
      if ((next[0]?.length ?? 0) < cols) {
        next = next.map((row) => [...row, ...Array.from({ length: cols - row.length }, emptyCell)])
      }
      return next
    }, { coalesce: 'paste' })
  }

  async function handleCopy() {
    // Copy/paste only ever moves plain cell content+style — colspan/rowspan
    // are stripped so pasting elsewhere never plants a stale span or a
    // mergedInto pointer that wouldn't mean anything at the new location.
    const cells = []
    for (let r = range.r1; r <= range.r2; r += 1) {
      const row = []
      for (let c = range.c1; c <= range.c2; c += 1) {
        const { text, bg, color, align, bold } = grid[r][c]
        row.push({ text, bg, color, align, bold })
      }
      cells.push(row)
    }
    clipboardRef.current = cells
    const tsv = cells.map((row) => row.map((cell) => cell.text).join('\t')).join('\n')
    try {
      await navigator.clipboard.writeText(tsv)
    } catch {
      /* system clipboard unavailable; in-app paste (clipboardRef) still works */
    }
  }

  async function handlePaste() {
    const target = { r: range.r1, c: range.c1 }
    let cells = clipboardRef.current

    if (!cells) {
      try {
        const text = await navigator.clipboard.readText()
        cells = text.split(/\r?\n/).map((line) => line.split('\t').map((text) => ({ text, bg: '', color: '', align: '', bold: false })))
      } catch {
        return
      }
    }
    if (!cells || cells.length === 0) return

    const neededRows = target.r + cells.length
    const neededCols = target.c + Math.max(...cells.map((row) => row.length))
    ensureGridSize(neededRows, neededCols)

    setGrid((g) => {
      const next = cloneGrid(g)
      splitIntersecting(next, target.r, target.c, neededRows - 1, neededCols - 1)
      cells.forEach((row, ri) => {
        row.forEach((cell, ci) => {
          const r = target.r + ri
          const c = target.c + ci
          if (next[r]?.[c]) next[r][c] = { ...next[r][c], ...cell }
        })
      })
      return next
    }, { coalesce: 'paste' })
    setAnchor(target)
    setFocusCell({ r: target.r + cells.length - 1, c: target.c + (cells[0]?.length ?? 1) - 1 })
  }

  // isPaste mirrors isCopy's own guard — when the user is mid-edit inside
  // one cell's <input> (not a multi-cell range), Ctrl+C/Ctrl+V should do the
  // ordinary "copy/paste the selected text within this field" thing, not
  // this modal's own grid-level cell copy/paste. Ctrl+V used to be missing
  // this guard entirely, so pasting into a cell you were actively typing in
  // (e.g. pasting a bit of namu wiki syntax into a cell that already had
  // real content) always replaced that cell's whole text instead of
  // inserting at the cursor — destroying whatever was already there. It
  // also silently corrupted the input's native undo history (the browser
  // never sees this as a real paste event, since it's a React state write,
  // not a native DOM edit — see EditorPane.jsx's replaceRange for the same
  // class of bug and why execCommand-based edits avoid it), so Ctrl+Z
  // afterward didn't restore the pre-paste text either.
  // 창 바깥(어두운 배경)을 빠르게 두 번 클릭해야 닫힌다 — 한 번 클릭으로 닫히면 작업 중이던 표가 실수로 날아간다. 창 안쪽에서 일어난
  // 더블클릭(칸의 글자를 더블클릭해 고르는 등)은 여기까지 올라오므로, 배경 자체를 눌렀을 때만 닫는다.
  function handleBackdropDoubleClick(e) {
    if (e.target === e.currentTarget) onCancel()
  }

  // 칸 안에서 선택한 글자에 굵게('''…''')·밑줄(__…__)을 씌우거나 벗긴다(lib/tableInline.js). 글자를 고르지 않았을 때 Ctrl+B 는 선택 범위
  // 전체 굵게(툴바의 굵게 단추와 같음), Ctrl+U 는 표시 한 쌍을 넣고 그 사이에 커서를 둔다. 바꾼 뒤 선택은 다시 그려진 뒤(위의 useEffect) 되돌린다.
  function applyInlineMark(kind) {
    const toggleWholeBold = () => updateRange({ bold: !focusedCellData?.bold })
    const el = document.activeElement
    const inGridCell = el?.tagName === 'INPUT' && Boolean(el.closest('.table-editor-grid'))
    const inContentBox = el?.id === 'table-editor-cell-content-input'
    if (!inGridCell && !inContentBox) {
      if (kind === 'bold') toggleWholeBold()
      return
    }
    const mark = kind === 'bold' ? BOLD_MARK : UNDERLINE_MARK
    const result = toggleInlineMark(el.value, el.selectionStart, el.selectionEnd, mark, { insertEmpty: kind === 'underline' })
    if (!result) {
      toggleWholeBold()
      return
    }
    const [r, c] = inGridCell ? el.closest('td').dataset.cell.split(':').map(Number) : [focusCell.r, focusCell.c]
    pendingSelectionRef.current = { element: el, start: result.selStart, end: result.selEnd }
    updateCell(r, c, { text: result.text })
  }

  function handleGridKeyDown(e) {
    const mod = (e.ctrlKey || e.metaKey) && !e.altKey
    // Ctrl+F — 찾아 바꾸기 열기(Ctrl+Shift+F 도 같음, 문서 편집기와 같은 키). 입력칸에 글자를 골라 둔 채 누르면 그 글자로 찾는다.
    // 한글 자판이면 e.key 가 자모일 수 있어 물리 키(e.code)도 본다.
    if (mod && (e.key.toLowerCase() === 'f' || e.code === 'KeyF')) {
      e.preventDefault()
      const active = document.activeElement
      const picked =
        active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && !active.closest('.table-find-bar')
          ? active.value.slice(active.selectionStart, active.selectionEnd)
          : ''
      find.openBar(picked.includes('\n') ? '' : picked)
      return
    }
    // 찾기 바·서식 패널 안의 입력칸에서는 아래의 표 단축키(복사·붙여넣기·채우기·되돌리기)를 쓰지 않는다 — 글자 입력칸의 평소 동작이어야 한다.
    if (e.target.closest?.('.table-find-bar, .table-format-panel')) return
    // Ctrl+Z 되돌리기, Ctrl+Y / Ctrl+Shift+Z 다시 실행 — 칸에 치는 글자를 포함해 표 편집기 안의 변경을 기록으로 되돌린다(칸 입력창의 글자
    // 자체 되돌리기 대신). 한글 자판이면 e.key 가 자모일 수 있어 물리 키(e.code)도 본다.
    const isZ = e.key.toLowerCase() === 'z' || e.code === 'KeyZ'
    const isY = e.key.toLowerCase() === 'y' || e.code === 'KeyY'
    if (mod && isZ && !e.shiftKey) {
      e.preventDefault()
      undo()
      return
    }
    if (mod && (isY || (isZ && e.shiftKey))) {
      e.preventDefault()
      redo()
      return
    }
    // Ctrl+D — 아래로 채우기(엑셀과 같음). 안 되는 상황이어도 브라우저의 기본 동작(북마크 등)은 막는다.
    if (mod && !e.shiftKey && (e.key.toLowerCase() === 'd' || e.code === 'KeyD')) {
      e.preventDefault()
      if (ops.fillDown.enabled) runOp(ops.fillDown)
      return
    }
    // Ctrl+B 굵게 / Ctrl+U 밑줄 — 문서 편집기와 같은 키. 한글 자판이면 e.key 가 자모일 수 있어 물리 키(e.code)도 본다.
    if (mod && !e.shiftKey && (e.key.toLowerCase() === 'b' || e.code === 'KeyB')) {
      e.preventDefault()
      applyInlineMark('bold')
      return
    }
    if (mod && !e.shiftKey && (e.key.toLowerCase() === 'u' || e.code === 'KeyU')) {
      e.preventDefault()
      applyInlineMark('underline')
      return
    }
    const isCopy = (e.ctrlKey || e.metaKey) && e.key === 'c'
    const isPaste = (e.ctrlKey || e.metaKey) && e.key === 'v'
    // Covers both a cell's own <input> and the larger "선택한 셀 내용"
    // <textarea> below — both are ordinary text-editing surfaces where
    // Ctrl+C/Ctrl+V should behave normally, not trigger this modal's own
    // grid-level cell copy/paste.
    const activeIsTextInput =
      (document.activeElement?.tagName === 'INPUT' && document.activeElement.type === 'text') ||
      document.activeElement?.tagName === 'TEXTAREA'
    if (isCopy && (isMultiCell || !activeIsTextInput)) {
      e.preventDefault()
      handleCopy()
    } else if (isPaste && (isMultiCell || !activeIsTextInput)) {
      e.preventDefault()
      handlePaste()
    }
  }

  const focusedCellData = grid[focusCell.r]?.[focusCell.c]

  // 상태 표시줄: 여러 칸을 골랐을 때만 합계·평균 등을 보여 준다(문서에는 쓰지 않는다). 첫 행을 헤더로 쓰는 표는 맨 윗줄을 뺀다.
  const stats = isMultiCell ? rangeStats(grid, range, { skipFirstRow: headerRow }) : null
  const [copiedStat, setCopiedStat] = useState(null) // { key, ok } — 값을 눌러 복사한 직후 잠깐 표시
  useEffect(() => {
    if (!copiedStat) return undefined
    const timer = setTimeout(() => setCopiedStat(null), 1200)
    return () => clearTimeout(timer)
  }, [copiedStat])

  // 값을 누르면 쉼표 없는 숫자로 복사해서 칸에 바로 붙여넣을 수 있게 한다. 칸 복사본(clipboardRef)이 남아 있으면 Ctrl+V 가
  // 방금 복사한 숫자 대신 그것을 붙이므로 비운다.
  async function copyStat(key, value) {
    clipboardRef.current = null
    try {
      await navigator.clipboard.writeText(formatStat(value, { grouping: false }))
      setCopiedStat({ key, ok: true })
    } catch {
      setCopiedStat({ key, ok: false })
    }
  }

  const markup = buildMarkup(grid, headerRow)
  // Rendered exactly the way the viewer would show it — colspan/rowspan
  // only really read as "merged" once laid out as a real table, not as
  // <-N>/<|N> tokens in the raw markup.
  const { html: renderedHtml } = useMemo(() => parseWikiText(markup), [markup])

  return (
    <div className="modal-backdrop" onDoubleClick={handleBackdropDoubleClick}>
      <div className="modal-panel table-editor-modal-panel" onClick={(e) => e.stopPropagation()} onKeyDown={handleGridKeyDown}>
        {/* 헤더는 스크롤해도 맨 위에 고정된다(App.css) — 행이 많아져도 "적용"을 바로 누를 수 있다. */}
        <div className="modal-header">
          <h2>표 편집기</h2>
          <div className="modal-header-actions">
            <TableEditorHelp />
            <button type="button" className="modal-confirm-btn" title="표를 문서에 넣고 닫기" onClick={() => onConfirm(markup)}>
              적용
            </button>
            <button type="button" className="modal-close-btn" title="적용하지 않고 닫기" onClick={onCancel}>
              ✕
            </button>
          </div>
        </div>

        <label className="modal-checkbox-row">
          <input type="checkbox" checked={headerRow} onChange={(e) => setHeaderRow(e.target.checked)} />
          첫 번째 행을 헤더로 (굵게 표시, 진짜 나무위키 문법으로 저장됨)
        </label>

        <div className="cell-style-toolbar">
          <span className="cell-style-toolbar-label">
            {isMultiCell ? `선택 범위 ${rangeLabel(range)}:` : `선택한 셀 ${rangeLabel(range)}:`}
          </span>
          <span className="cell-style-toolbar-sublabel">배경색</span>
          <ColorPicker
            value={focusedCellData?.bg}
            onChange={(hex) => updateRange({ bg: hex })}
            onClear={() => updateRange({ bg: '' })}
            title="배경색 (선택 범위 전체에 적용)"
          />
          <span className="cell-style-toolbar-sublabel">글자색</span>
          <ColorPicker
            value={focusedCellData?.color}
            onChange={(hex) => updateRange({ color: hex })}
            onClear={() => updateRange({ color: '' })}
            title="글자색 (선택 범위 전체에 적용)"
          />
          <button
            type="button"
            className={focusedCellData?.bold ? 'active' : ''}
            title="굵게 (선택 범위 전체에 적용)"
            onClick={() => updateRange({ bold: !focusedCellData?.bold })}
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            className={focusedCellData?.align === 'left' ? 'active' : ''}
            title="왼쪽 정렬"
            onClick={() => updateRange({ align: focusedCellData?.align === 'left' ? '' : 'left' })}
          >
            <AlignLeft size={14} />
          </button>
          <button
            type="button"
            className={focusedCellData?.align === 'center' ? 'active' : ''}
            title="가운데 정렬"
            onClick={() => updateRange({ align: focusedCellData?.align === 'center' ? '' : 'center' })}
          >
            <AlignCenter size={14} />
          </button>
          <button
            type="button"
            className={focusedCellData?.align === 'right' ? 'active' : ''}
            title="오른쪽 정렬"
            onClick={() => updateRange({ align: focusedCellData?.align === 'right' ? '' : 'right' })}
          >
            <AlignRight size={14} />
          </button>
          <button type="button" title="선택 범위 스타일 초기화" onClick={() => updateRange({ bg: '', color: '', align: '', bold: false })}>
            <Eraser size={14} />
          </button>
          <span className="editor-toolbar-divider" />
          <button type="button" title="복사 (Ctrl+C)" onClick={handleCopy}>
            <Copy size={14} />
          </button>
          <button type="button" title="붙여넣기 (Ctrl+V)" onClick={handlePaste}>
            <ClipboardPaste size={14} />
          </button>
          <span className="editor-toolbar-divider" />
          <button type="button" disabled={!isMultiCell} title="선택한 셀 병합 (왼쪽 위 셀의 내용만 유지됨)" onClick={mergeSelection}>
            <TableCellsMerge size={14} />
          </button>
          <button type="button" disabled={!canSplit} title="병합된 셀 나누기" onClick={splitSelection}>
            <TableCellsSplit size={14} />
          </button>
        </div>
        <TableStructureToolbar ops={ops} onRun={runOp} history={{ undo, redo, canUndo, canRedo }} findOpen={find.open} onToggleFind={() => (find.open ? find.closeBar() : find.openBar())} />
        <TableFormatPanels format={format} />
        {find.open && <TableFindBar find={find} />}

        {!isMultiCell && (
          <div className="table-editor-cell-content">
            <label htmlFor="table-editor-cell-content-input">
              선택한 셀 내용 ({focusCell.r + 1}행 {focusCell.c + 1}열) — 긴 내용은 여기서 편집하는 게 더
              편합니다
            </label>
            <textarea
              id="table-editor-cell-content-input"
              value={focusedCellData?.text ?? ''}
              onChange={(e) => updateCell(focusCell.r, focusCell.c, { text: e.target.value })}
            />
          </div>
        )}

        <div className="table-editor-grid-wrap">
          <table className="table-editor-grid">
            <tbody>
              {/* 열 글자(A, B, ...) — 누르면 그 열 전체가 범위로 잡힌다. 왼쪽 위 모서리는 표 전체. */}
              <tr>
                <td className="table-editor-head-cell">
                  <button type="button" title="표 전체 선택" onClick={selectAll}>
                    <BoxSelect size={12} />
                  </button>
                </td>
                {grid[0]?.map((_, c) => (
                  <td key={c} className="table-editor-head-cell">
                    <button
                      type="button"
                      className={isMultiCell && c >= range.c1 && c <= range.c2 ? 'in-range' : ''}
                      title={`${columnLabel(c)}열 전체 선택`}
                      onClick={() => selectColumn(c)}
                    >
                      {columnLabel(c)}
                    </button>
                  </td>
                ))}
                <td />
              </tr>
              {grid.map((row, r) => (
                <tr key={r}>
                  <td className="table-editor-head-cell">
                    <button
                      type="button"
                      className={isMultiCell && r >= range.r1 && r <= range.r2 ? 'in-range' : ''}
                      title={`${r + 1}행 전체 선택`}
                      onClick={() => selectRow(r)}
                    >
                      {r + 1}
                    </button>
                  </td>
                  {row.map((cell, c) => {
                    // A cell covered by an earlier merge gets no <td> of its
                    // own at all — same as the raw markup, the browser's
                    // table layout lets the spanning cell's colSpan/rowSpan
                    // cover this position instead.
                    if (cell.mergedInto) return null
                    return (
                      <td
                        key={c}
                        colSpan={cell.colspan > 1 ? cell.colspan : undefined}
                        rowSpan={cell.rowspan > 1 ? cell.rowspan : undefined}
                        data-cell={`${r}:${c}`}
                        className={[inRange(r, c) ? 'cell-in-range' : '', fillDrag.isPreviewCell(r, c) ? 'cell-fill-preview' : ''].filter(Boolean).join(' ') || undefined}
                        onMouseDown={(e) => {
                          if (e.shiftKey) {
                            e.preventDefault()
                            selectCell(r, c, true)
                          }
                        }}
                      >
                        <input
                          ref={(el) => {
                            inputRefs.current[`${r}:${c}`] = el
                          }}
                          value={cell.text}
                          style={{
                            background: cell.bg || undefined,
                            color: cell.color || undefined,
                            textAlign: cell.align || undefined,
                            fontWeight: r === 0 && headerRow ? 700 : undefined,
                          }}
                          className={[
                            focusCell.r === r && focusCell.c === c ? 'cell-selected' : '',
                            r === 0 && headerRow ? 'cell-header' : '',
                            find.matchCells.has(`${r}:${c}`) ? (find.currentCell === `${r}:${c}` ? 'cell-match cell-match-current' : 'cell-match') : '',
                            format.previewCells.has(`${r}:${c}`) ? 'cell-rule-preview' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          autoFocus={r === 0 && c === 0}
                          onFocus={() => selectCell(r, c, false)}
                          onChange={(e) => updateCell(r, c, { text: e.target.value })}
                          onKeyDown={(e) => handleCellKeyDown(e, r, c)}
                          placeholder={r === 0 && headerRow ? `헤더 ${c + 1}` : ''}
                        />
                        {showFillHandle && r === range.r2 && c === range.c2 && (
                          <span
                            className="fill-handle"
                            title="끌어서 자동 채우기 — 고른 범위가 씨앗이 되어 아래·오른쪽(위·왼쪽은 거꾸로)으로 이어 채웁니다. 두 번 누르면 옆 열 데이터 끝까지 아래로 채웁니다. Ctrl 을 누른 채 놓으면 복사↔이어 가기가 바뀝니다, Esc 로 취소"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              fillDrag.start()
                            }}
                            onDoubleClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              fillDrag.fillToAdjacent(e)
                            }}
                          />
                        )}
                      </td>
                    )
                  })}
                  <td className="table-editor-row-actions">
                    <button title="행 삭제" onClick={() => removeRow(r)}>
                      −
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td />
                {grid[0]?.map((_, c) => (
                  <td key={c} className="table-editor-col-actions">
                    <button title="열 삭제" onClick={() => removeColumn(c)}>
                      −
                    </button>
                  </td>
                ))}
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        {/* 상태 표시줄: 고른 범위의 집계(보기용, 문서에는 쓰지 않음). 값을 누르면 숫자만 복사된다. */}
        <div className="table-editor-stats" role="status" aria-live="polite">
          {stats === null ? (
            <span className="stats-hint">행 번호·열 글자를 누르거나 Shift+클릭으로 여러 칸을 고르면 합계·평균이 여기에 보입니다.</span>
          ) : (
            <>
              <span className="stats-range">{rangeLabel(range)}</span>
              <span>{stats.selected}칸</span>
              {stats.count === 0 ? (
                <span className="stats-hint">숫자가 있는 칸이 없습니다</span>
              ) : (
                [
                  ['sum', '합계', stats.sum],
                  ['avg', '평균', stats.avg],
                  ['count', '개수', stats.count],
                  ['min', '최소', stats.min],
                  ['max', '최대', stats.max],
                ].map(([key, label, value]) => (
                  <button key={key} type="button" className="stats-item" title="누르면 이 숫자가 복사됩니다" onClick={() => copyStat(key, value)}>
                    {label} <strong>{formatStat(value)}</strong>
                    {copiedStat?.key === key && <em>{copiedStat.ok ? ' 복사됨' : ' 복사 실패'}</em>}
                  </button>
                ))
              )}
              {stats.skippedHeader && <span className="stats-hint">첫 행(헤더)은 계산에서 뺐습니다</span>}
            </>
          )}
        </div>

        <div className="table-editor-toolbar">
          <button onClick={addRow}>+ 행 추가</button>
          <button onClick={addColumn}>+ 열 추가</button>
        </div>

        <div className="table-editor-preview">
          <div className="table-editor-preview-label">뷰어 미리보기</div>
          <div className="wiki-rendered table-editor-render-preview" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
        </div>

        <div className="table-editor-preview">
          <div className="table-editor-preview-label">삽입될 문법</div>
          <pre>{markup}</pre>
        </div>

      </div>
    </div>
  )
}
