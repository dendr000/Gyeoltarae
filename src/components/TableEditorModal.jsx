import { useMemo, useRef, useState } from 'react'
import {
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

function emptyCell() {
  return { text: '', bg: '', color: '', align: '', bold: false, colspan: 1, rowspan: 1, mergedInto: null, extraAttrs: [] }
}

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
  const [grid, setGrid] = useState(() => initialRows ?? emptyGrid(2, 2))
  const [headerRow, setHeaderRow] = useState(initialHeaderRow ?? true)
  const [anchor, setAnchor] = useState({ r: 0, c: 0 })
  const [focusCell, setFocusCell] = useState({ r: 0, c: 0 })
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

  const updateCell = (r, c, patch) => {
    setGrid((g) => g.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? { ...cell, ...patch } : cell)) : row)))
  }

  const updateRange = (patch) => {
    setGrid((g) =>
      g.map((row, ri) => (ri >= range.r1 && ri <= range.r2 ? row.map((cell, ci) => (ci >= range.c1 && ci <= range.c2 ? { ...cell, ...patch } : cell)) : row)),
    )
  }

  const addRow = () => setGrid((g) => [...g, Array.from({ length: g[0]?.length ?? 2 }, emptyCell)])
  const addColumn = () => setGrid((g) => g.map((row) => [...row, emptyCell()]))

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
    })
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
    })
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
  function handleGridKeyDown(e) {
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
  const markup = buildMarkup(grid, headerRow)
  // Rendered exactly the way the viewer would show it — colspan/rowspan
  // only really read as "merged" once laid out as a real table, not as
  // <-N>/<|N> tokens in the raw markup.
  const { html: renderedHtml } = useMemo(() => parseWikiText(markup), [markup])

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-panel table-editor-modal-panel" onClick={(e) => e.stopPropagation()} onKeyDown={handleGridKeyDown}>
        <div className="modal-header">
          <h2>표 편집기</h2>
          <button className="modal-close-btn" onClick={onCancel}>
            ✕
          </button>
        </div>

        <label className="modal-checkbox-row">
          <input type="checkbox" checked={headerRow} onChange={(e) => setHeaderRow(e.target.checked)} />
          첫 번째 행을 헤더로 (굵게 표시, 진짜 나무위키 문법으로 저장됨)
        </label>

        <div className="cell-style-toolbar">
          <span className="cell-style-toolbar-label">
            {isMultiCell
              ? `선택 범위 (${range.r1 + 1},${range.c1 + 1}) ~ (${range.r2 + 1},${range.c2 + 1}):`
              : `선택한 셀 (${focusCell.r + 1}행 ${focusCell.c + 1}열):`}
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
        <div className="cell-style-hint">
          Shift+클릭으로 여러 셀을 범위 선택해서 한꺼번에 배경색·글자색·정렬을 적용하거나 병합할 수
          있습니다. Ctrl+C / Ctrl+V로 셀 범위를 복사·붙여넣기(엑셀 등 외부 표에서 붙여넣기도 가능)할 수
          있습니다.
        </div>

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
              {grid.map((row, r) => (
                <tr key={r}>
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
                        className={inRange(r, c) ? 'cell-in-range' : ''}
                        onMouseDown={(e) => {
                          if (e.shiftKey) {
                            e.preventDefault()
                            selectCell(r, c, true)
                          }
                        }}
                      >
                        <input
                          value={cell.text}
                          style={{
                            background: cell.bg || undefined,
                            color: cell.color || undefined,
                            textAlign: cell.align || undefined,
                            fontWeight: r === 0 && headerRow ? 700 : undefined,
                          }}
                          className={focusCell.r === r && focusCell.c === c ? 'cell-selected' : ''}
                          onFocus={() => selectCell(r, c, false)}
                          onChange={(e) => updateCell(r, c, { text: e.target.value })}
                          placeholder={r === 0 && headerRow ? `헤더 ${c + 1}` : ''}
                        />
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

        <div className="modal-actions">
          <button className="modal-cancel-btn" onClick={onCancel}>
            취소
          </button>
          <button className="modal-confirm-btn" onClick={() => onConfirm(markup)}>
            적용
          </button>
        </div>
      </div>
    </div>
  )
}
